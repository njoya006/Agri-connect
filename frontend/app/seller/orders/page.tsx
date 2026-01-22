"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import Link from "next/link";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [pageUrl, setPageUrl] = useState<string | null>('/marketplace/orders/seller/');
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const params: Record<string, string> = {};
        if (statusFilter) params.status = statusFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        const resp = await apiClient.get(pageUrl || '/marketplace/orders/seller/', { params });
        const data = resp.data?.results ?? resp.data ?? [];
        setOrders(data || []);
        setNextUrl(resp.data?.next ?? null);
        setPrevUrl(resp.data?.previous ?? null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [pageUrl, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.get('/marketplace/orders/seller/summary/');
        setSummary(resp.data?.summary ?? []);
      } catch (e) {
        console.error('summary fetch failed', e);
      }
    })();
  }, []);

  const totalSales = orders.reduce((s, o) => s + Number(o.total_price || 0), 0) || summary.reduce((s, a) => s + Number(a.total_sales || 0), 0);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Seller Orders</h1>
      <div className="text-sm">Total sales: {totalSales} XAF</div>
      {summary.length > 0 && (
        <div className="rounded border p-3">
          <div className="font-semibold text-sm mb-2">Sales summary</div>
          <ul className="text-sm space-y-1">
            {summary.map((s) => (
              <li key={s.listing_id} className="flex items-center justify-between">
                <div className="text-xs">{s.title ?? `Listing ${s.listing_id}`}</div>
                <div className="text-xs font-medium">{s.total_quantity} units · {s.total_sales} XAF</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm">
        <label className="text-xs">Status:</label>
        <select
          value={statusFilter ?? ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="border rounded px-2 py-1 text-xs"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label className="text-xs">From:</label>
        <input type="date" onChange={(e) => setDateFrom(e.target.value || null)} className="border px-2 py-1 text-xs" />
        <label className="text-xs">To:</label>
        <input type="date" onChange={(e) => setDateTo(e.target.value || null)} className="border px-2 py-1 text-xs" />
      </div>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Order #{o.id}</div>
                <div className="text-xs">Buyer: {o.buyer_email ?? o.buyer}</div>
                <div className="text-xs">Status: {o.status}</div>
              </div>
              <div className="text-sm font-medium">{o.total_price} XAF</div>
            </div>
            <div className="mt-2 text-xs">
              Items:
              <ul className="ml-3 list-disc">
                {o.items?.map((it: any) => (
                  <li key={it.id}>{it.quantity} × {it.listing_title ?? it.listing}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPageUrl(prevUrl)}
          disabled={!prevUrl}
        >
          Previous
        </button>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPageUrl(nextUrl)}
          disabled={!nextUrl}
        >
          Next
        </button>
      </div>
    </section>
  );
}
