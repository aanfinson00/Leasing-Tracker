import { useState, useEffect } from 'react';
import { FilePlus, Sparkles } from 'lucide-react';
import type { Deal } from './types';
import { defaultDeal } from './types';
import { loadFromFile, saveToFile } from './lib/excel';
import { saveSnapshot, loadSnapshot, clearSnapshot } from './lib/autosave';
import { DealTable } from './components/DealTable';
import { FilterBar } from './components/FilterBar';
import { SummaryStrip } from './components/SummaryStrip';
import { DealDrawer } from './components/DealDrawer';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadSnapshot().then((snapshot) => {
      if (snapshot && snapshot.deals.length > 0) {
        const restore = confirm(
          `Found unsaved work from ${new Date(snapshot.savedAt).toLocaleString()} (${snapshot.deals.length} deals). Restore?`
        );
        if (restore) {
          setDeals(snapshot.deals);
          setFilteredDeals(snapshot.deals);
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
    if (deals.length === 0) {
      clearSnapshot();
      return;
    }
    saveSnapshot(deals, filename);
  }, [deals, filename, hydrated]);

  const handleOpenFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const loadedDeals = await loadFromFile(file);
      setDeals(loadedDeals);
      setFilteredDeals(loadedDeals);
      setFilename(file.name);
    } catch (err) {
      alert(`Error loading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveFile = () => {
    const name = filename || 'leases.xlsx';
    saveToFile(deals, name);
  };

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

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          filename={filename}
          dealCount={deals.length}
          hasDeals={deals.length > 0}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          onNewDeal={handleNewDeal}
        />

        <main className="flex-1 px-6 sm:px-10 pb-12 max-w-7xl w-full mx-auto space-y-8">
          {deals.length === 0 ? (
            <EmptyHero onNewDeal={handleNewDeal} />
          ) : (
            <>
              <SummaryStrip deals={filteredDeals} />

              <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg tracking-tight text-fg font-semibold">
                    Portfolio
                  </h2>
                  <p className="text-sm text-fg-subtle tabular-nums">
                    Showing {filteredDeals.length} of {deals.length}
                  </p>
                </div>

                <FilterBar deals={deals} onFilterChange={setFilteredDeals} />

                {filteredDeals.length === 0 ? (
                  <EmptyMatches />
                ) : (
                  <DealTable
                    deals={filteredDeals}
                    onSelectDeal={handleSelectDeal}
                    onDeleteDeal={handleDeleteDeal}
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
      />
    </div>
  );
}

function EmptyHero({ onNewDeal }: { onNewDeal: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-tint text-accent mb-6">
        <Sparkles size={24} strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl sm:text-3xl text-fg font-semibold tracking-[-0.02em]">
        Your portfolio, beautifully tracked
      </h2>
      <p className="text-base text-fg-muted mt-3 max-w-md leading-relaxed">
        Open a saved Excel workbook to pick up where you left off, or start a fresh deal — your
        data stays on your machine.
      </p>
      <button
        onClick={onNewDeal}
        className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
      >
        <FilePlus size={16} strokeWidth={2} />
        Create your first deal
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
