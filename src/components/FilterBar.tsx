import type { Deal, DealStage } from '../types';
import { DealStageEnum } from '../types';

interface FilterBarProps {
  deals: Deal[];
  onFilterChange: (filtered: Deal[]) => void;
}

export function FilterBar({ deals, onFilterChange }: FilterBarProps) {
  const handleSearchChange = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const filtered = deals.filter(
      (deal) =>
        deal.propertyName.toLowerCase().includes(lowerQuery) ||
        deal.tenantName.toLowerCase().includes(lowerQuery) ||
        deal.address.toLowerCase().includes(lowerQuery) ||
        deal.city.toLowerCase().includes(lowerQuery)
    );
    onFilterChange(filtered);
  };

  const handleStageFilter = (stages: DealStage[]) => {
    if (stages.length === 0) {
      onFilterChange(deals);
      return;
    }
    const filtered = deals.filter((deal) => stages.includes(deal.stage));
    onFilterChange(filtered);
  };

  const stages = DealStageEnum.options;

  return (
    <div className="bg-white rounded shadow p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search
        </label>
        <input
          type="text"
          placeholder="Property, tenant, address..."
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stage
        </label>
        <div className="flex flex-wrap gap-2">
          {stages.map((stage) => (
            <label key={stage} className="flex items-center">
              <input
                type="checkbox"
                value={stage}
                onChange={() => {
                  const selected = Array.from(
                    document.querySelectorAll('input[name="stage"]:checked')
                  ).map((el) => (el as HTMLInputElement).value) as DealStage[];
                  handleStageFilter(selected);
                }}
                name="stage"
                className="rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{stage}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
