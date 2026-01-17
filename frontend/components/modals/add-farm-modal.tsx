"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { FarmForm, type FarmFormValues } from "../forms/farm-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog";
import { useCreateFarm, useUpdateFarm } from "../../lib/hooks/use-farms";
import type { Farm, FarmPayload } from "../../lib/api/farms";

interface AddFarmModalProps {
  trigger: React.ReactNode;
  farm?: Farm;
  title?: string;
  onSuccess?: (farm: Farm) => void;
}

export function AddFarmModal({ trigger, farm, title, onSuccess }: AddFarmModalProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateFarm();
  const updateMutation = useUpdateFarm();

  const handleSubmit = async (values: FarmFormValues) => {
    const payload: FarmPayload = {
      name: values.name,
      location: values.location,
      total_area: values.total_area,
      soil_type: values.soil_type,
      irrigation_type: values.irrigation_type,
    };
    try {
      const result = farm
        ? await updateMutation.mutateAsync({ id: farm.id, payload })
        : await createMutation.mutateAsync(payload);
      toast.success(`Farm ${farm ? "updated" : "created"} successfully`);
      setOpen(false);
      onSuccess?.(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save farm");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? (farm ? "Edit farm" : "Add farm")}</DialogTitle>
        </DialogHeader>
        <FarmForm
          defaultValues={farm}
          onSubmit={handleSubmit}
          submitLabel={farm ? "Update farm" : "Create farm"}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
