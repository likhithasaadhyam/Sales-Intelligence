"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  PhoneCall,
  TrendingUp,
  Receipt,
  Target,
  FileSpreadsheet,
  Award,
  Calendar,
  MapPin,
  Mail,
  User,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly } from "@/lib/date-utils";

export default function EmployeeProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/employees/${id}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Loading employee profile and performance data...
      </div>
    );
  }

  if (!data?.employee) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-slate-500">Employee not found</p>
        <Link href="/admin/sales-team">
          <Button variant="outline" size="sm">Back to Sales Team</Button>
        </Link>
      </div>
    );
  }

  const { employee, stats, recentCalls = [], recentSales = [], dailyReports = [], targets = [] } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/sales-team"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sales Team
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white font-bold flex items-center justify-center text-2xl shadow-md">
                {employee.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{employee.name}</h1>
                  <Badge status={employee.status}>{employee.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {employee.employeeCode}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {employee.territory}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Joined {formatISTDateOnly(employee.joiningDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/admin/targets?employeeId=${employee.id}`}>
                <Button variant="outline" size="sm">
                  <Target className="w-3.5 h-3.5 mr-1.5" /> Configure Targets
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Month Calls</span>
              <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.totalCalls}</p>
            <span className="text-[10px] text-slate-400">Logged interactions</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Assigned Leads</span>
              <Award className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.totalLeads}</p>
            <span className="text-[10px] text-slate-400">Active in CRM</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Deals Closed</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.dealsClosed}</p>
            <span className="text-[10px] text-slate-400">Final contracts</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Paid Clients</span>
              <Award className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{stats.paidClients}</p>
            <span className="text-[10px] text-slate-400">Goal: {stats.targetPaidClients}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Revenue</span>
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {formatINR(BigInt(stats.revenueGeneratedPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Deal values</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Collected</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {formatINR(BigInt(stats.amountCollectedPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">{stats.targetAchievementPct}% target</span>
          </CardContent>
        </Card>
      </div>

      {/* Activity Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Daily Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Submitted Daily Work Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyReports.length > 0 ? (
              <div className="space-y-3">
                {dailyReports.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Report: {formatISTDateOnly(r.reportingDate)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Calls: {r.callsMade} | Connected: {r.connectedCalls} | Leads: {r.newLeadsAdded}
                      </p>
                    </div>
                    <Badge status={r.status}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No daily reports found.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Closed Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Closed Sales & Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {s.client?.businessName || "Client"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Package: {s.packageName} • {formatISTDateOnly(s.saleDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(BigInt(s.finalDealValuePaise))}
                      </p>
                      <Badge status={s.paymentStatus}>{s.paymentStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No closed sales recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
