"use client";

import * as React from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  Database,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function GeneralSettingsPage() {
  const [companyName, setCompanyName] = React.useState("MENTNEO");
  const [reportingDeadline, setReportingDeadline] = React.useState("20:00");
  const [currencySymbol, setCurrencySymbol] = React.useState("₹");
  const [twoPersonVerification, setTwoPersonVerification] = React.useState("true");
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          if (data.settings.COMPANY_NAME) setCompanyName(data.settings.COMPANY_NAME);
          if (data.settings.REPORTING_DEADLINE_IST) setReportingDeadline(data.settings.REPORTING_DEADLINE_IST);
          if (data.settings.CURRENCY_SYMBOL) setCurrencySymbol(data.settings.CURRENCY_SYMBOL);
          if (data.settings.TWO_PERSON_PAYMENT_VERIFICATION) setTwoPersonVerification(data.settings.TWO_PERSON_PAYMENT_VERIFICATION);
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          COMPANY_NAME: companyName,
          REPORTING_DEADLINE_IST: reportingDeadline,
          CURRENCY_SYMBOL: currencySymbol,
          TWO_PERSON_PAYMENT_VERIFICATION: twoPersonVerification,
        }),
      });

      if (res.ok) {
        setSuccessMsg("System configuration successfully saved!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-600" />
            General System Settings & Compliance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure reporting cutoff times, currency presentation, and operational accountability rules
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center gap-2 border border-teal-200 dark:border-teal-800">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-600" /> 1. Company Branding & Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Brand Name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Input
                label="Currency Symbol"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> 2. Operating Deadlines & Timezone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Daily Work Report Cutoff Time (IST 24-hr)"
                required
                type="time"
                value={reportingDeadline}
                onChange={(e) => setReportingDeadline(e.target.value)}
                helperText="Reports submitted after this time are flagged as overdue"
              />

              <Input
                label="System Timezone"
                disabled
                value="Asia/Kolkata (IST = UTC+5:30)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Financial Protocols */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> 3. Financial Integrity & Verification Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Two-Person Payment Verification Protocol"
                value={twoPersonVerification}
                onChange={(e) => setTwoPersonVerification(e.target.value)}
              >
                <option value="true">Enforced (Two-Person Verification Required)</option>
                <option value="false">Disabled (Auto-verify)</option>
              </Select>

              <div className="text-xs text-slate-500 space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Financial Precision Standard:
                </span>
                <p>
                  All monetary amounts are strictly calculated using integer paise (`1 INR = 100 paise`). Zero floating-point drift.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & Architecture Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" /> 4. Database Architecture & Production Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Prisma ORM Architecture:
                </span>
                <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                  20 Related Entities Active
                </span>
              </div>
              <p>
                Currently operating on local SQLite engine (`file:./dev.db`) for rapid local development, zero-daemon dependency, and relational integrity.
              </p>
              <p>
                To deploy to production on <strong>PostgreSQL</strong>, configure `DATABASE_URL="postgresql://user:pass@host:5432/mentneo_sales?schema=public"` in `.env` and execute `npx prisma db push`.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" size="md" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-2" /> Save System Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
