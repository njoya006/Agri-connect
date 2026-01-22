import apiClient from "./client";

export type InventoryCategory = "seeds" | "fertilizers" | "pesticides" | "equipment" | "harvest";

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  seeds: "Seeds",
  fertilizers: "Fertilizers",
  pesticides: "Pesticides",
  equipment: "Equipment",
  harvest: "Harvest",
};

export interface InventoryItem {
  id: number;
  farm: number;
  farm_name: string;
  category: InventoryCategory;
  name: string;
  description?: string;
  quantity: string;
  unit: string;
  minimum_stock_level: string;
  purchase_price?: string | null;
  selling_price?: string | null;
  expiry_date?: string | null;
  storage_location?: string;
  supplier_info?: string;
  last_audited?: string | null;
  created_at: string;
  updated_at: string;
  total_value: string;
  is_low_stock: boolean;
  is_expiring_soon: boolean;
}

export interface InventoryItemPayload {
  farm: number;
  category: InventoryCategory;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  minimum_stock_level: number;
  purchase_price?: number | null;
  selling_price?: number | null;
  expiry_date?: string | null;
  storage_location?: string;
  supplier_info?: string;
}

export type InventoryTransactionType = "purchase" | "usage" | "sale" | "adjustment";

export interface InventoryTransaction {
  id: number;
  item: number;
  item_name: string;
  farm_name: string;
  transaction_type: InventoryTransactionType;
  quantity_change: string;
  previous_quantity: string;
  new_quantity: string;
  related_activity?: number | null;
  related_listing?: number | null;
  performed_by?: number | null;
  transaction_date: string;
  notes?: string;
}

export interface InventoryTransactionPayload {
  item: number;
  transaction_type: InventoryTransactionType;
  quantity_change: number;
  related_activity?: number;
  notes?: string;
}

export interface InventoryItemFilters {
  search?: string;
  category?: InventoryCategory;
  low_stock?: boolean;
  farm?: number;
}

export interface InventoryTransactionFilters {
  item?: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const normalizeResponse = <T>(payload: T[] | PaginatedResponse<T>): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object" && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
};

export async function getInventoryItems(filters?: InventoryItemFilters): Promise<InventoryItem[]> {
  const { data } = await apiClient.get<InventoryItem[] | PaginatedResponse<InventoryItem>>("/inventory/items/", { params: filters });
  return normalizeResponse(data);
}

export async function getInventoryItem(id: number): Promise<InventoryItem> {
  const { data } = await apiClient.get<InventoryItem>(`/inventory/items/${id}/`);
  return data;
}

export async function createInventoryItem(payload: InventoryItemPayload): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>("/inventory/items/", payload);
  return data;
}

export async function updateInventoryItem(id: number, payload: Partial<InventoryItemPayload>): Promise<InventoryItem> {
  const { data } = await apiClient.patch<InventoryItem>(`/inventory/items/${id}/`, payload);
  return data;
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await apiClient.delete(`/inventory/items/${id}/`);
}


// Streaming CSV export with params (fields, date range, etc)
import { getToken } from "./token-manager";

export async function exportStreamingInventoryItems(params: {
  fields?: string[];
  startDate?: string;
  endDate?: string;
  farm?: string | number;
  category?: string;
}): Promise<Response> {
  const search = new URLSearchParams();
  if (params.fields && params.fields.length) search.append('fields', params.fields.join(','));
  if (params.startDate) search.append('start_date', params.startDate);
  if (params.endDate) search.append('end_date', params.endDate);
  if (params.farm) search.append('farm', String(params.farm));
  if (params.category) search.append('category', params.category);
  // Use full backend URL for local dev; adjust as needed for deployment
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const url = `${backendUrl}/api/inventory/export/stream/?${search.toString()}`;
  const token = getToken("access");
  const headers: Record<string, string> = { 'Accept': 'text/csv' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Add timeout (30s)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Export timed out. Try again or narrow your filters.');
    }
    throw err;
  }
}

export async function getInventoryTransactions(filters?: InventoryTransactionFilters): Promise<InventoryTransaction[]> {
  const { data } = await apiClient.get<InventoryTransaction[] | PaginatedResponse<InventoryTransaction>>("/inventory/transactions/", { params: filters });
  return normalizeResponse(data);
}

export async function getInventoryTransactionsPage(filters?: InventoryTransactionFilters & { page?: number; page_size?: number; ordering?: string }): Promise<PaginatedResponse<InventoryTransaction>> {
  const { data } = await apiClient.get<PaginatedResponse<InventoryTransaction>>("/inventory/transactions/", { params: filters });
  return data;
}

export async function createInventoryTransaction(payload: InventoryTransactionPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>("/inventory/transactions/", payload);
  return data;
}

export async function adjustInventoryQuantity(
  itemId: number,
  quantityChange: number,
  transaction_type: InventoryTransactionType,
  options?: { related_activity?: number; notes?: string },
): Promise<InventoryTransaction> {
  return createInventoryTransaction({
    item: itemId,
    transaction_type,
    quantity_change: quantityChange,
    related_activity: options?.related_activity,
    notes: options?.notes,
  });
}

export function restockInventoryItem(itemId: number, amount: number, notes?: string) {
  return adjustInventoryQuantity(itemId, Math.abs(amount), "purchase", { notes });
}

export function useInventoryItemStock(itemId: number, amount: number, options?: { related_activity?: number; notes?: string }) {
  return adjustInventoryQuantity(itemId, -Math.abs(amount), "usage", options);
}

export function adjustInventoryItemStock(itemId: number, currentQuantity: number, newQuantity: number, notes?: string) {
  const delta = newQuantity - currentQuantity;
  return adjustInventoryQuantity(itemId, delta, "adjustment", { notes });
}
