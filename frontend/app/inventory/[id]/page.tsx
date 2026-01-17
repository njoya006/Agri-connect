"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { InventoryItemModal } from "@/components/modals/inventory-item-modal";
import { InventoryStockModal } from "@/components/modals/inventory-stock-modal";
import { useInventoryItem, useInventoryTransactions } from "@/lib/hooks/use-inventory";
import TransactionDetail from "@/components/inventory/transaction-detail";
import { useLowStockAlerts } from "@/lib/hooks/use-low-stock";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/helpers";

interface PageProps {
  params: {
    id: string;
  };
}

export default function InventoryItemPage({ params }: PageProps) {
  const id = Number(params.id);
  const { data: item, isLoading: loadingItem, isError, refetch } = useInventoryItem(id);
  const { data: transactions = [], isLoading: loadingTx, refetch: refetchTx } = useInventoryTransactions(id);

  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const filteredTx = useMemo(() => {
    if (!filterType) return transactions;
    return transactions.filter((t) => t.transaction_type === filterType);
  }, [transactions, filterType]);

  // subscribe to low-stock events for this item (WS with SSE fallback)
  useLowStockAlerts(item?.id);

  if (loadingItem) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted/40" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-40 rounded-xl bg-muted/40" />
          <div className="col-span-2 h-40 rounded-xl bg-muted/40" />
        </div>
      </section>
    );
  }

  if (isError || !item) {
    return (
      <section>
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700">
          Could not load inventory item. <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {item.is_low_stock && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">Low stock — consider restocking soon.</div>
      )}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Inventory</p>
          <h1 className="text-3xl font-semibold text-foreground">{item.name}</h1>
          <p className="text-sm text-foreground/70">{item.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InventoryItemModal item={item} title={`Edit ${item.name}`} trigger={<Button size="sm">Edit</Button>} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Item overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Farm</span>
                <Link href={`/farms/${item.farm}`} className="font-medium text-foreground hover:text-accent">{item.farm_name}</Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">On-hand</span>
                <span className="font-semibold">{Number(item.quantity)} {item.unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Minimum</span>
                <span>{Number(item.minimum_stock_level)} {item.unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Value</span>
                <span className="font-semibold">{formatCurrency(item.total_value || 0)}</span>
              </div>
              {item.expiry_date && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Expiry</span>
                  <span>{formatDate(item.expiry_date)}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <InventoryStockModal mode="restock" item={item} trigger={<Button>Restock</Button>} />
              <InventoryStockModal mode="use" item={item} trigger={<Button variant="ghost">Use</Button>} />
              <InventoryStockModal mode="adjust" item={item} trigger={<Button variant="outline">Adjust</Button>} />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transactions</CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-border/60 bg-white px-3 py-1 text-sm"
                    value={filterType ?? ""}
                    onChange={(e) => setFilterType(e.target.value || undefined)}
                  >
                    <option value="">All types</option>
                    <option value="purchase">Purchase</option>
                    <option value="usage">Usage</option>
                    <option value="sale">Sale</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                {/* Transaction history table with pagination/sorting */}
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <TransactionHistoryTable itemId={item.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        <TransactionDetail transaction={selectedTx} open={Boolean(selectedTx)} onClose={() => setSelectedTx(null)} />
    </section>
  );
}
