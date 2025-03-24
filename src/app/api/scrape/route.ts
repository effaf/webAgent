import { NextResponse } from 'next/server'
import puppeteer, { Page, Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { promises as fs } from 'fs'

interface CompanyData {
  url?: string
  name: string
  batch?: string
  industry?: string
  location?: string
  description?: string
}

function isValidYCombinatorUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === 'www.ycombinator.com' && 
           parsedUrl.pathname.startsWith('/companies')
  } catch {
    return false
  }
}

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return retry(fn, retries - 1, delay * 2)
    }
    throw error
  }
}

async function scrapeCompanyListings(page: Page, url: string): Promise<CompanyData[]> {
  try {
    // Navigate to the page with optimized settings
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000
    })

    // Wait for the results container with better error handling
    try {
      await page.waitForSelector('div[class*="_section_"][class*="_results_"]', { 
        timeout: 30000,
        visible: true
      })
    } catch {
      throw new Error('Could not find company listings. The page might have changed or is not loading properly.')
    }

    // Extract company links and basic info with optimized selectors
    const companies = await page.evaluate(() => {
      const resultsContainer = document.querySelector('._section_i9oky_163._results_i9oky_343')
      if (!resultsContainer) {
        return []
      }

      const companyElements = resultsContainer.querySelectorAll('a[class*="_company_"]')
      if (!companyElements.length) {
        return []
      }

      const MAX_COMPANIES = 10
      
      return Array.from(companyElements)
        .slice(0, MAX_COMPANIES)
        .map(element => {
          try {
            const anchorElement = element as HTMLAnchorElement
            const pillWrapper = element.querySelector('div[class*="_pillWrapper_"]')
            
            const allPillLinks = pillWrapper?.querySelectorAll('a')
            const batchElement = allPillLinks?.[0]?.querySelector('span')
            const industryElements = Array.from(allPillLinks || []).slice(1).map(a => a.querySelector('span'))
            
            const locationElement = element.querySelector('span[class*="_coLocation_"]')
            const descriptionElement = element.querySelector('span[class*="_coDescription_"]')
            const nameElement = element.querySelector('span[class*="_coName_"]')

            return {
              url: anchorElement.href || '',
              name: nameElement?.textContent?.trim() || '',
              batch: batchElement?.textContent?.trim() || '',
              industry: industryElements.map(el => el?.textContent?.trim()).filter(Boolean).join(', '),
              location: locationElement?.textContent?.trim() || '',
              description: descriptionElement?.textContent?.trim() || ''
            }
          } catch {
            return null
          }
        })
        .filter(Boolean) as CompanyData[]
    })

    if (companies.length === 0) {
      throw new Error('No company data could be extracted. The page structure might have changed.')
    }

    return companies
  } catch (error) {
    throw error
  }
}

async function getBrowserInstance(): Promise<Browser> {
  // Check if we're in a Vercel production environment
  const isProduction = process.env.VERCEL === '1'

  if (isProduction) {
    try {
      // Use Chrome AWS Lambda for production
      const executablePath = await chromium.executablePath()
      
      return puppeteer.launch({
        args: [
          ...chromium.args,
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless
      })
    } catch (error) {
      console.error('Failed to launch browser in production:', error)
      throw new Error('Failed to initialize browser in production environment')
    }
  } else {
    // For local development, try to find Chrome in common locations
    const possiblePaths = [
      // Windows paths
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      // MacOS path
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // Linux path
      '/usr/bin/google-chrome',
    ]

    let executablePath
    for (const path of possiblePaths) {
      try {
        const exists = await fs.access(path).then(() => true).catch(() => false)
        if (exists) {
          executablePath = path
          break
        }
      } catch {
        continue
      }
    }

    if (!executablePath) {
      throw new Error('Could not find Chrome installation. Please install Google Chrome.')
    }

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    })
  }
}

export async function POST(request: Request) {
  let browser: Browser | null = null;
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    if (!isValidYCombinatorUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL. Must be a YCombinator companies listing page.' },
        { status: 400 }
      )
    }

    browser = await getBrowserInstance()
    const page = await browser.newPage()
    
    // Set memory limits but allow necessary resources
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      // Only block images and media, allow other resources
      if (request.resourceType() === 'image' || 
          request.resourceType() === 'media') {
        request.abort()
      } else {
        request.continue()
      }
    })

    // Set longer timeouts for better reliability
    page.setDefaultTimeout(60000)
    page.setDefaultNavigationTimeout(60000)

    const data = await retry(() => scrapeCompanyListings(page, url), 3, 3000)
    
    // Close browser immediately after use
    await browser.close()
    browser = null
    
    return NextResponse.json({ 
      data,
      metadata: {
        totalCompanies: data.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Scraping error:', error)
    
    // Log additional error details in production
    if (process.env.VERCEL === '1') {
      console.error('Production environment details:', {
        chromiumPath: await chromium.executablePath().catch(() => 'Failed to get path'),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined
      })
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while scraping data',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (error) {
        console.error('Error closing browser:', error)
      }
      browser = null
    }
  }
} 