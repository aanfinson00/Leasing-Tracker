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
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-fg tracking-tight leading-tight">
              {info.getValue() || 'Untitled'}
            </span>
            {info.row.original.city && (
              <span className="text-xs text-fg-subtle mt-0.5">
                {info.row.original.city}
                {info.row.original.state ? `, ${info.row.original.state}` : ''}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('tenantName', {
        header: 'Tenant',
        cell: (info) => <span className="text-sm text-fg-muted">{info.getValue() || '–'}</span>,
      }),
      columnHelper.accessor('stage', {
        header: 'Stage',
        cell: (info) => <StageBadge stage={info.getValue()} />,
      }),
      columnHelper.accessor('squareFeet', {
        header: 'SF',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted">
            {info.getValue()?.toLocaleString() ?? '–'}
          </span>
        ),
      }),
      columnHelper.accessor('baseRentPSF', {
        header: '$/SF',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted">
            {info.getValue() ? `$${info.getValue()?.toFixed(2)}` : '–'}
          </span>
        ),
      }),
      columnHelper.accessor('leaseStartDate', {
        header: 'Start',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted">{info.getValue() || '–'}</span>
        ),
      }),
      columnHelper.accessor('leaseEndDate', {
        header: 'End',
        cell: (info) => (
          <span className="tabular-nums text-sm text-fg-muted">{info.getValue() || '–'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                if (confirm(`Delete deal for "${info.row.original.propertyName || 'this property'}"?`)) {
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
    <div className="overflow-hidden rounded-2xl bg-bg-elevated shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const isActions = header.column.id === 'actions';
                  return (
                    <th
                      key={header.id}
                      className={[
                        'px-5 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle',
                        canSort && !isActions
                          ? 'cursor-pointer hover:text-fg transition-colors select-none'
                          : '',
                        isActions ? 'text-right' : '',
                      ].join(' ')}
                      onClick={canSort && !isActions ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className={`inline-flex items-center gap-1.5 ${isActions ? 'justify-end w-full' : ''}`}>
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
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
