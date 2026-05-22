---
name: prospect-intake
description: Take free-form info about a new prospect (forwarded email, broker call notes, deck snippet, paragraph) and extract a structured Deal record ready to insert into Supabase. Use when the user says "new prospect", "log this prospect", "add this tenant", "I just got off a call with X", "broker just sent me this", or pastes a tenant inquiry / RFP / tour request.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
  - mcp__claude_ai_Supabase__list_projects
---

# /prospect-intake — Structured intake for a new prospect

Turn a paragraph of context into a draft `Deal` JSON matching the zod
schema in `src/types.ts`. The user reviews, then you optionally insert
into the `deals` table.

---

## How to run

### 1. Read the schema

**Always read** `src/types.ts` for the current `DealSchema` and
`DealStatusEnum` before drafting. Don't infer from memory — the schema
evolves.

Required fields you must populate:
- `id` — generate a fresh UUID
- `dealName` — short label, "<Building/Project> — <Tenant>" if both
  known, otherwise tenant name
- `status` — see status mapping below
- `priority` — default `'Medium'` unless the input signals urgency

Optional but high-value fields if the input mentions them:
- `prospectTenant`, `brokerRep`, `transaction` (Lease / Sale / Sublease)
- `minSF`, `maxSF`
- `targetRent`, `proposedTermMonths`, `freeRentMonths`, `tiPerSF`
- `building`, `spaceId`
- `lat`, `lng` (only if explicitly given — don't geocode from address)
- `expectedStart`
- `notes` — anything in the input that doesn't fit a structured field

### 2. Status mapping

Pick the right starting status from the input:

| Signal in input | Status |
| --- | --- |
| Cold lead, no formal ask yet | `New Prospect` |
| "RFP", "send a proposal", "respond to RFP" | `RFP Requested` |
| "I want to send them something proactively" | `Drafting Unsolicited` |
| "Proposal is drafted, waiting on approval" | `Proposal Pending Approval` |
| "Sent the proposal", "they have our proposal" | `Proposal Sent` |
| "LOI", "term sheet" | `LOI Negotiations` |
| "Lease drafted", "redlines" | `Lease Negotiations` |
| "Signed", "executed" | `Executed` |

If ambiguous, default to `New Prospect` and flag the assumption.

### 3. Check for duplicates BEFORE drafting

Query Supabase for existing deals with the same tenant or close
building/space match:

```sql
select id, deal_name, prospect_tenant, status, building, space_id
from deals
where lower(prospect_tenant) ilike '%' || $1 || '%'
   or lower(deal_name) ilike '%' || $2 || '%'
limit 5;
```

If a likely match is returned, **stop and ask**: *"Looks like you may
already have **{deal_name}** ({status}). Update that one, or create a
new prospect?"* Don't silently create a duplicate.

### 4. Draft the JSON

Output the structured record as a fenced JSON block, then a plain-
English summary of what you filled in vs. left blank. Example:

```json
{
  "id": "0e5b...uuid",
  "dealName": "Norfolk Bldg 4 — Acme Logistics",
  "prospectTenant": "Acme Logistics",
  "brokerRep": "Sarah Chen (CBRE)",
  "transaction": "Lease",
  "status": "RFP Requested",
  "minSF": 80000,
  "maxSF": 120000,
  "proposedTermMonths": 60,
  "targetRent": null,
  "tiPerSF": null,
  "priority": "Medium",
  "notes": "Needs occupancy by Q3 2026. Auto-parts distribution, 24/7 ops."
}
```

Then below the block:

> **Filled:** tenant, broker, SF range, term, status, occupancy timing.
> **Left blank:** target rent, TI, building/space match.
> **Assumptions:** Defaulted priority to Medium — bump to High if Q3
> occupancy is a hard deadline.

### 5. Offer to insert

Ask: *"Insert this into `deals` now, or do you want to edit anything
first?"*

On confirm, INSERT with `mcp__claude_ai_Supabase__execute_sql`. Map the
camelCase JSON to snake_case columns (see `src/lib/repo/mappers.ts` for
the dealToRow mapping). Then log a `status-change` or `note` activity
entry to the `activities` table so the deal has its first event:

```sql
insert into activities (id, parent_type, parent_id, date, type, summary, created_at)
values (
  gen_random_uuid(),
  'deal',
  $1,  -- the new deal's id
  current_date,
  'note',
  'Prospect intake: <one-sentence summary of source>',
  now()
);
```

### 6. After insert

- Confirm with a short success message including the new deal name and
  status.
- If the user mentioned an attachment (proposal PDF, deck), suggest:
  *"If you upload the deck/proposal to the deal, I can run
  `/lease-abstract-from-pdf` to pull terms."*

---

## Anti-patterns

- **Don't geocode addresses.** If lat/lng isn't explicit in the input,
  leave it null. Coordinates get set on the Map tab.
- **Don't hallucinate broker names** from a company. If the input says
  "JLL sent over an RFP", `brokerRep` should be `"JLL (rep TBD)"`, not
  a fabricated person.
- **Don't fill `targetRent` from market rate guesses.** Only use what's
  in the input.
- **Don't overwrite** an existing deal silently — see step 3.
