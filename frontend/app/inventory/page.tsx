"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CircleDollarSign, Download, Filter, Package, RefreshCcw, Timer } from "lucide-react";

import { InventoryItemModal } from "@/components/modals/inventory-item-modal";
import { InventoryStockModal } from "@/components/modals/inventory-stock-modal";
import {
  INVENTORY_CATEGORY_LABELS,
  type InventoryCategory,
  type InventoryItem,
  type InventoryItemFilters,
} from "@/lib/api/inventory";
import { useFarms } from "@/lib/hooks/use-farms";
import { useInventoryStreamingExport, useInventoryItems } from "@/lib/hooks/use-inventory";
import { useInventoryTurnoverRate } from "@/lib/hooks/use-analytics";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils/helpers";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

const CATEGORY_ALL = "all";
const FARM_ALL = "all";
const CATEGORY_OPTIONS = [{ label: "All categories", value: CATEGORY_ALL }].concat(
  (Object.entries(INVENTORY_CATEGORY_LABELS) as Array<[InventoryCategory, string]>).map(([value, label]) => ({
    value,
    label,
  })),
);

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL);
  const [farmFilter, setFarmFilter] = useState<string>(FARM_ALL);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const { data: farms = [] } = useFarms();

  const filters = useMemo<InventoryItemFilters>(() => {
    const next: InventoryItemFilters = {};
    if (debouncedSearch) next.search = debouncedSearch;
    if (categoryFilter !== CATEGORY_ALL) next.category = categoryFilter as InventoryCategory;
    if (farmFilter !== FARM_ALL) next.farm = Number(farmFilter);
    if (onlyLowStock) next.low_stock = true;
    return next;
  }, [debouncedSearch, categoryFilter, farmFilter, onlyLowStock]);

  const {
    data: items = [],
    isLoading,
    isFetching,
    error,
  } = useInventoryItems(filters);
  // Streaming export mutation
  const exportStreamingMutation = useInventoryStreamingExport();

  // Export customization state
  const [exportFields, setExportFields] = useState<string[]>([]);
  const [exportStartDate, setExportStartDate] = useState<string>("");
  const [exportEndDate, setExportEndDate] = useState<string>("");

  const totalInventoryValue = useMemo(() => items.reduce((sum, item) => sum + toNumber(item.total_value), 0), [items]);
  const lowStockItems = useMemo(() => items.filter((item) => item.is_low_stock), [items]);
  const expiringSoonItems = useMemo(() => items.filter((item) => item.is_expiring_soon), [items]);

  const farmOptions = useMemo(
    () => [
      { label: "All farms", value: FARM_ALL },
      ...farms.map((farm) => ({ label: farm.name, value: String(farm.id) })),
    ],
    [farms],
  );

  const filtersActive = Boolean(debouncedSearch || categoryFilter !== CATEGORY_ALL || farmFilter !== FARM_ALL || onlyLowStock);

  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter(CATEGORY_ALL);
    setFarmFilter(FARM_ALL);
    setOnlyLowStock(false);
  };

  const handleExport = async () => {
    try {
      const blob = await exportStreamingMutation.mutateAsync({
        fields: exportFields.length ? exportFields : undefined,
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        farm: farmFilter !== FARM_ALL ? farmFilter : undefined,
        category: categoryFilter !== CATEGORY_ALL ? categoryFilter : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `agri-connect-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Inventory export ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to export inventory");
    }
  };

  const summaryCards = [
    {
      label: "Tracked SKUs",
      value: items.length,
      description: "Active items across all farms",
      icon: Package,
    },
    {
      label: "Low-stock alerts",
      value: lowStockItems.length,
      description: "Below the minimum threshold",
      icon: AlertTriangle,
    },
    {
      label: "Expiring soon",
      value: expiringSoonItems.length,
      description: "Monitor shelf-life risk",
      icon: Timer,
    },
    {
      label: "Inventory value",
      value: formatCurrency(totalInventoryValue || 0),
      description: "Based on purchase price",
      icon: CircleDollarSign,
    },
  ];

  // Inventory usage analytics (turnover rate)
  const {
    data: turnoverData = [],
    isLoading: isTurnoverLoading,
    error: turnoverError,
  } = useInventoryTurnoverRate(30);
  const filteredTurnover = useMemo(() => {
    let data = turnoverData;
    if (categoryFilter !== CATEGORY_ALL) {
      data = data.filter((item: { item_id: number }) => {
        const inv = items.find((i) => i.id === item.item_id);
        return inv && inv.category === categoryFilter;
      });
    }
    if (farmFilter !== FARM_ALL) {
      data = data.filter((item: { item_id: number }) => {
        const inv = items.find((i) => i.id === item.item_id);
        return inv && String(inv.farm) === String(farmFilter);
      });
    }
    return data;
  }, [turnoverData, categoryFilter, farmFilter, items]);

  return (
    <section className="space-y-6">
            {/* Inventory Usage Trends Visualization */}
            <Card className="shadow-card border border-accent/30 bg-white/90">
              <CardHeader>
                <CardTitle>Inventory Usage Trends (30d)</CardTitle>
                <p className="text-sm text-foreground/60">Top used items by farm/category. Filters apply below.</p>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {isTurnoverLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                        Loading usage trends…
                      </div>
                    ) : turnoverError ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="rounded-xl bg-red-100 px-6 py-4 text-center text-sm text-red-700 max-w-xs w-full mx-auto shadow-sm border border-red-200" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          Unable to load usage data.<br />{turnoverError instanceof Error ? turnoverError.message : 'Please try again.'}
                        </div>
                      </div>
                    ) : filteredTurnover.length ? (
                      <BarChart
                        data={filteredTurnover.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 20, right: 40, left: 80, bottom: 20 }}
                        barCategoryGap={16}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis type="number" stroke="#64748b" fontSize={13} tickLine={false} axisLine={false} />
                        <YAxis
                          dataKey="item_name"
                          type="category"
                          width={180}
                          tick={({ x, y, payload }) => (
                            <text
                              x={x}
                              y={y}
                              fill="#334155"
                              fontSize="13"
                              dy={6}
                              style={{ whiteSpace: 'pre-line', fontWeight: 500 }}
                            >
                              {String(payload.value).length > 24
                                ? `${String(payload.value).slice(0, 22)}...`
                                : payload.value}
                            </text>
                          )}
                        />
                        <Tooltip contentStyle={{ borderRadius: 12, maxWidth: 220, whiteSpace: 'pre-line' }} />
                        <Bar dataKey="total_out" fill="#0ea5e9" radius={[8, 8, 8, 8]} name="Used">
                          {filteredTurnover.slice(0, 10).map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill="#0ea5e9" />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <p className="rounded-xl bg-muted/60 px-6 py-4 text-center text-sm text-foreground/60 max-w-xs w-full mx-auto shadow-sm border border-border/40" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          No usage data for this period.
                        </p>
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Inventory</p>
          <h1 className="text-3xl font-semibold text-foreground">Stock control workspace</h1>
          <p className="text-sm text-foreground/70">
            Connected to the Django inventory service. Search, filter, and act on stock signals without leaving the browser.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Export customization UI */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <label className="text-xs font-medium">Fields:</label>
              <select
                multiple
                value={exportFields}
                onChange={e => setExportFields(Array.from(e.target.selectedOptions, o => o.value))}
                className="border rounded px-1 py-0.5 text-xs"
                style={{ minWidth: 120 }}
              >
                {[
                  'id', 'farm', 'category', 'name', 'description', 'quantity', 'unit',
                  'minimum_stock_level', 'purchase_price', 'selling_price', 'expiry_date',
                  'storage_location', 'supplier_info', 'last_audited', 'created_at', 'updated_at',
                ].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <label className="text-xs font-medium">Start date:</label>
              <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="border rounded px-1 py-0.5 text-xs" />
              <label className="text-xs font-medium">End date:</label>
              <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="border rounded px-1 py-0.5 text-xs" />
            </div>
          </div>
          <Button variant="outline" onClick={handleExport} isLoading={exportStreamingMutation.isPending} disabled={!items.length}>
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
          <InventoryItemModal
            trigger={
              <Button>
                <Package className="h-4 w-4" aria-hidden /> Add inventory item
              </Button>
            }
          />
        </div>
      </header>

      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
            <p className="font-medium">
              {lowStockItems.length} item{lowStockItems.length === 1 ? "" : "s"} below the safety stock level.
            </p>
            {!onlyLowStock && (
              <Button size="sm" variant="ghost" onClick={() => setOnlyLowStock(true)}>
                Show low stock only
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-amber-900/80 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                <span className="font-semibold">{item.name}</span>
                <span>
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
            {lowStockItems.length > 3 && (
              <p className="text-xs text-amber-800">
                +{lowStockItems.length - 3} more alerts. Use filters to focus the list.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="shadow-card">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">{card.label}</p>
                <CardTitle className="text-3xl">
                  {isLoading && typeof card.value === "number" ? "—" : card.value}
                </CardTitle>
              </div>
              <card.icon className="h-10 w-10 rounded-2xl bg-accent/10 p-2 text-accent" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Filters & search</CardTitle>
              <p className="text-sm text-foreground/60">Tune the dataset by farm, category, or alert status.</p>
            </div>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={handleResetFilters}>
                <RefreshCcw className="h-4 w-4" aria-hidden /> Reset filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Search"
              placeholder="Name, supplier, or notes"
              variant="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
              searchable
            />
            <Select label="Farm" value={farmFilter} onChange={setFarmFilter} options={farmOptions} searchable />
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-foreground/80">Focus on alerts</span>
              <Button
                type="button"
                variant={onlyLowStock ? "default" : "outline"}
                className="justify-start"
                onClick={() => setOnlyLowStock((prev) => !prev)}
              >
                <Filter className="h-4 w-4" aria-hidden /> {onlyLowStock ? "Showing low stock only" : "Highlight low stock"}
              </Button>
            </div>
          </div>
          {isFetching && !isLoading && <p className="text-xs text-foreground/60">Refreshing data…</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Inventory items</CardTitle>
              <p className="text-sm text-foreground/60">
                {items.length} record{items.length === 1 ? "" : "s"} loaded{filtersActive ? " (filtered)" : ""}.
              </p>
            </div>
            <InventoryItemModal
              title="Add inventory item"
              trigger={
                <Button variant="secondary" size="sm">
                  <Package className="h-4 w-4" aria-hidden /> Quick add
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700">
              Could not load inventory items. {error instanceof Error ? error.message : "Please try again."}
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-foreground/60">Syncing inventory…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border/60 p-8 text-sm text-foreground/70">
              <p>No inventory records yet. Connect your first lot to unlock alerts.</p>
              <InventoryItemModal
                title="Add inventory item"
                trigger={
                  <Button size="sm">
                    <Package className="h-4 w-4" aria-hidden /> Create item
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <InventoryTableRow key={item.id} item={item} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function InventoryTableRow({ item }: { item: InventoryItem }) {
  const currentQuantity = toNumber(item.quantity);
  const minimumStock = Math.max(0, toNumber(item.minimum_stock_level));
  const unit = item.unit || "units";
  const ratio = minimumStock > 0 ? Math.min(1, currentQuantity / minimumStock) : 1;
  const ratioPercent = Math.round(ratio * 100);

  const badges: Array<{ label: string; className: string }> = [];
  if (item.is_low_stock) {
    badges.push({ label: "Low stock", className: "bg-amber-100 text-amber-800" });
  }
  if (item.is_expiring_soon) {
    badges.push({ label: "Expiring soon", className: "bg-orange-100 text-orange-800" });
  }
  if (!badges.length) {
    badges.push({ label: "Healthy", className: "bg-emerald-100 text-emerald-700" });
  }

  return (
    <TableRow>
      <TableCell className="min-w-[220px] align-top">
        <div className="space-y-1">
          <Link href={`/inventory/${item.id}`} className="text-sm font-semibold text-foreground hover:text-accent">
            {item.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-medium text-foreground">
              {INVENTORY_CATEGORY_LABELS[item.category]}
            </span>
            {item.storage_location && <span>{item.storage_location}</span>}
          </div>
          {item.description && <p className="text-xs text-foreground/60">{item.description}</p>}
        </div>
      </TableCell>
      <TableCell className="align-top text-sm font-medium text-foreground">{item.farm_name}</TableCell>
      <TableCell className="align-top">
        <div className="space-y-1 text-xs text-foreground/60">
          <div className="flex items-center justify-between font-medium text-foreground">
            <span>
              {currentQuantity} {unit}
            </span>
            <span>Min {minimumStock} {unit}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-foreground/10">
            <div
              className={`h-2 rounded-full ${item.is_low_stock ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, ratioPercent)}%` }}
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top text-sm font-semibold text-foreground">
        {formatCurrency(item.total_value || 0)}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge.label} className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="min-w-[220px] text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <InventoryStockModal
            mode="restock"
            item={item}
            trigger={
              <Button size="sm" variant="outline">
                Restock
              </Button>
            }
          />
          <InventoryStockModal
            mode="use"
            item={item}
            trigger={
              <Button size="sm" variant="ghost">
                Use stock
              </Button>
            }
          />
          <InventoryItemModal
            title={`Edit ${item.name}`}
            item={item}
            trigger={
              <Button size="sm" variant="secondary">
                Edit
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}
