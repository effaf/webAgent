export interface ResumeResult {
  url: string;
  relevanceScore: number;
  explanation: string;
}

export interface PageMetadata {
  title: string;
  description: string;
  headings: {
    h1: string;
    h2: string;
  };
}

export interface AnalysisResult {
  analysis: {
    text?: string;
    urls?: string[];
    [key: string]: unknown;
  };
  metadata: PageMetadata;
}

export interface FormState {
  url: string;
  skills: string;
}

export interface LoadingState {
  isLoading: boolean;
  isAnalyzingResume: boolean;
}

export interface ErrorState {
  error: string | null;
}

export interface CompanyAnalysis {
  url: string;
  name: string;
  batch?: string;
  industry?: string;
  location?: string;
  description?: string;
  similarityScore: number;
  geminiAnalysis?: {
    overallAnalysis: string;
    topMatches: string[];
    skillGaps: string[];
    recommendations: string[];
  };
}
