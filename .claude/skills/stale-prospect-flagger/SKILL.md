---
name: stale-prospect-flagger
description: Scan the deals + activities tables and report prospects with no recent activity for their current pipeline stage. Use when the user asks "what's going stale?", "any deals slipping?", "what needs follow-up?", "show me prospects I've ignored", or asks for a pipeline health check / weekly status pulse.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
  - mcp__claude_ai_Supabase__list_projects
---

# /stale-prospect-flagger — Pipeline staleness watcher

Reads the `deals` and `activities` tables in Supabase, joins them, and
flags prospects with no recent activity given their pipeline stage.

Output: a markdown table ranked by severity, plus a one-line suggested
next action per deal.

---

## How to run

### 1. Resolve the Supabase project

If the project ref is already known from prior context, use it. Otherwise
call `mcp__claude_ai_Supabase__list_projects` and pick the one named
**leasing-tracker** (or whatever the user calls "parce" — same project).

### 2. Pull the data

Run a single SQL query that returns each non-closed deal alongside its
most recent activity timestamp:

```sql
select
  d.id,
  d.deal_name,
  d.prospect_tenant,
  d.broker_rep,
  d.status,
  d.priority,
  d.last_updated,
  (
    select max(a.created_at)
    from activities a
    where a.parent_type = 'deal'
      and a.parent_id = d.id::text
  ) as last_activity_at
from deals d
where d.status not in ('Executed', 'On Hold', 'Lost')
order by d.priority desc, d.deal_name asc;
```

If `last_activity_at` is null for a deal, use `d.last_updated` as the
fallback (or the deal's `created_at` if both are null — query the deals
table again if needed).

### 3. Apply the staleness rules

The thresholds are codified in
`src/lib/skill-support/staleness.ts`. **Read that file** before running
the report so you stay aligned with the in-app badge. Rough shape:

| Stage | Stale after |
| --- | --- |
| New Prospect | 7 days |
| RFP Requested | 5 days |
| Drafting Unsolicited | 10 days |
| Proposal Pending Approval | 3 days |
| Proposal Sent | 7 days |
| LOI Negotiations | 5 days |
| Lease Negotiations | 7 days |

Severity buckets per the helper:
- `ok` — under threshold
- `due` — at or just past threshold (1×–2×)
- `overdue` — 2×–3× threshold
- `critical` — >3× threshold

### 4. Format the report

Group by severity, most urgent first. Within each group, sort by High →
Medium → Low priority, then by days-since-activity descending.

```
## 🔴 Critical — needs attention today

| Deal | Tenant | Stage | Days Idle | Next Action |
| --- | --- | --- | --- | --- |
| Norfolk Building 4 | Acme Logistics | Proposal Pending Approval | 12d | Chase internal approval — this is the most urgent bucket. |

## 🟠 Overdue

...

## 🟡 Due now

...
```

Skip groups that are empty. If everything is `ok`, say so plainly:
*"Nothing stale right now — last check {today's date}."*

### 5. Don't write back

This skill is read-only. **Do not** insert activity entries or modify
deal status. If the user wants to follow up on a flagged deal, suggest
they run `/get-status-update <dealName>` next.

---

## Edge cases

- **Deal with zero activities ever** — count days since `created_at`.
  Brand-new deals (today) should not flag.
- **Status changed recently** — `status-change` activity entries count
  as activity. The query above already picks them up.
- **Deal on `On Hold`** — explicitly excluded by the WHERE clause. Don't
  second-guess; the user parked it on purpose.
- **Big batch (>50 deals)** — the report stays useful only if it's
  scannable. Cap the per-bucket list at 15; if a bucket is bigger,
  show top 15 and append `*…and N more in this bucket*`.
