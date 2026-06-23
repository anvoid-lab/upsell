import type { AnalyticsKPI, ConversationDataPoint, PlatformStat } from "@/types";
import { MOCK_KPIS, MOCK_CHART_DATA, MOCK_PLATFORM_STATS } from "@/lib/mock-data";

class AnalyticsOverviewService {
  async fetchKPIs(): Promise<AnalyticsKPI[]> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_KPIS;
  }

  async fetchChartData(): Promise<ConversationDataPoint[]> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_CHART_DATA;
  }

  async fetchPlatformStats(): Promise<PlatformStat[]> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PLATFORM_STATS;
  }
}

export const analyticsOverviewService = new AnalyticsOverviewService();
