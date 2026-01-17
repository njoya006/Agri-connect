"use client";

import { ReactNode, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type { InventoryItem } from "@/lib/api/inventory";
import { InventoryItemForm, type InventoryFormValues } from "@/components/forms/inventory-item-form";
import { useCreateInventoryItem, useUpdateInventoryItem } from "@/lib/hooks/use-inventory";
import { useFarms } from "@/lib/hooks/use-farms";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog";

interface InventoryItemModalProps {
  trigger: ReactNode;
  item?: InventoryItem;
  title?: string;
}

export function InventoryItemModal({ trigger, item, title }: InventoryItemModalProps) {
  const [open, setOpen] = useState(false);
  const { data: farms = [] } = useFarms();
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const farmOptions = useMemo(() => farms.map((farm) => ({ id: farm.id, name: farm.name })), [farms]);

  const handleSubmit = async (values: InventoryFormValues) => {
    const payload = {
      ...values,
      purchase_price: values.purchase_price ?? null,
      selling_price: values.selling_price ?? null,
      expiry_date: values.expiry_date || null,
      description: values.description ?? "",
      storage_location: values.storage_location ?? "",
      supplier_info: values.supplier_info ?? "",
    };

    try {
      const result = item
        ? await updateMutation.mutateAsync({ id: item.id, payload })
        : await createMutation.mutateAsync(payload);
      toast.success(`Inventory item ${item ? "updated" : "created"}`);
      if (result.is_low_stock) {
        toast((t) => (
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-yellow-600">Low stock alert</p>
            <p className="text-foreground/80">{result.name} is still below the minimum threshold. Consider restocking soon.</p>
            <button
              type="button"
              className="text-xs font-medium text-accent"
              onClick={() => toast.dismiss(t.id)}
            >
              Dismiss
            </button>
          </div>
        ));
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save inventory item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? (item ? "Edit inventory item" : "Add inventory item")}</DialogTitle>
        </DialogHeader>
        {farmOptions.length ? (
          <InventoryItemForm farms={farmOptions} defaultValues={item} onSubmit={handleSubmit} isSubmitting={isSubmitting} submitLabel={item ? "Update item" : "Create item"} />
        ) : (
          <p className="text-sm text-foreground/70">Add a farm before creating inventory items.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
