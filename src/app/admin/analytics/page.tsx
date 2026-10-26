"use client";

import * as React from "react";
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Receipt,
  Users,
  Award,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateFilterSelector } from "@/components/ui/date-filter-selector";
import { DateRangePreset, formatISTDateOnly } from "@/lib/date-utils";
import { formatINR } from "@/lib/financials";
import * as XLSX from "xlsx";

export default function ReportsAndAnalyticsPage() {
  const [reportType, setReportType] = React.useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  const [dateRange, setDateRange] = React.useState<DateRangePreset>("thisMonth");
  const [customStart, setCustomStart] = React.useState<string>();
  const [customEnd, setCustomEnd] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  const fetchReportData = React.useCallback(async () => {
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
    fetchReportData();
  }, [fetchReportData]);

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const employeeTable = data?.employeeTable || [];

  const handleExportExcel = () => {
    const wsData = [
      ["MENTNEO Sales Intelligence Executive Report"],
      [`Generated on: ${new Date().toLocaleDateString("en-IN")}`],
      [`Report Type: ${reportType}`],
      [],
      ["KPI Summary"],
      ["Total Sales Executives", cards.totalSalesExecutives],
      ["Total Calls Today", cards.totalCallsToday],
      ["Deals Closed", cards.paidClients],
      ["Period Revenue Generated", formatINR(BigInt(cards.periodRevenueGeneratedPaise || 0))],
      ["Verified Amount Collected", formatINR(BigInt(cards.periodAmountCollectedPaise || 0))],
      ["Pending Receivables", formatINR(BigInt(cards.pendingPaymentsPaise || 0))],
      ["Net Collections", formatINR(BigInt(cards.netPeriodCollectionsPaise || 0))],
      [],
      ["Sales Executive Performance Table"],
      [
        "Employee Name",
        "Employee Code",
        "Calls Today",
        "Connected Calls",
        "New Leads",
        "Deals Closed",
        "Paid Clients",
        "Revenue Generated",
        "Amount Collected",
        "Target Achv %",
        "Daily Report Status",
      ],
      ...employeeTable.map((e: any) => [
        e.name,
        e.employeeCode,
        e.callsToday,
        e.connectedCalls,
        e.newLeads,
        e.dealsClosed,
        e.paidClients,
        formatINR(BigInt(e.revenueGeneratedPaise || 0)),
        formatINR(BigInt(e.amountCollectedPaise || 0)),
        `${e.targetAchievementPct}%`,
        e.dailyReportStatus,
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `Mentneo_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCSV = () => {
    const headers = [
      "Employee Name",
      "Code",
      "Calls Today",
      "Connected Calls",
      "New Leads",
      "Deals Closed",
      "Paid Clients",
      "Revenue Generated",
      "Amount Collected",
      "Pending Payments",
      "Target Achv %",
      "Daily Report Status",
    ];

    const rows = employeeTable.map((e: any) => [
      `"${e.name}"`,
      `"${e.employeeCode}"`,
      e.callsToday,
      e.connectedCalls,
      e.newLeads,
      e.dealsClosed,
      e.paidClients,
      `"${formatINR(BigInt(e.revenueGeneratedPaise || 0))}"`,
      `"${formatINR(BigInt(e.amountCollectedPaise || 0))}"`,
      `"${formatINR(BigInt(e.pendingPaymentsPaise || 0))}"`,
      `"${e.targetAchievementPct}%"`,
      `"${e.dailyReportStatus}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-600" />
            Reports & Business Intelligence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated Daily, Weekly, and Monthly sales operations reports with Excel, CSV, and printable exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Report Tab Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-xs">
            {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setReportType(type);
                  if (type === "DAILY") setDateRange("today");
                  else if (type === "WEEKLY") setDateRange("thisWeek");
                  else if (type === "MONTHLY") setDateRange("thisMonth");
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  reportType === type
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {type} Report
              </button>
            ))}
          </div>

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

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Excel
          </Button>

          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
              MENTNEO SALES INTELLIGENCE
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {reportType} EXECUTIVE SALES REPORT
            </h2>
            <p className="text-xs text-slate-500">
              Period Scope: {dateRange.toUpperCase()} | Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="mt-2 sm:mt-0 text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Verified Accounting Figures
            </span>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Paid Clients</span>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{cards.paidClients || 0}</p>
            <span className="text-[10px] text-slate-400">Target: 180 Team</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Revenue Generated</span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
              {formatINR(BigInt(cards.periodRevenueGeneratedPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Finalized sales contracts</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Verified Collections</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatINR(BigInt(cards.periodAmountCollectedPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Confirmed bank receipts</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Receivables</span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
              {formatINR(BigInt(cards.pendingPaymentsPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Balance due</span>
          </div>
        </div>

        {/* Employee Report Table */}
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Employee Breakdown & Daily Work Report Submission Status
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Sales Executive</th>
                  <th className="py-2.5 px-3 text-center">Calls</th>
                  <th className="py-2.5 px-3 text-center">Leads</th>
                  <th className="py-2.5 px-3 text-center">Deals</th>
                  <th className="py-2.5 px-3 text-center">Paid Clients</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                  <th className="py-2.5 px-3 text-right">Verified Collected</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-center">Quota Achv %</th>
                  <th className="py-2.5 px-3 text-center">Report Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employeeTable.map((emp: any) => (
                  <tr key={emp.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {emp.name} <span className="font-mono text-slate-400 text-[10px]">({emp.employeeCode})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold">{emp.callsToday} ({emp.connectedCalls} conn)</td>
                    <td className="py-2.5 px-3 text-center">{emp.newLeads}</td>
                    <td className="py-2.5 px-3 text-center">{emp.dealsClosed}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-teal-600">{emp.paidClients}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{formatINR(BigInt(emp.revenueGeneratedPaise || 0))}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatINR(BigInt(emp.amountCollectedPaise || 0))}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-amber-600">{formatINR(BigInt(emp.pendingPaymentsPaise || 0))}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-teal-600">{emp.targetAchievementPct}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge status={emp.dailyReportStatus}>{emp.dailyReportStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Package Distribution Summary */}
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Package Tier Performance Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(charts.packagePerformance || []).map((pkg: any) => (
              <div key={pkg.name} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-slate-100">{pkg.name}</p>
                <div className="flex justify-between text-slate-500 mt-1">
                  <span>Clients Acquired:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{pkg.clients}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Revenue:</span>
                  <strong className="text-slate-900 dark:text-slate-100">₹{pkg.revenueRupees?.toLocaleString("en-IN")}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signoff Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400">
          <span>Prepared by: MENTNEO Sales Intelligence Engine</span>
          <span>Verified & Signed: Sales Operations Leadership</span>
        </div>
      </div>
    </div>
  );
}
