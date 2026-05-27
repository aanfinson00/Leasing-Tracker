---
name: promote-deal-to-rent-roll
description: Extract structured lease terms from a deal's notes / activity log / attached lease PDF, then emit a Rent Roll Excel ready to upload back into Leasing-Tracker. The app's PromoteDrawer auto-computes the cashflow from those terms — the skill's job is just to surface the inputs cleanly.
triggers:
  - "/promote-deal-to-rent-roll"
  - "promote this deal"
  - "build rent roll from lease"
runs_on: claude.ai (or Claude Code) — uses your authorized Outlook / Gmail / OneDrive / SharePoint connectors to read source docs
allowed_tools:
  - Microsoft 365 / Google connectors — Outlook, OneDrive, SharePoint (read)
  - WebFetch (for any externally-linked lease PDF)
  - Read (local lease PDFs)
output_format: excel
expected_sheets: [rent_roll, finalize]
---

# Skill: promote-deal-to-rent-roll

When a deal flips to Executed, the user opens the Promote drawer in
Leasing-Tracker. Most of the structured fields are already populated from
the deal record — but the **finalize fields** (security deposit, rent
commencement date) and any free-rent / escalation details often live only
in the lease document or email thread. This skill pulls those out so the
user doesn't re-type them.

## Inputs (passed in by the user when invoking)

- Deal name + ID
- Tenant name
- Building / space ID
- Existing structured fields the app already has: lease start, term,
  starting rent, TI, free rent
- A pointer to the executed lease — typically a SharePoint folder URL or a
  pasted PDF path

## Procedure

1. **Read the source documents.** Open the SharePoint folder; pull the
   executed lease + any LOI/PSA/redline. If you can't access SharePoint
   directly, ask the user to paste the path or attach the PDF.
2. **Extract** these specific fields, with citations to where they appear:
   - `security_deposit` (dollars; capitalize as a number, not a $ string)
   - `rent_commencement_date` (ISO YYYY-MM-DD)
   - `lease_start` (commencement of possession — may differ from rent
     commencement when free rent runs first)
   - `lease_term_months` (integer)
   - `starting_annual_rent_psf` (dollars/SF/year — year-1 rate)
   - `annual_rent_bumps_pct` (decimal or percent; e.g. 0.03 or 3 — note
     which convention)
   - `free_rent_months` (integer)
   - `ti_per_sf` (dollars/SF allowance)
   - `commission_structure_pct` and/or `commission_dollar`
3. **Sanity-check** against the deal's existing structured fields. If the
   lease says one thing and the deal record says another, surface the
   discrepancy in the workbook notes column — don't silently overwrite.
4. **Don't** compute the monthly cashflow. The app's PromoteDrawer auto-
   computes it from these inputs (see `src/lib/lease-math/cashflow.ts`).
   Returning a cashflow here would just risk drift between the skill's
   output and the app's source of truth.

## Output

Excel workbook with two sheets:

### Sheet `rent_roll` (one row)

| Column | Type | Notes |
|---|---|---|
| `deal_id` | string | The deal you're promoting from |
| `tenant_name` | string | |
| `lease_start` | YYYY-MM-DD | |
| `lease_term_months` | integer | |
| `starting_annual_rent_psf` | number | $/SF/year, year 1 |
| `annual_rent_bumps_pct` | number | 3 for 3% (or 0.03 — note which) |
| `free_rent_months` | integer | |
| `ti_per_sf` | number | |
| `commission_structure_pct` | number | optional |
| `commission_dollar` | number | optional |
| `notes` | string | citations + discrepancies vs deal record |

### Sheet `finalize` (one row)

| Column | Type | Notes |
|---|---|---|
| `deal_id` | string | match above |
| `security_deposit` | number | dollars |
| `rent_commencement_date` | YYYY-MM-DD | distinct from lease_start when free rent runs first |

## Quality bar

- **Cite every extracted field** — quote the lease section in `notes`
  ("Article 3.2(b): 'Tenant shall deposit $X'") so the user can verify in
  10 seconds rather than re-reading 80 pages.
- **Never invent.** If a field can't be found, leave the cell blank, don't
  guess. The user will fill in manually in the Promote drawer.
- **One workbook per deal.** No batch-mode in this skill.

## How the user consumes the output

1. Skill emits the workbook → saves to Downloads.
2. User opens the Promote drawer in Leasing-Tracker.
3. User pastes the values from the workbook into the drawer fields (or, in
   a future PR, uploads the workbook directly via Excel import).
4. PromoteDrawer's cashflow preview re-renders live as each field is
   entered. User confirms → row + cashflow saved to rent_roll.

## Future: direct import

When Leasing-Tracker adds a `/api/import/promote-result` endpoint, this
skill's output drops in as a one-click upload from PromoteDrawer. The
sheet schema above is designed to round-trip exactly.
