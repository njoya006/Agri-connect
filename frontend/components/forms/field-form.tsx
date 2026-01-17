"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

const fieldSchema = z.object({
  field_name: z.string().min(2, "Required"),
  field_number: z.number().int().nonnegative(),
  area: z.string().min(1, "Area is required"),
  current_crop: z.string().optional(),
  soil_ph: z.string().optional(),
  notes: z.string().optional(),
});

export type FieldFormValues = z.infer<typeof fieldSchema>;

interface FieldFormProps {
  defaultValues?: Partial<FieldFormValues>;
  onSubmit: (values: FieldFormValues) => Promise<void> | void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function FieldForm({ defaultValues, onSubmit, submitLabel = "Save field", isSubmitting }: FieldFormProps) {
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_name: defaultValues?.field_name ?? "",
      field_number: defaultValues?.field_number ?? 1,
      area: defaultValues?.area ?? "",
      current_crop: defaultValues?.current_crop ?? "",
      soil_ph: defaultValues?.soil_ph ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="Field name" placeholder="North Plot" {...form.register("field_name")} error={form.formState.errors.field_name?.message} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Field number"
          type="number"
          {...form.register("field_number", { valueAsNumber: true })}
          error={form.formState.errors.field_number?.message}
        />
        <Input label="Area" placeholder="50" {...form.register("area")} error={form.formState.errors.area?.message} helperText="Specify hectares or acres" />
      </div>
      <Input label="Current crop" placeholder="Maize" {...form.register("current_crop")} error={form.formState.errors.current_crop?.message} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Soil pH" placeholder="6.5" {...form.register("soil_ph")} error={form.formState.errors.soil_ph?.message} />
        <label className="text-sm font-medium text-foreground/80">
          Notes
          <textarea
            rows={3}
            className="mt-2 w-full rounded-xl border border-border/60 bg-white/90 px-4 py-2 text-sm"
            placeholder="Add notes about irrigation, access roads, or hazards."
            {...form.register("notes")}
          />
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
