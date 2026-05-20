import type { Deal } from '../types';

interface SummaryStripProps {
  deals: Deal[];
}

export function SummaryStrip({ deals }: SummaryStripProps) {
  const totalDeals = deals.length;
  const totalSquareFeet = deals.reduce((sum, d) => sum + (d.squareFeet || 0), 0);
  const totalAnnualRent = deals.reduce(
    (sum, d) => sum + ((d.squareFeet || 0) * (d.baseRentPSF || 0)),
    0
  );
  const activeLeases = deals.filter((d) => d.stage === 'Active').length;

  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-gray-600 text-sm">Total Deals</p>
          <p className="text-2xl font-bold text-gray-900">{totalDeals}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Total Square Feet</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalSquareFeet.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Total Annual Rent</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalAnnualRent.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Active Leases</p>
          <p className="text-2xl font-bold text-gray-900">{activeLeases}</p>
        </div>
      </div>
    </div>
  );
}
