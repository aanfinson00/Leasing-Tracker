import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronUp, ChevronDown, Pencil, Trash2, Sparkles, UserPlus, ClipboardCheck } from 'lucide-react';
import type { RentRollRow, Deal } from '../types';

interface RentRollTableProps {
  rows: RentRollRow[];
  prospectsBySpaceId: Map<string, Deal>;
  onboardingsByRentRollId: Set<string>;
  onSelect: (row: RentRollRow) => void;
  onDelete: (id: string) => void;
  onStartProspect: (row: RentRollRow) => void;
  onStartOnboarding: (row: RentRollRow) => void;
}

const formatNum = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : n.toLocaleString();

const formatCurrency = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : `$${n.toFixed(2)}`;

// 1-5 star tenant rating. 4-5 = green, 3 = amber, 1-2 = muted.
const RatingChip = ({ rating }: { rating: number | null }) => {
  if (rating == null) return <span className="text-fg-subtle">–</span>;
  const n = Math.max(1, Math.min(5, Math.round(rating)));
  const cls =
    n >= 4
      ? 'bg-success/10 text-success border-success/30'
      : n === 3
        ? 'bg-warning/10 text-warning border-warning/30'
        : 'bg-fg-subtle/10 text-fg-muted border-fg-subtle/20';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border tabular-nums ${cls}`}
      title={`${n}/5`}
    >
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
};

export function RentRollTable({
  rows,
  prospectsBySpaceId,
  onboardingsByRentRollId,
  onSelect,
  onDelete,
  onStartProspect,
  onStartOnboarding,
}: RentRollTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnHelper = createColumnHelper<RentRollRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('dealName', {
        header: 'Project',
        cell: (info) => {
          const r = info.row.original;
          const sub = [r.market, r.propertyType].filter(Boolean).join(' · ');
          return (
            <div className="flex flex-col min-w-0">
              <span
                className="text-sm font-semibold text-fg tracking-tight leading-tight truncate"
                title={info.getValue() || 'Untitled'}
              >
                {info.getValue() || 'Untitled'}
              </span>
              {sub && <span className="text-xs text-fg-subtle mt-0.5 truncate">{sub}</span>}
            </div>
          );
        },
        size: 220,
      }),
      columnHelper.accessor('spaceId', {
        header: 'Space',
        cell: (info) => {
          const r = info.row.original;
          const sub = [r.building, r.buildingType].filter(Boolean).join(' · ');
          return (
            <div className="flex flex-col min-w-0">
              <span className="text-sm tabular-nums text-fg-muted whitespace-nowrap">{info.getValue() || '–'}</span>
              {sub && <span className="text-xs text-fg-subtle mt-0.5 truncate">{sub}</span>}
            </div>
          );
        },
        size: 140,
      }),
      columnHelper.accessor('tenantName', {
        header: 'Tenant',
        cell: (info) => {
          const r = info.row.original;
          const name = info.getValue();
          const hasProspect = !r.occupied && r.spaceId && prospectsBySpaceId.has(r.spaceId);
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${r.occupied ? 'text-fg-muted' : 'text-fg-subtle italic'}`}>
                  {name || '–'}
                </span>
                {hasProspect && r.spaceId && (() => {
                  const p = prospectsBySpaceId.get(r.spaceId)!;
                  const isSigned = p.status === 'Executed';
                  const cls = isSigned
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-accent-soft text-accent';
                  return (
                    <span
                      title={`${p.status}: ${p.prospectTenant ?? p.dealName} (${p.brokerRep ?? '?'})`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${cls}`}
                    >
                      <Sparkles size={10} strokeWidth={2} />
                      {isSigned ? 'Signed' : 'Prospect'}
                    </span>
                  );
                })()}
              </div>
              {r.tenantRating !== null && r.occupied && (
                <RatingChip rating={r.tenantRating} />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('occupied', {
        header: 'Status',
        cell: (info) => {
          const occupied = info.getValue();
          return occupied ? (
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              Occupied
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 self-start">
              Vacant
            </span>
          );
        },
      }),
      columnHelper.accessor('leasableSF', {
        header: 'SF',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">
            {formatNum(info.getValue())}
          </span>
        ),
        meta: { numeric: true },
      }),
      columnHelper.accessor('startingAnnualRentPSF', {
        header: '$/SF',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">
            {formatCurrency(info.getValue())}
          </span>
        ),
        meta: { numeric: true },
      }),
      columnHelper.accessor('leaseEnd', {
        header: 'Lease End',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">
            {info.getValue() || '–'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const r = info.row.original;
          const canStartProspect =
            !r.occupied && (!r.spaceId || !prospectsBySpaceId.has(r.spaceId));
          const canStartOnboarding = r.occupied && !onboardingsByRentRollId.has(r.id);
          return (
            <div className="flex justify-end gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
              {canStartProspect && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartProspect(r);
                  }}
                  title="Start prospect for this space"
                  aria-label="Start prospect"
                  className="p-2 rounded-lg text-accent hover:bg-accent-soft transition-colors"
                >
                  <UserPlus size={14} strokeWidth={2} />
                </button>
              )}
              {canStartOnboarding && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartOnboarding(r);
                  }}
                  title="Start onboarding checklist"
                  aria-label="Start onboarding"
                  className="p-2 rounded-lg text-accent hover:bg-accent-soft transition-colors"
                >
                  <ClipboardCheck size={14} strokeWidth={2} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(r);
                }}
                title="Edit"
                aria-label="Edit row"
                className="p-2 rounded-lg text-fg-muted hover:text-accent hover:bg-bg-hover transition-colors"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this rent roll row?')) {
                    onDelete(r.id);
                  }
                }}
                title="Delete"
                aria-label="Delete row"
                className="p-2 rounded-lg text-fg-muted hover:text-danger hover:bg-bg-hover transition-colors"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, prospectsBySpaceId, onboardingsByRentRollId, onSelect, onDelete, onStartProspect, onStartOnboarding]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-2xl bg-bg-elevated shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg-elevated z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const isActions = header.column.id === 'actions';
                  const isNumeric = (header.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                  const align = isActions || isNumeric ? 'text-right' : 'text-left';
                  const colWidth = header.column.columnDef.size;
                  return (
                    <th
                      key={header.id}
                      style={colWidth ? { width: colWidth, minWidth: colWidth } : undefined}
                      className={[
                        'px-4 py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle whitespace-nowrap',
                        align,
                        canSort && !isActions
                          ? 'cursor-pointer hover:text-fg transition-colors select-none'
                          : '',
                      ].join(' ')}
                      onClick={canSort && !isActions ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className={`inline-flex items-center gap-1.5 ${isActions || isNumeric ? 'justify-end' : ''}`}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && !isActions && (
                          <span>
                            {sorted === 'asc' ? (
                              <ChevronUp size={12} strokeWidth={2.5} className="text-accent" />
                            ) : sorted === 'desc' ? (
                              <ChevronDown size={12} strokeWidth={2.5} className="text-accent" />
                            ) : (
                              <ArrowUpDown size={11} strokeWidth={1.75} className="opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row.original)}
                className="group border-b border-border last:border-b-0 hover:bg-bg-subtle/50 cursor-pointer transition-colors"
              >
                {row.getVisibleCells().map((cell) => {
                  const isActions = cell.column.id === 'actions';
                  const isNumeric = (cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                  const align = isActions || isNumeric ? 'text-right' : '';
                  return (
                    <td key={cell.id} className={`px-4 py-3 ${align}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
