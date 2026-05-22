---
name: lease-abstract-from-pdf
description: Read a lease PDF (or LOI / proposal) and extract structured fields — rent, term, escalations, TI, free rent, options, key dates — into JSON matching the rent_roll or scenarios schema. Use when the user shares a lease PDF, an LOI, a proposal letter, or asks "abstract this lease", "pull terms from this", "extract the rent schedule".
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
---

# /lease-abstract-from-pdf — Lease term extraction

Read a leasing document (executed lease, LOI, or proposal letter) and
output a structured abstract. The caller decides whether to push the
abstract into `rent_roll` (for executed) or `scenarios` (for proposed).

---

## How to run

### 1. Confirm the source document

The user should pass a file path. If not, ask for it. Supported: `.pdf`,
`.docx` (extracted text), `.txt`. For PDFs, use the Read tool with the
`pages` parameter — start with pages 1-5 to find the title page and
fundamentals, then targeted page ranges for the rent schedule and
options.

### 2. Identify document type

Set this up front — it changes which schema the output maps to:

| Cue | Type |
| --- | --- |
| "Letter of Intent", "Term Sheet", "Proposal" header | `LOI` |
| "Lease Agreement", "Lease", signatures, exhibit list | `Executed Lease` |
| "Proposed Terms", broker formatting, no signature page | `Proposal` |

### 3. Extract the abstract

Produce a JSON block with the fields below. Leave any field `null` if
the doc doesn't say. **Don't infer** market rents or escalations.

```json
{
  "documentType": "Executed Lease | LOI | Proposal",
  "landlord": "...",
  "tenant": "...",
  "guarantor": null,
  "premises": {
    "building": "...",
    "spaceId": "...",
    "rentableSF": 100000,
    "buildingSF": null
  },
  "term": {
    "commencement": "2026-09-01",
    "expiration": "2031-08-31",
    "termMonths": 60
  },
  "rent": {
    "baseRatePSF": 7.25,
    "escalationPct": 0.03,
    "escalationType": "annual" | "step",
    "stepSchedule": [
      { "year": 1, "ratePSF": 7.25 },
      { "year": 2, "ratePSF": 7.47 }
    ],
    "rentType": "NNN | Modified Gross | Full Service",
    "freeRentMonths": 6,
    "freeRentTiming": "front-loaded | back-loaded | spread"
  },
  "concessions": {
    "tiAllowancePSF": 15.00,
    "tiNotes": "...",
    "movingAllowance": null
  },
  "operatingExpenses": {
    "camMethodology": "...",
    "baseYear": null,
    "expenseStop": null,
    "taxStop": null
  },
  "options": {
    "renewalOptions": "2 x 5 years at FMV",
    "expansionRights": null,
    "rofo": null,
    "rofr": null,
    "earlyTermination": null
  },
  "keyDates": {
    "executionDate": "2026-04-15",
    "deliveryDate": null,
    "rentCommencement": "2026-12-01"
  },
  "exhibits": ["A: Floor Plan", "B: Work Letter", "C: Rules & Regs"],
  "redFlags": []
}
```

### 4. Red flags

Populate `redFlags` with anything that needs human review. Be specific
— don't fill with boilerplate. Examples:

- "Personal guarantor named but no financial requirements specified"
- "Free rent timing not stated — assumed front-loaded"
- "Tax stop language ambiguous: \"calendar year prior to commencement\" — clarify"
- "Escalation reads '3% or CPI, whichever is greater' — schedule used flat 3%"
- "No remeasurement clause — verify SF independently"

### 5. Match to a deal (optional)

Ask the user: *"Should I match this to an existing deal? I can look up
the prospect/tenant in Supabase."* On confirm:

```sql
select id, deal_name, prospect_tenant, status
from deals
where lower(prospect_tenant) ilike '%' || $1 || '%'
limit 5;
```

### 6. Suggest destination

Based on `documentType`:

- **Executed Lease** → suggest inserting into `rent_roll`. Map the
  abstract to `RentRollRowSchema` from `src/types.ts` (read it before
  drafting the SQL).
- **LOI / Proposal** → suggest creating or updating a `scenarios` row
  for the related deal. Map to `ScenarioInputs` (`baseRatePSF`,
  `escalation`, `freeRentMonths`, `tiAllowancePSF`,
  `proposedLeaseSF`, `leaseTermMonths`, `leaseCommencement`).

**Do not insert without confirmation.** Print the proposed SQL, then
ask: *"Run this insert?"*

---

## Edge cases

- **Multi-tenant lease (master lease + amendments).** Extract the
  current state — most recent amendment wins. Note in `redFlags` that
  this is consolidated.
- **Scanned PDF (image-based).** The Read tool returns visual content
  for image PDFs. Acknowledge to the user that OCR is happening
  visually and accuracy may be lower for handwritten edits.
- **PDF >20 pages.** Use the `pages` parameter to target sections.
  Lease structure is usually: 1-5 cover/fundamentals, mid-pages
  legal boilerplate (skip), last 20% rent schedule + exhibits.
- **LOI with placeholders ("[Term: TBD]").** Treat as `null`, not the
  placeholder string.
- **Conflicting numbers** (e.g., recital says 100k SF, exhibit shows
  98.5k). Use the more specific source (exhibit), flag the discrepancy.

---

## Composes with

- `/prospect-intake` — for newly-received proposals, intake the deal
  first, then abstract the proposal into a scenario.
- Future: `/weekly-portfolio-digest` references abstracted leases for
  expiration tracking.
