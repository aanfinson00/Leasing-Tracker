import ExcelJS from 'exceljs';
import { emptyDataSet, type FullDataSet } from './excel';

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 10,
  name: 'Calibri',
};
const DATA_FONT: Partial<ExcelJS.Font> = {
  size: 10,
  name: 'Calibri',
};
const BORDER_THIN: Partial<ExcelJS.Border> = {
  style: 'thin',
  color: { argb: 'FFE2E8F0' },
};
const CELL_BORDERS: Partial<ExcelJS.Borders> = {
  top: BORDER_THIN,
  bottom: BORDER_THIN,
  left: BORDER_THIN,
  right: BORDER_THIN,
};
const ALT_ROW_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

interface ColDef {
  header: string;
  key: string;
  width: number;
  style?: Partial<ExcelJS.Style>;
}

const PCT_STYLE: Partial<ExcelJS.Style> = { numFmt: '0.00%' };
const CURRENCY_STYLE: Partial<ExcelJS.Style> = { numFmt: '$#,##0.00' };
const NUMBER_STYLE: Partial<ExcelJS.Style> = { numFmt: '#,##0' };
const INT_STYLE: Partial<ExcelJS.Style> = { numFmt: '#,##0' };

function addStyledSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: ColDef[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[],
  tabColor?: string,
) {
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: tabColor ? { argb: tabColor } : undefined },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: { font: DATA_FONT, ...(c.style ?? {}) },
  }));

  rows.forEach((r) => ws.addRow(r));

  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle' };
    cell.border = CELL_BORDERS;
  });

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.eachCell((cell) => {
      cell.border = CELL_BORDERS;
      if (i % 2 === 0) cell.fill = ALT_ROW_FILL;
    });
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
}

const frac = (v: number | null) => (v != null ? v : null);

export async function buildStyledWorkbook(data: FullDataSet): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Parce Leasing Tracker';
  wb.created = new Date();

  if (data.deals.length > 0) {
    addStyledSheet(wb, 'Prospects', [
      { header: 'Deal Name', key: 'dealName', width: 24 },
      { header: 'Space ID', key: 'spaceId', width: 14 },
      { header: 'Building', key: 'building', width: 14 },
      { header: 'Deal ID', key: 'dealId', width: 10 },
      { header: 'Min SF', key: 'minSF', width: 10, style: NUMBER_STYLE },
      { header: 'Max SF', key: 'maxSF', width: 10, style: NUMBER_STYLE },
      { header: 'Prospect / Tenant', key: 'prospectTenant', width: 24 },
      { header: 'Broker / Rep', key: 'brokerRep', width: 16 },
      { header: 'Transaction', key: 'transaction', width: 22 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'UW Rent ($/SF)', key: 'lastRevalUWRent', width: 16, style: CURRENCY_STYLE },
      { header: 'Target Rent ($/SF)', key: 'targetRent', width: 18, style: CURRENCY_STYLE },
      { header: 'Proposed Term (Mo)', key: 'proposedTermMonths', width: 18, style: INT_STYLE },
      { header: 'Free Rent (Mo)', key: 'freeRentMonths', width: 16, style: INT_STYLE },
      { header: '$ TI / SF', key: 'tiPerSF', width: 12, style: CURRENCY_STYLE },
      { header: 'Probability %', key: 'probabilityPct', width: 14, style: PCT_STYLE },
      { header: 'Expected Start', key: 'expectedStart', width: 14 },
      { header: 'Last Updated', key: 'lastUpdated', width: 14 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Current Summary', key: 'currentSummary', width: 40 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'ID', key: 'id', width: 38 },
    ], data.deals.map((d) => ({
      dealName: d.dealName,
      spaceId: d.spaceId,
      building: d.building,
      dealId: d.dealId,
      minSF: d.minSF,
      maxSF: d.maxSF,
      prospectTenant: d.prospectTenant,
      brokerRep: d.brokerRep,
      transaction: d.transaction,
      status: d.status,
      lastRevalUWRent: d.lastRevalUWRent,
      targetRent: d.targetRent,
      proposedTermMonths: d.proposedTermMonths,
      freeRentMonths: d.freeRentMonths,
      tiPerSF: d.tiPerSF,
      probabilityPct: d.probabilityPct != null ? d.probabilityPct / 100 : null,
      expectedStart: d.expectedStart,
      lastUpdated: d.lastUpdated,
      priority: d.priority,
      currentSummary: d.currentSummary,
      notes: d.notes,
      id: d.id,
    })), 'FF3B82F6');
  }

  if (data.rentRoll.length > 0) {
    addStyledSheet(wb, 'Rent Roll', [
      { header: 'Deal ID', key: 'dealId', width: 10 },
      { header: 'Deal Name', key: 'dealName', width: 22 },
      { header: 'Market', key: 'market', width: 16 },
      { header: 'Property Type', key: 'propertyType', width: 14 },
      { header: 'Building Type', key: 'buildingType', width: 14 },
      { header: 'Space ID', key: 'spaceId', width: 14 },
      { header: 'Tenant Name', key: 'tenantName', width: 22 },
      { header: 'Tenant Rating', key: 'tenantRating', width: 14 },
      { header: 'Occupied?', key: 'occupied', width: 10 },
      { header: 'Leasable SF', key: 'leasableSF', width: 12, style: NUMBER_STYLE },
      { header: 'Lease Start', key: 'leaseStart', width: 12 },
      { header: 'Lease End', key: 'leaseEnd', width: 12 },
      { header: 'Base Rent ($/SF)', key: 'baseRentPerSF', width: 16, style: CURRENCY_STYLE },
      { header: 'Annual Escalation %', key: 'annualEscalation', width: 18, style: PCT_STYLE },
      { header: 'Free Rent (Mo)', key: 'freeRentMonths', width: 14, style: INT_STYLE },
      { header: 'TI ($/SF)', key: 'tiPerSF', width: 12, style: CURRENCY_STYLE },
      { header: 'Spec TI ($/SF)', key: 'specTIPerSF', width: 14, style: CURRENCY_STYLE },
      { header: 'UW TI ($/SF)', key: 'uwTiPerSF', width: 14, style: CURRENCY_STYLE },
      { header: 'Actual/Prospective UW', key: 'actualOrProspectiveUW', width: 22 },
      { header: 'UW Basis', key: 'uwBasis', width: 12 },
      { header: 'Last Reval UW Rent', key: 'lastRevalUWRent', width: 18, style: CURRENCY_STYLE },
      { header: 'Probability %', key: 'probabilityPct', width: 14, style: PCT_STYLE },
      { header: 'NER ($/SF)', key: 'nerPerSF', width: 12, style: CURRENCY_STYLE },
      { header: 'Expected Start', key: 'expectedStart', width: 14 },
      { header: 'Last Updated', key: 'lastUpdated', width: 14 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Deal Ref', key: 'dealRef', width: 38 },
    ], data.rentRoll.map((r) => ({
      dealId: r.dealId,
      dealName: r.dealName,
      market: r.market,
      propertyType: r.propertyType,
      buildingType: r.buildingType,
      spaceId: r.spaceId,
      tenantName: r.tenantName,
      tenantRating: r.tenantRating,
      occupied: r.occupied ? 'Yes' : 'No',
      leasableSF: r.leasableSF,
      leaseStart: r.leaseStart,
      leaseEnd: r.leaseEnd,
      baseRentPerSF: r.baseRentPerSF,
      annualEscalation: frac(r.annualEscalation),
      freeRentMonths: r.freeRentMonths,
      tiPerSF: r.tiPerSF,
      specTIPerSF: r.specTIPerSF,
      uwTiPerSF: r.uwTiPerSF,
      actualOrProspectiveUW: r.actualOrProspectiveUW,
      uwBasis: r.uwBasis,
      lastRevalUWRent: r.lastRevalUWRent,
      probabilityPct: r.probabilityPct != null ? r.probabilityPct / 100 : null,
      nerPerSF: r.nerPerSF,
      expectedStart: r.expectedStart,
      lastUpdated: r.lastUpdated,
      notes: r.notes,
      id: r.id,
      dealRef: r.dealRef,
    })), 'FF10B981');
  }

  if (data.activities.length > 0) {
    const dealMap = new Map(data.deals.map((d) => [d.id, d.dealName]));
    const rrMap = new Map(data.rentRoll.map((r) => [r.id, r.tenantName ?? r.dealName ?? r.id]));
    addStyledSheet(wb, 'Activity', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Parent Type', key: 'parentType', width: 12 },
      { header: 'Parent ID', key: 'parentId', width: 38 },
      { header: 'Parent Name', key: 'parentName', width: 22 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Summary', key: 'summary', width: 50 },
      { header: 'Detail', key: 'detail', width: 50 },
      { header: 'Author', key: 'author', width: 16 },
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'Pinned', key: 'pinned', width: 8 },
    ], data.activities.map((a) => ({
      id: a.id,
      parentType: a.parentType === 'deal' ? 'Deal' : 'Rent Roll',
      parentId: a.parentId,
      parentName: a.parentType === 'deal' ? dealMap.get(a.parentId) ?? '' : rrMap.get(a.parentId) ?? '',
      type: a.type,
      summary: a.summary,
      detail: a.detail,
      author: a.author,
      timestamp: a.timestamp,
      pinned: a.pinned ? 'Yes' : 'No',
    })), 'FF8B5CF6');
  }

  if (data.onboardings.length > 0) {
    const onbRows = data.onboardings.flatMap((c) =>
      c.items.map((item) => ({
        checklistId: c.id,
        dealName: c.dealName,
        itemId: item.id,
        label: item.label,
        category: item.category,
        checked: item.checked ? 'Yes' : 'No',
        completedBy: item.completedBy,
        completedAt: item.completedAt,
        notes: item.notes,
      }))
    );
    addStyledSheet(wb, 'Onboarding', [
      { header: 'Checklist ID', key: 'checklistId', width: 38 },
      { header: 'Deal Name', key: 'dealName', width: 22 },
      { header: 'Item ID', key: 'itemId', width: 22 },
      { header: 'Label', key: 'label', width: 30 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Checked', key: 'checked', width: 10 },
      { header: 'Completed By', key: 'completedBy', width: 16 },
      { header: 'Completed At', key: 'completedAt', width: 22 },
      { header: 'Notes', key: 'notes', width: 40 },
    ], onbRows, 'FFF59E0B');
  }

  if (data.scenarios.length > 0) {
    addStyledSheet(wb, 'Scenarios', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Deal ID', key: 'dealId', width: 38 },
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Inputs (JSON)', key: 'inputs', width: 50 },
      { header: 'Globals (JSON)', key: 'globals', width: 50 },
      { header: 'Results (JSON)', key: 'results', width: 50 },
      { header: 'Version', key: 'version', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.scenarios.map((s) => ({
      id: s.id,
      dealId: s.dealId,
      name: s.name,
      inputs: JSON.stringify(s.inputs),
      globals: JSON.stringify(s.globals),
      results: s.results ? JSON.stringify(s.results) : '',
      version: s.version,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })), 'FFEF4444');
  }

  if (data.buildings.length > 0) {
    addStyledSheet(wb, 'Buildings', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Project ID', key: 'projectId', width: 38 },
      { header: 'Label', key: 'label', width: 16 },
      { header: 'Width (ft)', key: 'widthFt', width: 12, style: NUMBER_STYLE },
      { header: 'Depth (ft)', key: 'depthFt', width: 12, style: NUMBER_STYLE },
      { header: 'Height (ft)', key: 'heightFt', width: 12, style: NUMBER_STYLE },
      { header: 'Bay Count', key: 'bayCount', width: 10, style: INT_STYLE },
      { header: 'Bay Space IDs', key: 'baySpaceIds', width: 30 },
      { header: 'Frontage Side', key: 'frontageSide', width: 14 },
      { header: 'Bump Outs (JSON)', key: 'bumpOuts', width: 30 },
      { header: 'Lat', key: 'lat', width: 12 },
      { header: 'Lng', key: 'lng', width: 12 },
      { header: 'Rotation (°)', key: 'rotation', width: 12 },
      { header: 'Footprint (JSON)', key: 'footprint', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.buildings.map((b) => ({
      id: b.id,
      projectId: b.projectId,
      label: b.label,
      widthFt: b.widthFt,
      depthFt: b.depthFt,
      heightFt: b.heightFt,
      bayCount: b.bayCount,
      baySpaceIds: (b.baySpaceIds ?? []).join('; '),
      frontageSide: b.frontageSide,
      bumpOuts: b.bumpOuts?.length ? JSON.stringify(b.bumpOuts) : '',
      lat: b.lat,
      lng: b.lng,
      rotation: b.rotation,
      footprint: b.footprint ? JSON.stringify(b.footprint) : '',
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })), 'FF64748B');
  }

  if (data.devProjects.length > 0) {
    addStyledSheet(wb, 'Dev Projects', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Project Name', key: 'projectName', width: 22 },
      { header: 'Phase', key: 'phase', width: 16 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Market', key: 'market', width: 16 },
      { header: 'Acreage', key: 'acreage', width: 10, style: NUMBER_STYLE },
      { header: 'Zoning', key: 'zoning', width: 12 },
      { header: 'Entitlements', key: 'entitlements', width: 14 },
      { header: 'Total Budget', key: 'totalBudget', width: 16, style: CURRENCY_STYLE },
      { header: 'Spent', key: 'spent', width: 14, style: CURRENCY_STYLE },
      { header: 'GC Name', key: 'gcName', width: 16 },
      { header: 'Architect', key: 'architect', width: 16 },
      { header: 'Risk Level', key: 'riskLevel', width: 12 },
      { header: 'Target Completion', key: 'targetCompletion', width: 16 },
      { header: 'Lat', key: 'lat', width: 12 },
      { header: 'Lng', key: 'lng', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.devProjects.map((p) => ({
      id: p.id,
      projectName: p.projectName,
      phase: p.phase,
      address: p.address,
      market: p.market,
      acreage: p.acreage,
      zoning: p.zoning,
      entitlements: p.entitlements,
      totalBudget: p.totalBudget,
      spent: p.spent,
      gcName: p.gcName,
      architect: p.architect,
      riskLevel: p.riskLevel,
      targetCompletion: p.targetCompletion,
      lat: p.lat,
      lng: p.lng,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })), 'FFF97316');
  }

  if (data.propertyTaxAppeals.length > 0) {
    addStyledSheet(wb, 'Tax Appeals', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Building ID', key: 'buildingId', width: 38 },
      { header: 'Building Name', key: 'buildingName', width: 22 },
      { header: 'Parcel Number', key: 'parcelNumber', width: 16 },
      { header: 'Jurisdiction', key: 'jurisdiction', width: 16 },
      { header: 'Tax Year', key: 'taxYear', width: 10, style: INT_STYLE },
      { header: 'Assessed Value', key: 'assessedValue', width: 16, style: CURRENCY_STYLE },
      { header: 'Our Proposed Value', key: 'ourProposedValue', width: 18, style: CURRENCY_STYLE },
      { header: 'Settled Value', key: 'settledValue', width: 16, style: CURRENCY_STYLE },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Filing Deadline', key: 'filingDeadline', width: 14 },
      { header: 'Hearing Date', key: 'hearingDate', width: 14 },
      { header: 'Consultant', key: 'consultant', width: 16 },
      { header: 'Fee %', key: 'consultantFeePct', width: 10, style: PCT_STYLE },
      { header: 'Fee ($)', key: 'consultantFeeDollar', width: 14, style: CURRENCY_STYLE },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.propertyTaxAppeals.map((a) => ({
      id: a.id,
      buildingId: a.buildingId,
      buildingName: a.buildingName,
      parcelNumber: a.parcelNumber,
      jurisdiction: a.jurisdiction,
      taxYear: a.taxYear,
      assessedValue: a.assessedValue,
      ourProposedValue: a.ourProposedValue,
      settledValue: a.settledValue,
      status: a.status,
      filingDeadline: a.filingDeadline,
      hearingDate: a.hearingDate,
      consultant: a.consultant,
      consultantFeePct: frac(a.consultantFeePct),
      consultantFeeDollar: a.consultantFeeDollar,
      notes: a.notes,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })), 'FFDC2626');
  }

  if (data.leaseComps.length > 0) {
    addStyledSheet(wb, 'Lease Comps', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Property Name', key: 'propertyName', width: 22 },
      { header: 'Address', key: 'buildingAddress', width: 30 },
      { header: 'Market', key: 'market', width: 16 },
      { header: 'Property Type', key: 'propertyType', width: 14 },
      { header: 'Building Type', key: 'buildingType', width: 14 },
      { header: 'Tenant', key: 'tenantName', width: 20 },
      { header: 'Industry', key: 'tenantIndustry', width: 16 },
      { header: 'Transaction Type', key: 'transactionType', width: 16 },
      { header: 'Signed Date', key: 'signedDate', width: 12 },
      { header: 'Delivery Date', key: 'deliveryDate', width: 12 },
      { header: 'Lease SF', key: 'leaseSF', width: 12, style: NUMBER_STYLE },
      { header: 'Building SF', key: 'buildingSF', width: 12, style: NUMBER_STYLE },
      { header: 'Base Rent ($/SF)', key: 'baseRentPSF', width: 16, style: CURRENCY_STYLE },
      { header: 'Effective Rent ($/SF)', key: 'effectiveRentPSF', width: 18, style: CURRENCY_STYLE },
      { header: 'Rent Type', key: 'rentType', width: 14 },
      { header: 'Term (Months)', key: 'termMonths', width: 14, style: INT_STYLE },
      { header: 'Free Rent (Months)', key: 'freeRentMonths', width: 16, style: INT_STYLE },
      { header: 'TI ($/SF)', key: 'tiPSF', width: 12, style: CURRENCY_STYLE },
      { header: 'Escalation %', key: 'escalationPct', width: 12, style: PCT_STYLE },
      { header: 'Options', key: 'options', width: 22 },
      { header: 'Source', key: 'source', width: 18 },
      { header: 'Source URL', key: 'sourceUrl', width: 30 },
      { header: 'Confidence', key: 'confidence', width: 12 },
      { header: 'Confidential', key: 'confidential', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.leaseComps.map((c) => ({
      id: c.id,
      propertyName: c.propertyName,
      buildingAddress: c.buildingAddress,
      market: c.market,
      propertyType: c.propertyType,
      buildingType: c.buildingType,
      tenantName: c.tenantName,
      tenantIndustry: c.tenantIndustry,
      transactionType: c.transactionType,
      signedDate: c.signedDate,
      deliveryDate: c.deliveryDate,
      leaseSF: c.leaseSF,
      buildingSF: c.buildingSF,
      baseRentPSF: c.baseRentPSF,
      effectiveRentPSF: c.effectiveRentPSF,
      rentType: c.rentType,
      termMonths: c.termMonths,
      freeRentMonths: c.freeRentMonths,
      tiPSF: c.tiPSF,
      escalationPct: frac(c.escalationPct),
      options: c.options,
      source: c.source,
      sourceUrl: c.sourceUrl,
      confidence: c.confidence,
      confidential: c.confidential ? 'Yes' : 'No',
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })), 'FF0EA5E9');
  }

  if (data.salesComps.length > 0) {
    addStyledSheet(wb, 'Sales Comps', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Property Name', key: 'propertyName', width: 22 },
      { header: 'Address', key: 'buildingAddress', width: 30 },
      { header: 'Market', key: 'market', width: 16 },
      { header: 'Property Type', key: 'propertyType', width: 14 },
      { header: 'Building Type', key: 'buildingType', width: 14 },
      { header: 'Sale Date', key: 'saleDate', width: 12 },
      { header: 'Sale Price', key: 'salePrice', width: 16, style: CURRENCY_STYLE },
      { header: 'Price ($/SF)', key: 'pricePSF', width: 14, style: CURRENCY_STYLE },
      { header: 'Cap Rate %', key: 'capRate', width: 12, style: PCT_STYLE },
      { header: 'NOI', key: 'noi', width: 14, style: CURRENCY_STYLE },
      { header: 'Building SF', key: 'buildingSF', width: 12, style: NUMBER_STYLE },
      { header: 'Land (Acres)', key: 'landAcres', width: 12, style: NUMBER_STYLE },
      { header: 'Year Built', key: 'yearBuilt', width: 10, style: INT_STYLE },
      { header: 'Occupancy %', key: 'occupancyPct', width: 12, style: PCT_STYLE },
      { header: 'Buyer', key: 'buyer', width: 20 },
      { header: 'Seller', key: 'seller', width: 20 },
      { header: 'Source', key: 'source', width: 18 },
      { header: 'Source URL', key: 'sourceUrl', width: 30 },
      { header: 'Confidence', key: 'confidence', width: 12 },
      { header: 'Confidential', key: 'confidential', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.salesComps.map((c) => ({
      id: c.id,
      propertyName: c.propertyName,
      buildingAddress: c.buildingAddress,
      market: c.market,
      propertyType: c.propertyType,
      buildingType: c.buildingType,
      saleDate: c.saleDate,
      salePrice: c.salePrice,
      pricePSF: c.pricePSF,
      capRate: frac(c.capRate),
      noi: c.noi,
      buildingSF: c.buildingSF,
      landAcres: c.landAcres,
      yearBuilt: c.yearBuilt,
      occupancyPct: frac(c.occupancyPct),
      buyer: c.buyer,
      seller: c.seller,
      source: c.source,
      sourceUrl: c.sourceUrl,
      confidence: c.confidence,
      confidential: c.confidential ? 'Yes' : 'No',
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })), 'FF0EA5E9');
  }

  if (data.amPendingItems.length > 0) {
    addStyledSheet(wb, 'AM Pending', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Item Type', key: 'itemType', width: 20 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Building ID', key: 'buildingId', width: 38 },
      { header: 'Building', key: 'buildingName', width: 20 },
      { header: 'Deal ID', key: 'dealId', width: 38 },
      { header: 'Deal', key: 'dealName', width: 20 },
      { header: 'Owner', key: 'owner', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Completed Date', key: 'completedDate', width: 14 },
      { header: 'Source', key: 'source', width: 16 },
      { header: 'Link', key: 'link', width: 30 },
      { header: 'Cadence', key: 'cadence', width: 12 },
      { header: 'Sent To Tab', key: 'sentToTab', width: 14 },
      { header: 'Sent To ID', key: 'sentToId', width: 38 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.amPendingItems.map((i) => ({
      id: i.id,
      itemType: i.itemType,
      title: i.title,
      description: i.description,
      buildingId: i.buildingId,
      buildingName: i.buildingName,
      dealId: i.dealId,
      dealName: i.dealName,
      owner: i.owner,
      status: i.status,
      priority: i.priority,
      dueDate: i.dueDate,
      completedDate: i.completedDate,
      source: i.source,
      link: i.link,
      cadence: i.cadence,
      sentToTab: i.sentToTab,
      sentToId: i.sentToId,
      notes: i.notes,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })), 'FFEF4444');
  }

  if (data.contacts.length > 0) {
    addStyledSheet(wb, 'Contacts', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Contact Type', key: 'contactType', width: 14 },
      { header: 'First Name', key: 'firstName', width: 16 },
      { header: 'Last Name', key: 'lastName', width: 16 },
      { header: 'Company', key: 'companyName', width: 22 },
      { header: 'Title', key: 'title', width: 18 },
      { header: 'Primary Phone', key: 'primaryPhone', width: 16 },
      { header: 'Primary Email', key: 'primaryEmail', width: 24 },
      { header: 'Other Phones', key: 'otherPhones', width: 24 },
      { header: 'Other Emails', key: 'otherEmails', width: 30 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.contacts.map((c) => {
      const primaryPhone = c.phones.find(p => p.isPrimary)?.value ?? c.phones[0]?.value ?? '';
      const otherPhones = c.phones.filter(p => p.value !== primaryPhone).map(p => p.value).join('; ');
      const primaryEmail = c.emails.find(e => e.isPrimary)?.value ?? c.emails[0]?.value ?? '';
      const otherEmails = c.emails.filter(e => e.value !== primaryEmail).map(e => e.value).join('; ');
      return {
        id: c.id,
        contactType: c.contactType,
        firstName: c.firstName,
        lastName: c.lastName,
        companyName: c.companyName,
        title: c.title,
        primaryPhone,
        primaryEmail,
        otherPhones,
        otherEmails,
        notes: c.notes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    }), 'FF6366F1');
  }

  // Link tables: Dev Project Contacts / Notes
  if (data.devProjectContacts.length > 0) {
    addStyledSheet(wb, 'Dev Project Contacts', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Dev Project ID', key: 'devProjectId', width: 38 },
      { header: 'Contact ID', key: 'contactId', width: 38 },
      { header: 'Role Override', key: 'roleOverride', width: 16 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ], data.devProjectContacts.map((l) => ({
      id: l.id, devProjectId: l.devProjectId, contactId: l.contactId,
      roleOverride: l.roleOverride, createdAt: l.createdAt,
    })), 'FF64748B');
  }

  if (data.devProjectNotes.length > 0) {
    addStyledSheet(wb, 'Dev Project Notes', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Dev Project ID', key: 'devProjectId', width: 38 },
      { header: 'Note Type', key: 'noteType', width: 14 },
      { header: 'Title', key: 'title', width: 22 },
      { header: 'Content', key: 'content', width: 60 },
      { header: 'Author', key: 'author', width: 16 },
      { header: 'Link', key: 'link', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.devProjectNotes.map((n) => ({
      id: n.id, devProjectId: n.devProjectId, noteType: n.noteType,
      title: n.title, content: n.content, author: n.author,
      link: n.link, createdAt: n.createdAt, updatedAt: n.updatedAt,
    })), 'FF64748B');
  }

  // Acquisitions
  if (data.acquisitionTargets.length > 0) {
    addStyledSheet(wb, 'Acquisitions', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Target Name', key: 'targetName', width: 22 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Market', key: 'market', width: 16 },
      { header: 'Property Type', key: 'propertyType', width: 14 },
      { header: 'Building SF', key: 'buildingSF', width: 12, style: NUMBER_STYLE },
      { header: 'Land (Acres)', key: 'landAcres', width: 12, style: NUMBER_STYLE },
      { header: 'Asking Price', key: 'askingPrice', width: 16, style: CURRENCY_STYLE },
      { header: 'Our Offer', key: 'ourOffer', width: 14, style: CURRENCY_STYLE },
      { header: 'UW IRR', key: 'underwrittenIRR', width: 10, style: PCT_STYLE },
      { header: 'UW Yield', key: 'underwrittenYield', width: 10, style: PCT_STYLE },
      { header: 'Broker', key: 'broker', width: 16 },
      { header: 'Seller', key: 'seller', width: 16 },
      { header: 'Diligence (JSON)', key: 'diligenceStatus', width: 30 },
      { header: 'Lat', key: 'lat', width: 12 },
      { header: 'Lng', key: 'lng', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.acquisitionTargets.map((a) => ({
      id: a.id, targetName: a.targetName, status: a.status,
      address: a.address, market: a.market, propertyType: a.propertyType,
      buildingSF: a.buildingSF, landAcres: a.landAcres,
      askingPrice: a.askingPrice, ourOffer: a.ourOffer,
      underwrittenIRR: frac(a.underwrittenIRR), underwrittenYield: frac(a.underwrittenYield),
      broker: a.broker, seller: a.seller,
      diligenceStatus: a.diligenceStatus ? JSON.stringify(a.diligenceStatus) : '',
      lat: a.lat, lng: a.lng, notes: a.notes,
      createdAt: a.createdAt, updatedAt: a.updatedAt,
    })), 'FF22C55E');
  }

  if (data.acquisitionTargetContacts.length > 0) {
    addStyledSheet(wb, 'Acq Contacts', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Acquisition Target ID', key: 'acquisitionTargetId', width: 38 },
      { header: 'Contact ID', key: 'contactId', width: 38 },
      { header: 'Role Override', key: 'roleOverride', width: 16 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ], data.acquisitionTargetContacts.map((l) => ({
      id: l.id, acquisitionTargetId: l.acquisitionTargetId,
      contactId: l.contactId, roleOverride: l.roleOverride, createdAt: l.createdAt,
    })), 'FF64748B');
  }

  if (data.acquisitionTargetNotes.length > 0) {
    addStyledSheet(wb, 'Acq Notes', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Acquisition Target ID', key: 'acquisitionTargetId', width: 38 },
      { header: 'Note Type', key: 'noteType', width: 14 },
      { header: 'Title', key: 'title', width: 22 },
      { header: 'Content', key: 'content', width: 60 },
      { header: 'Author', key: 'author', width: 16 },
      { header: 'Link', key: 'link', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.acquisitionTargetNotes.map((n) => ({
      id: n.id, acquisitionTargetId: n.acquisitionTargetId, noteType: n.noteType,
      title: n.title, content: n.content, author: n.author,
      link: n.link, createdAt: n.createdAt, updatedAt: n.updatedAt,
    })), 'FF64748B');
  }

  // Dispositions
  if (data.dispositionListings.length > 0) {
    addStyledSheet(wb, 'Dispositions', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Asset Name', key: 'assetName', width: 22 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Market', key: 'market', width: 16 },
      { header: 'Property Type', key: 'propertyType', width: 14 },
      { header: 'Building SF', key: 'buildingSF', width: 12, style: NUMBER_STYLE },
      { header: 'Land (Acres)', key: 'landAcres', width: 12, style: NUMBER_STYLE },
      { header: 'List Price', key: 'listPrice', width: 14, style: CURRENCY_STYLE },
      { header: 'List Cap %', key: 'listCapPct', width: 12, style: PCT_STYLE },
      { header: 'NOI', key: 'noi', width: 14, style: CURRENCY_STYLE },
      { header: 'Occupancy %', key: 'occupancyPct', width: 12, style: PCT_STYLE },
      { header: 'Broker', key: 'broker', width: 16 },
      { header: 'Lat', key: 'lat', width: 12 },
      { header: 'Lng', key: 'lng', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.dispositionListings.map((d) => ({
      id: d.id, assetName: d.assetName, status: d.status,
      address: d.address, market: d.market, propertyType: d.propertyType,
      buildingSF: d.buildingSF, landAcres: d.landAcres,
      listPrice: d.listPrice, listCapPct: frac(d.listCapPct),
      noi: d.noi, occupancyPct: frac(d.occupancyPct),
      broker: d.broker, lat: d.lat, lng: d.lng, notes: d.notes,
      createdAt: d.createdAt, updatedAt: d.updatedAt,
    })), 'FFEC4899');
  }

  if (data.dispositionListingContacts.length > 0) {
    addStyledSheet(wb, 'Dispo Contacts', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Disposition Listing ID', key: 'dispositionListingId', width: 38 },
      { header: 'Contact ID', key: 'contactId', width: 38 },
      { header: 'Role Override', key: 'roleOverride', width: 16 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ], data.dispositionListingContacts.map((l) => ({
      id: l.id, dispositionListingId: l.dispositionListingId,
      contactId: l.contactId, roleOverride: l.roleOverride, createdAt: l.createdAt,
    })), 'FF64748B');
  }

  if (data.dispositionListingNotes.length > 0) {
    addStyledSheet(wb, 'Dispo Notes', [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Disposition Listing ID', key: 'dispositionListingId', width: 38 },
      { header: 'Note Type', key: 'noteType', width: 14 },
      { header: 'Title', key: 'title', width: 22 },
      { header: 'Content', key: 'content', width: 60 },
      { header: 'Author', key: 'author', width: 16 },
      { header: 'Link', key: 'link', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ], data.dispositionListingNotes.map((n) => ({
      id: n.id, dispositionListingId: n.dispositionListingId, noteType: n.noteType,
      title: n.title, content: n.content, author: n.author,
      link: n.link, createdAt: n.createdAt, updatedAt: n.updatedAt,
    })), 'FF64748B');
  }

  return wb;
}

export async function buildStyledWorkbookBlob(data: FullDataSet): Promise<Blob> {
  const wb = await buildStyledWorkbook(data);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function buildStyledViewWorkbookBlob(
  viewName: string,
  data: FullDataSet,
): Promise<Blob> {
  const VIEW_ENTITY_MAP: Record<string, (keyof FullDataSet)[]> = {
    prospects: ['deals', 'activities'],
    rentroll: ['rentRoll', 'activities'],
    underwrite: ['scenarios'],
    comps: ['leaseComps', 'salesComps'],
    contacts: ['contacts'],
    development: ['devProjects', 'devProjectContacts', 'devProjectNotes', 'buildings'],
    'asset-mgmt': ['amPendingItems', 'propertyTaxAppeals'],
    onboarding: ['onboardings'],
    acquisitions: ['acquisitionTargets', 'acquisitionTargetContacts', 'acquisitionTargetNotes'],
    disposition: ['dispositionListings', 'dispositionListingContacts', 'dispositionListingNotes'],
  };

  const keys = VIEW_ENTITY_MAP[viewName] ?? (Object.keys(data) as (keyof FullDataSet)[]);
  const filtered: FullDataSet = { ...emptyDataSet() };
  for (const k of keys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (filtered as any)[k] = data[k];
  }
  return buildStyledWorkbookBlob(filtered);
}
