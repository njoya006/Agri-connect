"use client";

import Link from "next/link";
import { ClipboardList, CheckCircle2 } from "lucide-react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { useMetricTimeline } from "../../../lib/hooks/use-analytics";
import { formatDate } from "../../../lib/utils/helpers";
import { undoActivityInventory } from "@/lib/api/undo";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ActivityHubPage() {
  const { data: activityMetrics = [], isLoading } = useMetricTimeline({ metric_type: "activity" });
  const rows = activityMetrics.slice(0, 12);
  const [undoingId, setUndoingId] = useState<number | null>(null);

  const handleUndo = async (activityId: number) => {
    setUndoingId(activityId);
    try {
      await undoActivityInventory(activityId);
      toast.success("Inventory deduction undone.");
      // Optionally refetch activity/metrics here
    } catch (e) {
      toast.error("Failed to undo inventory deduction.");
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Activity</p>
          <h1 className="text-3xl font-semibold text-foreground">Field activity log</h1>
          <p className="text-sm text-foreground/70">Review telemetry synced from the backend analytics pipeline and log new work sessions.</p>
        </div>
        <Button asChild>
          <Link href="/farms/new">Link field to farm</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="h-5 w-5 text-accent" aria-hidden />
            Latest field signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farm</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Undo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell>{metric.farm_name}</TableCell>
                    <TableCell>{metric.notes || metric.metric_type}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        {metric.value} {metric.unit}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(metric.recorded_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={undoingId === metric.id}
                        onClick={() => handleUndo(metric.id)}
                      >
                        {undoingId === metric.id ? "Undoing..." : "Undo"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-foreground/60">
                    {isLoading ? "Loading recent activity metrics…" : "No metrics available yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to log new work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/70">
          <p>
            The Django backend exposes field activity endpoints under <code>/api/fields/{"{field_id}"}/activities/</code>. Use the mobile or desktop clients to
            submit irrigation, pest control, or harvest logs — they will appear above moments later.
          </p>
          <p>
            Coming soon: an inline workflow to submit activities directly from this dashboard. Until then, use the farm detail view or the public API to push
            updates.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
