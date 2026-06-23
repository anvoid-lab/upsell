"use client";

import { useState } from "react";
import type { AnalyticsOverviewResponse } from "@core/contracts";

interface UseAnalyticsOverviewReturn {
  kpis: AnalyticsOverviewResponse["kpis"];
  chart_data: AnalyticsOverviewResponse["chart_data"];
  platform_stats: AnalyticsOverviewResponse["platform_stats"];
  period: "7d" | "30d" | "90d";
  setPeriod: (period: "7d" | "30d" | "90d") => void;
}

export function useAnalyticsOverview(initialData: AnalyticsOverviewResponse): UseAnalyticsOverviewReturn {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");

  return {
    kpis: initialData.kpis,
    chart_data: initialData.chart_data,
    platform_stats: initialData.platform_stats,
    period,
    setPeriod,
  };
}
