"use client";

import Link from "next/link";
import { Layers, ShoppingBag, UploadCloud } from "lucide-react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

export default function MarketplacePage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Marketplace</p>
          <h1 className="text-3xl font-semibold text-foreground">Listings + price board</h1>
          <p className="text-sm text-foreground/70">Review inventory-backed listings, track price updates, and keep buyers in sync.</p>
        </div>
        <Button asChild>
          <Link href="/farms">Link inventory</Link>
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="h-5 w-5 text-accent" aria-hidden />
              Listings feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/70">
            <p>The React UI for marketplace listings is under active development. Listings posted via the backend API remain live.</p>
            <p>
              POST to <code>/api/marketplace/listings/</code> with images + inventory references to publish offers. Once the UI ships, those endpoints will power
              the grid displayed here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Layers className="h-5 w-5 text-accent" aria-hidden />
              Price board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/70">
            <p>Price updates live under <code>/api/marketplace/prices/</code>. Use them to broadcast commodity insights across your network.</p>
            <p>Coming soon: filters, CSV exports, and alerts for sudden price swings.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-foreground/70 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 h-5 w-5 text-accent" aria-hidden />
            <p>
              Until the React listing form is complete, continue uploading via API clients (Hoppscotch, Thunder Client, etc.). The response payloads are ready to
              hydrate the UI once connected.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/docs">View API docs</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
