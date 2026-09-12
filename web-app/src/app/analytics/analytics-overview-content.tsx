"use client";

import { FC } from "react";
import { MessageSquare, Send, TrendingUp, DollarSign, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { useAnalyticsOverview } from "./analytics-overview.hook";
import type { AnalyticsOverviewResponse } from "@core/contracts";

const PLATFORM_COLORS = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
  facebook: "#1877F2",
};

const KPI_ICONS: LucideIcon[] = [MessageSquare, Send, TrendingUp, DollarSign];

export const AnalyticsOverviewContent: FC<{ initialData: AnalyticsOverviewResponse }> = ({ initialData }) => {
  const { kpis, chart_data, platform_stats, period, setPeriod } = useAnalyticsOverview(initialData);

  const donutData = platform_stats.map((s) => ({ name: s.platform, value: s.conversations }));

  return (
    <div className="flex-1 overflow-auto bg-zinc-50/50">
      <div className="max-w-[900px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Analytics</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Shop &amp; Go · Performance overview</p>
          </div>
          <div className="flex bg-white border border-zinc-200 rounded-full p-0.5 gap-0.5">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  period === p ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {kpis.map((kpi, i) => {
            const Icon = KPI_ICONS[i];
            return (
              <div key={kpi.label} className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <Badge
                    variant={kpi.delta_positive ? "success" : "destructive"}
                    className="rounded-full text-[10px] px-2 py-0"
                  >
                    {kpi.delta}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-zinc-900 tracking-tight">{kpi.value}</p>
                <p className="text-xs text-zinc-400 mt-1">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Area chart */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-zinc-700 mb-5">Conversations over time</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart_data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#18181b" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={7} />
              <Area type="monotone" dataKey="total"      name="Total"       stroke="#18181b" strokeWidth={1.5} fill="url(#gradTotal)" dot={false} activeDot={{ r: 4, fill: "#18181b" }} />
              <Area type="monotone" dataKey="followed_up" name="Followed up" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gradFU)"    dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="converted"  name="Converted"   stroke="#6366f1" strokeWidth={1.5} strokeDasharray="2 3" fill="url(#gradConv)"  dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Platform + Bar */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-700 mb-3">By platform</h2>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name as keyof typeof PLATFORM_COLORS]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-700 mb-3">Conversion by platform</h2>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={platform_stats.map((s) => ({ name: s.platform.charAt(0).toUpperCase() + s.platform.slice(1), rate: s.rate }))}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }} formatter={(v: number) => [`${v}%`, "Rate"]} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {platform_stats.map((s) => (
                    <Cell key={s.platform} fill={PLATFORM_COLORS[s.platform]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products table */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700">Top products</h2>
            <span className="text-xs text-zinc-400">This week</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                {["Product", "Enquiries", "Conversions", "Rate"].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Nike Air Trainers", enq: 34, conv: 14, rate: "41%" },
                { name: "Summer Dress",      enq: 28, conv: 10, rate: "36%" },
                { name: "Leather Jacket",    enq: 19, conv: 6,  rate: "32%" },
                { name: "Red Handbag",       enq: 15, conv: 5,  rate: "33%" },
              ].map((row, i) => (
                <tr key={row.name} className={i < 3 ? "border-b border-zinc-100" : ""}>
                  <td className="px-5 py-3 text-sm font-medium text-zinc-800">{row.name}</td>
                  <td className="px-5 py-3 text-sm text-zinc-500">{row.enq}</td>
                  <td className="px-5 py-3 text-sm text-zinc-500">{row.conv}</td>
                  <td className="px-5 py-3 text-sm font-medium text-zinc-700">{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
