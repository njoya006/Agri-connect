"use client";

import { useEffect, useState } from "react";
import { getCart, removeFromCart, clearCart, updateQuantity, type CartItem } from "@/lib/cart";
import { useCreateOrder } from "@/lib/hooks/use-orders";
import { Button } from "@/ui/button";
import Link from "next/link";
import apiClient from "@/lib/api/client";

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const createOrder = useCreateOrder();

  useEffect(() => {
    setItems(getCart());
  }, []);

  const placeOrder = async () => {
    if (!items.length) return;
    const total = items.reduce((s, i) => s + (Number(i.price_per_unit || 0) * Number(i.quantity)), 0);

    try {
      // Call mock payment endpoint first
      const payResp = await apiClient.post('/payments/mock/', { amount: String(total), currency: 'XAF' });
      if (payResp.data?.status !== 'success') {
        window.alert('Payment failed');
        return;
      }

      const payload = { items: items.map((i) => ({ listing: i.listingId, quantity: i.quantity })) };
      await createOrder.mutateAsync(payload);
      clearCart();
      setItems([]);
      window.alert('Order placed successfully');
      window.location.href = '/orders';
    } catch (e) {
      window.alert('Payment or order failed');
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      {items.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <Link href="/marketplace" className="text-accent underline">Browse listings</Link>
        </div>
      ) : (
        <div>
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.listingId} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-xs text-foreground/60">{it.quantity} × {it.price_per_unit} XAF</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={String(it.quantity)}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      updateQuantity(it.listingId, v);
                      setItems(getCart());
                    }}
                    className="w-24 rounded border px-2 py-1 text-sm"
                  />
                  <button
                    className="text-xs text-red-600"
                    onClick={() => {
                      removeFromCart(it.listingId);
                      setItems(getCart());
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium">Total: {items.reduce((s, i) => s + (Number(i.price_per_unit || 0) * Number(i.quantity)), 0)} XAF</div>
            <Button onClick={placeOrder}>Place order</Button>
          </div>
        </div>
      )}
    </section>
  );
}
