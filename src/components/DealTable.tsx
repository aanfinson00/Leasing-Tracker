import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import type { Deal } from '../types';
import { StageBadge } from './StageBadge';

interface DealTableProps {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
}

export function DealTable({ deals, onSelectDeal, onDeleteDeal }: DealTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columnHelper = createColumnHelper<Deal>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('propertyName', {
        header: 'Property',
        cell: (info) => (
          <span className="font-medium text-fg">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('tenantName', {
        header: 'Tenant',
        cell: (info) => <span className="text-fg-muted">{info.getValue()}</span>,
      }),
      columnHelper.accessor('stage', {
        header: 'Stage',
        cell: (info) => <StageBadge stage={info.getValue()} />,
      }),
      columnHelper.accessor('squareFeet', {
        header: 'SF',
        cell: (info) => (
          <span className="tabular-nums text-fg-muted">
            {info.getValue()?.toLocaleString() ?? '–'}
          </span>
        ),
      }),
      columnHelper.accessor('baseRentPSF', {
        header: '$/SF',
        cell: (info) => (
          <span className="tabular-nums text-fg-muted">
            {info.getValue() ? `$${info.getValue()?.toFixed(2)}` : '–'}
          </span>
        ),
      }),
      columnHelper.accessor('leaseStartDate', {
        header: 'Start',
        cell: (info) => (
          <span className="tabular-nums text-fg-muted">{info.getValue() || '–'}</span>
        ),
      }),
      columnHelper.accessor('leaseEndDate', {
        header: 'End',
        cell: (info) => (
          <span className="tabular-nums text-fg-muted">{info.getValue() || '–'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectDeal(info.row.original);
              }}
              title="Edit"
              aria-label="Edit deal"
              className="p-1.5 rounded text-fg-muted hover:text-accent hover:bg-bg-hover transition-colors"
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete deal for "${info.row.original.propertyName || 'this property'}"?`)) {
                  onDeleteDeal(info.row.original.id);
                }
              }}
              title="Delete"
              aria-label="Delete deal"
              className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-bg-hover transition-colors"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ),
      }),
    ],
    [columnHelper, onSelectDeal, onDeleteDeal]
  );

  const table = useReactTable({
    data: deals,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated shadow-card">
      <table className="w-full border-collapse">
        <thead className="bg-bg-subtle border-b border-border">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const isActions = header.column.id === 'actions';
                return (
                  <th
                    key={header.id}
                    className={[
                      'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted',
                      canSort && !isActions
                        ? 'cursor-pointer hover:text-fg transition-colors select-none'
                        : '',
                      isActions ? 'text-right' : '',
                    ].join(' ')}
                    onClick={canSort && !isActions ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className={`inline-flex items-center gap-1 ${isActions ? 'justify-end w-full' : ''}`}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && !isActions && (
                        <span className="text-fg-subtle">
                          {sorted === 'asc' ? (
                            <ChevronUp size={12} strokeWidth={2.5} />
                          ) : sorted === 'desc' ? (
                            <ChevronDown size={12} strokeWidth={2.5} />
                          ) : (
                            <ArrowUpDown size={12} strokeWidth={2} className="opacity-40" />
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
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelectDeal(row.original)}
              className="hover:bg-bg-hover cursor-pointer transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2.5 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
