"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface LowStockMessage {
  type: string;
  item_id: number;
  current_quantity?: string | number;
  alert_id?: number;
  message?: string;
}

export function useLowStockAlerts(itemId?: number) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!itemId || typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;

    // Try WebSocket first
    let connected = false;
    try {
      const token = localStorage.getItem("accessToken");
      const wsUrl = `${protocol}://${host}/ws/alerts/${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        connected = true;
      };
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as LowStockMessage;
          if (payload?.type === "low_stock" && payload.item_id === itemId) {
            const qty = payload.current_quantity ?? undefined;
            queryClient.setQueryData(["inventory", "items", itemId], (old: any) => {
              if (!old) return old;
              return { ...old, quantity: String(qty ?? old.quantity), is_low_stock: true };
            });
            toast((t) => `Low stock: ${payload.message ?? `item ${itemId}`} (qty ${qty})`);
          }
        } catch (e) {
          // ignore parse errors
        }
      };
      ws.onerror = (event) => {
        // If unauthorized/expired, show toast and prompt re-auth
        if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
          if (event && (event as any).code === 4001) {
            toast.error("Session expired. Please log in again to receive alerts.");
            // Optionally, redirect to login or trigger logout
          }
        }
        // fallback to SSE
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    } catch (e) {
      connected = false;
    }

    if (!connected && typeof EventSource !== "undefined") {
      const token = localStorage.getItem("accessToken");
      const url = `/api/inventory/alerts/stream/${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as LowStockMessage;
          if (payload?.type === "low_stock" && payload.item_id === itemId) {
            const qty = payload.current_quantity ?? undefined;
            queryClient.setQueryData(["inventory", "items", itemId], (old: any) => {
              if (!old) return old;
              return { ...old, quantity: String(qty ?? old.quantity), is_low_stock: true };
            });
            toast((t) => `Low stock: ${payload.message ?? `item ${itemId}`} (qty ${qty})`);
          }
        } catch (e) {
          // ignore
        }
      };
      es.onerror = (event) => {
        // If unauthorized/expired, show toast and prompt re-auth
        if ((event as any)?.status === 401 || (event as any)?.code === 4001) {
          toast.error("Session expired. Please log in again to receive alerts.");
          // Optionally, redirect to login or trigger logout
        }
        es.close();
      };
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [itemId, queryClient]);
}
