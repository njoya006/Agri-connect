// Predictive restocking analytics
export interface InventoryRestockingPrediction {
  item_id: number;
  item_name: string;
  current_quantity: number;
  minimum_stock_level: number;
  avg_daily_usage: number;
  days_until_restock: number | null;
  should_restock: boolean;
}

export async function getInventoryRestockingPrediction(params?: { days?: number }): Promise<InventoryRestockingPrediction[]> {
  const { data } = await apiClient.get<InventoryRestockingPrediction[]>("/analytics/restocking-prediction/", { params });
  return data;
}
import apiClient from "./client";

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const isPaginated = <T>(payload: unknown): payload is PaginatedResponse<T> => {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      Array.isArray((payload as { results?: unknown }).results),
  );
};

export interface FarmMetric {
  id: number;
  farm: number;
  farm_name: string;
  metric_type: string;
  value: string;
  unit: string;
  notes?: string;
  recorded_at: string;
}

export interface AnalyticsSummaryItem {
  farmId: number;
  farmName: string;
  totalValue: number;
  metricCount: number;
  averageValue: number;
}

interface AnalyticsSummaryRaw {
  farm__id: number;
  farm__name: string;
  total_value: string;
  metric_count: number;
  average_value: string;
}

export interface MetricFilters {
  metric_type?: string;
  farm?: number;
}

export async function getFarmMetrics(params?: MetricFilters): Promise<FarmMetric[]> {
  const { data } = await apiClient.get<FarmMetric[] | PaginatedResponse<FarmMetric>>("/analytics/metrics/", { params });
  if (Array.isArray(data)) {
    return data;
  }
  if (isPaginated<FarmMetric>(data)) {
    return data.results;
  }
  return [];
}


// Inventory analytics: turnover rate
export interface InventoryTurnoverRate {
  item_id: number;
  item_name: string;
  turnover_rate: number;
  total_out: number;
  average_inventory: number;
}


export async function getInventoryTurnoverRate(params?: { days?: number }): Promise<InventoryTurnoverRate[]> {
  const { data } = await apiClient.get<InventoryTurnoverRate[]>("/inventory/alerts/turnover-rate/", { params });
  return data;
}

// Inventory analytics: stock value trend
export interface InventoryStockValueTrend {
  date: string;
  total_value: number;
}


export async function getInventoryStockValueTrend(params?: { days?: number }): Promise<InventoryStockValueTrend[]> {
  const { data } = await apiClient.get<InventoryStockValueTrend[]>("/inventory/alerts/stock-value-trend/", { params });
  return data;
}

export async function getAnalyticsSummary(params?: MetricFilters): Promise<AnalyticsSummaryItem[]> {
  const { data } = await apiClient.get<AnalyticsSummaryRaw[]>("/analytics/summary/", { params });
  return data.map((item) => ({
    farmId: item.farm__id,
    farmName: item.farm__name,
    totalValue: Number(item.total_value ?? 0),
    metricCount: item.metric_count,
    averageValue: Number(item.average_value ?? 0),
  }));
}
