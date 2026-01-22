"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { useSuggestedInventoryItems } from "@/lib/hooks/use-suggested-inventory";

const activitySchema = z.object({
  activity_type: z.enum(["planting", "fertilizing", "irrigation", "pest_control", "weeding", "harvesting"]),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  cost: z.string().optional(),
  weather_conditions: z.string().optional(),
});

export type ActivityFormValues = z.infer<typeof activitySchema> & {
  images?: File[];
  inventory_items?: { item_id: number; quantity: number }[];
};

interface ActivityFormProps {
  defaultValues?: Partial<ActivityFormValues>;
  onSubmit: (values: ActivityFormValues) => Promise<void> | void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

const ACTIVITY_LABELS: Record<ActivityFormValues["activity_type"], string> = {
  planting: "Planting",
  fertilizing: "Fertilizing",
  irrigation: "Irrigation",
  pest_control: "Pest control",
  weeding: "Weeding",
  harvesting: "Harvesting",
};

export function ActivityForm({ defaultValues, onSubmit, submitLabel = "Log activity", isSubmitting }: ActivityFormProps) {
  const [images, setImages] = useState<File[]>(defaultValues?.images ?? []);
  const [selectedItems, setSelectedItems] = useState<{ item_id: number; quantity: number }[]>([]);
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_type: defaultValues?.activity_type ?? "planting",
      date: defaultValues?.date ?? new Date().toISOString().slice(0, 10),
      description: defaultValues?.description ?? "",
      quantity: defaultValues?.quantity ?? "",
      unit: defaultValues?.unit ?? "kg",
      cost: defaultValues?.cost ?? "",
      weather_conditions: defaultValues?.weather_conditions ?? "",
    },
  });

  const activityType = form.watch("activity_type");
  const { items: suggestedItems, loading: loadingItems } = useSuggestedInventoryItems(activityType);

  const handleItemChange = (itemId: number, quantity: number) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.item_id === itemId);
      if (exists) {
        return prev.map((i) => (i.item_id === itemId ? { ...i, quantity } : i));
      }
      return [...prev, { item_id: itemId, quantity }];
    });
  };

  const handleSubmit = async (values: ActivityFormValues) => {
    try {
      await onSubmit({ ...values, images, inventory_items: selectedItems });
    } catch (err: any) {
      // Show error toast for image upload or server errors
      const msg = err?.message || err?.toString() || "Failed to save activity. Please try again.";
      toast.error(msg.includes("upload_images") ? msg.replace("upload_images:", "Image error:") : msg);
    }
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      <label className="text-sm font-medium text-foreground/80">
        Activity type
        <select
          className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
          {...form.register("activity_type")}
        >
          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Input label="Date" type="date" {...form.register("date")} error={form.formState.errors.date?.message} />
      <label className="text-sm font-medium text-foreground/80">
        Description
        <textarea
          rows={3}
          className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
          placeholder="Describe the task, crop, or field note."
          {...form.register("description")}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Quantity" placeholder="100" {...form.register("quantity")} />
        <Input label="Unit" placeholder="kg" {...form.register("unit")} />
        <Input label="Cost" placeholder="250" {...form.register("cost")} />
      </div>
      <label className="text-sm font-medium text-foreground/80">
        Weather conditions (JSON)
        <textarea
          rows={3}
          className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
          placeholder='{"temperature": "24C", "rainfall": "10mm"}'
          {...form.register("weather_conditions")}
        />
      </label>
      <label className="text-sm font-medium text-foreground/80">
        Images (optional)
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-2 w-full rounded-xl border border-dashed border-border/60 bg-white/90 px-4 py-2 text-sm"
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            // Frontend validation: max 5MB, JPEG/PNG only
            const validFiles = files.filter(f => {
              if (f.size > 5 * 1024 * 1024) {
                toast.error(`Image '${f.name}' exceeds 5MB size limit.`);
                return false;
              }
              if (!["image/jpeg", "image/png"].includes(f.type)) {
                toast.error(`Image '${f.name}' must be JPEG or PNG.`);
                return false;
              }
              return true;
            });
            setImages(validFiles);
          }}
        />
        {images.length > 0 && <span className="mt-1 block text-xs text-foreground/60">{images.length} image(s) selected</span>}
      </label>
      <label className="text-sm font-medium text-foreground/80">
        Inventory items used
        {loadingItems ? (
          <div className="mt-2 text-xs text-foreground/60">Loading items…</div>
        ) : suggestedItems.length === 0 ? (
          <div className="mt-2 text-xs text-foreground/60">No items available. Add new inventory first.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {suggestedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={item.quantity}
                  disabled={item.quantity <= 0}
                  placeholder={`0 (max ${item.quantity} ${item.unit})`}
                  onChange={(e) => handleItemChange(item.id, Number(e.target.value))}
                  className="w-24 rounded border px-2 py-1 text-sm"
                />
                <span className="text-xs text-foreground/70">
                  {item.name} ({item.quantity} {item.unit} in stock)
                </span>
              </div>
            ))}
          </div>
        )}
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
