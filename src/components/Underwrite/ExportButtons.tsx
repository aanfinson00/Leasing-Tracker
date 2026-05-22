// Excel + PDF export buttons for the A vs B underwriting comparison.
// Both use dynamic imports for code-splitting — exceljs (~1MB) and
// @react-pdf/renderer (~1MB) only land in the user's bundle when they
// click the corresponding button.
//
// Ported from Lease-Calculator/components/excel/export-button.tsx and
// .../pdf/export-button.tsx. Differences: props instead of Zustand,
// Leasing-Tracker's button styling, and a shared toast helper passed
// in from the parent.

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { runScenario } from '../../lib/lease-math/calc';
import type {
  Globals,
  ScenarioInputs,
} from '../../lib/lease-math/types';

interface ExportProps {
  propertyName: string;
  aName: string;
  aInputs: ScenarioInputs;
  bName: string;
  bInputs: ScenarioInputs;
  globals: Globals;
  onToast: (msg: string) => void;
}

const BTN_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ' +
  'text-fg bg-bg-elevated border border-border rounded-lg ' +
  'hover:bg-bg-hover transition-colors shadow-soft ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

function makeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportExcelButton(props: ExportProps) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      const { buildWorkbook } = await import('../../lib/lease-export/buildWorkbook');
      const buf = await buildWorkbook({
        propertyName: props.propertyName,
        aName: props.aName,
        aInputs: props.aInputs,
        bName: props.bName,
        bInputs: props.bInputs,
        globals: props.globals,
      });
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const slug = makeSlug(props.propertyName || 'underwrite') || 'underwrite';
      const date = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `${slug}-comparison-${date}.xlsx`);
      props.onToast('Excel downloaded');
    } catch (e) {
      console.error('Excel export failed:', e);
      props.onToast(`Excel export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={handle} disabled={busy} className={BTN_CLASS}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} strokeWidth={2} />}
      {busy ? 'Generating…' : 'Excel'}
    </button>
  );
}

export function ExportPdfButton(props: ExportProps) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      const [{ pdf }, { ComparisonDoc }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../lib/lease-export/ComparisonDoc'),
      ]);
      const aResults = runScenario(props.aInputs, props.globals);
      const bResults = runScenario(props.bInputs, props.globals);
      const blob = await pdf(
        <ComparisonDoc
          propertyName={props.propertyName}
          aName={props.aName}
          aInputs={props.aInputs}
          aResults={aResults}
          bName={props.bName}
          bInputs={props.bInputs}
          bResults={bResults}
          globals={props.globals}
        />
      ).toBlob();
      const slug = makeSlug(props.propertyName || 'underwrite') || 'underwrite';
      const date = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `${slug}-comparison-${date}.pdf`);
      props.onToast('PDF downloaded');
    } catch (e) {
      console.error('PDF export failed:', e);
      props.onToast(`PDF export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={handle} disabled={busy} className={BTN_CLASS}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} strokeWidth={2} />}
      {busy ? 'Generating…' : 'PDF'}
    </button>
  );
}
