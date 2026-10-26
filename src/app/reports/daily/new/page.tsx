"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  ArrowLeft,
  Save,
  Send,
  PhoneCall,
  UserPlus,
  TrendingUp,
  Receipt,
  FileText,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatISTDateOnly } from "@/lib/date-utils";

export default function NewDailyWorkReportPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [reportingDate, setReportingDate] = React.useState(new Date().toISOString().slice(0, 10));

  // Calls
  const [callsMade, setCallsMade] = React.useState(50);
  const [connectedCalls, setConnectedCalls] = React.useState(35);
  const [unansweredCalls, setUnansweredCalls] = React.useState(15);
  const [interestedProspects, setInterestedProspects] = React.useState(8);
  const [followUpCalls, setFollowUpCalls] = React.useState(18);
  const [whatsappFollowups, setWhatsappFollowups] = React.useState(20);
  const [meetingsScheduled, setMeetingsScheduled] = React.useState(2);

  // Leads
  const [newLeadsReceived, setNewLeadsReceived] = React.useState(5);
  const [newLeadsAdded, setNewLeadsAdded] = React.useState(5);
  const [leadsContacted, setLeadsContacted] = React.useState(25);
  const [qualifiedLeads, setQualifiedLeads] = React.useState(4);
  const [hotLeads, setHotLeads] = React.useState(2);
  const [warmLeads, setWarmLeads] = React.useState(5);
  const [coldLeads, setColdLeads] = React.useState(3);
  const [followupsCompleted, setFollowupsCompleted] = React.useState(14);

  // Sales
  const [proposalsSent, setProposalsSent] = React.useState(2);
  const [meetingsCompleted, setMeetingsCompleted] = React.useState(2);
  const [negotiationsInProgress, setNegotiationsInProgress] = React.useState(2);
  const [dealsClosed, setDealsClosed] = React.useState(1);
  const [newClientsAcquired, setNewClientsAcquired] = React.useState(1);
  const [packageSold, setPackageSold] = React.useState("Mentneo Professional Scale (₹35,000)");
  const [dealValueRupees, setDealValueRupees] = React.useState(35000);

  // Financials
  const [revenueGeneratedRupees, setRevenueGeneratedRupees] = React.useState(35000);
  const [amountCollectedRupees, setAmountCollectedRupees] = React.useState(35000);
  const [amountUpiRupees, setAmountUpiRupees] = React.useState(35000);
  const [amountBankTransferRupees, setAmountBankTransferRupees] = React.useState(0);
  const [amountCashRupees, setAmountCashRupees] = React.useState(0);
  const [amountGatewayRupees, setAmountGatewayRupees] = React.useState(0);
  const [pendingAmountRupees, setPendingAmountRupees] = React.useState(0);
  const [refundsRupees, setRefundsRupees] = React.useState(0);

  // Summary
  const [mainActivities, setMainActivities] = React.useState("");
  const [clientConversations, setClientConversations] = React.useState("");
  const [challengesFaced, setChallengesFaced] = React.useState("");
  const [reasonMissedTargets, setReasonMissedTargets] = React.useState("");
  const [tomorrowPlan, setTomorrowPlan] = React.useState("");
  const [additionalNotes, setAdditionalNotes] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      });
  }, []);

  const handleSubmit = async (action: "DRAFT" | "SUBMIT") => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportingDate,
          action,
          callsMade,
          connectedCalls,
          unansweredCalls,
          interestedProspects,
          followUpCalls,
          whatsappFollowups,
          meetingsScheduled,
          newLeadsReceived,
          newLeadsAdded,
          leadsContacted,
          qualifiedLeads,
          hotLeads,
          warmLeads,
          coldLeads,
          followupsCompleted,
          proposalsSent,
          meetingsCompleted,
          negotiationsInProgress,
          dealsClosed,
          newClientsAcquired,
          packageSold,
          dealValueRupees,
          revenueGeneratedRupees,
          amountCollectedRupees,
          amountUpiRupees,
          amountBankTransferRupees,
          amountCashRupees,
          amountGatewayRupees,
          pendingAmountRupees,
          refundsRupees,
          mainActivities,
          clientConversations,
          challengesFaced,
          reasonMissedTargets,
          tomorrowPlan,
          additionalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "Failed to save report" });
      } else {
        setStatusMessage({
          type: "success",
          text: action === "DRAFT" ? "Draft saved successfully." : "Daily work report submitted successfully for manager review!",
        });
        if (action === "SUBMIT") {
          setTimeout(() => router.push("/reports/daily"), 1200);
        }
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network connection error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/reports/daily"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Daily Reports
        </Link>
        <span className="text-xs text-slate-400">
          Daily Deadline: <strong>8:00 PM IST</strong>
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
            Daily Work Report Submission Form
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mandatory daily submission for all sales executives to log daily calls, leads, closed sales, and collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={isLoading}
            onClick={() => handleSubmit("DRAFT")}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={() => handleSubmit("SUBMIT")}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Daily Report
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
              : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          {statusMessage.text}
        </div>
      )}

      {/* Section 1: Employee & Reporting Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">1. Employee & Reporting Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-500 block mb-1">Employee Name</label>
              <input
                disabled
                value={currentUser?.name || "Sales Executive"}
                className="w-full h-9 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Employee Code</label>
              <input
                disabled
                value={currentUser?.employeeCode || "MNT-001"}
                className="w-full h-9 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-300 font-mono font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Reporting Date</label>
              <input
                type="date"
                value={reportingDate}
                onChange={(e) => setReportingDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Team / Department</label>
              <input
                disabled
                value={currentUser?.teamName || "Mentneo Alpha Inside Sales"}
                className="w-full h-9 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 text-slate-700 dark:text-slate-300 font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Call Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-sky-600" /> 2. Call Activity Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Total Calls Made"
              type="number"
              value={callsMade}
              onChange={(e) => setCallsMade(Number(e.target.value))}
            />
            <Input
              label="Connected Calls"
              type="number"
              value={connectedCalls}
              onChange={(e) => setConnectedCalls(Number(e.target.value))}
            />
            <Input
              label="Calls Not Answered"
              type="number"
              value={unansweredCalls}
              onChange={(e) => setUnansweredCalls(Number(e.target.value))}
            />
            <Input
              label="Interested Prospects"
              type="number"
              value={interestedProspects}
              onChange={(e) => setInterestedProspects(Number(e.target.value))}
            />
            <Input
              label="Follow-up Calls"
              type="number"
              value={followUpCalls}
              onChange={(e) => setFollowUpCalls(Number(e.target.value))}
            />
            <Input
              label="WhatsApp Follow-ups"
              type="number"
              value={whatsappFollowups}
              onChange={(e) => setWhatsappFollowups(Number(e.target.value))}
            />
            <Input
              label="Meetings Scheduled"
              type="number"
              value={meetingsScheduled}
              onChange={(e) => setMeetingsScheduled(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Lead Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" /> 3. Lead & Pipeline Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="New Leads Received"
              type="number"
              value={newLeadsReceived}
              onChange={(e) => setNewLeadsReceived(Number(e.target.value))}
            />
            <Input
              label="New Leads Added"
              type="number"
              value={newLeadsAdded}
              onChange={(e) => setNewLeadsAdded(Number(e.target.value))}
            />
            <Input
              label="Leads Contacted"
              type="number"
              value={leadsContacted}
              onChange={(e) => setLeadsContacted(Number(e.target.value))}
            />
            <Input
              label="Qualified Leads"
              type="number"
              value={qualifiedLeads}
              onChange={(e) => setQualifiedLeads(Number(e.target.value))}
            />
            <Input
              label="Hot Leads (🔥)"
              type="number"
              value={hotLeads}
              onChange={(e) => setHotLeads(Number(e.target.value))}
            />
            <Input
              label="Warm Leads (⚡)"
              type="number"
              value={warmLeads}
              onChange={(e) => setWarmLeads(Number(e.target.value))}
            />
            <Input
              label="Cold Leads (❄️)"
              type="number"
              value={coldLeads}
              onChange={(e) => setColdLeads(Number(e.target.value))}
            />
            <Input
              label="Follow-ups Done"
              type="number"
              value={followupsCompleted}
              onChange={(e) => setFollowupsCompleted(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Sales Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> 4. Sales & Conversion Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Proposals Sent"
              type="number"
              value={proposalsSent}
              onChange={(e) => setProposalsSent(Number(e.target.value))}
            />
            <Input
              label="Meetings Completed"
              type="number"
              value={meetingsCompleted}
              onChange={(e) => setMeetingsCompleted(Number(e.target.value))}
            />
            <Input
              label="Negotiations In Progress"
              type="number"
              value={negotiationsInProgress}
              onChange={(e) => setNegotiationsInProgress(Number(e.target.value))}
            />
            <Input
              label="Deals Closed Today"
              type="number"
              value={dealsClosed}
              onChange={(e) => setDealsClosed(Number(e.target.value))}
            />
            <Input
              label="New Clients Acquired"
              type="number"
              value={newClientsAcquired}
              onChange={(e) => setNewClientsAcquired(Number(e.target.value))}
            />
            <div className="sm:col-span-2">
              <Input
                label="Package Sold Today"
                value={packageSold}
                onChange={(e) => setPackageSold(e.target.value)}
              />
            </div>
            <Input
              label="Deal Value (₹)"
              type="number"
              value={dealValueRupees}
              onChange={(e) => setDealValueRupees(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Financial Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" /> 5. Financial & Payment Collection Activity
          </CardTitle>
          <p className="text-xs text-slate-500">
            Note: Daily work reports are activity summaries. Official payment verification takes place in the collections register.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Total Revenue Generated (₹)"
              type="number"
              value={revenueGeneratedRupees}
              onChange={(e) => setRevenueGeneratedRupees(Number(e.target.value))}
            />
            <Input
              label="Amount Collected Today (₹)"
              type="number"
              value={amountCollectedRupees}
              onChange={(e) => setAmountCollectedRupees(Number(e.target.value))}
            />
            <Input
              label="Received via UPI (₹)"
              type="number"
              value={amountUpiRupees}
              onChange={(e) => setAmountUpiRupees(Number(e.target.value))}
            />
            <Input
              label="Received via Bank Transfer (₹)"
              type="number"
              value={amountBankTransferRupees}
              onChange={(e) => setAmountBankTransferRupees(Number(e.target.value))}
            />
            <Input
              label="Received via Cash (₹)"
              type="number"
              value={amountCashRupees}
              onChange={(e) => setAmountCashRupees(Number(e.target.value))}
            />
            <Input
              label="Received via Gateway (₹)"
              type="number"
              value={amountGatewayRupees}
              onChange={(e) => setAmountGatewayRupees(Number(e.target.value))}
            />
            <Input
              label="Pending Amount (₹)"
              type="number"
              value={pendingAmountRupees}
              onChange={(e) => setPendingAmountRupees(Number(e.target.value))}
            />
            <Input
              label="Refunds, if any (₹)"
              type="number"
              value={refundsRupees}
              onChange={(e) => setRefundsRupees(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Qualitative Work Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" /> 6. Work Summary & Accountability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Main Activities Completed Today *
            </label>
            <textarea
              required
              rows={2}
              value={mainActivities}
              onChange={(e) => setMainActivities(e.target.value)}
              placeholder="Summary of prospecting calls, negotiations, and closed client onboarding..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Important Client Conversations
            </label>
            <textarea
              rows={2}
              value={clientConversations}
              onChange={(e) => setClientConversations(e.target.value)}
              placeholder="Key quotes, customer requirements, enterprise negotiations..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Challenges Faced
              </label>
              <textarea
                rows={2}
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                placeholder="Objections encountered, competition, technical queries..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Missed Targets (if any)
              </label>
              <textarea
                rows={2}
                value={reasonMissedTargets}
                onChange={(e) => setReasonMissedTargets(e.target.value)}
                placeholder="Unreachable prospects, rescheduled demos, decision maker unavailable..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tomorrow’s Action Plan
            </label>
            <textarea
              rows={2}
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              placeholder="Priority follow-ups, hot leads to close, scheduled demos..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any other comments or feedback for sales leadership..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submission Footer Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="outline"
          isLoading={isLoading}
          onClick={() => handleSubmit("DRAFT")}
        >
          <Save className="w-4 h-4 mr-2" /> Save as Draft
        </Button>
        <Button
          variant="primary"
          isLoading={isLoading}
          onClick={() => handleSubmit("SUBMIT")}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold"
        >
          <Send className="w-4 h-4 mr-2" /> Submit Daily Work Report
        </Button>
      </div>
    </div>
  );
}
