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
import { useMetricTimeline } from "../../lib/hooks/use-analytics";
import { useFarms } from "../../lib/hooks/use-farms";
import { formatDate } from "../../lib/utils/helpers";

const QUICK_ACTIONS = [
  { label: "Add Farm", href: "/farms/new", description: "Create a new operation record", icon: PlusCircle },
  { label: "Log Activity", href: "/farms/activities", description: "Capture field work updates", icon: Activity },
  { label: "View Marketplace", href: "/marketplace", description: "Review live offers", icon: ShoppingBag },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: farms = [], isLoading } = useFarms();
  const { data: yieldMetrics = [], isLoading: isYieldLoading } = useMetricTimeline({ metric_type: "yield" });
  const { data: activityMetrics = [], isLoading: isActivityLoading } = useMetricTimeline({ metric_type: "activity" });

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

  const stats = [
    { label: "Total Farms", value: totalFarms, icon: Leaf },
    { label: "Active Fields", value: activeFields, icon: Activity },
    { label: "Recent Activities", value: recentActivities.length, icon: LineChart },
  ];

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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Yield over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
