"use client";

import { ReactNode, useState } from "react";
import toast from "react-hot-toast";

import { FieldForm, type FieldFormValues } from "../forms/field-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog";
import { useCreateField, useUpdateField } from "@/lib/hooks/use-farms";
import type { Field } from "@/lib/api/farms";

interface AddFieldModalProps {
  farmId: number;
  trigger: ReactNode;
  field?: Field;
  title?: string;
}

export function AddFieldModal({ farmId, trigger, field, title }: AddFieldModalProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateField(farmId);
  const updateMutation = useUpdateField();

  const handleSubmit = async (values: FieldFormValues) => {
    try {
      if (field) {
        await updateMutation.mutateAsync({ id: field.id, payload: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      toast.success(`Field ${field ? "updated" : "created"}`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save field");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? (field ? "Edit field" : "Add field")}</DialogTitle>
        </DialogHeader>
        <FieldForm
          defaultValues={field}
          onSubmit={handleSubmit}
          submitLabel={field ? "Update field" : "Create field"}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
