import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Save, Plus, FileWarning } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <TopBar filename={filename} dealCount={deals.length} />

        <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-bg-elevated text-fg border border-border rounded-md hover:bg-bg-hover transition-colors shadow-card"
            >
              <FolderOpen size={15} strokeWidth={2} />
              Open File
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
              disabled={deals.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-bg-elevated text-fg border border-border rounded-md hover:bg-bg-hover transition-colors shadow-card disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
            >
              <Save size={15} strokeWidth={2} />
              Save File
            </button>

            <div className="ml-auto" />

            <button
              onClick={handleNewDeal}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold bg-accent text-accent-fg rounded-md hover:bg-accent-hover transition-colors shadow-card"
            >
              <Plus size={15} strokeWidth={2.5} />
              New Deal
            </button>
          </div>

          {deals.length === 0 ? (
            <EmptyState
              icon={FileWarning}
              title="No deals loaded"
              body="Open an existing .xlsx file or create your first deal to get started."
            />
          ) : (
            <>
              <FilterBar deals={deals} onFilterChange={setFilteredDeals} />

              {filteredDeals.length === 0 ? (
                <EmptyState
                  icon={FileWarning}
                  title="No matches"
                  body="No deals match your current filters. Adjust the search or stage filters above."
                />
              ) : (
                <DealTable
                  deals={filteredDeals}
                  onSelectDeal={handleSelectDeal}
                  onDeleteDeal={handleDeleteDeal}
                />
              )}

              <SummaryStrip deals={filteredDeals} />
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

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  body: string;
}

function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-bg-elevated rounded-lg border border-dashed border-border">
      <Icon size={32} strokeWidth={1.5} className="text-fg-subtle mb-3" />
      <h2 className="text-base font-semibold text-fg tracking-tight">{title}</h2>
      <p className="text-sm text-fg-muted mt-1 max-w-md">{body}</p>
    </div>
  );
}

export default App;
