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
