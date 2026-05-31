// =============================================================================
// generate-mcp-guide-pdf.tsx
//
// Generates the Parce-branded "Leasing Tracker MCP — User Guide" PDF for
// coworker onboarding. Uses @react-pdf/renderer (already a project dep).
//
// Run:   npx tsx scripts/generate-mcp-guide-pdf.tsx
// Out:   ~/Library/Mobile Documents/com~apple~CloudDocs/Claude/leasing-tracker-mcp-guide.pdf
//
// Why Helvetica instead of Outfit: @react-pdf/renderer's bundled font keeps
// the script dependency-free (no Google Fonts fetch / network at build).
// The Parce brand comes through via copper accents, generous whitespace,
// and the playbook layout idiom. If we ever want Outfit, register here via
// Font.register({ family: 'Outfit', fonts: [{ src: <url>, fontWeight: 400 }, ...] }).
// =============================================================================

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Path,
  Polygon,
  G,
  renderToFile,
  Text as PDFText,
  Svg as PDFSvg,
} from '@react-pdf/renderer';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

// ─────────────────────────────────────────────────────────────────────────────
// Parce brand
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  copper: '#d4895a',
  copperDeep: '#b87040',
  copperLight: '#e8a87a',
  copperGlow: 'rgba(212,137,90,0.12)',
  warmBlack: '#1c1917',
  nearBlack: '#18181b',
  warmWhite: '#f5f0eb',
  white: '#ffffff',
  cardDark: '#27272a',
  muted: '#a8a29e',
  stone500: '#78716c',
  stone400: '#a8a29e',
  stone300: '#d6d3d1',
  stone200: '#e7e5e4',
  stone100: '#f5f5f4',
  border: '#e7e0d8',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.warmWhite,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.nearBlack,
    lineHeight: 1.5,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 60,
    textAlign: 'right',
    fontSize: 8,
    color: C.stone500,
  },
  brandMark: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    fontSize: 8,
    color: C.stone500,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  copperBar: {
    height: 3,
    backgroundColor: C.copper,
    marginBottom: 24,
    width: 40,
  },
  // Cover
  coverPage: {
    backgroundColor: C.warmBlack,
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: 'Helvetica',
    color: C.warmWhite,
  },
  coverLogo: {
    fontSize: 36,
    fontFamily: 'Helvetica',
    fontWeight: 300,
    color: C.copper,
    letterSpacing: 4,
    marginBottom: 80,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: C.warmWhite,
    marginBottom: 14,
    lineHeight: 1.1,
  },
  coverSubtitle: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 40,
    fontWeight: 300,
  },
  coverMeta: {
    fontSize: 9,
    color: C.stone500,
    marginTop: 200,
    letterSpacing: 1.5,
  },
  // Headings
  h1: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.warmBlack,
    marginBottom: 8,
    marginTop: 0,
  },
  h2: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.warmBlack,
    marginTop: 22,
    marginBottom: 8,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.copperDeep,
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  // Body
  p: { marginBottom: 8, color: C.warmBlack },
  pMuted: { marginBottom: 8, color: C.stone500, fontSize: 9 },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletDot: {
    color: C.copper,
    marginRight: 6,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    flex: 1,
    color: C.warmBlack,
  },
  // Inline code
  code: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: C.copperDeep,
    backgroundColor: C.copperGlow,
    paddingHorizontal: 3,
  },
  // Code block
  codeBlock: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: C.warmWhite,
    backgroundColor: C.warmBlack,
    padding: 12,
    marginVertical: 8,
    borderRadius: 4,
    lineHeight: 1.5,
  },
  // Callout box
  callout: {
    backgroundColor: C.copperGlow,
    borderLeftWidth: 3,
    borderLeftColor: C.copper,
    padding: 12,
    marginVertical: 12,
  },
  // Table
  table: {
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 6,
  },
  tableRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: C.copper,
    paddingVertical: 6,
    backgroundColor: C.copperGlow,
  },
  tableCell: {
    paddingHorizontal: 6,
    fontSize: 9,
  },
  tableCellHeader: {
    paddingHorizontal: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.copperDeep,
  },
  // Two-column section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  sectionNumber: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.copper,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.warmBlack,
  },
  // Caption
  diagramCaption: {
    fontSize: 8,
    color: C.stone500,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Reusable building blocks
// ─────────────────────────────────────────────────────────────────────────────

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={s.bullet}>
    <Text style={s.bulletDot}>•</Text>
    <Text style={s.bulletText}>{children}</Text>
  </View>
);

const Inline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={s.code}>{children}</Text>
);

const PageFooter: React.FC<{ n: number }> = ({ n }) => (
  <>
    <Text style={s.brandMark}>PARCE / LEASING TRACKER MCP GUIDE</Text>
    <Text style={s.pageNumber}>{n}</Text>
  </>
);

const Section: React.FC<{ num: string; title: string }> = ({ num, title }) => (
  <>
    <View style={s.sectionHeader}>
      <Text style={s.sectionNumber}>{num}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    <View style={s.copperBar} />
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Diagrams (hand-authored SVG)
// ─────────────────────────────────────────────────────────────────────────────

const DiagramToolCall = () => (
  <View style={{ marginVertical: 16, alignItems: 'center' }}>
    <Svg width="450" height="180" viewBox="0 0 450 180">
      {/* 5 boxes in sequence */}
      {[
        { x: 0, label: 'You', sub: 'asks a question' },
        { x: 95, label: 'Claude', sub: 'picks a tool' },
        { x: 190, label: 'MCP Server', sub: 'on Vercel' },
        { x: 285, label: 'Supabase', sub: 'reads / writes' },
        { x: 380, label: 'Back to you', sub: 'answer + data' },
      ].map((box, i) => (
        <G key={i}>
          <Rect
            x={box.x}
            y={40}
            width={70}
            height={50}
            rx={6}
            fill={i === 2 ? C.copper : C.warmBlack}
            stroke={C.copperDeep}
            strokeWidth={1}
          />
          <PDFText
            x={box.x + 35}
            y={60}
            style={{ fontSize: 9, fill: C.warmWhite, textAlign: 'center', fontFamily: 'Helvetica-Bold' }}
          >
            {box.label}
          </PDFText>
          <PDFText
            x={box.x + 35}
            y={76}
            style={{ fontSize: 7, fill: C.muted, textAlign: 'center' }}
          >
            {box.sub}
          </PDFText>
          {/* Arrow to next */}
          {i < 4 && (
            <G>
              <Line
                x1={box.x + 70}
                y1={65}
                x2={box.x + 90}
                y2={65}
                stroke={C.copper}
                strokeWidth={1.5}
              />
              <Polygon
                points={`${box.x + 88},62 ${box.x + 93},65 ${box.x + 88},68`}
                fill={C.copper}
              />
            </G>
          )}
        </G>
      ))}

      {/* Bottom labels — protocol details */}
      <PDFText x={47} y={120} style={{ fontSize: 7, fill: C.stone500, textAlign: 'center' }}>
        natural language
      </PDFText>
      <PDFText x={142} y={120} style={{ fontSize: 7, fill: C.stone500, textAlign: 'center' }}>
        HTTPS + Bearer
      </PDFText>
      <PDFText x={237} y={120} style={{ fontSize: 7, fill: C.stone500, textAlign: 'center' }}>
        SQL (RLS bypass)
      </PDFText>
      <PDFText x={332} y={120} style={{ fontSize: 7, fill: C.stone500, textAlign: 'center' }}>
        JSON-RPC response
      </PDFText>
      <PDFText x={427} y={120} style={{ fontSize: 7, fill: C.stone500, textAlign: 'center' }}>
        rendered text
      </PDFText>

      {/* Step time annotation */}
      <PDFText x={225} y={155} style={{ fontSize: 7, fill: C.copperDeep, textAlign: 'center', fontFamily: 'Helvetica-Bold' }}>
        Typical end-to-end latency: 1–3 seconds
      </PDFText>
    </Svg>
    <Text style={s.diagramCaption}>How a single tool call flows under the hood.</Text>
  </View>
);

const DiagramToolGuide = () => {
  // Tool selection by intent
  const rows = [
    { intent: 'Find a deal by name / tenant / broker', tool: 'list_deals', role: 'read' },
    { intent: 'Get a portfolio rollup (NRA, occupancy, exp.)', tool: 'portfolio_summary', role: 'read' },
    { intent: 'Search across all entities by name', tool: 'search', role: 'read' },
    { intent: 'See current tenants / vacant spaces', tool: 'list_tenants', role: 'read' },
    { intent: 'See full rent-roll with filters', tool: 'list_rent_roll', role: 'read' },
    { intent: 'List buildings on a project', tool: 'list_buildings', role: 'read' },
    { intent: 'Pull lease comps for benchmarking', tool: 'list_lease_comps', role: 'read' },
    { intent: 'Pull sales comps for cap-rate research', tool: 'list_sales_comps', role: 'read' },
    { intent: 'See active development projects', tool: 'list_dev_projects', role: 'read' },
    { intent: 'See acquisition pipeline', tool: 'list_acquisitions', role: 'read' },
    { intent: 'See disposition pipeline', tool: 'list_dispositions', role: 'read' },
    { intent: 'Look up a person (broker / attorney / vendor)', tool: 'find_contact', role: 'read' },
    { intent: 'Spawn a new prospect deal', tool: 'create_deal', role: 'write' },
    { intent: 'Update a deal (rent, term, status, etc.)', tool: 'update_deal', role: 'write' },
    { intent: 'Log a call / meeting / note to a deal', tool: 'add_activity_to_deal', role: 'write' },
    { intent: 'Patch a tenant / lease row', tool: 'update_tenant', role: 'write' },
    { intent: 'Patch a specific rent-roll row (lease end, TI, etc.)', tool: 'update_rent_roll_row', role: 'write' },
    { intent: 'Log a dev project update', tool: 'add_dev_project_note', role: 'write' },
    { intent: 'Add a new contact', tool: 'create_contact', role: 'write' },
  ];
  return (
    <View style={{ marginVertical: 8 }}>
      <View style={s.tableRowHeader}>
        <Text style={[s.tableCellHeader, { width: '60%' }]}>I want to…</Text>
        <Text style={[s.tableCellHeader, { width: '30%' }]}>Tool</Text>
        <Text style={[s.tableCellHeader, { width: '10%' }]}>Role</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[
            s.tableRow,
            i % 2 === 0 ? { backgroundColor: C.white } : { backgroundColor: 'transparent' },
          ]}
        >
          <Text style={[s.tableCell, { width: '60%' }]}>{r.intent}</Text>
          <Text style={[s.tableCell, { width: '30%', fontFamily: 'Courier', color: C.copperDeep }]}>
            {r.tool}
          </Text>
          <Text
            style={[
              s.tableCell,
              {
                width: '10%',
                color: r.role === 'write' ? C.copperDeep : C.stone500,
                fontFamily: r.role === 'write' ? 'Helvetica-Bold' : 'Helvetica',
              },
            ]}
          >
            {r.role}
          </Text>
        </View>
      ))}
    </View>
  );
};

const DiagramTokenLifecycle = () => (
  <View style={{ marginVertical: 16, alignItems: 'center' }}>
    <Svg width="460" height="220" viewBox="0 0 460 220">
      {[
        { x: 10, y: 30, label: 'Austin mints token', sub: 'via Supabase SQL' },
        { x: 130, y: 30, label: '1Password', sub: 'shared securely' },
        { x: 250, y: 30, label: 'You add to client', sub: 'Claude config' },
        { x: 370, y: 30, label: 'Claude uses it', sub: 'on every call' },
        { x: 130, y: 130, label: '~90 days later', sub: 'expires' },
        { x: 250, y: 130, label: 'Austin re-mints', sub: 'new token issued' },
        { x: 370, y: 130, label: 'You update config', sub: 'cycle resets' },
      ].map((box, i) => (
        <G key={i}>
          <Rect
            x={box.x}
            y={box.y}
            width={80}
            height={56}
            rx={6}
            fill={i < 4 ? C.warmBlack : C.copper}
            stroke={C.copperDeep}
            strokeWidth={1}
          />
          <PDFText
            x={box.x + 40}
            y={box.y + 22}
            style={{ fontSize: 8, fill: C.warmWhite, textAlign: 'center', fontFamily: 'Helvetica-Bold' }}
          >
            {box.label}
          </PDFText>
          <PDFText
            x={box.x + 40}
            y={box.y + 40}
            style={{ fontSize: 6.5, fill: i < 4 ? C.muted : C.warmWhite, textAlign: 'center' }}
          >
            {box.sub}
          </PDFText>
        </G>
      ))}
      {/* Arrows top row */}
      {[0, 1, 2].map((i) => (
        <G key={`arrow-top-${i}`}>
          <Line
            x1={10 + i * 120 + 80}
            y1={58}
            x2={10 + (i + 1) * 120}
            y2={58}
            stroke={C.copper}
            strokeWidth={1.5}
          />
          <Polygon
            points={`${10 + (i + 1) * 120 - 5},55 ${10 + (i + 1) * 120 - 1},58 ${10 + (i + 1) * 120 - 5},61`}
            fill={C.copper}
          />
        </G>
      ))}
      {/* Vertical arrow down right side */}
      <Line x1={410} y1={86} x2={410} y2={130} stroke={C.copper} strokeWidth={1.5} />
      <Polygon points={`407,128 410,133 413,128`} fill={C.copper} />
      {/* Bottom row arrows (right to left) */}
      {[0, 1].map((i) => (
        <G key={`arrow-bot-${i}`}>
          <Line
            x1={370 - i * 120}
            y1={158}
            x2={290 - i * 120}
            y2={158}
            stroke={C.copper}
            strokeWidth={1.5}
          />
          <Polygon
            points={`${293 - i * 120},155 ${288 - i * 120},158 ${293 - i * 120},161`}
            fill={C.copper}
          />
        </G>
      ))}
      {/* Loop-back arrow from bottom-left up to top-left */}
      <Path
        d={`M 130 130 L 50 130 L 50 60 L 90 60`}
        stroke={C.copperLight}
        strokeWidth={1}
        fill="none"
        strokeDasharray="3,3"
      />
      <Polygon points={`88,57 92,60 88,63`} fill={C.copperLight} />
    </Svg>
    <Text style={s.diagramCaption}>
      Token lifecycle. Solid arrows = active flow; dashed = the loop back to a fresh cycle.
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Pages
// ─────────────────────────────────────────────────────────────────────────────

const Cover = () => (
  <Page size="A4" style={s.coverPage}>
    <Text style={s.coverLogo}>PARCE</Text>
    <View style={[s.copperBar, { width: 60, marginBottom: 30 }]} />
    <Text style={s.coverTitle}>Leasing Tracker MCP</Text>
    <Text style={s.coverTitle}>User Guide</Text>
    <Text style={s.coverSubtitle}>
      Connecting Claude to live Parce data — for analysts, brokers, and asset
      managers who want to query, update, and reason over our CRE database
      through any Claude surface.
    </Text>
    <Text style={s.coverMeta}>VERSION 1.0  ·  MAY 2026  ·  INTERNAL ONLY</Text>
  </Page>
);

const PageOne = () => (
  <Page size="A4" style={s.page}>
    <Section num="1" title="What this is" />
    <Text style={s.p}>
      The Leasing Tracker MCP is a bridge between Claude and our Leasing-Tracker
      database. When you talk to Claude about deals, tenants, rent rolls, or any
      other CRE data we track in Supabase, Claude can read from and write to the
      database directly — through a set of structured tools we've defined.
    </Text>

    <View style={s.callout}>
      <Text style={[s.p, { marginBottom: 0 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', color: C.copperDeep }}>
          Without the MCP:
        </Text>{' '}
        Claude has no access to our data. It can chat, but it can't query.
      </Text>
      <Text style={[s.p, { marginBottom: 0, marginTop: 6 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', color: C.copperDeep }}>
          With the MCP:
        </Text>{' '}
        You say "pull me LOI deals" and Claude reads them live, in seconds.
      </Text>
    </View>

    <Text style={s.h2}>Works in every Claude surface</Text>
    <Bullet>
      <Text style={{ fontFamily: 'Helvetica-Bold' }}>Claude Code</Text> (CLI / IDE
      extensions) — full support, one command to register.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: 'Helvetica-Bold' }}>Claude Desktop</Text>{' '}
      (Mac/Windows app) — full support via config file.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: 'Helvetica-Bold' }}>iMessage</Text> (mobile) — via
      a shared phone-channel session, if you've been added.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: 'Helvetica-Bold' }}>Claude.ai web</Text> — not
      currently supported (needs OAuth, on the roadmap).
    </Bullet>

    <Text style={s.h2}>How a tool call flows</Text>
    <Text style={s.p}>
      When you ask Claude a question that needs data, here's what actually happens
      behind the scenes:
    </Text>
    <DiagramToolCall />

    <PageFooter n={2} />
  </Page>
);

const PageQuickStart = () => (
  <Page size="A4" style={s.page}>
    <Section num="2" title="Quick start" />
    <Text style={s.p}>Five minutes from zero to your first query.</Text>

    <Text style={s.h2}>Step 1 — Get your bearer token from Austin</Text>
    <Text style={s.p}>
      Ping Austin in team chat asking for MCP access. He'll send you a token via
      1Password (or another secure secrets manager). It looks like:
    </Text>
    <View style={s.codeBlock}>
      <Text>Bearer 4a13371ca9847f2bfa340952c868a2be7ff99d9a1f3bb6e8</Text>
    </View>

    <View style={s.callout}>
      <Text style={[s.p, { marginBottom: 0 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', color: C.copperDeep }}>
          Treat your token like a password.
        </Text>{' '}
        Don't paste it into email, Slack, or other AI services. Only into your
        Claude client config.
      </Text>
    </View>

    <Text style={s.h2}>Step 2 — Add to your Claude client</Text>
    <Text style={s.h3}>If you use Claude Code (CLI)</Text>
    <View style={s.codeBlock}>
      <Text>
        {`claude mcp add leasing-tracker \\\n  https://leasing-tracker-psi.vercel.app/api/mcp \\\n  --transport http \\\n  --scope user \\\n  --header "Authorization: Bearer YOUR_TOKEN_HERE"`}
      </Text>
    </View>
    <Text style={s.p}>
      Verify with <Inline>claude mcp list</Inline>. Should show{' '}
      <Inline>leasing-tracker (HTTP) - ✓ Connected</Inline>.
    </Text>

    <Text style={s.h3}>If you use Claude Desktop</Text>
    <Text style={s.p}>
      Edit the file at{' '}
      <Inline>~/Library/Application Support/Claude/claude_desktop_config.json</Inline>{' '}
      (Mac) or <Inline>%APPDATA%/Claude/claude_desktop_config.json</Inline>{' '}
      (Windows). Add the entry below alongside any existing keys, then fully quit
      and reopen Claude Desktop:
    </Text>
    <View style={s.codeBlock}>
      <Text>{`{
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
}`}</Text>
    </View>

    <Text style={s.h2}>Step 3 — Try a test prompt</Text>
    <Text style={s.p}>Open a fresh conversation and try:</Text>
    <View style={s.callout}>
      <Text style={[s.p, { marginBottom: 0, fontStyle: 'italic' }]}>
        "Pull a portfolio summary from the leasing-tracker MCP."
      </Text>
    </View>
    <Text style={s.p}>
      If it works, you'll see a JSON-formatted breakdown of deal counts, occupancy
      %, weighted-average rent, and lease expirations in the next 12 months.
    </Text>

    <PageFooter n={3} />
  </Page>
);

const PageToolGuide = () => (
  <Page size="A4" style={s.page}>
    <Section num="3" title="Tool selection guide" />
    <Text style={s.p}>
      19 tools total. You don't need to memorize them — Claude picks the right
      one based on what you ask. This table is for orientation.
    </Text>
    <DiagramToolGuide />

    <Text style={s.h2}>Role tiers explained</Text>
    <Bullet>
      <Inline>read</Inline> tokens can call all <Inline>list_*</Inline>,{' '}
      <Inline>find_*</Inline>, and <Inline>search</Inline> tools. View-only.
    </Bullet>
    <Bullet>
      <Inline>write</Inline> tokens can additionally call all{' '}
      <Inline>create_*</Inline>, <Inline>update_*</Inline>, and{' '}
      <Inline>add_*</Inline> tools. Most users get this.
    </Bullet>
    <Bullet>
      <Inline>admin</Inline> is reserved for future destructive operations. Not
      generally needed.
    </Bullet>

    <PageFooter n={4} />
  </Page>
);

const PageExamplePrompts = () => (
  <Page size="A4" style={s.page}>
    <Section num="4" title="Example prompts" />
    <Text style={s.p}>
      Real prompts you can paste. Adjust deal/tenant names as needed.
    </Text>

    <Text style={s.h3}>Pipeline questions</Text>
    <Bullet>"Show me deals in LOI Negotiations."</Bullet>
    <Bullet>"What's our active pipeline look like by status?"</Bullet>
    <Bullet>"Find any deals mentioning Caliber."</Bullet>

    <Text style={s.h3}>Rent roll / tenant questions</Text>
    <Bullet>"What leases are expiring in the next 90 days?"</Bullet>
    <Bullet>
      "Show me the Smoky Bean lease — what's the TI and how much term is left?"
    </Bullet>
    <Bullet>"Pull the rent roll for project 5001."</Bullet>

    <Text style={s.h3}>Portfolio rollup</Text>
    <Bullet>"Give me a one-screen portfolio summary."</Bullet>
    <Bullet>"How much vacant SF do we have right now?"</Bullet>

    <Text style={s.h3}>Updates (writes — be specific)</Text>
    <Bullet>
      "Add a note to the Acme deal: discussed renewal terms, they want 10%
      more TI."
    </Bullet>
    <Bullet>"Update the Caliber lease end date to 2028-12-31."</Bullet>
    <Bullet>"Bump the target rent on deal X to $32/SF."</Bullet>

    <Text style={s.h3}>Comp lookups</Text>
    <Bullet>
      "Show me lease comps in Charlotte over 50k SF signed since January."
    </Bullet>
    <Bullet>"What sales comps do we have for office in Atlanta this year?"</Bullet>

    <Text style={s.h3}>Multi-step / agentic</Text>
    <Bullet>
      "Find the Acme deal, then list all rent-roll rows for its building, then
      summarize."
    </Bullet>
    <Bullet>
      "Pull my morning brief: top 5 deals to follow up on, expiring leases in
      the next 30 days, and any dev projects in Construction phase."
    </Bullet>

    <View style={s.callout}>
      <Text style={[s.p, { marginBottom: 0 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', color: C.copperDeep }}>
          Tip:
        </Text>{' '}
        Don't worry about tool names. Describe what you want; Claude figures out
        which tool to call.
      </Text>
    </View>

    <PageFooter n={5} />
  </Page>
);

const PageSecurity = () => (
  <Page size="A4" style={s.page}>
    <Section num="5" title="Security & etiquette" />

    <Text style={s.h2}>Your token = your identity</Text>
    <Text style={s.p}>
      Every action you take via the MCP is logged with your token's name. If your
      token leaks, an attacker has the same powers you do — read everything, write
      some things.
    </Text>
    <Bullet>
      <Text style={{ fontFamily: 'Helvetica-Bold' }}>Store</Text> your token in
      1Password (or another vetted password manager). Never email or Slack it.
    </Bullet>
    <Bullet>
      <Text style={{ fontFamily: 'Helvetica-Bold' }}>Report leaks immediately</Text>{' '}
      to Austin. He can revoke a token in one SQL statement.
    </Bullet>
    <Bullet>
      Tokens <Text style={{ fontFamily: 'Helvetica-Bold' }}>expire on a 90-day
      cycle</Text> by default. Austin will renew before your token dies.
    </Bullet>
    <Bullet>
      Don't share your token with coworkers. Ask Austin to mint each person their
      own — the audit trail per person matters.
    </Bullet>

    <Text style={s.h2}>Token lifecycle</Text>
    <DiagramTokenLifecycle />

    <Text style={s.h2}>Before you confirm a write</Text>
    <Text style={s.p}>
      Tools that change data execute immediately when Claude calls them. There's
      no preview. So when you ask Claude to do something with a write impact:
    </Text>
    <Bullet>
      Be specific about the row. "Update the Acme deal" → which Acme? Better:
      "Update the Acme Industrial deal on Highland St I created last week."
    </Bullet>
    <Bullet>
      Verify Claude found the right row before confirming. If it just charges
      ahead without confirming, stop it.
    </Bullet>
    <Bullet>
      For high-stakes changes (status flips, rent changes, lease end dates),
      double-check in the app immediately after. Realtime sync = under 1 second.
    </Bullet>

    <Text style={s.h2}>Sensitive data hygiene</Text>
    <Text style={s.p}>
      Our database contains tenant PII, dollar amounts, NDA-restricted comps. When
      using the MCP:
    </Text>
    <Bullet>Don't paste extracted data into other AI services.</Bullet>
    <Bullet>Don't screenshot tool results to public channels.</Bullet>
    <Bullet>
      Don't ask Claude to "send this to my personal email" — be deliberate about
      destinations.
    </Bullet>

    <PageFooter n={6} />
  </Page>
);

const PageTroubleshooting = () => (
  <Page size="A4" style={s.page}>
    <Section num="6" title="Troubleshooting" />

    <Text style={s.h3}>"Tool requires role 'admin'; this token has role 'read'"</Text>
    <Text style={s.p}>
      Your token doesn't have permission for that tool. Ask Austin to upgrade your
      token's role.
    </Text>

    <Text style={s.h3}>"Missing Authorization header" / "Unknown token"</Text>
    <Text style={s.p}>
      Token isn't being sent, or doesn't match what's in our DB. Verify with{' '}
      <Inline>claude mcp list</Inline> (Code) or check the config file (Desktop).
    </Text>

    <Text style={s.h3}>"Token expired at …"</Text>
    <Text style={s.p}>Your 90-day expiry hit. Ask Austin for a fresh token.</Text>

    <Text style={s.h3}>"Token has been revoked"</Text>
    <Text style={s.p}>
      Austin revoked it (leaked, role changed, etc.). Ping him if you should still
      have access.
    </Text>

    <Text style={s.h3}>"Rate limit exceeded: 60 requests/minute"</Text>
    <Text style={s.p}>
      Per-token cap. Wait 60 sec. If you hit this regularly, something's looping —
      check for runaway agents.
    </Text>

    <Text style={s.h3}>"Tools never appear in chat after restart"</Text>
    <Text style={s.p}>
      For Desktop: the <Inline>mcp-remote</Inline> bridge takes 10-15 seconds to
      spin up first time. Wait, then check the tools menu. If still missing, check
      Desktop logs (Settings → Developer → Open Logs Folder) for{' '}
      <Inline>mcp-remote</Inline> errors.
    </Text>

    <Text style={s.h3}>"Connection failed" / generic connector errors</Text>
    <Text style={s.p}>
      Try hitting <Inline>https://leasing-tracker-psi.vercel.app/api/mcp</Inline>{' '}
      in your browser. If you get any JSON response, the server is alive. If you
      get a 5xx or no response, ping Austin.
    </Text>

    <Text style={s.h2}>Asking for help</Text>
    <Text style={s.p}>When you're stuck, ping Austin with:</Text>
    <Bullet>The prompt you used</Bullet>
    <Bullet>What you expected to happen</Bullet>
    <Bullet>What actually happened (full error text — screenshots help)</Bullet>
    <Bullet>Which Claude surface (Code, Desktop, mobile)</Bullet>

    <PageFooter n={7} />
  </Page>
);

const PageGlossary = () => (
  <Page size="A4" style={s.page}>
    <Section num="7" title="Glossary & quick reference" />

    <View style={s.table}>
      <View style={s.tableRowHeader}>
        <Text style={[s.tableCellHeader, { width: '25%' }]}>Term</Text>
        <Text style={[s.tableCellHeader, { width: '75%' }]}>Meaning</Text>
      </View>
      {[
        ['MCP', "Anthropic's open standard for letting Claude call external tools (e.g., our database)."],
        ['MCP server', 'Deployed code at leasing-tracker-psi.vercel.app/api/mcp that exposes the 19 tools.'],
        ['Tool', 'One named function the MCP exposes (e.g., list_deals, portfolio_summary).'],
        ['Bearer token', 'Your secret authentication credential. Format: Bearer <48-hex-chars>.'],
        ['Endpoint', 'The address of the MCP server (the Vercel URL above).'],
        ['JSON-RPC', 'The wire protocol MCP uses underneath. Claude handles it for you.'],
        ['Role', 'Permission level your token has: read / write / admin.'],
        ['Realtime', "Supabase's live-sync feature. MCP writes appear in the web app within 1 second."],
        ['Connector', "claude.ai's term for an MCP server registration."],
        ['mcp-remote', 'Bridge tool that converts our HTTP MCP into local stdio (used for Claude Desktop).'],
        ['OAuth', 'An auth protocol with login flows. claude.ai web requires it; our server uses Bearer.'],
      ].map(([term, meaning], i) => (
        <View key={i} style={s.tableRow}>
          <Text style={[s.tableCell, { width: '25%', fontFamily: 'Helvetica-Bold', color: C.copperDeep }]}>
            {term}
          </Text>
          <Text style={[s.tableCell, { width: '75%' }]}>{meaning}</Text>
        </View>
      ))}
    </View>

    <Text style={s.h2}>Quick reference card</Text>
    <View style={s.codeBlock}>
      <Text>
        {`MCP endpoint:       https://leasing-tracker-psi.vercel.app/api/mcp
Auth:               Bearer token in Authorization header (from Austin)
Rate limit:         60 requests/min per token
Token rotation:     ~90 days (Austin will remind you)
Tools available:    19 (see Section 3 table)
Source code:        github.com/aanfinson00/Leasing-Tracker (mcp/ folder)
Help:               ping Austin in team chat with prompt + error + screenshot`}
      </Text>
    </View>

    <View style={{ marginTop: 40, alignItems: 'center' }}>
      <View style={[s.copperBar, { width: 80 }]} />
      <Text style={{ fontSize: 10, color: C.stone500, marginTop: 6 }}>Happy querying.</Text>
      <Text style={{ fontSize: 8, color: C.stone500, marginTop: 20, letterSpacing: 1.5 }}>
        PARCE  ·  LEASING TRACKER  ·  MCP USER GUIDE v1.0
      </Text>
    </View>

    <PageFooter n={8} />
  </Page>
);

const Doc = () => (
  <Document
    title="Leasing Tracker MCP — User Guide"
    author="Parce"
    subject="Coworker onboarding for the Leasing Tracker MCP server"
  >
    <Cover />
    <PageOne />
    <PageQuickStart />
    <PageToolGuide />
    <PageExamplePrompts />
    <PageSecurity />
    <PageTroubleshooting />
    <PageGlossary />
  </Document>
);

// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────
const OUT = resolve(
  homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Claude/leasing-tracker-mcp-guide.pdf'
);

await renderToFile(<Doc />, OUT);
console.log(`Wrote PDF → ${OUT}`);
