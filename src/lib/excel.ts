import * as XLSX from 'xlsx';
import type { Deal } from '../types';
import { DealSchema } from '../types';

const DEALS_SHEET = 'Deals';

export async function loadFromFile(file: File): Promise<Deal[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[DEALS_SHEET];

        if (!worksheet) {
          throw new Error(`Sheet "${DEALS_SHEET}" not found in workbook`);
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        const deals = rows.map((row) => {
          const normalized: Record<string, unknown> = {};

          // Map Excel columns to Deal fields
          Object.entries(row).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase().trim();
            if (value === '') {
              normalized[lowerKey] = null;
            } else if (value === 'NULL' || value === 'null') {
              normalized[lowerKey] = null;
            } else {
              normalized[lowerKey] = value;
            }
          });

          // Parse numbers and dates
          if (normalized['squarefeet'] && typeof normalized['squarefeet'] === 'string') {
            normalized['squarefeet'] = parseInt(normalized['squarefeet'] as string, 10) || null;
          }
          if (normalized['termmonths'] && typeof normalized['termmonths'] === 'string') {
            normalized['termmonths'] = parseInt(normalized['termmonths'] as string, 10) || null;
          }
          if (normalized['freerentmonths'] && typeof normalized['freerentmonths'] === 'string') {
            normalized['freerentmonths'] = parseInt(normalized['freerentmonths'] as string, 10) || null;
          }

          // Attempt to parse as Deal
          const deal = DealSchema.safeParse(normalized);
          if (!deal.success) {
            console.warn('Failed to parse row:', normalized, deal.error);
            return null;
          }
          return deal.data;
        }).filter((d) => d !== null) as Deal[];

        resolve(deals);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function saveToFile(deals: Deal[], filename: string = 'leases.xlsx'): void {
  // Convert deals to workbook format
  const wsData = deals.map((deal) => ({
    id: deal.id,
    propertyName: deal.propertyName,
    address: deal.address,
    city: deal.city,
    state: deal.state,
    squareFeet: deal.squareFeet,
    tenantName: deal.tenantName,
    stage: deal.stage,
    targetCloseDate: deal.targetCloseDate,
    broker: deal.broker,
    brokerCommissionPct: deal.brokerCommissionPct,
    baseRentPSF: deal.baseRentPSF,
    leaseStartDate: deal.leaseStartDate,
    leaseEndDate: deal.leaseEndDate,
    termMonths: deal.termMonths,
    rentEscalationPct: deal.rentEscalationPct,
    nnnPSF: deal.nnnPSF,
    tiAllowancePSF: deal.tiAllowancePSF,
    freeRentMonths: deal.freeRentMonths,
    renewalOptions: deal.renewalOptions,
    expansionRights: deal.expansionRights,
    notes: deal.notes,
    lastModifiedBy: deal.lastModifiedBy,
    lastModifiedAt: deal.lastModifiedAt,
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);

  // Set column widths for readability
  const colWidths = [
    { wch: 36 },  // id
    { wch: 20 },  // propertyName
    { wch: 25 },  // address
    { wch: 12 },  // city
    { wch: 8 },   // state
    { wch: 12 },  // squareFeet
    { wch: 15 },  // tenantName
    { wch: 12 },  // stage
    { wch: 15 },  // targetCloseDate
    { wch: 15 },  // broker
    { wch: 16 },  // brokerCommissionPct
    { wch: 12 },  // baseRentPSF
    { wch: 15 },  // leaseStartDate
    { wch: 15 },  // leaseEndDate
    { wch: 12 },  // termMonths
    { wch: 16 },  // rentEscalationPct
    { wch: 10 },  // nnnPSF
    { wch: 14 },  // tiAllowancePSF
    { wch: 15 },  // freeRentMonths
    { wch: 20 },  // renewalOptions
    { wch: 20 },  // expansionRights
    { wch: 30 },  // notes
    { wch: 15 },  // lastModifiedBy
    { wch: 20 },  // lastModifiedAt
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, DEALS_SHEET);

  // Add a Summary sheet with rollups
  const summaryData = generateSummary(deals);
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  XLSX.writeFile(wb, filename);
}

function generateSummary(deals: Deal[]): Record<string, unknown>[] {
  const metrics = {
    totalDeals: deals.length,
    totalSF: deals.reduce((sum, d) => sum + (d.squareFeet || 0), 0),
    totalAnnualRent: deals.reduce((sum, d) => {
      const sf = d.squareFeet || 0;
      const psf = d.baseRentPSF || 0;
      return sum + (sf * psf);
    }, 0),
  };

  const byStageCounts = deals.reduce(
    (acc, d) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return [
    { metric: 'Total Deals', value: metrics.totalDeals },
    { metric: 'Total Square Feet', value: metrics.totalSF },
    { metric: 'Total Annual Rent', value: metrics.totalAnnualRent },
    { metric: '', value: '' },
    { metric: 'Deals by Stage', value: '' },
    ...Object.entries(byStageCounts).map(([stage, count]) => ({
      metric: `  ${stage}`,
      value: count,
    })),
  ];
}
