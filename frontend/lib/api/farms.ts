import apiClient from "./client";

export interface Activity {
  id: number;
  field: number;
  field_name: string;
  activity_type: "planting" | "fertilizing" | "irrigation" | "pest_control" | "weeding" | "harvesting";
  date: string;
  description?: string;
  quantity: string;
  unit: string;
  cost: string;
  weather_conditions: Record<string, unknown>;
  performed_by: number | null;
  performer_email?: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface Field {
  id: number;
  farm: number;
  farm_name: string;
  field_name: string;
  field_number: number;
  area: string;
  current_crop?: string;
  crop_history: Array<Record<string, string>>;
  soil_ph?: string;
  last_fertilized_date?: string | null;
  last_harvest_date?: string | null;
  notes?: string;
  is_active: boolean;
  activity_count: number;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: number;
  owner: number;
  owner_email: string;
  name: string;
  location: string;
  total_area: string;
  soil_type: string;
  irrigation_type: string;
  latitude: string | null;
  longitude: string | null;
  established_date: string | null;
  is_active: boolean;
  active_field_count: number;
  total_yield: string;
  last_activity_date: string | null;
  fields?: Field[];
  created_at: string;
  updated_at: string;
}

export interface FarmPayload {
  name: string;
  location: string;
  total_area: string;
  soil_type: string;
  irrigation_type?: string;
  latitude?: string | null;
  longitude?: string | null;
  established_date?: string | null;
  is_active?: boolean;
}

export interface FieldPayload {
  field_name: string;
  field_number: number;
  area: string;
  current_crop?: string;
  soil_ph?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ActivityPayload {
  activity_type: Activity["activity_type"];
  date: string;
  description?: string;
  quantity?: string;
  unit?: string;
  cost?: string;
  weather_conditions?: Record<string, unknown>;
  performed_by?: number | null;
}

export async function getFarms(): Promise<Farm[]> {
  const { data } = await apiClient.get<Farm[]>("/farms/");
  return data;
}

export async function getFarm(id: number): Promise<Farm> {
  const { data } = await apiClient.get<Farm>(`/farms/${id}/`);
  return data;
}

export async function createFarm(payload: FarmPayload): Promise<Farm> {
  const { data } = await apiClient.post<Farm>("/farms/", payload);
  return data;
}

export async function updateFarm(id: number, payload: Partial<FarmPayload>): Promise<Farm> {
  const { data } = await apiClient.patch<Farm>(`/farms/${id}/`, payload);
  return data;
}

export async function deleteFarm(id: number): Promise<void> {
  await apiClient.delete(`/farms/${id}/`);
}

export async function getFields(farmId: number): Promise<Field[]> {
  const { data } = await apiClient.get<Field[]>(`/farms/${farmId}/fields/`);
  return data;
}

export async function createField(farmId: number, payload: FieldPayload): Promise<Field> {
  const { data } = await apiClient.post<Field>(`/farms/${farmId}/fields/`, payload);
  return data;
}

export async function getActivities(fieldId: number): Promise<Activity[]> {
  const { data } = await apiClient.get<Activity[]>(`/fields/${fieldId}/activities/`);
  return data;
}

export async function createActivity(fieldId: number, payload: ActivityPayload | FormData): Promise<Activity> {
  const endpoint = `/fields/${fieldId}/activities/`;
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.post<Activity>(endpoint, payload, config);
  return data;
}
