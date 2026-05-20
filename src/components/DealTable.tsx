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
import type { Deal } from '../types';

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
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('tenantName', {
        header: 'Tenant',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('stage', {
        header: 'Stage',
        cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('squareFeet', {
        header: 'SF',
        cell: (info) => info.getValue()?.toLocaleString(),
      }),
      columnHelper.accessor('baseRentPSF', {
        header: '$/SF',
        cell: (info) => (info.getValue() ? `$${info.getValue()?.toFixed(2)}` : '–'),
      }),
      columnHelper.accessor('leaseStartDate', {
        header: 'Start Date',
        cell: (info) => info.getValue() || '–',
      }),
      columnHelper.accessor('leaseEndDate', {
        header: 'End Date',
        cell: (info) => info.getValue() || '–',
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2">
            <button
              onClick={() => onSelectDeal(info.row.original)}
              className="text-blue-600 hover:text-blue-900 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteDeal(info.row.original.id)}
              className="text-red-600 hover:text-red-900 text-sm"
            >
              Delete
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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-200"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <span className="text-xs">
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === 'desc' ? ' 🔽' : ' 🔼'
                      ) : null}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm text-gray-900">
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
