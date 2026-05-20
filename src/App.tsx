import { useState, useRef } from 'react';
import { Deal, defaultDeal } from './types';
import { loadFromFile, saveToFile } from './lib/excel';
import './App.css';

function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filename, setFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const loadedDeals = await loadFromFile(file);
      setDeals(loadedDeals);
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
    setDeals([...deals, defaultDeal()]);
  };

  const handleUpdateDeal = (id: string, updated: Deal) => {
    setDeals(deals.map((d) => (d.id === id ? updated : d)));
  };

  const handleDeleteDeal = (id: string) => {
    setDeals(deals.filter((d) => d.id !== id));
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
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Property</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tenant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">SF</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">$/SF</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{deal.propertyName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{deal.tenantName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{deal.squareFeet?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">${deal.baseRentPSF?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{deal.leaseStartDate}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteDeal(deal.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Total Deals</p>
              <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Square Feet</p>
              <p className="text-2xl font-bold text-gray-900">
                {deals.reduce((sum, d) => sum + (d.squareFeet || 0), 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Annual Rent</p>
              <p className="text-2xl font-bold text-gray-900">
                ${deals
                  .reduce((sum, d) => sum + ((d.squareFeet || 0) * (d.baseRentPSF || 0)), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Active Leases</p>
              <p className="text-2xl font-bold text-gray-900">
                {deals.filter((d) => d.stage === 'Active').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
