"use client";

import Link from "next/link";
import { Sprout, MapPin, Layers } from "lucide-react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { useFarms } from "../../lib/hooks/use-farms";
import { formatDate } from "../../lib/utils/helpers";

export default function FarmsPage() {
  const { data: farms = [], isLoading } = useFarms();

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Operations</p>
          <h1 className="text-3xl font-semibold text-foreground">Farms workspace</h1>
          <p className="mt-2 text-sm text-foreground/70">Review every farm, its fields, and the most recent telemetry before taking action.</p>
        </div>
        <Button asChild>
          <Link href="/farms/new">Add farm</Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-foreground/60">
          Loading farm registry…
        </div>
      ) : farms.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {farms.map((farm) => (
            <Card key={farm.id} className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sprout className="h-5 w-5 text-accent" aria-hidden />
                  {farm.name}
                </CardTitle>
                <p className="text-sm text-foreground/60">{farm.location}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-foreground/70">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-foreground/50" aria-hidden />
                  {farm.total_area} / {farm.soil_type}
                </p>
                <p className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-foreground/50" aria-hidden />
                  {farm.active_field_count} active fields
                </p>
                <p>
                  Last activity: {farm.last_activity_date ? formatDate(farm.last_activity_date) : "No activity yet"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-foreground/60">
          No farms recorded yet. Start by creating one above and syncing it with your teams.
        </div>
      )}
    </section>
  );
}
