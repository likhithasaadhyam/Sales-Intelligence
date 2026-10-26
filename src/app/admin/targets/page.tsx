"use client";

import * as React from "react";
import {
  Target,
  Plus,
  Calendar,
  Users,
  Award,
  TrendingUp,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR, paiseToRupees } from "@/lib/financials";
import { formatISTDateOnly } from "@/lib/date-utils";

export default function TargetManagementPage() {
  const [targets, setTargets] = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");
  const [periodType, setPeriodType] = React.useState("MONTHLY");
  const [targetPaidClients, setTargetPaidClients] = React.useState(30);
  const [targetSalesValueRupees, setTargetSalesValueRupees] = React.useState(950000);
  const [targetCollectionsRupees, setTargetCollectionsRupees] = React.useState(950000);
  const [targetCalls, setTargetCalls] = React.useState(1200);
  const [targetLeads, setTargetLeads] = React.useState(240);
  const [targetFollowUps, setTargetFollowUps] = React.useState(480);
  const [pkg25k, setPkg25k] = React.useState(15);
  const [pkg35k, setPkg35k] = React.useState(10);
  const [pkg45k, setPkg45k] = React.useState(5);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [resTargets, resEmployees] = await Promise.all([
        fetch("/api/targets"),
        fetch("/api/employees"),
      ]);
      if (resTargets.ok && resEmployees.ok) {
        const jsonTargets = await resTargets.json();
        const jsonEmployees = await resEmployees.json();
        setTargets(jsonTargets.targets || []);
        setEmployees(jsonEmployees.employees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId || null,
          periodType,
          targetPaidClients,
          targetSalesValueRupees,
          targetCollectionsRupees,
          targetCalls,
          targetLeads,
          targetFollowUps,
          package25kCount: pkg25k,
          package35kCount: pkg35k,
          package45kCount: pkg45k,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save target");
      } else {
        setShowModal(false);
        fetchData();
      }
    } catch {
      setFormError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sales Targets & Quota Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure company sales plans, monthly revenue targets, and tier package distributions
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Configure / Assign Target
        </Button>
      </div>

      {/* Target Plan Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Team Monthly Target */}
        <Card className="bg-gradient-to-br from-sky-900 to-slate-900 text-white border-sky-800/50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                Team Monthly Plan
              </span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black">180 Paid Clients</p>
            <p className="text-xs text-sky-200">
              Target Value: <span className="font-bold text-white">₹57,00,000</span> (₹57 Lakhs)
            </p>
            <p className="text-[11px] text-slate-300 pt-1 border-t border-sky-800/60">
              Aggregated across 6 Sales Executives
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Per Executive Quota */}
        <Card className="bg-gradient-to-br from-teal-900 to-slate-900 text-white border-teal-800/50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                Standard Executive Quota
              </span>
              <Target className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black">30 Paid Clients</p>
            <p className="text-xs text-teal-200">
              Sales Goal: <span className="font-bold text-white">₹9,50,000</span> (₹9.5 Lakhs)
            </p>
            <p className="text-[11px] text-slate-300 pt-1 border-t border-teal-800/60">
              Daily Pace: ~50 calls, 10 leads, 20 follow-ups
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Package Distribution */}
        <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-800/50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                Package Tier Distribution
              </span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>₹25k Starter Plan:</span>
                <span className="font-bold">15 / exec (90 Team)</span>
              </div>
              <div className="flex justify-between">
                <span>₹35k Scale Plan:</span>
                <span className="font-bold">10 / exec (60 Team)</span>
              </div>
              <div className="flex justify-between">
                <span>₹45k Enterprise:</span>
                <span className="font-bold">5 / exec (30 Team)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Target Schedules</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Historical targets remain immutable to ensure historical reports stay 100% accurate.
          </p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Assignee / Scope</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3 text-center">Paid Clients Target</th>
                <th className="py-3 px-3 text-right">Target Sales Value</th>
                <th className="py-3 px-3 text-center">Package Breakdown (25k / 35k / 45k)</th>
                <th className="py-3 px-3 text-center">Daily Activity Quotas</th>
                <th className="py-3 px-4">Effective Date Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading sales targets...
                  </td>
                </tr>
              ) : targets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No targets configured yet. Click Configure Target to create one.
                  </td>
                </tr>
              ) : (
                targets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4">
                      {t.employee ? (
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{t.employee.name}</p>
                          <p className="text-[10px] text-slate-400">Individual Target</p>
                        </div>
                      ) : t.team ? (
                        <div>
                          <p className="font-semibold text-sky-600 dark:text-sky-400">{t.team.name}</p>
                          <p className="text-[10px] text-slate-400">Team-Level Target</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">General Target</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <Badge variant="info">{t.periodType}</Badge>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-teal-600 dark:text-teal-400 text-sm">
                      {t.targetPaidClients}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(BigInt(t.targetSalesValuePaise))}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                        {t.package25kCount} / {t.package35kCount} / {t.package45kCount}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center text-[11px] text-slate-500">
                      {t.targetCalls} calls • {t.targetLeads} leads
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatISTDateOnly(t.startDate)} → {formatISTDateOnly(t.endDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Target Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Configure Sales Target"
        description="Set targets for individual sales executives or team-level goals"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTarget} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Target Scope / Employee"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">Entire Sales Team (Default)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </Select>

            <Select
              label="Period Type"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
            >
              <option value="DAILY">Daily Target</option>
              <option value="WEEKLY">Weekly Target</option>
              <option value="MONTHLY">Monthly Target</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Paid Clients Target"
              type="number"
              required
              value={targetPaidClients}
              onChange={(e) => setTargetPaidClients(Number(e.target.value))}
            />
            <Input
              label="Sales Value Target (₹)"
              type="number"
              required
              value={targetSalesValueRupees}
              onChange={(e) => setTargetSalesValueRupees(Number(e.target.value))}
            />
            <Input
              label="Collection Target (₹)"
              type="number"
              required
              value={targetCollectionsRupees}
              onChange={(e) => setTargetCollectionsRupees(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Target Calls"
              type="number"
              value={targetCalls}
              onChange={(e) => setTargetCalls(Number(e.target.value))}
            />
            <Input
              label="Target Leads"
              type="number"
              value={targetLeads}
              onChange={(e) => setTargetLeads(Number(e.target.value))}
            />
            <Input
              label="Target Follow-ups"
              type="number"
              value={targetFollowUps}
              onChange={(e) => setTargetFollowUps(Number(e.target.value))}
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Package Sales Target Breakdown
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="₹25k Packages"
                type="number"
                value={pkg25k}
                onChange={(e) => setPkg25k(Number(e.target.value))}
              />
              <Input
                label="₹35k Packages"
                type="number"
                value={pkg35k}
                onChange={(e) => setPkg35k(Number(e.target.value))}
              />
              <Input
                label="₹45k Packages"
                type="number"
                value={pkg45k}
                onChange={(e) => setPkg45k(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Target Configuration
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
