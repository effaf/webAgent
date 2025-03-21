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

async function scrapeCompanyListings(page: Page, url: string, pageNumber: number = 1): Promise<CompanyData[]> {
  const pageUrl = pageNumber > 1 ? `${url}${url.includes('?') ? '&' : '?'}page=${pageNumber}` : url
  
  await page.goto(pageUrl, { waitUntil: 'networkidle0' })

  // Wait for the results container
  await page.waitForSelector('._section_i9oky_163._results_i9oky_343')

  // Extract company links and basic info
  const companies = await page.evaluate(() => {
    const resultsContainer = document.querySelector('._section_i9oky_163._results_i9oky_343')
    if (!resultsContainer) return []

    const companyElements = resultsContainer.querySelectorAll('a[class*="_company_"]')
    return Array.from(companyElements).map(element => {
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
    throw new Error('No company links found')
  }

  return companies
}

async function scrapeAllPages(page: Page, url: string): Promise<CompanyData[]> {
  let allCompanies: CompanyData[] = []
  let currentPage = 1
  let hasMorePages = true

  while (hasMorePages) {
    try {
      const companies = await retry(() => scrapeCompanyListings(page, url, currentPage))
      allCompanies = [...allCompanies, ...companies]
      
      // Check if there's a next page button
      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('button[aria-label="Next page"]')
        return nextButton && !nextButton.hasAttribute('disabled')
      })

      if (!hasNextPage) {
        hasMorePages = false
      } else {
        currentPage++
      }
    } catch (error) {
      console.error(`Error scraping page ${currentPage}:`, error)
      hasMorePages = false
    }
  }

  return allCompanies
}

async function getBrowserInstance(): Promise<Browser> {
  // Check if we're in a Vercel production environment
  const isProduction = process.env.VERCEL === '1'

  if (isProduction) {
    // Use Chrome AWS Lambda for production
    const executablePath = await chromium.executablePath()
    
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: true,
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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
}

export async function POST(request: Request) {
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

    const browser = await getBrowserInstance()
    const page = await browser.newPage()
    
    try {
      const data = await retry(() => scrapeAllPages(page, url))
      return NextResponse.json({ data })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape data' },
      { status: 500 }
    )
  }
} 