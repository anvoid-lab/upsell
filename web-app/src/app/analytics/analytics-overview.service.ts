import "server-only";

import {
  AnalyticsContract,
  type AnalyticsKPI,
  type AnalyticsOverviewResponse,
  type ConversationDataPoint,
  type PlatformStat,
} from "@core/contracts";
import { MOCK_KPIS, MOCK_CHART_DATA, MOCK_PLATFORM_STATS } from "@/lib/mock-data";

class AnalyticsOverviewService {
  async fetchOverview(): Promise<AnalyticsOverviewResponse> {
    await new Promise((r) => setTimeout(r, 300));
    return AnalyticsContract.overviewResponseSchema.parse({
      kpis: MOCK_KPIS,
      chart_data: MOCK_CHART_DATA,
      platform_stats: MOCK_PLATFORM_STATS,
    });
  }

  async fetchKPIs(): Promise<AnalyticsKPI[]> {
    return (await this.fetchOverview()).kpis;
  }

  async fetchChartData(): Promise<ConversationDataPoint[]> {
    return (await this.fetchOverview()).chart_data;
  }

  async fetchPlatformStats(): Promise<PlatformStat[]> {
    return (await this.fetchOverview()).platform_stats;
  }
}

export const analyticsOverviewService = new AnalyticsOverviewService();
