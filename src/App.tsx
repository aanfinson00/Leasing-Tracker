import { useState, useRef, useEffect, useMemo } from 'react';
import { FilePlus, Sparkles, FolderOpen, Download, Plus, FileSpreadsheet, Link2, Check, X } from 'lucide-react';
import type { Deal, RentRollRow } from './types';
import { defaultDeal, defaultRentRollRow } from './types';
import { loadFromFile, saveToFile } from './lib/excel';
import { saveSnapshot, loadSnapshot, clearSnapshot } from './lib/autosave';
import { encodeShare, decodeShare, readShareFromUrl, clearShareFromUrl } from './lib/share';
import { DealTable } from './components/DealTable';
import { FilterBar } from './components/FilterBar';
import { SummaryStrip } from './components/SummaryStrip';
import { DealDrawer } from './components/DealDrawer';
import { RentRollTable } from './components/RentRollTable';
import { RentRollFilterBar } from './components/RentRollFilterBar';
import { RentRollSummary } from './components/RentRollSummary';
import { RentRollDrawer } from './components/RentRollDrawer';
import { PromoteDrawer } from './components/PromoteDrawer';
import { ReportsView } from './components/ReportsView';
import { Sidebar, type View } from './components/Sidebar';

function App() {
  const [view, setView] = useState<View>('prospects');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [rentRoll, setRentRoll] = useState<RentRollRow[]>([]);
  const [filteredRentRoll, setFilteredRentRoll] = useState<RentRollRow[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editingRow, setEditingRow] = useState<RentRollRow | null>(null);
  const [promotingDeal, setPromotingDeal] = useState<Deal | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [sharedSnapshot, setSharedSnapshot] = useState<{ filename: string; sharedAt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cross-tab lookup: which prospects have an active deal for a given Space ID?
  const prospectsBySpaceId = useMemo(() => {
    const m = new Map<string, Deal>();
    deals.forEach((d) => {
      if (d.spaceId && d.status !== 'Lost') {
        m.set(d.spaceId, d);
      }
    });
    return m;
  }, [deals]);

  useEffect(() => {
    const encoded = readShareFromUrl();
    if (encoded) {
      decodeShare(encoded).then((payload) => {
        if (payload) {
          setDeals(payload.deals);
          setFilteredDeals(payload.deals);
          setRentRoll(payload.rentRoll);
          setFilteredRentRoll(payload.rentRoll);
          setFilename(payload.filename);
          setSharedSnapshot({ filename: payload.filename, sharedAt: payload.sharedAt });
        } else {
          alert('That share link is invalid or corrupted.');
        }
        clearShareFromUrl();
        setHydrated(true);
      });
      return;
    }

    loadSnapshot().then((snapshot) => {
      if (snapshot && (snapshot.deals.length > 0 || snapshot.rentRoll.length > 0)) {
        const restore = confirm(
          `Found unsaved work from ${new Date(snapshot.savedAt).toLocaleString()} (${snapshot.deals.length} deals, ${snapshot.rentRoll.length} rent roll rows). Restore?`
        );
        if (restore) {
          setDeals(snapshot.deals);
          setFilteredDeals(snapshot.deals);
          setRentRoll(snapshot.rentRoll);
          setFilteredRentRoll(snapshot.rentRoll);
          setFilename(snapshot.filename);
        } else {
          clearSnapshot();
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (deals.length === 0 && rentRoll.length === 0) {
      clearSnapshot();
      return;
    }
    saveSnapshot(deals, rentRoll, filename);
  }, [deals, rentRoll, filename, hydrated]);

  const handleOpenFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await loadFromFile(file);
      setDeals(result.deals);
      setFilteredDeals(result.deals);
      setRentRoll(result.rentRoll);
      setFilteredRentRoll(result.rentRoll);
      setFilename(file.name);
    } catch (err) {
      alert(`Error loading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveFile = () => {
    const name = filename || 'leases.xlsx';
    saveToFile(deals, rentRoll, name);
  };

  const handleShareLink = async () => {
    try {
      const encoded = await encodeShare(deals, rentRoll, filename || 'leases.xlsx');
      const url = `${window.location.origin}${window.location.pathname}#data=${encoded}`;
      // Soft size warning — URLs over ~30KB break some chat apps / email
      const sizeKB = Math.round(url.length / 1024);
      if (sizeKB > 30) {
        const proceed = confirm(
          `Share link is ${sizeKB} KB. Some chat apps / email clients truncate long URLs (~30 KB safe). Copy anyway?`
        );
        if (!proceed) return;
      }
      await navigator.clipboard.writeText(url);
      setShareToast(`Share link copied (${sizeKB} KB)`);
      setTimeout(() => setShareToast(null), 3500);
    } catch (err) {
      alert(`Could not create share link: ${err instanceof Error ? err.message : err}`);
    }
  };

  // ── Prospects handlers
  const handleNewDeal = () => {
    const newDeal = defaultDeal();
    const updated = [...deals, newDeal];
    setDeals(updated);
    setFilteredDeals(updated);
    setEditingDeal(newDeal);
  };
  const handleSelectDeal = (deal: Deal) => setEditingDeal(deal);
  const handleSaveDeal = (updated: Deal) => {
    const newDeals = deals.map((d) => (d.id === updated.id ? updated : d));
    setDeals(newDeals);
    setFilteredDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };
  const handleDeleteDeal = (id: string) => {
    const newDeals = deals.filter((d) => d.id !== id);
    setDeals(newDeals);
    setFilteredDeals((prev) => prev.filter((d) => d.id !== id));
  };

  // ── Rent Roll handlers
  const handleNewRow = () => {
    const newRow = defaultRentRollRow();
    const updated = [...rentRoll, newRow];
    setRentRoll(updated);
    setFilteredRentRoll(updated);
    setEditingRow(newRow);
  };
  const handleSelectRow = (row: RentRollRow) => setEditingRow(row);
  const handleSaveRow = (updated: RentRollRow) => {
    const newRows = rentRoll.map((r) => (r.id === updated.id ? updated : r));
    setRentRoll(newRows);
    setFilteredRentRoll((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };
  const handleDeleteRow = (id: string) => {
    const newRows = rentRoll.filter((r) => r.id !== id);
    setRentRoll(newRows);
    setFilteredRentRoll((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Cross-tab: Promote a prospect → Rent Roll
  const handleOpenPromote = (deal: Deal) => {
    setEditingDeal(null);
    setPromotingDeal(deal);
  };

  const handleConfirmPromote = (rrRow: RentRollRow, isNew: boolean) => {
    if (!promotingDeal) return;
    const newRows = isNew
      ? [...rentRoll, rrRow]
      : rentRoll.map((r) => (r.id === rrRow.id ? rrRow : r));
    setRentRoll(newRows);
    setFilteredRentRoll(newRows);
    // Delete the prospect — it lives in the rent roll from here on
    const newDeals = deals.filter((d) => d.id !== promotingDeal.id);
    setDeals(newDeals);
    setFilteredDeals(newDeals);
    setPromotingDeal(null);
    setView('rentroll');
  };

  // ── Cross-tab: Start a prospect from a vacant Rent Roll row
  const todayIso = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const handleStartProspect = (row: RentRollRow) => {
    const sf = row.leasableSF;
    const newDeal: Deal = {
      ...defaultDeal(),
      dealName: row.dealName ?? '',
      dealId: row.dealId,
      building: row.building,
      spaceId: row.spaceId,
      minSF: sf,
      maxSF: sf,
      lastRevalUWRent: row.lastRevalUWRent,
      targetRent: row.startingAnnualRentPSF ?? row.lastRevalUWRent,
      status: 'Prospect',
      priority: 'Low',
      lastUpdated: todayIso(),
    };
    const updated = [...deals, newDeal];
    setDeals(updated);
    setFilteredDeals(updated);
    setView('prospects');
    setEditingDeal(newDeal);
  };

  // Find the matched Rent Roll row for a prospect being promoted
  const matchedRentRollRow = useMemo<RentRollRow | null>(() => {
    if (!promotingDeal?.spaceId) return null;
    return (
      rentRoll.find((r) => r.spaceId === promotingDeal.spaceId) ?? null
    );
  }, [promotingDeal, rentRoll]);

  const hasData = deals.length > 0 || rentRoll.length > 0;
  const currentCount =
    view === 'prospects' ? filteredDeals.length : view === 'rentroll' ? filteredRentRoll.length : 0;
  const totalCount =
    view === 'prospects' ? deals.length : view === 'rentroll' ? rentRoll.length : 0;
  const viewTitle =
    view === 'prospects' ? 'Prospects' : view === 'rentroll' ? 'Rent Roll' : 'Reports';

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <Sidebar view={view} onChangeView={setView} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur-md">
          <div className="px-6 sm:px-10 pt-8 pb-6 max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-[26px] sm:text-[30px] leading-[1.1] tracking-[-0.02em] text-fg font-semibold">
                  {viewTitle}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-fg-muted flex-wrap">
                  {filename ? (
                    <>
                      <FileSpreadsheet size={14} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />
                      <span className="font-medium text-fg">{filename}</span>
                      {view !== 'reports' && (
                        <>
                          <span className="text-fg-subtle">·</span>
                          <span className="tabular-nums">
                            {currentCount} of {totalCount}
                          </span>
                        </>
                      )}
                    </>
                  ) : hasData ? (
                    <>
                      {view !== 'reports' && (
                        <span className="tabular-nums font-medium text-fg">
                          {currentCount} of {totalCount}
                        </span>
                      )}
                      {view !== 'reports' && <span className="text-fg-subtle">·</span>}
                      <span className="text-warning">Unsaved — click Save to export</span>
                    </>
                  ) : (
                    <span className="text-fg-subtle">Open a workbook to begin</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft"
                >
                  <FolderOpen size={15} strokeWidth={1.75} />
                  Open
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleOpenFile}
                  className="hidden"
                />

                <button
                  onClick={handleSaveFile}
                  disabled={!hasData}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
                >
                  <Download size={15} strokeWidth={1.75} />
                  Save
                </button>

                <button
                  onClick={handleShareLink}
                  disabled={!hasData}
                  title="Copy a shareable URL with the current data baked in"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
                >
                  <Link2 size={15} strokeWidth={1.75} />
                  Share
                </button>

                {view !== 'reports' && (
                  <button
                    onClick={view === 'prospects' ? handleNewDeal : handleNewRow}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
                  >
                    <Plus size={15} strokeWidth={2.25} />
                    {view === 'prospects' ? 'New Deal' : 'New Row'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {sharedSnapshot && (
          <div className="max-w-7xl w-full mx-auto px-6 sm:px-10 -mt-2 mb-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-accent-tint border border-accent/20 rounded-xl">
              <Sparkles size={16} strokeWidth={2} className="text-accent shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-medium text-fg">Viewing a shared snapshot</span>
                <span className="text-fg-muted"> from {sharedSnapshot.filename} · shared {new Date(sharedSnapshot.sharedAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setSharedSnapshot(null)}
                className="text-fg-muted hover:text-fg p-1 rounded-md transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {shareToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-fg text-bg rounded-xl shadow-lift text-sm font-medium">
            <Check size={15} strokeWidth={2.5} />
            {shareToast}
          </div>
        )}

        <main className="flex-1 px-6 sm:px-10 pb-12 max-w-7xl w-full mx-auto space-y-8">
          {view === 'reports' ? (
            <ReportsView deals={deals} rentRoll={rentRoll} />
          ) : view === 'prospects' ? (
            deals.length === 0 ? (
              <EmptyHero onAction={handleNewDeal} ctaLabel="Create your first deal" />
            ) : (
              <>
                <SummaryStrip deals={filteredDeals} />
                <section className="space-y-4">
                  <FilterBar deals={deals} onFilterChange={setFilteredDeals} />
                  {filteredDeals.length === 0 ? (
                    <EmptyMatches />
                  ) : (
                    <DealTable
                      deals={filteredDeals}
                      onSelectDeal={handleSelectDeal}
                      onDeleteDeal={handleDeleteDeal}
                      onPromote={handleOpenPromote}
                    />
                  )}
                </section>
              </>
            )
          ) : rentRoll.length === 0 ? (
            <EmptyHero onAction={handleNewRow} ctaLabel="Add first row" />
          ) : (
            <>
              <RentRollSummary rows={filteredRentRoll} />
              <section className="space-y-4">
                <RentRollFilterBar rows={rentRoll} onFilterChange={setFilteredRentRoll} />
                {filteredRentRoll.length === 0 ? (
                  <EmptyMatches />
                ) : (
                  <RentRollTable
                    rows={filteredRentRoll}
                    prospectsBySpaceId={prospectsBySpaceId}
                    onSelect={handleSelectRow}
                    onDelete={handleDeleteRow}
                    onStartProspect={handleStartProspect}
                  />
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <DealDrawer
        deal={editingDeal}
        onClose={() => setEditingDeal(null)}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        onPromote={handleOpenPromote}
      />
      <RentRollDrawer
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSave={handleSaveRow}
        onDelete={handleDeleteRow}
      />
      <PromoteDrawer
        deal={promotingDeal}
        existingRow={matchedRentRollRow}
        onClose={() => setPromotingDeal(null)}
        onConfirm={handleConfirmPromote}
      />
    </div>
  );
}

function EmptyHero({ onAction, ctaLabel }: { onAction: () => void; ctaLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-tint text-accent mb-6">
        <Sparkles size={24} strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl sm:text-3xl text-fg font-semibold tracking-[-0.02em]">
        Your portfolio, beautifully tracked
      </h2>
      <p className="text-base text-fg-muted mt-3 max-w-md leading-relaxed">
        Open a saved Excel workbook to pick up where you left off, or start fresh — your
        data stays on your machine.
      </p>
      <button
        onClick={onAction}
        className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
      >
        <FilePlus size={16} strokeWidth={2} />
        {ctaLabel}
      </button>
    </div>
  );
}

function EmptyMatches() {
  return (
    <div className="text-center py-12 px-6 bg-bg-elevated rounded-2xl shadow-soft">
      <p className="text-base font-semibold text-fg tracking-tight">No matches</p>
      <p className="text-sm text-fg-muted mt-1">
        Try clearing some filters or broadening your search.
      </p>
    </div>
  );
}

export default App;
