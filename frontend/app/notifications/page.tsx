"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import Link from "next/link";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.get('/notifications/');
        const data = resp.data?.results ?? resp.data ?? [];
        setItems(data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const markRead = async (id: number) => {
    try {
      await apiClient.post(`/notifications/${id}/mark_read/`);
      // update local state
      setItems((s) => s.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      // trigger header update in other tabs
      try {
        localStorage.setItem('agri_notifications_v1', String(Date.now()));
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error('mark read failed', e);
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {items.length === 0 ? (
        <div>No notifications.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className={`rounded border p-3 ${n.is_read ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-xs text-foreground/60">{n.message}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-foreground/70">{new Date(n.created_at).toLocaleString()}</div>
                  {!n.is_read && (
                    <button className="text-xs text-accent underline" onClick={() => markRead(n.id)}>Mark read</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Link href="/dashboard" className="text-accent underline">Back to dashboard</Link>
      </div>
    </section>
  );
}
