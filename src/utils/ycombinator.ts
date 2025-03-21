import { normalizeUrl } from './url'
import { fetchAndExtractCompanyData, analyzeWithGemini } from './scraper'

const YC_COMPANIES_URL = 'https://www.ycombinator.com/companies'

export function isYCombinatorUrl(url: string): boolean {
  try {
    const normalizedUrl = normalizeUrl(url, YC_COMPANIES_URL)
    const urlObj = new URL(normalizedUrl)
    // Check if it's the companies page or a subpage
    return urlObj.origin === 'https://www.ycombinator.com' && 
           urlObj.pathname.startsWith('/companies')
  } catch {
    return false
  }
}

export async function fetchYCombinatorData(url: string, userSkills: string[] = []) {
  if (!isYCombinatorUrl(url)) {
    throw new Error('Only YCombinator companies page and its subpages are supported')
  }

  try {
    const companies = await fetchAndExtractCompanyData(url)
    return analyzeWithGemini(companies, userSkills)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch YCombinator data: ${error.message}`)
    }
    throw new Error('Failed to fetch YCombinator data')
  }
} 