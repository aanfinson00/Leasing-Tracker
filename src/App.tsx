import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FilePlus,
  Sparkles,
  FolderOpen,
  Download,
  Plus,
  FileSpreadsheet,
  Link2,
  Check,
  X,
  Cloud,
  CloudOff,
  Unlink,
} from 'lucide-react';
import type { ActivityEntry, Deal, DealStatus, RentRollRow } from './types';
import { defaultDeal, defaultRentRollRow } from './types';
import { loadFromFile, saveToFile, buildWorkbookBlob } from './lib/excel';
import { saveSnapshot, loadSnapshot, clearSnapshot } from './lib/autosave';
import { encodeShare, decodeShare, readShareFromUrl, clearShareFromUrl } from './lib/share';
import { makeStatusChangeEntry } from './lib/activity';
import {
  isFileSystemAccessSupported,
  loadHandle,
  saveHandle,
  clearHandle,
  updateLastSeenModified,
  queryHandlePermission,
  requestHandlePermission,
  pickFile,
  readFromHandle,
  writeToHandle,
} from './lib/fileHandle';
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
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editingRow, setEditingRow] = useState<RentRollRow | null>(null);
  const [promotingDeal, setPromotingDeal] = useState<Deal | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [appToast, setAppToast] = useState<string | null>(null);
  const [sharedSnapshot, setSharedSnapshot] = useState<{ filename: string; sharedAt: string } | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [lastSeenModified, setLastSeenModified] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fsAccessSupported = isFileSystemAccessSupported();

  const showToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast((prev) => (prev === msg ? null : prev)), 3500);
  };

  const formatTime = (d: Date): string =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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

  const loadFromHandleResult = async (handle: FileSystemFileHandle): Promise<boolean> => {
    try {
      const file = await readFromHandle(handle);
      const result = await loadFromFile(file);
      setDeals(result.deals);
      setFilteredDeals(result.deals);
      setRentRoll(result.rentRoll);
      setFilteredRentRoll(result.rentRoll);
      setActivities(result.activities);
      setFilename(file.name);
      setLastSeenModified(file.lastModified);
      return true;
    } catch (err) {
      console.error('Failed to load from handle:', err);
      return false;
    }
  };

  useEffect(() => {
    const encoded = readShareFromUrl();
    if (encoded) {
      decodeShare(encoded).then((payload) => {
        if (payload) {
          setDeals(payload.deals);
          setFilteredDeals(payload.deals);
          setRentRoll(payload.rentRoll);
          setFilteredRentRoll(payload.rentRoll);
          setActivities(payload.activities ?? []);
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

    (async () => {
      // Try to reconnect to a previously-saved file handle first. If it
      // resolves cleanly with granted permission, we skip the autosave-restore
      // prompt entirely — the canonical file IS the source of truth.
      if (fsAccessSupported) {
        const rec = await loadHandle();
        if (rec) {
          setFileHandle(rec.handle);
          setFilename(rec.name);
          const perm = await queryHandlePermission(rec.handle);
          if (perm === 'granted') {
            const ok = await loadFromHandleResult(rec.handle);
            if (ok) {
              setHydrated(true);
              return;
            }
          } else {
            setNeedsReconnect(true);
            setHydrated(true);
            return;
          }
        }
      }

      const snapshot = await loadSnapshot();
      if (snapshot && (snapshot.deals.length > 0 || snapshot.rentRoll.length > 0)) {
        const restore = confirm(
          `Found unsaved work from ${new Date(snapshot.savedAt).toLocaleString()} (${snapshot.deals.length} deals, ${snapshot.rentRoll.length} rent roll rows). Restore?`
        );
        if (restore) {
          setDeals(snapshot.deals);
          setFilteredDeals(snapshot.deals);
          setRentRoll(snapshot.rentRoll);
          setFilteredRentRoll(snapshot.rentRoll);
          setActivities(snapshot.activities ?? []);
          setFilename(snapshot.filename);
        } else {
          clearSnapshot();
        }
      }
      setHydrated(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated) return;
    if (deals.length === 0 && rentRoll.length === 0 && activities.length === 0) {
      clearSnapshot();
      return;
    }
    saveSnapshot(deals, rentRoll, activities, filename);
  }, [deals, rentRoll, activities, filename, hydrated]);

  const handleOpenClick = async () => {
    if (fsAccessSupported) {
      try {
        const handle = await pickFile();
        if (!handle) return;
        const file = await readFromHandle(handle);
        const result = await loadFromFile(file);
        setDeals(result.deals);
        setFilteredDeals(result.deals);
        setRentRoll(result.rentRoll);
        setFilteredRentRoll(result.rentRoll);
        setActivities(result.activities);
        setFilename(file.name);
        setFileHandle(handle);
        setLastSeenModified(file.lastModified);
        setNeedsReconnect(false);
        await saveHandle(handle, file.lastModified);
        showToast(`Connected to ${file.name}`);
      } catch (err) {
        alert(`Error opening file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      return;
    }
    // Fallback for browsers without File System Access (Firefox, Safari)
    fileInputRef.current?.click();
  };

  const handleOpenFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await loadFromFile(file);
      setDeals(result.deals);
      setFilteredDeals(result.deals);
      setRentRoll(result.rentRoll);
      setFilteredRentRoll(result.rentRoll);
      setActivities(result.activities);
      setFilename(file.name);
    } catch (err) {
      alert(`Error loading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveFile = async () => {
    if (fileHandle) {
      try {
        // Conflict detection: did the file change since we loaded it?
        const current = await readFromHandle(fileHandle);
        if (
          lastSeenModified !== null &&
          current.lastModified > lastSeenModified &&
          current.lastModified - lastSeenModified > 1500 // ignore sub-2s clock noise
        ) {
          const diffSec = Math.round((current.lastModified - lastSeenModified) / 1000);
          const diffLabel =
            diffSec < 60
              ? `${diffSec}s ago`
              : diffSec < 3600
                ? `${Math.round(diffSec / 60)} min ago`
                : `${Math.round(diffSec / 3600)}h ago`;
          const choice = confirm(
            `${current.name} was modified externally (${diffLabel}). Overwrite anyway?\n\nClick Cancel to reload their version instead.`
          );
          if (!choice) {
            const ok = await loadFromHandleResult(fileHandle);
            if (ok) showToast('Reloaded latest version');
            return;
          }
        }
        const blob = buildWorkbookBlob(deals, rentRoll, activities);
        await writeToHandle(fileHandle, blob);
        // Re-read to grab the new mtime (after the write)
        const after = await readFromHandle(fileHandle);
        setLastSeenModified(after.lastModified);
        await updateLastSeenModified(after.lastModified);
        showToast(`Saved · ${formatTime(new Date())}`);
      } catch (err) {
        console.error('Save failed:', err);
        alert(`Save failed: ${err instanceof Error ? err.message : err}`);
      }
      return;
    }
    const name = filename || 'leases.xlsx';
    saveToFile(deals, rentRoll, activities, name);
  };

  const handleReconnect = async () => {
    if (!fileHandle) return;
    const perm = await requestHandlePermission(fileHandle);
    if (perm !== 'granted') {
      showToast('Permission denied');
      return;
    }
    const ok = await loadFromHandleResult(fileHandle);
    if (ok) {
      setNeedsReconnect(false);
      showToast(`Reconnected to ${fileHandle.name}`);
    }
  };

  const handleDisconnect = async () => {
    if (!fileHandle) return;
    if (!confirm(`Disconnect from ${fileHandle.name}? Future saves will download instead.`)) return;
    await clearHandle();
    setFileHandle(null);
    setLastSeenModified(null);
    setNeedsReconnect(false);
    showToast('Disconnected — saves will download');
  };

  const handleShareLink = async () => {
    try {
      const encoded = await encodeShare(deals, rentRoll, activities, filename || 'leases.xlsx');
      const url = `${window.location.origin}${window.location.pathname}#data=${encoded}`;
      // Microsoft SafeLinks (Teams + Outlook) routes through Akamai, which
      // rejects URLs over ~8 KB. Warn early so people don't paste broken
      // links into Teams chats.
      const sizeKB = Math.round(url.length / 1024);
      if (sizeKB > 6) {
        const proceed = confirm(
          `Share link is ${sizeKB} KB.\n\n` +
            `Microsoft Teams and Outlook reject links over ~8 KB (SafeLinks limit), ` +
            `and many chat apps truncate long URLs.\n\n` +
            (fileHandle
              ? `For your team, the connected file in OneDrive is the better channel — Save in place, then Share from OneDrive.\n\n`
              : `For your team, save the workbook into a shared OneDrive folder and share it from there.\n\n`) +
            `Copy this link anyway?`
        );
        if (!proceed) return;
      }
      await navigator.clipboard.writeText(url);
      showToast(`Share link copied (${sizeKB} KB)`);
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
    setActivities((prev) =>
      prev.filter((a) => !(a.parentType === 'deal' && a.parentId === id))
    );
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
    setActivities((prev) =>
      prev.filter((a) => !(a.parentType === 'rentroll' && a.parentId === id))
    );
  };

  // ── Activity handlers
  const handleAddActivity = (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => {
    const full: ActivityEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setActivities((prev) => [...prev, full]);
  };
  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };
  const handleDealStatusChange = (deal: Deal, from: DealStatus, to: DealStatus) => {
    if (from === to) return;
    const entry = makeStatusChangeEntry('deal', deal.id, from, to);
    setActivities((prev) => [...prev, entry]);
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

    // Reassign existing activities from the prospect to the rent roll row,
    // and append a transition entry so the timeline shows the handoff.
    const transition = makeStatusChangeEntry(
      'rentroll',
      rrRow.id,
      'Executed',
      'Promoted to Rent Roll'
    );
    setActivities((prev) => [
      ...prev.map((a) =>
        a.parentType === 'deal' && a.parentId === promotingDeal.id
          ? { ...a, parentType: 'rentroll' as const, parentId: rrRow.id }
          : a
      ),
      transition,
    ]);

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
      status: 'New Prospect',
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
                  {needsReconnect && fileHandle ? (
                    <button
                      onClick={handleReconnect}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-warning bg-warning/10 border border-warning/40 rounded-lg hover:bg-warning/15 transition-colors"
                    >
                      <CloudOff size={14} strokeWidth={1.75} />
                      Reconnect to {fileHandle.name}
                    </button>
                  ) : filename ? (
                    <>
                      <FileSpreadsheet size={14} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />
                      <span className="font-medium text-fg">{filename}</span>
                      {fileHandle && (
                        <>
                          <span
                            title="Connected — saves go directly to this file"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                          >
                            <Cloud size={13} strokeWidth={2} />
                            <span className="text-[11px] font-medium uppercase tracking-wide">Connected</span>
                          </span>
                          <button
                            onClick={handleDisconnect}
                            title="Disconnect from this file"
                            className="p-1 rounded-md text-fg-subtle hover:text-fg hover:bg-bg-hover transition-colors"
                            aria-label="Disconnect"
                          >
                            <Unlink size={12} strokeWidth={1.75} />
                          </button>
                        </>
                      )}
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
                  onClick={handleOpenClick}
                  title={
                    fsAccessSupported
                      ? 'Pick a workbook — the app will save back to it in place'
                      : 'Open a workbook'
                  }
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
                  title={fileHandle ? 'Save in place' : 'Download workbook'}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
                >
                  {fileHandle ? (
                    <Cloud size={15} strokeWidth={1.75} />
                  ) : (
                    <Download size={15} strokeWidth={1.75} />
                  )}
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

        {appToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-fg text-bg rounded-xl shadow-lift text-sm font-medium">
            <Check size={15} strokeWidth={2.5} />
            {appToast}
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
        activities={activities}
        onClose={() => setEditingDeal(null)}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        onPromote={handleOpenPromote}
        onAddActivity={handleAddActivity}
        onDeleteActivity={handleDeleteActivity}
        onStatusChange={handleDealStatusChange}
      />
      <RentRollDrawer
        row={editingRow}
        activities={activities}
        onClose={() => setEditingRow(null)}
        onSave={handleSaveRow}
        onDelete={handleDeleteRow}
        onAddActivity={handleAddActivity}
        onDeleteActivity={handleDeleteActivity}
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
