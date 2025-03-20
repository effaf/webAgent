interface CompanyLink {
  url: string
  name: string
  batch?: string
  industry?: string
  location?: string
  description?: string
}

interface CompanyAnalysis extends CompanyLink {
  similarityScore: number
}

interface RawCompanyData {
  url: string
  name: string
  batch?: string
  industry?: string
  location?: string
  description?: string
}

export async function fetchAndExtractCompanyData(url: string): Promise<CompanyLink[]> {
  try {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch data')
    }

    const { data } = await response.json()
    
    // Log the received data structure
    console.log('Received data:', data)

    // Validate the data structure
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No company data found')
    }

    // Validate each company link
    const validCompanies = data.filter((company: RawCompanyData): company is CompanyLink => 
      typeof company === 'object' && 
      typeof company.url === 'string' && 
      typeof company.name === 'string' &&
      (!company.batch || typeof company.batch === 'string') &&
      (!company.industry || typeof company.industry === 'string') &&
      (!company.location || typeof company.location === 'string') &&
      (!company.description || typeof company.description === 'string')
    )

    if (validCompanies.length === 0) {
      throw new Error('No valid company data found')
    }

    return validCompanies
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch and extract company data: ${error.message}`)
    }
    throw new Error('Failed to fetch and extract company data')
  }
}

export function calculateCosineSimilarity(skills1: string[], skills2: string[]): number {
  // Convert skills arrays to sets for unique values
  const set1 = new Set(skills1.map(s => s.toLowerCase()))
  const set2 = new Set(skills2.map(s => s.toLowerCase()))

  // Create vectors
  const allSkills = new Set([...set1, ...set2])
  const vector1: number[] = Array.from(allSkills).map(skill => set1.has(skill) ? 1 : 0)
  const vector2: number[] = Array.from(allSkills).map(skill => set2.has(skill) ? 1 : 0)

  // Calculate dot product
  const dotProduct = vector1.reduce((sum, val, i) => sum + (val * vector2[i]), 0)

  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + (val * val), 0))
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + (val * val), 0))

  // Calculate cosine similarity
  if (magnitude1 === 0 || magnitude2 === 0) return 0
  return dotProduct / (magnitude1 * magnitude2)
}

export async function analyzeWithGemini(companies: CompanyLink[], userSkills: string[]): Promise<CompanyAnalysis[]> {
  const companiesData = companies.map(company => {
    // Create a skills array from company data for better matching
    const companySkills = [
      company.name,
      company.industry || '',
      company.description || ''
    ].filter(Boolean)

    return {
      ...company,
      similarityScore: calculateCosineSimilarity(userSkills, companySkills)
    }
  }).sort((a, b) => b.similarityScore - a.similarityScore)

  // TODO: Implement Gemini API call here
  // This is where you'll make the actual API call to Gemini
  // You'll need to format the data appropriately for the API

  return companiesData
} 