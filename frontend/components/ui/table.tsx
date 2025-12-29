"use client";

import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as React from "react";

import { cn, formatDate } from "../../lib/utils/helpers";
import { Button } from "./button";

const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-2xl border border-border/40 bg-white/90 shadow-sm">
    <table ref={ref} className={cn("w-full min-w-max text-sm", className)} {...props} />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("text-left text-xs uppercase tracking-wide text-foreground/60", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-border/60", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("transition hover:bg-accent/5", className)} {...props} />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("px-4 py-3 font-semibold", className)} {...props} />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3", className)} {...props} />
));
TableCell.displayName = "TableCell";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  format?: "date" | "currency";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSizeOptions?: number[];
  initialSortKey?: Column<T>["key"];
}

export function DataTable<T extends Record<string, unknown>>({ data, columns, pageSizeOptions = [10, 25, 50], initialSortKey }: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<Column<T>["key"] | undefined>(initialSortKey);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0]);
  const [page, setPage] = React.useState(0);

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const aValue = a[sortKey as keyof T];
      const bValue = b[sortKey as keyof T];
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return sortDirection === "asc" ? -1 : 1;
    });
    return copy;
  }, [data, sortDirection, sortKey]);

  const pageCount = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(page * pageSize, page * pageSize + pageSize);

  const handleSort = (key: Column<T>["key"], sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const formatCell = (value: unknown, column: Column<T>, row: T) => {
    if (column.render) return column.render(row);
    if (column.format === "date" && typeof value === "string") return formatDate(value);
    return value as React.ReactNode;
  };

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key as string} className={cn(column.sortable && "cursor-pointer select-none")}
                onClick={() => handleSort(column.key, column.sortable)}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {sortKey === column.key && (
                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length ? (
            paginatedData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.key as string}>{formatCell(row[column.key as keyof T], column, row)}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-sm text-foreground/60">
                No records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className="rounded-lg border border-border/60 bg-white px-3 py-1"
            value={pageSize}
            onChange={(event) => {
              setPage(0);
              setPageSize(Number(event.target.value));
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPage(0)} disabled={page === 0}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 0))} disabled={page === 0}>
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
          <span className="text-xs text-foreground/70">
            Page {page + 1} of {pageCount || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((prev) => Math.min(prev + 1, pageCount - 1))}
            disabled={page >= pageCount - 1}
          >
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableCell, TableHead };
