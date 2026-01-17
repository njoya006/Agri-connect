import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createActivity,
  createFarm,
  createField,
  deleteActivity,
  deleteFarm,
  deleteField,
  getActivities,
  getFarm,
  getFarmStats,
  getFarms,
  getField,
  getFields,
  type Activity,
  type ActivityPayload,
  type Farm,
  type FarmPayload,
  type Field,
  type FieldPayload,
  updateFarm,
  updateField,
} from "../api/farms";

const farmKeys = {
  all: ["farms"] as const,
  lists: () => [...farmKeys.all] as const,
  detail: (id: number) => [...farmKeys.all, id] as const,
  stats: (id: number) => [...farmKeys.all, id, "stats"] as const,
  fields: (farmId: number) => [...farmKeys.all, farmId, "fields"] as const,
  fieldDetail: (fieldId: number) => ["fields", fieldId] as const,
  fieldActivities: (fieldId: number) => ["fields", fieldId, "activities"] as const,
  farmActivities: (farmId: number) => [...farmKeys.all, farmId, "activities"] as const,
};

export function useFarms() {
  return useQuery<Farm[]>({
    queryKey: farmKeys.lists(),
    queryFn: getFarms,
  });
}

export function useFarm(id?: number) {
  return useQuery<Farm>({
    queryKey: farmKeys.detail(id ?? 0),
    queryFn: () => getFarm(id as number),
    enabled: Boolean(id),
  });
}

export function useFarmStats(id?: number) {
  return useQuery({
    queryKey: farmKeys.stats(id ?? 0),
    queryFn: () => getFarmStats(id as number),
    enabled: Boolean(id),
  });
}

export function useFields(farmId?: number) {
  return useQuery<Field[]>({
    queryKey: farmKeys.fields(farmId ?? 0),
    queryFn: () => getFields(farmId as number),
    enabled: Boolean(farmId),
  });
}

export function useField(fieldId?: number) {
  return useQuery<Field>({
    queryKey: farmKeys.fieldDetail(fieldId ?? 0),
    queryFn: () => getField(fieldId as number),
    enabled: Boolean(fieldId),
  });
}

export function useFieldActivities(fieldId?: number) {
  return useQuery<Activity[]>({
    queryKey: farmKeys.fieldActivities(fieldId ?? 0),
    queryFn: () => getActivities(fieldId as number),
    enabled: Boolean(fieldId),
  });
}

export function useFarmActivities(farmId?: number) {
  const queryClient = useQueryClient();

  return useQuery<Activity[]>({
    queryKey: farmKeys.farmActivities(farmId ?? 0),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const fields = await queryClient.ensureQueryData<Field[]>({
        queryKey: farmKeys.fields(farmId as number),
        queryFn: () => getFields(farmId as number),
      });
      const activityGroups = await Promise.all(fields.map((field) => getActivities(field.id)));
      return activityGroups
        .flat()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 10);
    },
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFarm,
    onSuccess: (created) => {
      queryClient.setQueryData<Farm[]>(farmKeys.lists(), (existing) => (existing ? [...existing, created] : [created]));
    },
  });
}

export function useUpdateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FarmPayload> }) => updateFarm(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Farm[]>(farmKeys.lists(), (existing) =>
        existing ? existing.map((farm) => (farm.id === updated.id ? updated : farm)) : [updated],
      );
      queryClient.setQueryData(farmKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: farmKeys.stats(updated.id) });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteFarm(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Farm[]>(farmKeys.lists(), (existing) =>
        existing ? existing.filter((farm) => farm.id !== id) : existing,
      );
      queryClient.removeQueries({ queryKey: farmKeys.detail(id) });
      queryClient.removeQueries({ queryKey: farmKeys.stats(id) });
      queryClient.removeQueries({ queryKey: farmKeys.fields(id) });
    },
  });
}

export function useCreateField(farmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FieldPayload) => createField(farmId, payload),
    onSuccess: (created) => {
      queryClient.setQueryData<Field[]>(farmKeys.fields(farmId), (existing) => (existing ? [...existing, created] : [created]));
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(farmId) });
      queryClient.invalidateQueries({ queryKey: farmKeys.stats(farmId) });
    },
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FieldPayload> }) => updateField(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Field>(farmKeys.fieldDetail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: farmKeys.fields(updated.farm) });
    },
  });
}

export function useDeleteField(farmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: number) => deleteField(fieldId),
    onSuccess: (_, fieldId) => {
      queryClient.setQueryData<Field[]>(farmKeys.fields(farmId), (existing) =>
        existing ? existing.filter((field) => field.id !== fieldId) : existing,
      );
      queryClient.removeQueries({ queryKey: farmKeys.fieldDetail(fieldId) });
      queryClient.invalidateQueries({ queryKey: farmKeys.stats(farmId) });
    },
  });
}

export function useCreateActivity(fieldId: number, farmId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ActivityPayload | FormData) => createActivity(fieldId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmKeys.fieldActivities(fieldId) });
      if (farmId) {
        queryClient.invalidateQueries({ queryKey: farmKeys.farmActivities(farmId) });
        queryClient.invalidateQueries({ queryKey: farmKeys.stats(farmId) });
      }
    },
  });
}

export function useDeleteActivity(fieldId: number, farmId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: number) => deleteActivity(activityId),
    onSuccess: (_, activityId) => {
      queryClient.invalidateQueries({ queryKey: farmKeys.fieldActivities(fieldId) });
      queryClient.removeQueries({ queryKey: ["activities", activityId] });
      if (farmId) {
        queryClient.invalidateQueries({ queryKey: farmKeys.farmActivities(farmId) });
        queryClient.invalidateQueries({ queryKey: farmKeys.stats(farmId) });
      }
    },
  });
}
