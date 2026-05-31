# Leasing-Tracker MCP — User's Guide

A beginner-friendly guide to using the Leasing-Tracker MCP server with Claude. No engineering background required.

---

## What is this?

The Leasing-Tracker MCP is a **bridge between Claude and our Leasing-Tracker database**. When you talk to Claude about deals, tenants, rent rolls, or any other CRE data we track in Supabase, Claude can read from and write to the database directly — through a set of structured "tools" we've defined.

**Without the MCP**, you'd say to Claude: *"Pull me a list of LOI deals"* and Claude would say *"I don't have access to your data."*

**With the MCP**, you say: *"Pull me a list of LOI deals"* and Claude actually does it, reading live data and showing you results in seconds.

It works in every Claude surface you might use — Claude Desktop, the Claude Code CLI, and (with a bit of setup) Claude.ai web.

---

## Quick start (5 minutes)

### Step 1 — Get your bearer token from Austin

Send a message to Austin saying you'd like access to the Leasing-Tracker MCP. He'll send you a token via 1Password (or another secure secrets manager). It looks like:

```
4a13371ca9847f2bfa340952c868a2be7ff99d9a1f3bb6e8
```

**Treat this like a password.** Don't paste it into email, Slack, or anywhere else — only into your Claude client config.

### Step 2 — Add it to your Claude

Pick the Claude surface you use most:

- **Using Claude Code (CLI)?** → [Claude Code setup](#claude-code-setup)
- **Using Claude Desktop (Mac/Windows app)?** → [Claude Desktop setup](#claude-desktop-setup)
- **Using Claude.ai web?** → Not currently supported for individual users without an admin enabling OAuth. Use Desktop instead for now.

### Step 3 — Try a test prompt

Open a new conversation in your Claude client and try:

> *"Pull a portfolio summary from the leasing-tracker MCP."*

If it works, you'll see a JSON-formatted breakdown of deal counts, occupancy, weighted average rent, and lease expirations.

---

## What it can do

The MCP exposes **19 tools** organized by what kind of data you want to touch:

### Deal pipeline (4 tools)

| Tool | What it does |
|---|---|
| `list_deals` | Search the leasing pipeline by status, tenant, broker, or name |
| `create_deal` | Spawn a new prospect, RFP, or unsolicited offer |
| `update_deal` | Patch rent, term, TI, status, or any other deal field |
| `add_activity_to_deal` | Log a call, meeting, email, or note to a deal's journal |

### Rent roll (4 tools)

| Tool | What it does |
|---|---|
| `list_tenants` | Search active tenants and vacant spaces by name, building, or occupancy |
| `update_tenant` | Patch lease terms, TI, rent, tenant rating after a renewal or amendment |
| `list_rent_roll` | Filter rent roll by deal, building, occupancy status, or expiration date |
| `update_rent_roll_row` | Patch a specific rent-roll row (lease end, rent escalations, notes) |

### Buildings + comps (3 tools)

| Tool | What it does |
|---|---|
| `list_buildings` | List buildings within a project (4-digit deal ID) |
| `list_lease_comps` | Search lease comparables by market, property type, size, or signed date |
| `list_sales_comps` | Search sales comparables by market, type, sold-after date |

### Development pipeline (2 tools)

| Tool | What it does |
|---|---|
| `list_dev_projects` | Active development pipeline, filterable by phase or project name |
| `add_dev_project_note` | Log a site visit, PM update, or design review note |

### Acquisitions + dispositions (2 tools)

| Tool | What it does |
|---|---|
| `list_acquisitions` | Acquisitions pipeline (deals you're trying to buy) |
| `list_dispositions` | Dispositions pipeline (assets you're selling) |

### Contacts (2 tools)

| Tool | What it does |
|---|---|
| `find_contact` | Look up a person by name, company, or email |
| `create_contact` | Add a new broker, attorney, vendor, or other party |

### Cross-cutting (2 tools)

| Tool | What it does |
|---|---|
| `portfolio_summary` | Roll-up: deal counts by status, total NRA, occupancy %, weighted rent, 12-month expirations |
| `search` | Free-text search across deal names, tenant names, broker reps, and building names |

---

## Setup by client

### Claude Code setup

If you use Claude Code (CLI), one command registers the MCP:

```bash
claude mcp add leasing-tracker \
  https://leasing-tracker-psi.vercel.app/api/mcp \
  --transport http \
  --scope user \
  --header "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with the token Austin sent you. Verify:

```bash
claude mcp list
```

Should show:
```
leasing-tracker: https://leasing-tracker-psi.vercel.app/api/mcp (HTTP) - ✓ Connected
```

That's it. Every Claude Code session you open from now on can call the tools.

### Claude Desktop setup

Claude Desktop's "Connectors" UI is OAuth-only and won't accept our bearer token. Use the config file directly:

1. **Open the config file.** On Mac:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   On Windows:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```
   Open in any text editor.

2. **Add the leasing-tracker MCP entry.** If the file is empty or doesn't have an `mcpServers` block, add this (preserve any existing top-level keys):

   ```json
   {
     "mcpServers": {
       "leasing-tracker": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "https://leasing-tracker-psi.vercel.app/api/mcp",
           "--header",
           "Authorization: Bearer YOUR_TOKEN_HERE"
         ]
       }
     }
   }
   ```

3. **Save the file**, then **fully quit Claude Desktop** (⌘+Q on Mac, not just closing the window).

4. **Reopen Claude Desktop.** First launch will spend 5-10 seconds downloading `mcp-remote` (a bridge tool). Normal.

5. **Verify**: in any chat, click the 🔌 / "Search and tools" icon. You should see `leasing-tracker` with 19 tools.

### Mobile access (via iMessage)

If Austin has set up the iMessage channel, you can text the configured number with prompts like *"pull my pipeline"* and the channel session executes the MCP call for you. Ask Austin if you need to be added to the allowlist.

### Claude.ai web (not yet supported)

The claude.ai web Custom Connector UI requires OAuth 2.0 with Dynamic Client Registration, which our MCP server doesn't currently implement. Use Desktop or Code for now. If demand grows, OAuth can be added — flag it to Austin.

---

## Example prompts to try

**Pipeline questions:**
- *"Show me deals in LOI Negotiations."*
- *"What's our active pipeline look like by status?"*
- *"Find any deals mentioning Caliber."*

**Rent roll / tenant questions:**
- *"What leases are expiring in the next 90 days?"*
- *"Show me the Smoky Bean lease — what's the TI and how much term is left?"*
- *"Pull the rent roll for project 5001."*

**Portfolio rollup:**
- *"Give me a one-screen portfolio summary."*
- *"How much vacant SF do we have right now?"*

**Updates (writes):**
- *"Add a note to the Acme deal: discussed renewal terms, they want 10% more TI."*
- *"Update the Caliber lease end date to 2028-12-31."*
- *"Bump the target rent on deal X to $32/SF."*

**Comp lookups:**
- *"Show me lease comps in Charlotte over 50k SF signed since January."*
- *"What sales comps do we have for office in Atlanta this year?"*

**Multi-step / agentic:**
- *"Find the Acme deal, then list all rent-roll rows for its building, then summarize."*
- *"Pull my morning brief: top 5 deals to follow up on, expiring leases in the next 30 days, and any dev projects in Construction phase."*

Don't worry about exact tool names — Claude figures out which tool to call. Just describe what you want.

---

## What the MCP can't do (limitations)

| Limitation | Workaround |
|---|---|
| **Cannot delete records** | By design — destructive ops require manual SQL by an admin |
| **Cannot run raw SQL** | Only the 19 typed tools; ask Austin if you need a custom query |
| **Cannot upload files / images** | Use the web app for that |
| **Cannot directly trigger emails or notifications** | Use the activity log + the web app's reminders for that |
| **No "undo" button** | Once a write goes through, it's live (~1 sec via Supabase Realtime). Be sure before you confirm. |
| **Rate limit: 60 requests per minute per token** | Plenty for human use; would only hit this with a runaway agent |

---

## Security and etiquette

**Your token = your identity.**

Every action you take via the MCP is logged with your token's name (e.g., `Sarah (analyst)`). If your token leaks, an attacker has the same powers you do — read everything, write some things. So:

- ✅ Store your token in **1Password** (or another vetted password manager). Never email, Slack, or message it.
- ✅ Tell Austin **immediately** if you suspect your token leaked — he can revoke it in 1 second.
- ✅ Your token has an **expiration date** (typically 90 days for human users). Austin will renew it as it approaches.
- ❌ Don't paste your token into Claude conversations. It's already in your client config; Claude doesn't need to "see" it again.
- ❌ Don't share your token with other coworkers. Ask Austin to mint each person their own.

**Before you confirm a write:**

Tools that change data (`update_*`, `create_*`, `add_*`) execute immediately when Claude calls them. There's no preview. So when you ask Claude to do something with a write impact:

1. **Be specific about the row.** "Update the Acme deal" → which Acme deal if there are two? Be clearer: "Update the Acme Industrial deal on Highland St — the one I created last week."
2. **Verify Claude found the right row before confirming the write.** Claude should tell you "found deal #X with name Y — should I update it?" If it just charges ahead, stop it and ask it to confirm.
3. **For high-stakes changes (deal status flips, rent changes, lease end dates), double-check the change in the app immediately after.** Realtime sync means it'll show up within ~1 second.

**Sensitive data hygiene:**

Our database contains:
- Tenant names (PII, occasionally NDA)
- Dollar amounts (commercially sensitive)
- Broker contacts (PII)
- Comp data (some under NDA)

When you use Claude with the MCP:
- Don't paste extracted data into other AI services
- Don't screenshot tool results to public channels
- Don't ask Claude to "send this to my personal email" — the MCP doesn't have an email tool, but if a future tool exists, be deliberate about destinations

---

## Troubleshooting

### "Tool requires role 'admin'; this token has role 'read'"
Your token doesn't have the permission level needed for that tool. `list_*` / `find_*` / `search` work with any role; `create_*` / `update_*` / `add_*` need `write` or `admin`. Ask Austin to upgrade your token's role if you need to make changes.

### "Missing Authorization header" / "Unknown token"
Either your token isn't being sent (check your client config) or the token in your config doesn't match what's in our database. Verify with `claude mcp list` (Claude Code) or by checking the config file (Desktop). If the token was rotated, ask Austin for the new one.

### "Token expired at ..."
Your 90-day expiry was reached. Ask Austin to mint a new token.

### "Token has been revoked"
Austin revoked the token (probably because it leaked, or because you left/changed roles). Ask Austin if you should have access.

### "Rate limit exceeded: 60 requests/minute"
You (or an agent acting as you) hit the per-minute cap. Wait 60 seconds and try again. If you hit this regularly, something's making excess requests — check for runaway agents or stuck retries.

### "Tools never appear in chat after restart"
For Desktop: the `mcp-remote` bridge sometimes takes 10-15 seconds to spin up the first time. Wait a bit and try opening the tools menu again. If it still doesn't appear, check the Desktop logs (Settings → Developer → Open Logs Folder) for `mcp-remote` errors.

### "Connection failed" / "Connector unavailable"
Could be the MCP server itself is down. Check status at `https://leasing-tracker-psi.vercel.app/api/mcp` — if you get any JSON response (even an error), the server is alive. If you get a 5xx or no response, ping Austin.

---

## Asking for help

When you're stuck, ping Austin in the team chat with:

1. **What you tried** (the prompt you used)
2. **What you expected** (e.g., "expected a list of deals")
3. **What happened** (the error message or unexpected output, full text — screenshots help)
4. **Which Claude surface** (Code, Desktop, Web)

Faster fixes for him = faster unblock for you.

---

## Glossary

| Term | Meaning |
|---|---|
| **MCP** | Model Context Protocol — Anthropic's open standard for letting Claude call external tools (e.g., our database) |
| **MCP server** | The deployed code at `leasing-tracker-psi.vercel.app/api/mcp` that exposes the 19 tools to Claude |
| **Tool** | One named function the MCP server exposes — like `list_deals` or `portfolio_summary` |
| **Bearer token** | Your secret authentication credential. Format: `Bearer <48-hex-chars>` |
| **Endpoint / URL** | The address of the MCP server: `https://leasing-tracker-psi.vercel.app/api/mcp` |
| **JSON-RPC** | The wire protocol MCP uses underneath. You won't see this directly — Claude handles it |
| **Role** | The permission level your token has: `read` (look only), `write` (create + update), `admin` (everything + future destructive ops) |
| **Realtime** | Supabase's live-sync feature. When the MCP writes a change, it appears in the web app within ~1 second |
| **Connector** | claude.ai's term for an MCP server registration in the web UI |
| **Custom Connector** | claude.ai's Team/Enterprise feature for registering custom MCP servers (OAuth only — not supported by our MCP today) |
| **mcp-remote** | A bridge tool that converts our HTTP MCP into a local stdio MCP, used for Claude Desktop |
| **OAuth** | An auth protocol that uses login flows + tokens. claude.ai web requires it; our server uses simpler Bearer tokens (works with Code + Desktop) |

---

## Quick-reference card

```
MCP endpoint:       https://leasing-tracker-psi.vercel.app/api/mcp
Auth:               Bearer token in Authorization header (get from Austin)
Rate limit:         60 requests/min per token
Token rotation:     ~90 days (Austin will remind you)
Tools available:    19 (see "What it can do" above)
Source code:        github.com/aanfinson00/Leasing-Tracker (mcp/ folder)
Help:               ping Austin in team chat with prompt + error + screenshot
```

Happy querying.
