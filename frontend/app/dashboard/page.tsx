"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Activity, Leaf, LineChart, PlusCircle, ShoppingBag } from "lucide-react";
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
} from "recharts";

import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

import { useAuth } from "../../lib/hooks/use-auth";
import { useMetricTimeline, useInventoryTurnoverRate } from "../../lib/hooks/use-analytics";
import { useFarms } from "../../lib/hooks/use-farms";
import { useInventoryItems } from "../../lib/hooks/use-inventory";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "../../lib/utils/helpers";

const QUICK_ACTIONS = [
  { label: "Add Farm", href: "/farms/new", description: "Create a new operation record", icon: PlusCircle },
  { label: "Log Activity", href: "/farms/activities", description: "Capture field work updates", icon: Activity },
  { label: "View Marketplace", href: "/marketplace", description: "Review live offers", icon: ShoppingBag },
];

export default function DashboardPage() {
  // All hooks must be called inside the component body
  const { user } = useAuth();
  const { data: farms = [], isLoading } = useFarms();
  const { data: yieldMetrics = [], isLoading: isYieldLoading } = useMetricTimeline({ metric_type: "yield" });
  const { data: activityMetrics = [], isLoading: isActivityLoading } = useMetricTimeline({ metric_type: "activity" });
  const { data: turnoverData = [], isLoading: isTurnoverLoading } = useInventoryTurnoverRate(30);
  const { data: inventoryItems = [], isLoading: isInventoryLoading } = useInventoryItems({ low_stock: true });

  const lowStockItems = inventoryItems.filter((item) => item.is_low_stock);
  const totalFarms = farms.length;
  const activeFields = farms.reduce((acc, farm) => acc + (farm.active_field_count ?? 0), 0);
  const recentActivities = useMemo(() => {
    return (activityMetrics ?? [])
      .slice(0, 6)
      .map((metric) => ({
        id: metric.id,
        farm: metric.farm_name,
        activity: metric.notes || metric.metric_type,
        date: metric.recorded_at,
        status: Number(metric.value) >= 0 ? "Logged" : "Review",
      }));
  }, [activityMetrics]);
  const yieldTrend = useMemo(() => {
    const trimmed = (yieldMetrics ?? []).slice(0, 8).reverse();
    return trimmed.map((metric) => ({
      period: formatDate(metric.recorded_at, "MMM d"),
      yield: Number(metric.value) || 0,
    }));
  }, [yieldMetrics]);
  const topUsed = useMemo(() => {
    return [...(turnoverData ?? [])]
      .sort((a, b) => b.total_out - a.total_out)
      .slice(0, 5);
  }, [turnoverData]);
  const stats = [
    { label: "Total Farms", value: totalFarms, icon: Leaf },
    { label: "Active Fields", value: activeFields, icon: Activity },
    { label: "Recent Activities", value: recentActivities.length, icon: LineChart },
    { label: "Low-stock Items", value: lowStockItems.length, icon: AlertTriangle },
  ];
      {/* Low-stock alert summary */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
            <p className="font-medium">
              {lowStockItems.length} item{lowStockItems.length === 1 ? "" : "s"} below the safety stock level.
            </p>
            <Link href="/inventory" className="text-xs text-accent underline ml-2">View inventory</Link>
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
                +{lowStockItems.length - 3} more alerts. See inventory for details.
              </p>
            )}
          </div>
        </div>
      )}

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-foreground/60">Welcome back, {user?.first_name ?? "planner"}</p>
          <h1 className="text-3xl font-semibold text-foreground">Your agronomic control room</h1>
          <p className="mt-2 text-sm text-foreground/70">Track farm operations, marketplace signals, and field insights in one place.</p>
        </div>
        <Button asChild>
          <Link href="/farms/new">Create new farm</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">{stat.label}</p>
                <CardTitle className="text-3xl">{isLoading ? "—" : stat.value}</CardTitle>
              </div>
              <stat.icon className="h-10 w-10 rounded-2xl bg-accent/10 p-2 text-accent" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60">Snapshot updated in real time.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Inventory Usage Trends Card */}
        <Card className="lg:col-span-1 shadow-card border border-accent/30 bg-white/90">
          <CardHeader>
            <CardTitle>Top Used Inventory (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {isTurnoverLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                    Loading usage trends…
                  </div>
                ) : topUsed.length ? (
                  <RechartsLineChart data={topUsed} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="item_name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Line type="monotone" dataKey="total_out" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Used" />
                  </RechartsLineChart>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                    No usage data for this period.
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Yield over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {yieldTrend.length ? (
                  <RechartsLineChart data={yieldTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Line type="monotone" dataKey="yield" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                  </RechartsLineChart>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                    {isYieldLoading ? "Loading yield telemetry…" : "No yield metrics recorded yet."}
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-2xl border border-border/60 p-3 transition hover:border-accent"
              >
                <action.icon className="h-5 w-5 text-accent" aria-hidden />
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="text-xs text-foreground/60">{action.description}</span>
                </div>
                <span className="text-xs font-semibold text-foreground/50 group-hover:text-accent">Go →</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent activities</CardTitle>
              {(isActivityLoading || isLoading) && <span className="text-xs text-foreground/60">Loading latest telemetry…</span>}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farm</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.length ? (
                  recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.farm}</TableCell>
                      <TableCell>{activity.activity}</TableCell>
                      <TableCell>{formatDate(activity.date)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                          {activity.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-foreground/60">
                      {isActivityLoading ? "Syncing activity metrics…" : "No activity metrics recorded yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
