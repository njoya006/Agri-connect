"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { INVENTORY_CATEGORY_LABELS, type InventoryItem } from "@/lib/api/inventory";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

const categoryOptions = ["seeds", "fertilizers", "pesticides", "equipment", "harvest"] as const;

const inventorySchema = z.object({
  farm: z.number().int().positive("Select farm"),
  name: z.string().min(2, "Name is required"),
  category: z.enum(categoryOptions),
  quantity: z.number().min(0, "Quantity must be zero or more"),
  unit: z.string().min(1, "Unit is required"),
  minimum_stock_level: z.number().min(0, "Minimum stock must be zero or more"),
  purchase_price: z.number().min(0).optional().nullable(),
  selling_price: z.number().min(0).optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  description: z.string().optional(),
  storage_location: z.string().optional(),
  supplier_info: z.string().optional(),
});

export type InventoryFormValues = z.infer<typeof inventorySchema>;

interface InventoryItemFormProps {
  farms: Array<{ id: number; name: string }>;
  defaultValues?: Partial<InventoryItem>;
  onSubmit: (values: InventoryFormValues) => Promise<void> | void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function InventoryItemForm({ farms, defaultValues, onSubmit, submitLabel = "Save item", isSubmitting }: InventoryItemFormProps) {
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      farm: defaultValues?.farm ?? farms[0]?.id,
      name: defaultValues?.name ?? "",
      category: defaultValues?.category ?? "seeds",
      quantity: defaultValues ? Number(defaultValues.quantity) : 0,
      unit: defaultValues?.unit ?? "kg",
      minimum_stock_level: defaultValues ? Number(defaultValues.minimum_stock_level) : 0,
      purchase_price: defaultValues?.purchase_price ? Number(defaultValues.purchase_price) : undefined,
      selling_price: defaultValues?.selling_price ? Number(defaultValues.selling_price) : undefined,
      expiry_date: defaultValues?.expiry_date ?? undefined,
      description: defaultValues?.description ?? "",
      storage_location: defaultValues?.storage_location ?? "",
      supplier_info: defaultValues?.supplier_info ?? "",
    },
  });

  // Wrap onSubmit to catch unique constraint errors
  const handleSubmit = async (values: InventoryFormValues) => {
    try {
      await onSubmit(values);
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "Failed to save item. Please try again.";
      if (msg.includes("already exists")) {
        toast.error("An item with this name and category already exists for this farm. Please choose a different name or category.");
      } else {
        toast.error(msg);
      }
    }
  };

  const quantity = form.watch("quantity") || 0;
  const purchasePrice = form.watch("purchase_price") || 0;
  const totalValue = useMemo(() => {
    if (!quantity || !purchasePrice) return 0;
    return quantity * purchasePrice;
  }, [quantity, purchasePrice]);

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      <label className="text-sm font-medium text-foreground/80">
        Farm
        <select
          className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
          {...form.register("farm", { valueAsNumber: true })}
        >
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
        {form.formState.errors.farm && <span className="mt-1 block text-xs text-red-500">{form.formState.errors.farm.message}</span>}
      </label>
      <Input label="Name" placeholder="Hybrid maize seeds" {...form.register("name")} error={form.formState.errors.name?.message} />
      <label className="text-sm font-medium text-foreground/80">
        Category
        <select className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm" {...form.register("category")}>
          {categoryOptions.map((value) => (
            <option key={value} value={value}>
              {INVENTORY_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="Quantity"
          type="number"
          step="0.01"
          {...form.register("quantity", { valueAsNumber: true })}
          error={form.formState.errors.quantity?.message}
        />
        <Input label="Unit" placeholder="kg" {...form.register("unit")} error={form.formState.errors.unit?.message} />
        <Input
          label="Minimum stock"
          type="number"
          step="0.01"
          {...form.register("minimum_stock_level", { valueAsNumber: true })}
          error={form.formState.errors.minimum_stock_level?.message}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Purchase price"
          type="number"
          step="0.01"
          {...form.register("purchase_price", { valueAsNumber: true })}
          error={form.formState.errors.purchase_price?.message}
        />
        <Input
          label="Selling price"
          type="number"
          step="0.01"
          {...form.register("selling_price", { valueAsNumber: true })}
          error={form.formState.errors.selling_price?.message}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Expiry date" type="date" {...form.register("expiry_date")} error={form.formState.errors.expiry_date?.message} />
        <div>
          <label className="text-sm font-medium text-foreground/80">Estimated value</label>
          <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm font-semibold text-foreground">
            {totalValue ? `≈ ${totalValue.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>
      <label className="text-sm font-medium text-foreground/80">
        Description
        <textarea
          rows={3}
          className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
          placeholder="Notes about supplier quality, planting instructions, etc."
          {...form.register("description")}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Storage location" placeholder="Main warehouse" {...form.register("storage_location")} />
        <Input label="Supplier information" placeholder="GreenGrow Ltd" {...form.register("supplier_info")} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
