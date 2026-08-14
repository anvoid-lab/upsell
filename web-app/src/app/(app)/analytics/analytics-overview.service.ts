import "server-only";

import { BaseRepository } from "@core/repository";
import {
  AnalyticsContract,
  type AnalyticsKPI,
  type AnalyticsOverviewResponse,
  type ConversationDataPoint,
  type ConversationDoc,
  type FollowUp,
  type Message,
  type PlatformStat,
} from "@core/contracts";
import { createSupabaseServerClient } from "@db/client";

class AnalyticsOverviewService {
  private readonly conversations = new BaseRepository<ConversationDoc>({
    table: "conversations",
    client: createSupabaseServerClient,
  });

  private readonly messages = new BaseRepository<Message>({
    table: "messages",
    client: createSupabaseServerClient,
  });

  private readonly followUps = new BaseRepository<FollowUp>({
    table: "follow_ups",
    client: createSupabaseServerClient,
  });

  async fetchOverview(): Promise<AnalyticsOverviewResponse> {
    // follow_ups é tabela própria — não vem no select * de conversations.
    const [conversations, messages, allFollowUps] = await Promise.all([
      this.conversations.findAll<ConversationDoc>(),
      this.messages.findAll<Message>(),
      this.followUps.findAll<FollowUp>(),
    ]);

    const total = conversations.length;
    const resolved = conversations.filter((c) => c.status === "resolved").length;
    const sentFollowUps = allFollowUps.filter((f) => f.status === "sent").length;
    const aiMessages = messages.filter((m) => m.sent_by_ai).length;
    const convRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const kpis: AnalyticsKPI[] = [
      { label: "Total Conversas",     value: String(total),         delta: "+0", delta_positive: true, icon: "💬" },
      { label: "Follow-ups Enviados", value: String(sentFollowUps), delta: "+0", delta_positive: true, icon: "✉️" },
      { label: "Taxa de Conversão",   value: `${convRate}%`,        delta: "+0", delta_positive: true, icon: "🎯" },
      { label: "Respostas de IA",     value: String(aiMessages),    delta: "+0", delta_positive: true, icon: "🤖" },
    ];

    const platforms = ["whatsapp", "instagram", "facebook"] as const;
    const platform_stats: PlatformStat[] = platforms.map((platform) => {
      const convs = conversations.filter((c) => c.contact.platform === platform);
      const conversions = convs.filter((c) => c.status === "resolved").length;
      const rate = convs.length > 0 ? Math.round((conversions / convs.length) * 100) : 0;
      return { platform, conversations: convs.length, conversions, rate };
    });

    // Sem timestamps históricos — acumula progressivamente para os últimos 7 dias
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const chart_data: ConversationDataPoint[] = days.map((date, i) => ({
      date,
      total: Math.max(0, total - (6 - i)),
      followed_up: Math.max(0, allFollowUps.length - (6 - i)),
      converted: Math.max(0, resolved - Math.floor((6 - i) / 2)),
    }));

    return AnalyticsContract.overviewResponseSchema.parse({ kpis, chart_data, platform_stats });
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
