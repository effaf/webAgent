import { generateEmbedding, generateEmbeddings, calculateCosineSimilarity as calculateEmbeddingSimilarity } from './embeddings';

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

export async function analyzeWithGemini(companies: CompanyLink[], userSkills: string[]): Promise<CompanyAnalysis[]> {
  try {
    if (!Array.isArray(userSkills) || userSkills.length === 0) {
      throw new Error("User skills cannot be empty");
    }

    // Combine user skills into a single text for embedding
    const userSkillsText = userSkills.join(", ");
    
    if (!companies || companies.length === 0) {
      throw new Error("No companies provided for analysis");
    }
    
    // Generate embedding for user skills
    const userSkillsEmbedding = await generateEmbedding(userSkillsText);
    
    // Prepare company texts for batch embedding
    const companyTexts = companies.map(company => {
      const text = [
        company.name,
        company.industry || '',
        company.description || ''
      ].filter(Boolean).join(" ").trim();
      
      if (!text) {
        throw new Error(`Invalid company data: ${company.name} has no content for embedding`);
      }
      return text;
    });
    
    // Generate embeddings for all companies in one batch
    const companyEmbeddings = await generateEmbeddings(companyTexts);
    
    // Calculate similarity scores and create CompanyAnalysis objects
    const companiesData = companies.map((company, index) => {
      return {
        ...company,
        similarityScore: calculateEmbeddingSimilarity(userSkillsEmbedding, companyEmbeddings[index])
      };
    });
    
    // Sort by similarity score in descending order
    return companiesData.sort((a, b) => b.similarityScore - a.similarityScore);
    
  } catch (error) {
    console.error('Error analyzing companies:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze companies with embeddings');
  }
} 