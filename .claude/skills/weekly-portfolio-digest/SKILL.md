---
name: weekly-portfolio-digest
description: Compose a Monday-morning portfolio digest by running the watcher skills (stale prospects, lease expirations, scenario drift) and synthesizing the output into a single one-page brief. Use when the user asks for the "weekly digest", "Monday digest", "portfolio pulse", "what should I focus on this week", or runs the recurring schedule.
user-invocable: true
allowed-tools:
  - Read
  - Skill
  - mcp__claude_ai_Supabase__execute_sql
---

# /weekly-portfolio-digest — Monday-morning brief

Runs the parce watcher suite and synthesizes results into a one-page
prioritized brief. Designed to be the first thing you read on Monday.

---

## How to run

### 1. Run the watchers

Invoke each watcher in turn (via the Skill tool when supported, or
inline by following their SKILL.md instructions):

1. `/stale-prospect-flagger` — pipeline staleness
2. `/lease-expiration-watcher --months 18` — renewals
3. `/scenario-drift-watcher` — underwriting drift

**Capture each watcher's output** but don't print it raw. The digest
is a synthesis, not a concatenation.

### 2. Pull this week's calendar items

Optional but high-leverage if available:

```sql
-- Activities scheduled or noted as "follow up <date>" in upcoming week
select parent_id, date, type, summary
from activities
where date between current_date and (current_date + interval '7 days')
order by date asc;
```

### 3. Compose the brief

Structure — **strict order**, scannable in ≤90 seconds:

```markdown
# 📰 Parce — Weekly Brief
**{today's date}** · {N} open deals · {totalSF} SF in pipeline

---

## 🎯 Top 3 actions this week

1. **[Most urgent thing]** — one line on why
2. **[Second]** — one line
3. **[Third]** — one line

Pull these from the cross-product of watchers: e.g., a critical-stale
deal in LOI Negotiations is action #1; a holdover tenant from
lease-expiration is action #2; etc. Rank by impact × urgency.

---

## 🔴 Needs attention now

| Item | Where | Days/$ at stake | Suggested action |
| --- | --- | --- | --- |
| Norfolk-04 — Acme proposal | Pipeline | 12d idle | Chase internal approval |
| Holdover: Beta Corp | Rent Roll | M2M since 4/15 | Hand them a renewal LOI |

(Cap at 5 rows.)

---

## 🟠 This week's pipeline focus

- **{N} deals** in moderate-stale range — surfaced names, terse:
  *"Norfolk Bldg 2, Charlotte Pad C, Knoxville-12."*
- **Renewals to start in next 90 days:** {count} representing {sf} SF.
- **Scenario refresh needed:** {count} scenarios drifted from their
  deal targets.

---

## 📅 On your calendar this week

(From step 2's query. Bullet list of dated activities. If empty, omit
section.)

---

## 📈 Quick stats

- Pipeline by stage: {distribution}
- New activity last 7 days: {count} entries
- Largest open deal: {name} ({SF}, ~${rent}/SF target)
```

### 4. Length budget

Hard ceiling: **600 words**. If a section is empty, drop it
entirely rather than padding. A short brief gets read; a long one
gets archived.

### 5. Tone

Operator, not analyst. Speak in actions: *"Chase Acme on
approval"* — not *"It is recommended that follow-up be considered
with Acme."* Bullets > paragraphs.

### 6. Don't insert anything

Read + report only. The digest's value is signal, not state changes.

---

## Edge cases

- **All watchers come back empty.** Output: *"Quiet week. {N} open
  deals, all current. {M} leases ≥18 months out. Nothing on fire."*
  Don't fabricate urgency.
- **One watcher fails.** Note the failure and continue with the
  others. *"⚠️ lease-expiration watcher errored — see {error}. Brief
  below uses pipeline + drift only."*
- **First-time run / sparse data.** Be honest: *"Pipeline still
  small — {N} deals, {M} activities total. Brief will get more
  interesting as data accumulates."*

---

## Scheduling

To run this every Monday at 7am automatically, the user can use
`/schedule` (or `/loop 1w /weekly-portfolio-digest`).

---

## Composes with

- All three watchers — they're the inputs.
- `/get-status-update <deal>` — natural follow-up on any flagged deal.
