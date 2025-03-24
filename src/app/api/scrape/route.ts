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
  // Navigate to the page with longer timeout
  await page.goto(url, { 
    waitUntil: 'networkidle0',
    timeout: 30000 // 30 seconds timeout
  })

  // Wait for the results container
  await page.waitForSelector('._section_i9oky_163._results_i9oky_343')

  // Extract company links and basic info
  const companies = await page.evaluate(() => {
    const resultsContainer = document.querySelector('._section_i9oky_163._results_i9oky_343')
    if (!resultsContainer) return []

    const companyElements = resultsContainer.querySelectorAll('a[class*="_company_"]')
    const MAX_COMPANIES = 10  // Limit to first 10 companies
    
    return Array.from(companyElements)
      .slice(0, MAX_COMPANIES)  // Only take first 10 companies
      .map(element => {
        const anchorElement = element as HTMLAnchorElement
        const pillWrapper = element.querySelector('div[class*="_pillWrapper_i9oky_33"]')
        
        const allPillLinks = pillWrapper?.querySelectorAll('a')
        const batchElement = allPillLinks?.[0]?.querySelector('span')
        const industryElements = Array.from(allPillLinks || []).slice(1).map(a => a.querySelector('span'))
        
        const locationElement = element.querySelector('span[class*="_coLocation_i9oky_486"]')
        const descriptionElement = element.querySelector('span[class*="_coDescription_i9oky_495"]')
        const nameElement = element.querySelector('span[class*="_coName_i9oky_470"]')

        return {
          url: anchorElement.href || '',
          name: nameElement?.textContent?.trim() || '',
          batch: batchElement?.textContent?.trim() || '',
          industry: industryElements.map(el => el?.textContent?.trim()).filter(Boolean).join(', '),
          location: locationElement?.textContent?.trim() || '',
          description: descriptionElement?.textContent?.trim() || ''
        }
      })
  })

  if (companies.length === 0) {
    // Log the page content for debugging
    const pageContent = await page.content()
    console.error('Page content:', pageContent)
    throw new Error('No company links found. Please check if the page structure has changed.')
  }

  return companies
}

async function getBrowserInstance(): Promise<Browser> {
  // Check if we're in a Vercel production environment
  const isProduction = process.env.VERCEL === '1'

  if (isProduction) {
    // Use Chrome AWS Lambda for production
    const executablePath = await chromium.executablePath()
    
    return puppeteer.launch({
      args: [...chromium.args, '--disable-gpu', '--disable-dev-shm-usage'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: true
    })
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
      // Only block images, allow other resources
      if (request.resourceType() === 'image') {
        request.abort()
      } else {
        request.continue()
      }
    })

    // Set a longer timeout for the entire operation
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(30000)

    const data = await retry(() => scrapeCompanyListings(page, url))
    
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape data' },
      { status: 500 }
    )
  } finally {
    if (browser) {
      await browser.close()
      browser = null
    }
  }
} 