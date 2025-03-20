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
  analysis: any;
  metadata: PageMetadata;
}

export interface FormState {
  url: string;
  prompt: string;
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
  name: string;
  description: string;
  technologies: string[];
  industry: string;
  location: string;
  teamSize: string;
  similarityScore: number;
  geminiAnalysis?: {
    overallAnalysis: string;
    topMatches: string[];
    skillGaps: string[];
    recommendations: string[];
  };
}
