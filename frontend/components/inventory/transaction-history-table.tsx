"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useInventoryTransactionsPaged } from "@/lib/hooks/use-inventory";
import type { InventoryTransaction } from "@/lib/api/inventory";
import { Button } from "@/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { formatDate } from "@/lib/utils/helpers";

interface Props {
  itemId: number;
  initialPageSize?: number;
}

export default function TransactionHistoryTable({ itemId, initialPageSize = 10 }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [ordering, setOrdering] = useState<string>("-transaction_date");

  const { data, isLoading, isError, refetch } = useInventoryTransactionsPaged(itemId, page, pageSize, ordering);

  const typed = data as { results: InventoryTransaction[]; count: number } | undefined;
  const transactions = typed?.results ?? [];
  const total = typed?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleOrdering = (field: string) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      setOrdering(`-${field}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-full rounded bg-muted/40" />
        <div className="h-8 w-full rounded bg-muted/40" />
        <div className="h-8 w-full rounded bg-muted/40" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700">
        Could not load transactions. <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-foreground/60">No transactions yet. Use the stock actions to add entries.</div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={ordering.includes("transaction_date") ? "default" : "ghost"} onClick={() => toggleOrdering("transaction_date")}>
            Date
          </Button>
          <Button size="sm" variant={ordering.includes("transaction_type") ? "default" : "ghost"} onClick={() => toggleOrdering("transaction_type")}>
            Type
          </Button>
          <Button size="sm" variant={ordering.includes("quantity_change") ? "default" : "ghost"} onClick={() => toggleOrdering("quantity_change")}>
            Quantity
          </Button>
        </div>
        <div className="text-sm text-foreground/60">Page {page} of {totalPages}</div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Prev</TableHead>
            <TableHead>New</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx: InventoryTransaction) => (
            <TableRow key={tx.id} className="hover:bg-muted/50">
              <TableCell>{formatDate(tx.transaction_date)}</TableCell>
              <TableCell className="font-medium">{tx.transaction_type}</TableCell>
              <TableCell>{tx.quantity_change}</TableCell>
              <TableCell>{tx.previous_quantity}</TableCell>
              <TableCell>{tx.new_quantity}</TableCell>
              <TableCell>{tx.performed_by ?? "—"}</TableCell>
              <TableCell>{tx.notes ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
        <div className="text-sm text-foreground/60">{total} transactions</div>
      </div>
    </div>
  );
}
