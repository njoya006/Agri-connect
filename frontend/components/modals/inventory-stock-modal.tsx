"use client";

import { ReactNode, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";

import type { InventoryItem } from "@/lib/api/inventory";
import { useInventoryAdjustment, useInventoryRestock, useInventoryUsage } from "@/lib/hooks/use-inventory";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog";
import { Input } from "@/ui/input";

const adjustmentSchema = z.object({
  amount: z.number().positive("Enter a positive amount"),
  notes: z.string().optional(),
});

const targetSchema = z.object({
  newQuantity: z.number().min(0, "Quantity cannot be negative"),
  notes: z.string().optional(),
});

type AdjustmentValues = z.infer<typeof adjustmentSchema>;
type TargetValues = z.infer<typeof targetSchema>;

type InventoryStockMode = "restock" | "use" | "adjust";

interface InventoryStockModalProps {
  trigger: ReactNode;
  item: InventoryItem;
  mode: InventoryStockMode;
}

const MODE_LABEL: Record<InventoryStockMode, string> = {
  restock: "Restock",
  use: "Use stock",
  adjust: "Adjust quantity",
};

const MODE_DESCRIPTION: Record<InventoryStockMode, string> = {
  restock: "Log newly received stock to keep availability accurate and trigger downstream automation workflows.",
  use: "Record usage so task costs and marketplace availability stay in sync.",
  adjust: "Set the actual counted quantity after an audit to correct discrepancies.",
};

export function InventoryStockModal({ trigger, item, mode }: InventoryStockModalProps) {
  const [open, setOpen] = useState(false);
  const restockMutation = useInventoryRestock();
  const usageMutation = useInventoryUsage();
  const adjustMutation = useInventoryAdjustment();
  const currentQuantity = Number(item.quantity) || 0;
  const minimumStock = Number(item.minimum_stock_level) || 0;
  const quantityFormatter = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }), []);

  const adjustmentForm = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { amount: 1, notes: "" },
  });

  const targetForm = useForm<TargetValues>({
    resolver: zodResolver(targetSchema),
    defaultValues: { newQuantity: currentQuantity, notes: "" },
  });

  const isSubmitting = restockMutation.isPending || usageMutation.isPending || adjustMutation.isPending;

  const handleClose = () => {
    adjustmentForm.reset();
    targetForm.reset({ newQuantity: currentQuantity, notes: "" });
    setOpen(false);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (values: AdjustmentValues | TargetValues) => {
    try {
      if (mode === "restock") {
        const data = values as AdjustmentValues;
        await restockMutation.mutateAsync({ itemId: item.id, amount: data.amount, notes: data.notes });
        toast.success("Stock updated");
      } else if (mode === "use") {
        const data = values as AdjustmentValues;
        await usageMutation.mutateAsync({ itemId: item.id, amount: data.amount, notes: data.notes });
        toast.success("Usage recorded");
      } else {
        const data = values as TargetValues;
        await adjustMutation.mutateAsync({ itemId: item.id, currentQuantity: Number(item.quantity) || 0, newQuantity: data.newQuantity, notes: data.notes });
        toast.success("Quantity adjusted");
      }
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update inventory");
    }
  };

  const quantityBody = mode === "adjust" ? (
    <form className="space-y-4" onSubmit={targetForm.handleSubmit(handleSubmit)}>
      <Input
        label="New on-hand quantity"
        type="number"
        step="0.01"
        {...targetForm.register("newQuantity", { valueAsNumber: true })}
        error={targetForm.formState.errors.newQuantity?.message}
      />
      <Input label="Notes" placeholder="Optional note" {...targetForm.register("notes")} />
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Save adjustment
      </Button>
    </form>
  ) : (
    <form className="space-y-4" onSubmit={adjustmentForm.handleSubmit(handleSubmit)}>
      <Input
        label={mode === "restock" ? "Amount to add" : "Amount to deduct"}
        type="number"
        step="0.01"
        {...adjustmentForm.register("amount", { valueAsNumber: true })}
        error={adjustmentForm.formState.errors.amount?.message}
      />
      <Input label="Notes" placeholder="Optional note" {...adjustmentForm.register("notes")} />
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {mode === "restock" ? "Add stock" : "Deduct stock"}
      </Button>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="space-y-5">
        <DialogHeader>
          <DialogTitle>
            {MODE_LABEL[mode]} • {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-foreground/80">
          <p>{MODE_DESCRIPTION[mode]}</p>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span>On-hand</span>
              <span>
                {quantityFormatter.format(currentQuantity)} {item.unit}
              </span>
            </div>
            <p className="mt-1 text-xs text-foreground/60">
              Minimum threshold: {quantityFormatter.format(minimumStock)} {item.unit}
            </p>
            {item.is_low_stock && (
              <p className="mt-2 text-xs font-medium text-amber-600">This item is currently below the minimum stock level.</p>
            )}
            {item.is_expiring_soon && (
              <p className="mt-1 text-xs font-medium text-orange-600">Batch is nearing expiry. Prioritize usage before spoilage.</p>
            )}
          </div>
        </div>
        {quantityBody}
      </DialogContent>
    </Dialog>
  );
}
