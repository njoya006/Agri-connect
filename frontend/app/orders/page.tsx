"use client";
import { useOrders } from "@/lib/hooks/use-orders";

export default function OrdersPage() {
  const { data = [], isLoading } = useOrders();

  if (isLoading) return <div>Loading orders…</div>;

  return (
    <section>
      <h1 className="text-2xl font-semibold">My Orders</h1>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/70">You have no orders yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.map((order: any) => (
            <li key={order.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Order #{order.id}</div>
                  <div className="text-xs text-foreground/60">Status: {order.status}</div>
                </div>
                <div className="text-sm font-medium">{order.total_price} XAF</div>
              </div>
              <ul className="mt-2 text-sm">
                {order.items?.map((it: any) => (
                  <li key={it.id} className="text-foreground/70">{it.quantity} × listing #{it.listing}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
