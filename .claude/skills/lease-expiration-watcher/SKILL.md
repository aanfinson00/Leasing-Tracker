---
name: lease-expiration-watcher
description: Scan rent_roll for leases expiring in the next N months and flag them for renewal action. Use when the user asks "what's expiring?", "show me renewals coming up", "what leases roll in 2026?", "lease expiration pulse", or asks for a portfolio renewal pipeline.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
---

# /lease-expiration-watcher — Renewal pipeline watcher

Reads `rent_roll` and reports leases whose `leaseEnd` falls within a
configurable horizon (default 18 months). Output ranked by urgency.

---

## How to run

### 1. Parse the horizon

Default is **18 months**. The user may pass `--months 24` or "next 12
months" — extract that, otherwise default. Industrial leasing
convention: start renewal conversations 12-18 months out for medium
tenants, 24+ months for anchors.

### 2. Pull rent roll

```sql
select
  id,
  deal_name,
  building_id,
  building,
  space_id,
  tenant_name,
  tenant_rating,
  leasable_sf,
  lease_end,
  lease_term_months,
  starting_annual_rent_psf,
  in_place_rent,
  notes
from rent_roll
where occupied = true
  and lease_end is not null
  and lease_end <= (current_date + ($1 || ' months')::interval)
order by lease_end asc;
```

Where `$1` is the horizon in months.

### 3. Bucket the results

| Bucket | Window |
| --- | --- |
| 🔴 **Urgent — start now** | Expires in ≤6 months |
| 🟠 **Active — start within 90 days** | 6-12 months |
| 🟡 **On radar** | 12-18 months |
| 🔵 **Long horizon** | 18+ months (only if user expanded horizon) |

Within each bucket, sort by:
1. **Leasable SF descending** (anchors first — bigger renewals matter
   more)
2. Tenant rating descending (prefer talking to high-credit tenants
   first)
3. Lease end ascending

### 4. Cross-reference deals

For each row, check if there's already a `New Prospect` / `RFP
Requested` / etc. deal for the same tenant + space:

```sql
select id, deal_name, status, last_updated
from deals
where prospect_tenant = $1
  and (building = $2 or space_id = $3)
  and status not in ('Executed', 'Lost');
```

If a deal exists, note it in the row: *"Renewal pipeline already open
— see deal {deal_name} ({status})."*

### 5. Format the report

```
## 🔴 Urgent — start now (≤6 months)

| Tenant | Space | SF | Rate | Expires | Days Left | Pipeline | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Acme Logistics | Norfolk-04-A | 120,000 | $7.25 | 2026-11-30 | 192 | — | **Open RFP** |
| ... |
```

Show `in_place_rent` as the rate. If null, fall back to
`starting_annual_rent_psf`.

### 6. Summary stats

End with a one-paragraph rollup:

> **Portfolio renewal load (next {N} months):** {totalSF} SF across
> {count} leases. Of those, {urgentCount} need action now ({urgentSF}
> SF), {activeCount} this quarter ({activeSF} SF). Highest-rent
> exposure: {topRentTenant} at ${topRent}/SF, {topRentSF} SF expiring
> {topRentDate}.

### 7. Don't write back

Read-only. If the user wants to start a renewal RFP, suggest:
*"Run `/prospect-intake` with the tenant info and I'll log a renewal
deal."*

---

## Edge cases

- **Month-to-month tenants** (`lease_end` in the past or term <12
  months remaining and no renewal). Always include in "urgent".
- **Multi-space tenants.** Group by tenant for the report — show
  spaces consolidated rather than separate rows, total SF, earliest
  expiration date wins for bucket.
- **Holdover scenarios** (lease_end < today but still occupied).
  Flag explicitly with 🚨 in the action column.

---

## Composes with

- `/weekly-portfolio-digest` — runs this as one of several panels.
- `/prospect-intake` — open a renewal RFP from a flagged expiration.
