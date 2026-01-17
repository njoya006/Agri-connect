"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

const farmSchema = z.object({
  name: z.string().min(3, "Name is required"),
  location: z.string().min(3, "Location is required"),
  total_area: z.string().min(1, "Area is required"),
  soil_type: z.string().min(1, "Select soil type"),
  irrigation_type: z.string().min(1, "Select irrigation type"),
  description: z.string().optional(),
});

export type FarmFormValues = z.infer<typeof farmSchema> & {
  image?: File | null;
};

const SOIL_OPTIONS = [
  { label: "Loam", value: "loam" },
  { label: "Clay", value: "clay" },
  { label: "Sandy", value: "sandy" },
  { label: "Silt", value: "silt" },
  { label: "Peat", value: "peat" },
];

const IRRIGATION_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Drip", value: "drip" },
  { label: "Sprinkler", value: "sprinkler" },
  { label: "Flood", value: "flood" },
];

interface FarmFormProps {
  defaultValues?: Partial<FarmFormValues>;
  onSubmit: (values: FarmFormValues) => Promise<void> | void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function FarmForm({ defaultValues, onSubmit, submitLabel = "Save farm", isSubmitting }: FarmFormProps) {
  const [image, setImage] = useState<File | null>(defaultValues?.image ?? null);
  const form = useForm<FarmFormValues>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      location: defaultValues?.location ?? "",
      total_area: defaultValues?.total_area ?? "",
      soil_type: defaultValues?.soil_type ?? "loam",
      irrigation_type: defaultValues?.irrigation_type ?? "none",
      description: defaultValues?.description ?? "",
    },
  });

  const handleSubmit = async (values: FarmFormValues) => {
    // Only send backend-accepted fields
    const payload = {
      name: values.name,
      location: values.location,
      total_area: values.total_area,
      soil_type: values.soil_type,
      irrigation_type: values.irrigation_type,
      // description and image are not sent to backend
    };
    await onSubmit(payload as any);
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      <Input label="Farm name" placeholder="Green Valley" {...form.register("name")} error={form.formState.errors.name?.message} />
      <Input label="Location" placeholder="City, Region" {...form.register("location")} error={form.formState.errors.location?.message} />
      <Input label="Total area" placeholder="120" {...form.register("total_area")} error={form.formState.errors.total_area?.message} helperText="Specify hectares or acres" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-foreground/80">
          Soil type
          <select
            className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
            {...form.register("soil_type")}
          >
            {SOIL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {form.formState.errors.soil_type && <span className="mt-1 block text-xs text-red-500">{form.formState.errors.soil_type.message}</span>}
        </label>
        <label className="text-sm font-medium text-foreground/80">
          Irrigation type
          <select
            className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
            {...form.register("irrigation_type")}
          >
            {IRRIGATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {form.formState.errors.irrigation_type && <span className="mt-1 block text-xs text-red-500">{form.formState.errors.irrigation_type.message}</span>}
        </label>
      </div>
      <label className="text-sm font-medium text-foreground/80">
        Description
        <textarea
          rows={3}
          className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
          placeholder="Share soil insights, access roads, or irrigation notes."
          {...form.register("description")}
        />
      </label>
      <label className="text-sm font-medium text-foreground/80">
        Farm image (optional)
        <input
          type="file"
          accept="image/*"
          className="mt-2 w-full rounded-xl border border-dashed border-border/60 bg-white/90 px-4 py-2 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setImage(file ?? null);
          }}
        />
        {image && <span className="mt-1 block text-xs text-foreground/60">{image.name}</span>}
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
