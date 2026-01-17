"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select } from "@/ui/select";
import { useCreateFarm } from "../../../lib/hooks/use-farms";

const farmSchema = z.object({
  name: z.string().min(3, "Name is required"),
  location: z.string().min(3, "Location is required"),
  total_area: z.string().min(1, "Area is required"),
  soil_type: z.string().min(2, "Soil type is required"),
  irrigation_type: z.string().optional(),
});

type FarmFormValues = z.infer<typeof farmSchema>;

export default function NewFarmPage() {
  const router = useRouter();
  const form = useForm<FarmFormValues>({ resolver: zodResolver(farmSchema), defaultValues: { irrigation_type: "drip", soil_type: "loam" } });
  const { mutateAsync, isPending } = useCreateFarm();

  const onSubmit = async (values: FarmFormValues) => {
    try {
      // Sanitize total_area so backend DecimalField receives a valid number
      const sanitizedArea = String(values.total_area).replace(/[^0-9.-]/g, "").trim();
      const payload = {
        name: values.name,
        location: values.location,
        total_area: sanitizedArea,
        soil_type: values.soil_type,
        irrigation_type: values.irrigation_type,
      };
      await mutateAsync(payload as any);
      toast.success("Farm created successfully");
      router.push("/farms");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create farm. Check required fields.");
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Create</p>
        <h1 className="text-3xl font-semibold text-foreground">Register a farm</h1>
        <p className="text-sm text-foreground/70">Capture the essential metadata so downstream analytics stay contextual.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Farm details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Input label="Farm name" placeholder="e.g. Green Valley" {...form.register("name")} error={form.formState.errors.name?.message} />
            <Input label="Location" placeholder="City, Region" {...form.register("location")} error={form.formState.errors.location?.message} />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Total area" placeholder="120 ha" {...form.register("total_area")} error={form.formState.errors.total_area?.message} />
              <Select
                label="Soil type"
                value={form.watch("soil_type")}
                onChange={(val) => form.setValue("soil_type", val)}
                options={[
                  { label: "Loam", value: "loam" },
                  { label: "Clay", value: "clay" },
                  { label: "Sandy", value: "sandy" },
                  { label: "Silt", value: "silt" },
                  { label: "Peat", value: "peat" },
                ]}
                searchable
              />
            </div>
            <Select
              label="Irrigation type"
              value={form.watch("irrigation_type")}
              onChange={(val) => form.setValue("irrigation_type", val)}
              options={[
                { label: "Drip", value: "drip" },
                { label: "Sprinkler", value: "sprinkler" },
                { label: "Flood", value: "flood" },
                { label: "None", value: "none" },
              ]}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isPending} loadingText="Saving…">
                Save farm
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
