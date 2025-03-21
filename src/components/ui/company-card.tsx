import { CompanyAnalysis } from "@/types/analyze";

interface CompanyCardProps {
  company: CompanyAnalysis;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const similarityPercentage = Math.round(company.similarityScore * 100);

  return (
    <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4 border border-zinc-700/50 hover:border-green-500/30 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-green-400">{company.name}</h3>
          {company.batch && (
            <span className="inline-block px-2 py-1 text-xs bg-zinc-700/50 rounded-full text-zinc-300 mt-2">
              {company.batch}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-500">{similarityPercentage}%</div>
          <div className="text-xs text-zinc-400">match</div>
        </div>
      </div>

      {company.industry && (
        <div className="text-sm text-zinc-300">
          <span className="text-zinc-500">Industry:</span> {company.industry}
        </div>
      )}

      {company.location && (
        <div className="text-sm text-zinc-300">
          <span className="text-zinc-500">Location:</span> {company.location}
        </div>
      )}

      {company.description && (
        <p className="text-sm text-zinc-400 line-clamp-3">{company.description}</p>
      )}

      <a
        href={company.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-4 text-sm text-green-400 hover:text-green-300 transition-colors"
      >
        View Company →
      </a>
    </div>
  );
} 