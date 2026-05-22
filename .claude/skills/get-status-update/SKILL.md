---
name: get-status-update
description: For a given deal, search Gmail for recent threads with the prospect or broker, then draft an activity entry summarizing the latest status. Use when the user says "status on X", "what's the latest with X", "any update from X?", "get me up to speed on X", or clicks the "Get Status Update" button in the deal drawer.
user-invocable: true
allowed-tools:
  - Read
  - mcp__claude_ai_Supabase__execute_sql
  - mcp__claude_ai_Gmail__search_threads
  - mcp__claude_ai_Gmail__get_thread
---

# /get-status-update — Email-driven activity entry

Given a deal name or ID, look at Gmail for recent threads involving the
prospect or broker, then draft an `ActivityEntry` capturing the latest
status. The user reviews + commits.

---

## How to run

### 1. Resolve the deal

Accept either a deal name (fuzzy) or a deal ID (uuid). Query:

```sql
select id, deal_name, prospect_tenant, broker_rep, status, last_updated, notes
from deals
where id::text = $1
   or lower(deal_name) ilike '%' || $1 || '%'
   or lower(prospect_tenant) ilike '%' || $1 || '%'
limit 5;
```

If 0 results, say so. If >1, list them and ask which one. If exactly
one, proceed.

### 2. Build the Gmail search

Construct a Gmail search query from the deal's tenant + broker fields.
Use Gmail operators:

```
({prospect_tenant_words} OR "{broker_rep_name}" OR "{deal_name}") newer_than:30d
```

Strip parens/punctuation from names, drop suffixes like `(CBRE)`, and
quote multi-word names. Example for "Acme Logistics" / "Sarah Chen
(CBRE)":

```
("Acme Logistics" OR "Sarah Chen" OR "acme.com") newer_than:30d
```

Call `mcp__claude_ai_Gmail__search_threads` with that query.

### 3. Read the most relevant threads

Take the top 3-5 threads from the search. For each, call
`mcp__claude_ai_Gmail__get_thread`. Look for:

- **The most recent inbound message** (from the prospect/broker, not
  the user)
- **Status-shifting language**: "let's proceed", "need to think",
  "going with another option", "send the LOI", "we're aligned on
  terms"
- **Open asks**: questions the prospect raised that haven't been
  answered, requests for info, redline pushback

### 4. Check what we already have logged

```sql
select id, date, type, summary
from activities
where parent_type = 'deal' and parent_id = $1
order by created_at desc
limit 5;
```

Don't draft an activity that duplicates one already in the log. If the
most recent activity already covers the latest thread, say:
*"Activity log is already current — most recent entry covers
{thread_subject}."*

### 5. Draft the activity entry

Use the `ActivityEntrySchema` shape from `src/types.ts`. Pick the
right `type`:

- `email-in` — most recent meaningful message is from the prospect/broker
- `email-out` — most recent is from the user (rare for this skill)
- `note` — synthesis across multiple threads, no single triggering
  email
- `status-change` — only if you're confident the deal status should
  actually change

Example draft:

```json
{
  "id": "{gen_uuid}",
  "parentType": "deal",
  "parentId": "{deal_id}",
  "date": "2026-05-22",
  "type": "email-in",
  "summary": "Sarah (CBRE) confirmed Acme is moving forward with the 100k SF option at $7.25/SF. Needs revised LOI by Friday with 60-month term and 6 months free. Open ask: clarify CAM stop methodology.",
  "link": null,
  "author": null
}
```

Below the JSON, add a one-line **Open asks** section listing any
unanswered questions from the threads so the user can address them.

### 6. Status-change recommendation

If the email content clearly justifies moving the deal to a new status
(e.g., LOI requested → `LOI Negotiations`), say so explicitly:

> **Suggested status change:** `RFP Requested` → `LOI Negotiations`.
> The prospect asked for a revised LOI — that's the trigger.

Do **not** update the deal status automatically. Wait for user
confirmation.

### 7. Offer to insert

Ask: *"Log this activity? (and update status to LOI Negotiations?)"*

On confirm, INSERT into `activities`. If the user also confirmed a
status change, UPDATE the deal:

```sql
update deals
set status = $1, last_updated = now()
where id = $2;
```

---

## Edge cases

- **No threads found.** Tell the user: *"No Gmail threads in the last
  30 days for {tenant}. Want me to widen to 90d, or do you have an
  off-channel update (call, text) to log instead?"*
- **Too many threads (>10).** Show the user the subjects and ask which
  ones to read.
- **Thread with attachments referenced ("see attached proposal").**
  Mention the attachment in the summary, but the skill can't read
  Gmail attachments directly — flag it.
- **Multiple prospects with the same broker.** The Gmail search will
  conflate them. Add the prospect's company domain to the query if
  available (`from:@acme.com`).
- **Skip personal/internal noise.** Filter out HR/admin/internal
  threads that match the broker's name but aren't deal-related.

---

## Composes with

- `/stale-prospect-flagger` — run this after to clear a flagged deal.
- `/prospect-intake` — predecessor for newly-created deals.
- Future: `/weekly-portfolio-digest` runs this in batch.
