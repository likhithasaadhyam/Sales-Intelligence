"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Download,
  Eye,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR } from "@/lib/financials";

export default function SalesTeamManagementPage() {
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [newTerritory, setNewTerritory] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const fetchEmployees = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          employeeCode: newCode,
          territory: newTerritory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create employee");
      } else {
        setShowAddModal(false);
        setNewName("");
        setNewEmail("");
        setNewCode("");
        setNewTerritory("");
        fetchEmployees();
      }
    } catch {
      setFormError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to change this employee status to ${nextStatus}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) {
        fetchEmployees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Employee Name",
      "Employee Code",
      "Email",
      "Territory",
      "Status",
      "Calls Today",
      "Connected Calls",
      "New Leads",
      "Qualified Leads",
      "Follow-ups Completed",
      "Deals Closed",
      "Paid Clients",
      "Revenue Generated",
      "Amount Collected",
      "Monthly Target",
      "Target Achievement %",
      "Daily Report Status",
    ];

    const rows = employees.map((emp) => [
      `"${emp.name}"`,
      `"${emp.employeeCode}"`,
      `"${emp.email}"`,
      `"${emp.territory}"`,
      `"${emp.status}"`,
      emp.callsToday,
      emp.connectedCalls,
      emp.newLeads,
      emp.qualifiedLeads,
      emp.followupsCompleted,
      emp.dealsClosed,
      emp.paidClients,
      `"${formatINR(BigInt(emp.revenueGeneratedPaise || 0))}"`,
      `"${formatINR(BigInt(emp.amountCollectedPaise || 0))}"`,
      emp.monthlyTarget,
      `"${emp.targetAchievementPct}%"`,
      `"${emp.dailyReportStatus}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Sales_Team_Performance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (statusFilter === "ALL") return true;
    return emp.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sales Team Directory & Performance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor sales executive targets, calls, pipeline conversions, and daily work report submissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Team CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Sales Executive
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by executive name, email, or employee code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interactive Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Sales Executive</th>
                <th className="py-3 px-3">Territory</th>
                <th className="py-3 px-3 text-center">Calls Today</th>
                <th className="py-3 px-3 text-center">Leads Today</th>
                <th className="py-3 px-3 text-center">Deals Closed</th>
                <th className="py-3 px-3 text-center">Paid Clients</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                <th className="py-3 px-3 text-right">Collected</th>
                <th className="py-3 px-3 text-center">Target Achv.</th>
                <th className="py-3 px-3 text-center">Report Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading sales team records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No sales executives found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400"
                          >
                            {emp.name}
                          </Link>
                          <p className="text-[10px] text-slate-400">{emp.employeeCode} • {emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {emp.territory}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {emp.callsToday}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">
                        ({emp.connectedCalls} conn)
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {emp.newLeads}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-slate-900 dark:text-slate-100">
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

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {emp.targetAchievementPct}%
                        </span>
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${Math.min(emp.targetAchievementPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={emp.dailyReportStatus}>
                        {emp.dailyReportStatus}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/employees/${emp.id}`}>
                          <button
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(emp.id, emp.status)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            emp.status === "ACTIVE"
                              ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          }`}
                          title={emp.status === "ACTIVE" ? "Deactivate Executive" : "Activate Executive"}
                        >
                          {emp.status === "ACTIVE" ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Sales Executive"
        description="Create employee account with auto-assigned default ₹9.5L monthly target"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Full Name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Rohith Kumar"
          />

          <Input
            label="Email Address"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="e.g. rohith@mentneo.com"
          />

          <Input
            label="Employee Code"
            required
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="e.g. MNT-007"
          />

          <Input
            label="Sales Territory"
            value={newTerritory}
            onChange={(e) => setNewTerritory(e.target.value)}
            placeholder="e.g. South Zone - Hyderabad"
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
