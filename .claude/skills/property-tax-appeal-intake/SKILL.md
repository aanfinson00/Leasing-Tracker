---
name: property-tax-appeal-intake
description: Log a new property tax appeal — capture parcel, jurisdiction, tax year, assessed value, our proposed value, key dates, consultant terms. Use when the user says "log an appeal", "new tax appeal", "filed an appeal on X", "got the assessment for X — let's contest", or pastes an assessment notice.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
---

# /property-tax-appeal-intake — Log a property tax appeal

Turn assessment-notice context (or a spoken summary) into a draft
`PropertyTaxAppeal` JSON matching the zod schema in `src/types.ts`,
then optionally insert into Supabase.

---

## How to run

### 1. Read the schema

**Always read** `src/types.ts` for the current `PropertyTaxAppealSchema`
+ `PropertyTaxAppealStatusEnum`. The status enum is:

`Considering | Filed | Under Review | Hearing Scheduled | Settled | Withdrawn | Lost`

Default status is `Considering` unless the user says "we filed it"
(`Filed`) or "hearing is set" (`Hearing Scheduled`).

### 2. Required fields

- `id` — generate fresh UUID
- `taxYear` — the year being appealed (e.g., 2026). If the user says
  "this year's assessment", use the current calendar year.
- `status` — see above
- `createdAt` / `updatedAt` — ISO timestamps (now)

### 3. High-value optional fields

If the input mentions them, capture:

- **Property:** `buildingId` (lookup), `building`, `parcelNumber`,
  `jurisdiction` (e.g., "Norfolk County", "City of Charlotte")
- **Valuation triangle:** `assessedValue` (their number),
  `proposedValue` (our ask), `marketValue` (independent estimate)
- **Dates:** `filedDate`, `hearingDate`, `resolutionDate`
- **Outcome:** `initialAssessedValue`, `finalAssessedValue`,
  `estimatedSavings`
- **Consultant:** `consultantName`, `consultantFeePct` (e.g., 0.30 for
  30% contingency), `consultantFeeDollar`

### 4. Match to a building

Try to resolve `buildingId` from existing data:

```sql
select b.id, b.name, b.project_id
from buildings b
where lower(b.name) ilike '%' || $1 || '%'
limit 5;
```

If exactly one match, fill `buildingId`. If multiple, list them and
ask which one. If none, leave `buildingId` null but still capture
`building` (the human-readable string).

### 5. Check for duplicates

```sql
select id, building, tax_year, status, assessed_value, hearing_date
from property_tax_appeals
where tax_year = $1
  and (
    building_id = $2
    or lower(coalesce(parcel_number, '')) = lower(coalesce($3, ''))
    or (building is not null and lower(building) ilike '%' || $4 || '%')
  )
limit 5;
```

If an appeal already exists for this property + tax_year combo,
**stop and ask**: *"Looks like you may already have an appeal for
{building} tax year {tax_year} ({status}). Update that one, or log a
new one (parallel filing)?"*

### 6. Draft the JSON

```json
{
  "id": "{uuid}",
  "buildingId": "blg_norfolk_04",
  "building": "Norfolk Building 4",
  "parcelNumber": "12-345-678",
  "jurisdiction": "Norfolk County, VA",
  "taxYear": 2026,
  "assessedValue": 18500000,
  "proposedValue": 14200000,
  "marketValue": 13800000,
  "status": "Considering",
  "filedDate": null,
  "hearingDate": null,
  "resolutionDate": null,
  "initialAssessedValue": 18500000,
  "finalAssessedValue": null,
  "estimatedSavings": null,
  "consultantName": "Drucker & Falk",
  "consultantFeePct": 0.30,
  "consultantFeeDollar": null,
  "notes": "Comp set: nearby industrial sold 2025-09 at $138/SF vs assessor implied $185/SF.",
  "createdAt": "2026-05-22T12:00:00Z",
  "updatedAt": "2026-05-22T12:00:00Z"
}
```

Below the block: one paragraph summary of what's captured vs missing
+ key assumptions.

### 7. Offer to insert

Ask: *"Insert this into `property_tax_appeals`? I can also log a `note`
activity tying this to the building."*

On confirm:

```sql
insert into property_tax_appeals (
  id, building_id, building, parcel_number, jurisdiction, tax_year,
  assessed_value, proposed_value, market_value, status,
  filed_date, hearing_date, resolution_date,
  initial_assessed_value, final_assessed_value, estimated_savings,
  consultant_name, consultant_fee_pct, consultant_fee_dollar,
  notes
) values (...);
```

---

## Anti-patterns

- **Don't guess `assessedValue`** from "market value" or vice versa.
  If only one is given, leave the other null.
- **Don't assume a hearing date** from the filing date — jurisdictions
  vary wildly.
- **Don't default `consultantFeePct`** without evidence — different
  consultants and jurisdictions have very different splits.
- **Don't fill `estimatedSavings`** until you have both the
  initial and target values; the watcher computes a live estimate.

---

## Composes with

- `/property-tax-appeal-watcher` — find appeals with upcoming hearings.
- `/lease-abstract-from-pdf` — if the assessment doc came in as PDF,
  abstract relevant fields first.
