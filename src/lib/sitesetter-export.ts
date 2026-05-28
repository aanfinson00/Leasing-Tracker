// =============================================================================
// SiteSetter → Rent-Roll Preview Excel
//
// Takes a normalized SiteSetter site plan (buildings) + the parent Dev
// Project context and produces a 2-sheet Excel workbook:
//
//   Sheet `building_summary`  — one row per building (dims + total SF +
//                              gross potential rent at the user-supplied
//                              $/SF)
//   Sheet `projected_rent_roll` — one row per building, shaped like
//                              Leasing-Tracker's rent_roll import schema
//                              so users can fill in tenants and re-import
//                              once leases are signed
// =============================================================================

import * as XLSX from 'xlsx';
import type { DevelopmentProject } from '../types';
import type { SiteSetterBuilding } from './sitesetter';

export interface RentRollPreviewOptions {
  /** Default $/SF/year applied to every projected row when set */
  defaultStartingRentPSF?: number | null;
  /** Default lease term in months — sets a placeholder on every row */
  defaultLeaseTermMonths?: number | null;
}

interface BuildingSummaryRow {
  'Building Name': string;
  'Width (ft)': number;
  'Depth (ft)': number;
  'Footprint SF': number;
  'Truck Court Side': string;
  'Rotation (°)': number;
  'Gross Potential Rent (annual)': number | string;
  'At $/SF': number | string;
}

interface ProjectedRentRollRow {
  'Deal ID': string;
  'Building': string;
  'Space ID': string;
  'Tenant Name': string;
  'Leasable SF': number;
  'Starting Rent ($/SF/yr)': number | string;
  'Lease Term (months)': number | string;
  'Free Rent (months)': string;
  'Annual Rent Bumps (%)': string;
  'TI ($/SF)': string;
  'Occupied': string;
  'Notes': string;
}

export function buildSitePlanWorkbook(
  project: Pick<DevelopmentProject, 'id' | 'projectName' | 'address' | 'market'>,
  buildings: SiteSetterBuilding[],
  options: RentRollPreviewOptions = {}
): Uint8Array {
  const rate = options.defaultStartingRentPSF ?? null;
  const term = options.defaultLeaseTermMonths ?? null;

  // ── Sheet 1: building_summary ────────────────────────────────────────
  const summary: BuildingSummaryRow[] = buildings.map((b) => {
    const gpr = rate != null ? Math.round(b.sf * rate) : '';
    return {
      'Building Name': b.name,
      'Width (ft)': b.widthFt,
      'Depth (ft)': b.depthFt,
      'Footprint SF': b.sf,
      'Truck Court Side': b.truckCourtSide ?? '',
      'Rotation (°)': b.rotationDeg,
      'At $/SF': rate ?? '',
      'Gross Potential Rent (annual)': gpr,
    };
  });

  // Total footer row — useful at a glance
  const totalSF = buildings.reduce((s, b) => s + b.sf, 0);
  const totalGpr = rate != null ? Math.round(totalSF * rate) : '';
  summary.push({
    'Building Name': `TOTAL (${buildings.length} buildings)`,
    'Width (ft)': '' as unknown as number,
    'Depth (ft)': '' as unknown as number,
    'Footprint SF': totalSF,
    'Truck Court Side': '',
    'Rotation (°)': '' as unknown as number,
    'At $/SF': rate ?? '',
    'Gross Potential Rent (annual)': totalGpr,
  });

  // ── Sheet 2: projected_rent_roll ─────────────────────────────────────
  // Column names match Leasing-Tracker's rent_roll Excel import vocabulary
  // so users can fill in tenants and re-import once leases are signed.
  const rentRoll: ProjectedRentRollRow[] = buildings.map((b) => ({
    'Deal ID': project.id,
    'Building': b.name,
    'Space ID': `${project.projectName.slice(0, 24)}-${b.name}-S01`.replace(/\s+/g, '_'),
    'Tenant Name': '',
    'Leasable SF': b.sf,
    'Starting Rent ($/SF/yr)': rate ?? '',
    'Lease Term (months)': term ?? '',
    'Free Rent (months)': '',
    'Annual Rent Bumps (%)': '',
    'TI ($/SF)': '',
    'Occupied': 'No',
    'Notes': `Projected from SiteSetter site plan — ${b.widthFt}×${b.depthFt} ft footprint`,
  }));

  // ── Cover info as cell A1 of a metadata sheet ────────────────────────
  const meta = [
    ['Project', project.projectName],
    ['Project ID', project.id],
    ['Address', project.address ?? '—'],
    ['Market', project.market ?? '—'],
    ['Generated at', new Date().toISOString()],
    ['Building count', buildings.length],
    ['Total footprint SF', totalSF],
    ['Notes', 'Source: SiteSetter share-link. Fill in tenant + lease terms in projected_rent_roll, then re-import.'],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'project');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'building_summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rentRoll), 'projected_rent_roll');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * Trigger a browser download for the workbook bytes.
 */
export function downloadWorkbook(filename: string, bytes: Uint8Array): void {
  // BlobPart requires an ArrayBuffer-backed view; newer @types/node tighten
  // Uint8Array's generic so we hand it a plain ArrayBuffer slice instead.
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
