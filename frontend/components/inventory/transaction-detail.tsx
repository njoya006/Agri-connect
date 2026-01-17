"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

import type { InventoryTransaction } from "@/lib/api/inventory";
import { useInventoryTransactionCreate } from "@/lib/hooks/use-inventory";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog";
import { Button } from "@/ui/button";

interface Props {
  transaction?: InventoryTransaction | null;
  open: boolean;
  onClose: () => void;
}

export default function TransactionDetail({ transaction, open, onClose }: Props) {
  if (!transaction) return null;
  const [adjustAmount, setAdjustAmount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const createTx = useInventoryTransactionCreate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction • #{transaction.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-foreground/70">Type</p>
              <p className="font-medium">{transaction.transaction_type}</p>
            </div>
            <div>
              <p className="text-foreground/70">Date</p>
              <p className="font-medium">{new Date(transaction.transaction_date).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-foreground/70">Quantity change</p>
              <p className="font-medium">{transaction.quantity_change}</p>
            </div>
            <div>
              <p className="text-foreground/70">Performed by</p>
              <p className="font-medium">{transaction.performed_by ?? "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-foreground/70">Notes</p>
            <p className="font-medium">{transaction.notes ?? "—"}</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-foreground/70">Reconcile (create adjustment)</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="w-32 rounded border px-2 py-1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  className="rounded border px-2 py-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { onClose(); }}>
                Close
              </Button>
              <Button
                onClick={async () => {
                  const amt = Number(adjustAmount || 0);
                  if (!amt) {
                    toast.error("Enter a non-zero adjustment amount");
                    return;
                  }
                  try {
                    await createTx.mutateAsync({
                      item: transaction.item,
                      transaction_type: "adjustment",
                      quantity_change: amt,
                      notes: notes || `Reconciled tx #${transaction.id}`,
                    });
                    toast.success("Reconciliation recorded");
                    onClose();
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to record reconciliation");
                  }
                }}
              >
                Reconcile
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
