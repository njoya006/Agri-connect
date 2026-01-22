import { getInventoryRestockingPrediction, type InventoryRestockingPrediction } from "../api/analytics";
export function useInventoryRestockingPrediction(days?: number) {
  return useQuery<InventoryRestockingPrediction[]>({
    queryKey: ["analytics", "restocking-prediction", days ?? 30],
    queryFn: () => getInventoryRestockingPrediction({ days }),
  });
}
import { getInventoryTurnoverRate, getInventoryStockValueTrend, type InventoryTurnoverRate, type InventoryStockValueTrend } from "../api/analytics";
export function useInventoryTurnoverRate(days?: number) {
  return useQuery<InventoryTurnoverRate[]>({
    queryKey: ["analytics", "turnover-rate", days ?? 30],
    queryFn: () => getInventoryTurnoverRate({ days }),
  });
}

export function useInventoryStockValueTrend(days?: number) {
  return useQuery<InventoryStockValueTrend[]>({
    queryKey: ["analytics", "stock-value-trend", days ?? 30],
    queryFn: () => getInventoryStockValueTrend({ days }),
  });
}
import { useQuery } from "@tanstack/react-query";

import { getAnalyticsSummary, getFarmMetrics, type AnalyticsSummaryItem, type FarmMetric, type MetricFilters } from "../api/analytics";

const analyticsKeys = {
  summary: (filters?: MetricFilters) => ["analytics", "summary", filters?.metric_type ?? "all", filters?.farm ?? "all"] as const,
  metrics: (filters?: MetricFilters) => ["analytics", "metrics", filters?.metric_type ?? "all", filters?.farm ?? "all"] as const,
};

export function useAnalyticsSummary(filters?: MetricFilters) {
  return useQuery<AnalyticsSummaryItem[]>({
    queryKey: analyticsKeys.summary(filters),
    queryFn: () => getAnalyticsSummary(filters),
  });
}

export function useMetricTimeline(filters?: MetricFilters) {
  return useQuery<FarmMetric[]>({
    queryKey: analyticsKeys.metrics(filters),
    queryFn: () => getFarmMetrics(filters),
  });
}
