"use client";

import { useState } from "react";
import { WebsiteAnalysisForm } from "@/components/website-analysis-form";
import type { FormState, LoadingState, ErrorState, CompanyAnalysis } from "@/types/analyze";
import { fetchYCombinatorData } from "@/utils/ycombinator";
import { ErrorMessage } from "@/components/ui/error-message";

export default function Home() {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    url: "",
    skills: "",
  });

  // Loading states
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isAnalyzingResume: false,
  });

  // Error state
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
  });

  // Results state
  const [results, setResults] = useState<CompanyAnalysis[] | null>(null);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    setErrorState({ error: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingState(prev => ({ ...prev, isLoading: true }));
    setErrorState({ error: null });
    setResults(null);

    try {
      if (!formState.skills.trim()) {
        throw new Error('Please enter at least one skill');
      }

      const userSkills = formState.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (userSkills.length === 0) {
        throw new Error('Please enter valid skills separated by commas');
      }

      const analysis = await fetchYCombinatorData(
        formState.url,
        userSkills
      );
      setResults(analysis);
    } catch (error) {
      setErrorState({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    } finally {
      setLoadingState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex flex-col items-center p-4 relative overflow-x-hidden">
      {/* <AmbientBackground /> */}

      <main className="w-full max-w-2xl mx-auto text-center space-y-12 relative py-16 mt-[15vh]">
        <h1 className="text-5xl font-bold text-green-500 drop-shadow-lg pb-2">
          Find the best startup for you
        </h1>

        {errorState.error && <ErrorMessage message={errorState.error} />}

        <WebsiteAnalysisForm
          formState={formState}
          isLoading={loadingState.isLoading}
          onSubmit={handleSubmit}
          onFormChange={handleFormChange}
        />

        {results && (
          <div className="mt-8 text-left">
            <h2 className="text-2xl font-bold text-green-500 mb-4">Analysis Results</h2>
            <pre className="bg-zinc-800/50 p-4 rounded-lg overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
