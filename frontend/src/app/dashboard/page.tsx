"use client";

import * as React from "react";
import Link from "next/link";
import {
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  UserPlus,
  CalendarCheck,
  CheckCircle,
  Briefcase,
  TrendingUp,
  Receipt,
  Clock,
  Target,
  ArrowRight,
  PlusCircle,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateFilterSelector } from "@/components/ui/date-filter-selector";
import { DateRangePreset, formatISTDateOnly } from "@/lib/date-utils";
import { formatINR } from "@/lib/financials";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#0284c7", "#0d9488", "#f59e0b", "#6366f1"];

export default function SalesExecutiveDashboardPage() {
  const [dateRange, setDateRange] = React.useState<DateRangePreset>("thisMonth");
  const [customStart, setCustomStart] = React.useState<string>();
  const [customEnd, setCustomEnd] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/analytics/executive?range=${dateRange}`;
      if (customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const kpis = data?.kpis || {};
  const targets = data?.targets || {};
  const funnel = data?.funnel || {};
  const timeline = data?.timeline || [];
  const packageBreakdown = data?.packageBreakdown || [];

  const funnelChartData = [
    { stage: "Leads", count: funnel.newLeads || 0 },
    { stage: "Contacted", count: funnel.contacted || 0 },
    { stage: "Qualified", count: funnel.qualified || 0 },
    { stage: "Meetings", count: funnel.meetings || 0 },
    { stage: "Proposals", count: funnel.proposals || 0 },
    { stage: "Closed Deals", count: funnel.dealsClosed || 0 },
    { stage: "Paid Clients", count: funnel.paidClients || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {data?.employee?.name || "Executive"} 👋
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
              Sales Executive
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Today is {formatISTDateOnly(new Date())} (IST). Review your targets, pending follow-ups, and daily progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateFilterSelector
            value={dateRange}
            customStartDate={customStart}
            customEndDate={customEnd}
            onChange={(range, start, end) => {
              setDateRange(range);
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
          <Link href="/reports/daily/new">
            <Button variant="teal" size="sm" className="shadow-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Submit Daily Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Target Progress Banner Card */}
      <Card className="bg-gradient-to-r from-slate-900 via-[#0a1428] to-[#041e3a] text-white border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Target Header & Client Progress */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-sky-300 uppercase">
                    Monthly Performance Milestone
                  </h3>
                  <p className="text-xs text-slate-300">
                    Target: {targets.targetPaidClients || 30} Paid Clients | Sales Goal: {formatINR(targets.targetSalesValuePaise ? BigInt(targets.targetSalesValuePaise) : 95000000n)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">
                    Paid Clients: {targets.paidClientsAchieved || 0} / {targets.targetPaidClients || 30}
                  </span>
                  <span className="text-teal-400 font-bold">{targets.clientTargetAchievementPct || 0}% Achieved</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(targets.clientTargetAchievementPct || 0, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {targets.remainingClients > 0
                    ? `${targets.remainingClients} more paid clients needed to reach 100% monthly target.`
                    : "🎉 Monthly target fully achieved! Outstanding work!"}
                </p>
              </div>
            </div>

            {/* Target Breakdown Metric 1 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Revenue Generated</p>
              <p className="text-xl font-bold text-white mt-1">
                {formatINR(kpis.revenueGeneratedPaise ? BigInt(kpis.revenueGeneratedPaise) : 0n)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {targets.revenueTargetAchievementPct || 0}% of ₹9.5L target
              </p>
            </div>

            {/* Target Breakdown Metric 2 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Amount Collected</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {formatINR(kpis.amountCollectedPaise ? BigInt(kpis.amountCollectedPaise) : 0n)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Verified collections only
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 14 Personal Performance KPI Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Daily & Period Performance Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* 1. Calls Made Today */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Calls Today</span>
                <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{kpis.callsMadeToday || 0}</p>
              <span className="text-[10px] text-slate-400">Target: ~50/day</span>
            </CardContent>
          </Card>

          {/* 2. Connected Calls */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Connected</span>
                <PhoneForwarded className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{kpis.connectedCallsToday || 0}</p>
              <span className="text-[10px] text-slate-400">
                {kpis.callsMadeToday > 0 ? `${Math.round((kpis.connectedCallsToday / kpis.callsMadeToday) * 100)}% connected` : "No calls yet"}
              </span>
            </CardContent>
          </Card>

          {/* 3. Calls Not Answered */}
          <Card className="hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Not Answered</span>
                <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{kpis.unansweredCallsToday || 0}</p>
              <span className="text-[10px] text-slate-400">Requires follow-up</span>
            </CardContent>
          </Card>

          {/* 4. New Leads Added */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Leads Added</span>
                <UserPlus className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{kpis.newLeadsAddedToday || 0}</p>
              <span className="text-[10px] text-slate-400">Target: 10/day</span>
            </CardContent>
          </Card>

          {/* 5. Follow-ups Completed */}
          <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Follow-ups Done</span>
                <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{kpis.followupsCompletedToday || 0}</p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">{kpis.followupsPending || 0} pending</span>
            </CardContent>
          </Card>

          {/* 6. Qualified Leads */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Qualified</span>
                <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{kpis.qualifiedLeadsPeriod || 0}</p>
              <span className="text-[10px] text-slate-400">In sales pipeline</span>
            </CardContent>
          </Card>

          {/* 7. Meetings Scheduled */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Meetings</span>
                <Briefcase className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{kpis.meetingsScheduled || 0}</p>
              <span className="text-[10px] text-slate-400">Scheduled in period</span>
            </CardContent>
          </Card>

          {/* 8. Deals Closed */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Deals Closed</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{kpis.dealsClosed || 0}</p>
              <span className="text-[10px] text-slate-400">Final contracts</span>
            </CardContent>
          </Card>

          {/* 9. Paid Clients */}
          <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Paid Clients</span>
                <Award className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{kpis.paidClients || 0}</p>
              <span className="text-[10px] text-slate-400">Goal: 30 / mo</span>
            </CardContent>
          </Card>

          {/* 10. Revenue Generated */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Revenue</span>
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {formatINR(kpis.revenueGeneratedPaise ? BigInt(kpis.revenueGeneratedPaise) : 0n)}
              </p>
              <span className="text-[10px] text-slate-400">Contract value</span>
            </CardContent>
          </Card>

          {/* 11. Amount Collected */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Collected</span>
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatINR(kpis.amountCollectedPaise ? BigInt(kpis.amountCollectedPaise) : 0n)}
              </p>
              <span className="text-[10px] text-slate-400">Verified cash</span>
            </CardContent>
          </Card>

          {/* 12. Pending Payments */}
          <Card className="hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Pending</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
                {formatINR(kpis.pendingPaymentsPaise ? BigInt(kpis.pendingPaymentsPaise) : 0n)}
              </p>
              <span className="text-[10px] text-slate-400">Receivables</span>
            </CardContent>
          </Card>

          {/* 13. Daily Completion */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Daily Target</span>
                <Target className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                {Math.min(Math.round(((kpis.callsMadeToday || 0) / 50) * 100), 100)}%
              </p>
              <span className="text-[10px] text-slate-400">Calls base</span>
            </CardContent>
          </Card>

          {/* 14. Monthly Completion */}
          <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium truncate">Monthly Target</span>
                <Award className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {targets.clientTargetAchievementPct || 0}%
              </p>
              <span className="text-[10px] text-slate-400">Client goal</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Conversion Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Conversion Funnel</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personal lead progress: New Leads → Contacted → Qualified → Meetings → Proposals → Closed Deals → Paid Clients
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Package Sales Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Package Distribution</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Closed deals by package tier
            </p>
          </CardHeader>
          <CardContent>
            {packageBreakdown.some((p: any) => p.count > 0) ? (
              <div className="h-64 w-full flex flex-col justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={packageBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {packageBreakdown.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 text-xs mt-2">
                  {packageBreakdown.map((p: any, idx: number) => (
                    <div key={p.name} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="truncate">{p.name.replace("Mentneo ", "")}</span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{p.count} deals</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p>No package sales recorded in this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Activity Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Personal Activity Timeline</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recent calls, leads created, status updates, sales, and report submissions
              </p>
            </div>
            <Link href="/activity/calls">
              <Button variant="ghost" size="sm" className="text-xs text-sky-600">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {timeline.length > 0 ? (
              <div className="space-y-3">
                {timeline.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <div className="mt-0.5">
                      <Badge status={item.type}>{item.type}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(item.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                No recent activity logged. Use the quick actions to log a call or lead!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Quick Sales Actions</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immediate workflows to log work and update CRM
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link href="/activity/calls" className="block">
              <Button variant="outline" className="w-full justify-start text-xs h-10 border-slate-200 dark:border-slate-700">
                <PhoneCall className="w-4 h-4 mr-2.5 text-sky-600" /> Log Phone Call
              </Button>
            </Link>

            <Link href="/crm/leads" className="block">
              <Button variant="outline" className="w-full justify-start text-xs h-10 border-slate-200 dark:border-slate-700">
                <UserPlus className="w-4 h-4 mr-2.5 text-teal-600" /> Add New Lead
              </Button>
            </Link>

            <Link href="/sales/records" className="block">
              <Button variant="outline" className="w-full justify-start text-xs h-10 border-slate-200 dark:border-slate-700">
                <TrendingUp className="w-4 h-4 mr-2.5 text-emerald-600" /> Record Closed Sale
              </Button>
            </Link>

            <Link href="/sales/collections" className="block">
              <Button variant="outline" className="w-full justify-start text-xs h-10 border-slate-200 dark:border-slate-700">
                <Receipt className="w-4 h-4 mr-2.5 text-amber-600" /> Record Client Payment
              </Button>
            </Link>

            <Link href="/reports/daily/new" className="block pt-2">
              <Button variant="primary" className="w-full justify-center text-xs h-10 shadow-sm bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                Submit Daily Work Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
