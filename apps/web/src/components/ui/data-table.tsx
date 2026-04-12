'use client';

import { flexRender, Table as TanStackTable } from '@tanstack/react-table';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResizeHandle } from '@/components/ui/resize-handle';
import { useResizableColumns } from '@/hooks/use-resizable-columns';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  defaultColumnWidths?: readonly number[];
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  defaultColumnWidths,
  onRowClick,
  emptyMessage = 'No results found.',
  emptyIcon,
}: DataTableProps<TData>) {
  const resizable = defaultColumnWidths != null && defaultColumnWidths.length > 0;
  const { widths, startResize } = useResizableColumns(defaultColumnWidths ?? []);
  const columnCount = table.getAllColumns().length;

  return (
    <div className="rounded-md border">
      <Table style={resizable ? { tableLayout: 'fixed' } : undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, idx) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    resizable && 'relative overflow-hidden',
                    header.column.getCanSort() && 'cursor-pointer select-none',
                  )}
                  style={resizable ? { width: widths[idx] } : undefined}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  {resizable && <ResizeHandle onMouseDown={startResize(idx)} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center"
                >
                  {emptyIcon && (
                    <div className="flex justify-center mb-2">
                      {emptyIcon}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {emptyMessage}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/50',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell, idx) => (
                    <TableCell
                      key={cell.id}
                      className={cn(resizable && 'overflow-hidden text-ellipsis')}
                      style={resizable ? { width: widths[idx] } : undefined}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
