"use client";

import Link from "next/link";
import { Layers, ShoppingBag, UploadCloud } from "lucide-react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { useMarketplaceListings, useMarketplacePrices } from "@/lib/hooks/use-marketplace";
import Image from "next/image";
import { useState, useEffect } from "react";
import { addToCart, getCart } from "@/lib/cart";
// `Link` already imported above

export default function MarketplacePage() {
  const { data: listings = [], isLoading: listingsLoading, error: listingsError } = useMarketplaceListings();
  const { data: prices = [], isLoading: pricesLoading, error: pricesError } = useMarketplacePrices();
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const [qtys, setQtys] = useState<Record<number, string>>({});

  useEffect(() => {
    // initialize per-listing qty defaults
    if (listings && listings.length) {
      const initial: Record<number, string> = {};
      listings.forEach((l: any) => {
        initial[l.id] = '1';
      });
      setQtys((s) => ({ ...initial, ...s }));
    }
  }, [listings]);

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
            {listingsLoading ? (
              <p>Loading listings…</p>
            ) : listingsError ? (
              <p className="text-red-500">Failed to load listings.</p>
            ) : listings.length === 0 ? (
              <p>No listings available.</p>
            ) : (
              <div className="grid gap-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-4 border-b pb-3 last:border-b-0">
                    {listing.image && (
                      <Image src={listing.image} alt={listing.title} width={64} height={64} className="rounded object-cover" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{listing.title}</div>
                      <div className="text-xs text-foreground/60">{listing.description}</div>
                      <div className="text-accent font-bold mt-1">{listing.price_per_unit} XAF</div>
                      <div className="mt-2">
                        <label className="text-xs mr-2">Qty</label>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={qtys[listing.id] ?? '1'}
                          onChange={(e) => setQtys((s) => ({ ...s, [listing.id]: e.target.value }))}
                          className="w-20 rounded border px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => {
                            const raw = qtys[listing.id] ?? '1';
                            const qty = Number(raw) || 1;
                            if (qty <= 0) return;
                            addToCart({ listingId: listing.id, title: listing.title, price_per_unit: Number(listing.price_per_unit), quantity: qty });
                            setAdded((s) => ({ ...s, [listing.id]: true }));
                            setTimeout(() => setAdded((s) => ({ ...s, [listing.id]: false })), 1400);
                          }}
                          className={"ml-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold " + (added[listing.id] ? "bg-green-600 text-white" : "bg-accent text-accent-foreground")}
                        >
                          {added[listing.id] ? 'Added' : 'Add to cart'}
                        </button>
                        <Link href="/marketplace/checkout" className="ml-3 text-xs text-foreground/70 underline">Checkout</Link>
                      </div>
                      {listing.inventory_reference && (
                        <div className="text-xs text-foreground/40">Inventory: {listing.inventory_reference}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {pricesLoading ? (
              <p>Loading prices…</p>
            ) : pricesError ? (
              <p className="text-red-500">Failed to load prices.</p>
            ) : prices.length === 0 ? (
              <p>No price data available.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Commodity</th>
                    <th className="text-left">Price</th>
                    <th className="text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr key={price.id}>
                      <td>{price.commodity}</td>
                      <td>{price.price} XAF</td>
                      <td>{new Date(price.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
