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
