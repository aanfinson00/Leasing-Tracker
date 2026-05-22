# parce skills

Claude Skills for operating the parce asset-management app. Each skill is
a directory with a `SKILL.md` frontmatter+prompt file that Claude loads
when the trigger phrases match.

## Conventions

**Naming.** kebab-case. Verb-first when it's an action
(`get-status-update`), noun-first when it's a thing
(`prospect-intake`).

**Patterns.** Most skills fall into one of three shapes:

| Pattern | Shape | Examples |
| --- | --- | --- |
| **Watcher** | Read DB → analyze → report stale/at-risk items | `stale-prospect-flagger`, `lease-expiration-watcher`, `scenario-drift-watcher` |
| **Intake** | Free-form input → extract → output structured fields | `prospect-intake`, `lease-abstract-from-pdf` |
| **Composer** | Read DB + Gmail → draft an activity / email / update | `get-status-update`, `weekly-portfolio-digest` |

**Data access.** Skills query Supabase via the `mcp__claude_ai_Supabase__*`
tools (project ref + tables live there). Read-only by default — only
write when the skill's contract says so, and prefer creating drafts the
user reviews before commit.

**Gmail access.** The `mcp__claude_ai_Gmail__*` tools handle thread
search and reading. Composer skills look for threads in the last 30 days
unless overridden.

**Output shape.** Watchers return a ranked markdown table. Intakes
return JSON matching the relevant zod schema in `src/types.ts`.
Composers return a draft activity entry + optional follow-up actions.

## When to add a backing TS module

Most skills can run from the SKILL.md prompt alone. Add a module under
`src/lib/skill-support/<skill-name>.ts` when:

1. The skill needs deterministic logic (staleness thresholds, scoring),
   AND
2. The same logic is needed inside the React app (e.g., to render a
   "stale" badge on the deals table).

That way the rules live in one place and the SKILL.md just calls into
it via Bash+tsx, or describes the rules and lets Claude apply them.

## Trigger phrasing

`description:` in frontmatter is what Claude matches on. Be specific
about the work it does AND what triggers it, in one sentence. The
imessage plugin's `configure` skill is a good template — verb, object,
then "Use when the user…" with two or three example asks.
