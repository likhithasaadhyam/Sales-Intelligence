"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  PhoneCall,
  UserPlus,
  Clock,
  CheckCircle,
  TrendingUp,
  Receipt,
  Award,
  AlertTriangle,
  Download,
  Eye,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateFilterSelector } from "@/components/ui/date-filter-selector";
import { DateRangePreset } from "@/lib/date-utils";
import { formatINR } from "@/lib/financials";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

const COLORS = ["#0284c7", "#0d9488", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];

export default function AdminOverviewDashboardPage() {
  const [dateRange, setDateRange] = React.useState<DateRangePreset>("thisMonth");
  const [customStart, setCustomStart] = React.useState<string>();
  const [customEnd, setCustomEnd] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [employeeSearch, setEmployeeSearch] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/analytics/admin?range=${dateRange}`;
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
    fetchData();
  }, [fetchData]);

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const employeeTable = data?.employeeTable || [];

  const filteredEmployees = employeeTable.filter((emp: any) =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const exportTableCSV = () => {
    const headers = [
      "Employee Name",
      "Employee Code",
      "Calls Today",
      "Connected Calls",
      "New Leads",
      "Qualified Leads",
      "Follow-ups Completed",
      "Deals Closed",
      "Paid Clients",
      "Revenue Generated",
      "Amount Collected",
      "Pending Payments",
      "Monthly Target",
      "Target Achievement %",
      "Daily Report Status",
    ];

    const rows = filteredEmployees.map((emp: any) => [
      `"${emp.name}"`,
      `"${emp.employeeCode}"`,
      emp.callsToday,
      emp.connectedCalls,
      emp.newLeads,
      emp.qualifiedLeads,
      emp.followupsCompleted,
      emp.dealsClosed,
      emp.paidClients,
      `"${formatINR(BigInt(emp.revenueGeneratedPaise || 0))}"`,
      `"${formatINR(BigInt(emp.amountCollectedPaise || 0))}"`,
      `"${formatINR(BigInt(emp.pendingPaymentsPaise || 0))}"`,
      emp.monthlyTarget,
      `"${emp.targetAchievementPct}%"`,
      `"${emp.dailyReportStatus}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Employee_Performance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            MENTNEO Sales Operations Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time sales intelligence across sales executives, daily calls, pipeline conversions, and verified cash collections
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
          <Link href="/admin/analytics">
            <Button variant="outline" size="sm">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Full Reports & Exports
            </Button>
          </Link>
        </div>
      </div>

      {/* 14 Required Summary KPI Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Company Sales & Operations Indicators
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* 1. Total Sales Executives */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Total Executives</span>
                <Users className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cards.totalSalesExecutives || 0}</p>
              <span className="text-[10px] text-slate-400">Team roster</span>
            </CardContent>
          </Card>

          {/* 2. Active Sales Executives */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Active Executives</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{cards.activeSalesExecutives || 0}</p>
              <span className="text-[10px] text-slate-400">Ready to call</span>
            </CardContent>
          </Card>

          {/* 3. Total Calls Today */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Calls Today</span>
                <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cards.totalCallsToday || 0}</p>
              <span className="text-[10px] text-slate-400">Prospecting calls</span>
            </CardContent>
          </Card>

          {/* 4. Total Leads Today */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Leads Today</span>
                <UserPlus className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cards.totalLeadsToday || 0}</p>
              <span className="text-[10px] text-slate-400">New prospects</span>
            </CardContent>
          </Card>

          {/* 5. Follow-ups Due */}
          <Card className="hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Follow-ups Due</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{cards.followupsDue || 0}</p>
              <span className="text-[10px] text-slate-400">Due / Overdue</span>
            </CardContent>
          </Card>

          {/* 6. Qualified Leads */}
          <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Qualified Leads</span>
                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{cards.qualifiedLeads || 0}</p>
              <span className="text-[10px] text-slate-400">In period</span>
            </CardContent>
          </Card>

          {/* 7. Deals Closed Today */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Deals Today</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{cards.dealsClosedToday || 0}</p>
              <span className="text-[10px] text-slate-400">Contracts signed</span>
            </CardContent>
          </Card>

          {/* 8. Paid Clients */}
          <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Paid Clients</span>
                <Award className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{cards.paidClients || 0}</p>
              <span className="text-[10px] text-slate-400">Verified paid</span>
            </CardContent>
          </Card>

          {/* 9. Today's Revenue */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Today's Revenue</span>
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {formatINR(BigInt(cards.todayRevenueGeneratedPaise || 0))}
              </p>
              <span className="text-[10px] text-slate-400">Deal value</span>
            </CardContent>
          </Card>

          {/* 10. Today's Amount Collected */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Today's Collected</span>
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatINR(BigInt(cards.todayAmountCollectedPaise || 0))}
              </p>
              <span className="text-[10px] text-slate-400">Verified cash</span>
            </CardContent>
          </Card>

          {/* 11. Pending Payments */}
          <Card className="hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Pending Payments</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
                {formatINR(BigInt(cards.pendingPaymentsPaise || 0))}
              </p>
              <span className="text-[10px] text-slate-400">Receivables</span>
            </CardContent>
          </Card>

          {/* 12. Monthly Revenue */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Monthly Revenue</span>
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {formatINR(BigInt(cards.monthlyRevenuePaise || 0))}
              </p>
              <span className="text-[10px] text-slate-400">Month-to-date</span>
            </CardContent>
          </Card>

          {/* 13. Target Achievement */}
          <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Target Achv.</span>
                <Award className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                {cards.monthlyTargetAchievement || 0}%
              </p>
              <span className="text-[10px] text-slate-400">Of ₹57L team target</span>
            </CardContent>
          </Card>

          {/* 14. Overall Conversion Rate */}
          <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium truncate">Conversion Rate</span>
                <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
                {cards.overallConversionRate || 0}%
              </p>
              <span className="text-[10px] text-slate-400">Lead-to-client</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 1: Revenue Trend & Sales Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>A. Revenue Trend & Verified Collections</CardTitle>
            <p className="text-xs text-slate-500">
              Daily finalized revenue generated vs verified cash collections
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.revenueTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue Generated" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="collections" name="Verified Collections" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart D: Sales Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>D. Sales Conversion Funnel</CardTitle>
            <p className="text-xs text-slate-500">
              Pipeline progression from initial lead to paid client conversion
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.salesFunnel || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Employee Performance & Target Achievement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart B: Employee Performance */}
        <Card>
          <CardHeader>
            <CardTitle>B. Employee Performance Comparison</CardTitle>
            <p className="text-xs text-slate-500">
              Comparing calls, new leads, and closed deals by sales executive
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.employeePerformance || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" name="Calls Today" fill="#0284c7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="leads" name="Leads Today" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="paidClients" name="Paid Clients" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart C: Target vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle>C. Target vs Actual Paid Clients</CardTitle>
            <p className="text-xs text-slate-500">
              Each executive’s progress toward their 30 monthly paid clients goal
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.targetAchievement || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="achieved" name="Achieved Clients" fill="#0d9488" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="target" name="Monthly Target (30)" fill="#64748b" radius={[3, 3, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Daily Calls, Package Performance & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart E: Daily Calls */}
        <Card>
          <CardHeader>
            <CardTitle>E. Daily Calls Analysis</CardTitle>
            <p className="text-xs text-slate-500">Total calls vs connected calls</p>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.dailyCallsAnalysis || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total Calls" fill="#0284c7" />
                  <Bar dataKey="connected" name="Connected" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart G: Package Performance */}
        <Card>
          <CardHeader>
            <CardTitle>G. Package Performance</CardTitle>
            <p className="text-xs text-slate-500">Clients acquired by package tier</p>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.packagePerformance || []} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="clients" name="Clients" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart H: Lead Source Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>H. Lead Source Analysis</CardTitle>
            <p className="text-xs text-slate-500">Volume distribution by channel</p>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={charts.leadSourceAnalysis || []}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {(charts.leadSourceAnalysis || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 text-[11px] mt-1">
                {(charts.leadSourceAnalysis || []).slice(0, 4).map((s: any, idx: number) => (
                  <div key={s.source} className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="truncate">{s.source} ({s.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Employee Performance Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Team Performance & Daily Report Accountability</CardTitle>
            <p className="text-xs text-slate-500">
              Complete sales executive activity, closures, and daily work report submission statuses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search executive..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="h-8 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-44"
            />
            <Button variant="outline" size="sm" onClick={exportTableCSV}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Executive</th>
                <th className="py-3 px-3 text-center">Calls (Conn / Total)</th>
                <th className="py-3 px-3 text-center">New Leads</th>
                <th className="py-3 px-3 text-center">Deals</th>
                <th className="py-3 px-3 text-center">Paid Clients</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                <th className="py-3 px-3 text-right">Collected</th>
                <th className="py-3 px-3 text-right">Pending</th>
                <th className="py-3 px-3 text-center">Target Achv.</th>
                <th className="py-3 px-3 text-center">Report Status</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    <Link href={`/admin/employees/${emp.id}`} className="hover:text-sky-600">
                      {emp.name}
                    </Link>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({emp.employeeCode})</span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="font-semibold text-emerald-600">{emp.connectedCalls}</span>
                    <span className="text-slate-400"> / {emp.callsToday}</span>
                  </td>

                  <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                    {emp.newLeads}
                  </td>

                  <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                    {emp.dealsClosed}
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-teal-600 dark:text-teal-400">
                    {emp.paidClients}
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-slate-100">
                    {formatINR(BigInt(emp.revenueGeneratedPaise || 0))}
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(BigInt(emp.amountCollectedPaise || 0))}
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                    {formatINR(BigInt(emp.pendingPaymentsPaise || 0))}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-teal-600 dark:text-teal-400">{emp.targetAchievementPct}%</span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge status={emp.dailyReportStatus}>{emp.dailyReportStatus}</Badge>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/employees/${emp.id}`}>
                      <button className="p-1 rounded text-slate-400 hover:text-sky-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
