import { CompanyAnalysis } from "@/types/analyze";
import { CompanyCard } from "./company-card";

interface CompanyListProps {
  companies: CompanyAnalysis[];
}

export function CompanyList({ companies }: CompanyListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-green-500">Analysis Results</h2>
        <span className="text-zinc-400 text-sm">
          {companies.length} {companies.length === 1 ? 'company' : 'companies'} found
        </span>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {companies.map((company) => (
          <CompanyCard key={company.url} company={company} />
        ))}
      </div>
    </div>
  );
} 