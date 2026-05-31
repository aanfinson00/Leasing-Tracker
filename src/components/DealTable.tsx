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
import { ArrowUpDown, ChevronUp, ChevronDown, Pencil, Trash2, ArrowRight } from 'lucide-react';
import type { Deal } from '../types';
import { StatusBadge, PriorityLabel } from './StatusBadge';
import { relativeTime } from '../lib/relative-time';

interface DealTableProps {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
  onPromote: (deal: Deal) => void;
}

const formatSFCell = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return '–';
  if (min !== null && max !== null && min === max) return min.toLocaleString();
  if (min !== null && max !== null) return `${min.toLocaleString()}–${max.toLocaleString()}`;
  return (min ?? max)?.toLocaleString() ?? '–';
};

const formatTI = (deal: Deal): string => {
  if (deal.tiPerSF !== null) return `$${deal.tiPerSF.toFixed(2)}`;
  if (deal.tiNote) return deal.tiNote;
  return '–';
};

export function DealTable({ deals, onSelectDeal, onDeleteDeal, onPromote }: DealTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columnHelper = createColumnHelper<Deal>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('dealName', {
        header: 'Deal',
        cell: (info) => {
          const d = info.row.original;
          const sub = [d.building, d.spaceId].filter(Boolean).join(' · ');
          return (
            <div className="flex flex-col min-w-0">
              <span
                className="text-sm font-semibold text-fg tracking-tight leading-tight truncate"
                title={info.getValue() || 'Untitled'}
              >
                {info.getValue() || 'Untitled'}
              </span>
              {sub && <span className="text-xs text-fg-subtle mt-0.5 tabular-nums truncate">{sub}</span>}
            </div>
          );
        },
        size: 200,
      }),
      columnHelper.accessor('prospectTenant', {
        header: 'Prospect',
        cell: (info) => {
          const d = info.row.original;
          return (
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-fg-muted truncate">{info.getValue() || '–'}</span>
              {d.brokerRep && (
                <span className="text-xs text-fg-subtle mt-0.5 truncate">{d.brokerRep}</span>
              )}
            </div>
          );
        },
        size: 180,
      }),
      columnHelper.accessor('transaction', {
        header: 'Transaction',
        cell: (info) => <span className="text-sm text-fg-muted whitespace-nowrap">{info.getValue() || '–'}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor((row) => row.maxSF ?? row.minSF ?? 0, {
        id: 'sf',
        header: 'SF',
        cell: (info) => {
          const d = info.row.original;
          return (
            <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">
              {formatSFCell(d.minSF, d.maxSF)}
            </span>
          );
        },
        meta: { numeric: true },
      }),
      columnHelper.accessor('targetRent', {
        header: 'Target $/SF',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">
            {info.getValue() !== null ? `$${info.getValue()?.toFixed(2)}` : '–'}
          </span>
        ),
        meta: { numeric: true },
      }),
      columnHelper.accessor((row) => row.tiPerSF ?? -1, {
        id: 'ti',
        header: 'TI $/SF',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">
            {formatTI(info.row.original)}
          </span>
        ),
        meta: { numeric: true },
      }),
      columnHelper.accessor('probabilityPct', {
        header: 'Prob',
        cell: (info) => {
          const v = info.getValue();
          if (v === null) return <span className="text-sm text-fg-subtle">–</span>;
          const color =
            v >= 80 ? 'text-emerald-700 dark:text-emerald-300' :
            v >= 40 ? 'text-amber-700 dark:text-amber-300' :
            'text-fg-muted';
          return (
            <span className={`tabular-nums text-sm font-medium ${color}`}>{v}%</span>
          );
        },
        meta: { numeric: true },
      }),
      columnHelper.accessor('expectedStart', {
        header: 'Start',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted whitespace-nowrap">{info.getValue() || '–'}</span>
        ),
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: (info) => <PriorityLabel priority={info.getValue()} />,
      }),
      columnHelper.accessor((row) => row.lastUpdated ?? '', {
        id: 'lastUpdated',
        header: 'Updated',
        cell: (info) => {
          const v = info.getValue();
          if (!v) return <span className="text-fg-subtle text-xs">–</span>;
          return (
            <span
              className="text-xs text-fg-muted whitespace-nowrap"
              title={String(v)}
            >
              {relativeTime(String(v))}
            </span>
          );
        },
        sortingFn: (a, b) => {
          const av = String(a.original.lastUpdated ?? '');
          const bv = String(b.original.lastUpdated ?? '');
          return av.localeCompare(bv);
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const isExecuted = info.row.original.status === 'Executed';
          return (
            <div className="flex justify-end gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
              {isExecuted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPromote(info.row.original);
                  }}
                  title="Promote to Rent Roll"
                  aria-label="Promote to Rent Roll"
                  className="p-2 rounded-lg text-accent hover:bg-accent-soft transition-colors"
                >
                  <ArrowRight size={14} strokeWidth={2} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDeal(info.row.original);
                }}
                title="Edit"
                aria-label="Edit deal"
                className="p-2 rounded-lg text-fg-muted hover:text-accent hover:bg-bg-hover transition-colors"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete deal "${info.row.original.dealName || 'this deal'}"?`)) {
                    onDeleteDeal(info.row.original.id);
                  }
                }}
                title="Delete"
                aria-label="Delete deal"
                className="p-2 rounded-lg text-fg-muted hover:text-danger hover:bg-bg-hover transition-colors"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, onSelectDeal, onDeleteDeal, onPromote]
  );

  const table = useReactTable({
    data: deals,
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
                onClick={() => onSelectDeal(row.original)}
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
