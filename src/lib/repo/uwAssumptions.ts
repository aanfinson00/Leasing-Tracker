import { supabase } from '../supabase';
import type { UwAssumption } from '../../types';
import { UwAssumptionSchema } from '../../types';

const TABLE = 'uw_assumptions';

interface UwAssumptionRow {
  id: string;
  assumption_set: string;
  code: string;
  project_uuid: string | null;
  project_name_raw: string | null;
  tenant_name: string | null;
  building_code: string | null;
  suite_code: string | null;
  project_sf: number | string | null;
  building_sf: number | string | null;
  lease_sf: number | string | null;
  trended_rent_psf: number | string | null;
  lease_term_months: number | null;
  start_month_post_completion: number | null;
  starting_month: number | null;
  start_date: string | null;
  free_rent_months: number | null;
  tis_psf: number | string | null;
  lcs_pct: number | string | null;
  lc_override_pct: number | string | null;
  rent_escalations_pct: number | string | null;
  status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v);

function rowToUwAssumption(r: UwAssumptionRow): UwAssumption {
  const parsed = UwAssumptionSchema.parse({
    id: r.id,
    assumptionSet: r.assumption_set,
    code: r.code,
    projectUuid: r.project_uuid,
    projectNameRaw: r.project_name_raw,
    tenantName: r.tenant_name,
    buildingCode: r.building_code,
    suiteCode: r.suite_code,
    projectSF: numOrNull(r.project_sf),
    buildingSF: numOrNull(r.building_sf),
    leaseSF: numOrNull(r.lease_sf),
    trendedRentPSF: numOrNull(r.trended_rent_psf),
    leaseTermMonths: r.lease_term_months,
    startMonthPostCompletion: r.start_month_post_completion,
    startingMonth: r.starting_month,
    startDate: r.start_date,
    freeRentMonths: r.free_rent_months,
    tisPSF: numOrNull(r.tis_psf),
    lcsPct: numOrNull(r.lcs_pct),
    lcOverridePct: numOrNull(r.lc_override_pct),
    rentEscalationsPct: numOrNull(r.rent_escalations_pct),
    status: r.status,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
  return parsed;
}

export async function listUwAssumptions(
  filter?: { assumptionSet?: string; projectUuid?: string }
): Promise<UwAssumption[]> {
  let q = supabase.from(TABLE).select('*').order('code', { ascending: true });
  if (filter?.assumptionSet) q = q.eq('assumption_set', filter.assumptionSet);
  if (filter?.projectUuid) q = q.eq('project_uuid', filter.projectUuid);
  const { data, error } = await q;
  if (error) throw error;
  return (data as UwAssumptionRow[]).map(rowToUwAssumption);
}
