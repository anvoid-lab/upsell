"use client";

import { useState, useEffect } from "react";
import type { AnalyticsKPI, ConversationDataPoint, PlatformStat } from "@/types";
import { analyticsOverviewService } from "./analytics-overview.service";

interface UseAnalyticsOverviewReturn {
  kpis: AnalyticsKPI[];
  chartData: ConversationDataPoint[];
  platformStats: PlatformStat[];
  isLoading: boolean;
  period: "7d" | "30d" | "90d";
  setPeriod: (period: "7d" | "30d" | "90d") => void;
}

export function useAnalyticsOverview(): UseAnalyticsOverviewReturn {
  const [kpis, setKpis] = useState<AnalyticsKPI[]>([]);
  const [chartData, setChartData] = useState<ConversationDataPoint[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      analyticsOverviewService.fetchKPIs(),
      analyticsOverviewService.fetchChartData(),
      analyticsOverviewService.fetchPlatformStats(),
    ]).then(
      ([k, c, p]) => {
        setKpis(k);
        setChartData(c);
        setPlatformStats(p);
        setIsLoading(false);
      }
    );
  }, [period]);

  return { kpis, chartData, platformStats, isLoading, period, setPeriod };
}
