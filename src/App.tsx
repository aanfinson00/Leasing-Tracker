import { useState, useRef, useEffect } from 'react';
import type { Deal } from './types';
import { defaultDeal } from './types';
import { loadFromFile, saveToFile } from './lib/excel';
import { saveSnapshot, loadSnapshot, clearSnapshot } from './lib/autosave';
import { DealTable } from './components/DealTable';
import { FilterBar } from './components/FilterBar';
import { SummaryStrip } from './components/SummaryStrip';
import { DealDrawer } from './components/DealDrawer';

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

  const handleSelectDeal = (deal: Deal) => {
    setEditingDeal(deal);
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Industrial Leasing Tracker</h1>
          <p className="text-gray-600 mt-1">{filename ? `Loaded: ${filename}` : 'No file loaded'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
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
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            Save File
          </button>

          <button
            onClick={handleNewDeal}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            New Deal
          </button>
        </div>

        {deals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No deals loaded. Open a file or create a new deal.</p>
          </div>
        ) : (
          <>
            <FilterBar deals={deals} onFilterChange={setFilteredDeals} />

            {filteredDeals.length === 0 ? (
              <div className="text-center py-12 bg-white rounded shadow">
                <p className="text-gray-600 text-lg">No deals match your filters.</p>
              </div>
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

export default App;
