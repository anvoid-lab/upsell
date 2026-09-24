import { analyticsOverviewService } from "./analytics-overview.service";
import { AnalyticsOverviewContent } from "./analytics-overview-content";

export default async function AnalyticsPage() {
  const data = await analyticsOverviewService.fetchOverview();
  return <AnalyticsOverviewContent initialData={data} />;
}
