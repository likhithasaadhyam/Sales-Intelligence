"use client";

import * as React from "react";
import Link from "next/link";
import {
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  Clock,
  Plus,
  Search,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatIST } from "@/lib/date-utils";

export default function CallActivityPage() {
  const [calls, setCalls] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState<any>({});
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [outcomeFilter, setOutcomeFilter] = React.useState("ALL");

  // Call Logger Modal
  const [showModal, setShowModal] = React.useState(false);
  const [leadId, setLeadId] = React.useState("");
  const [callDirection, setCallDirection] = React.useState("OUTBOUND");
  const [callStatus, setCallStatus] = React.useState("CONNECTED");
  const [durationMins, setDurationMins] = React.useState(4);
  const [durationSecs, setDurationSecs] = React.useState(0);
  const [outcome, setOutcome] = React.useState("QUALIFIED");
  const [followupReq, setFollowupReq] = React.useState(true);
  const [nextDate, setNextDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [resCalls, resLeads] = await Promise.all([
        fetch(`/api/calls?status=${statusFilter}&outcome=${outcomeFilter}`),
        fetch("/api/leads"),
      ]);
      if (resCalls.ok) {
        const json = await resCalls.json();
        setCalls(json.calls || []);
        setMetrics(json.metrics || {});
      }
      if (resLeads.ok) {
        const jsonLeads = await resLeads.json();
        setLeads(jsonLeads.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, outcomeFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      setFormError("Please select a lead prospect");
      return;
    }
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          callDirection,
          callStatus,
          durationMinutes: durationMins,
          durationSeconds: durationSecs,
          outcome,
          followUpRequired: followupReq,
          nextFollowUpDate: nextDate || undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to log call");
      } else {
        setShowModal(false);
        setNotes("");
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Call Activity Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track outbound prospecting calls, connected ratios, durations, and follow-up conversions
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Phone Call
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Total Calls</span>
              <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{metrics.totalCalls || 0}</p>
            <span className="text-[10px] text-slate-400">Total logged</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Connected</span>
              <PhoneForwarded className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.connectedCalls || 0}</p>
            <span className="text-[10px] text-slate-400">Answered by lead</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Not Answered</span>
              <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{metrics.unansweredCalls || 0}</p>
            <span className="text-[10px] text-slate-400">No answer / busy</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Connected %</span>
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{metrics.connectionRate || 0}%</p>
            <span className="text-[10px] text-slate-400">Call pickup rate</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Avg Duration</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {Math.round((metrics.avgDurationSeconds || 0) / 60)} min
            </p>
            <span className="text-[10px] text-slate-400">{metrics.avgDurationSeconds || 0} seconds</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">Qualified Calls</span>
              <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{metrics.qualifiedOutcomes || 0}</p>
            <span className="text-[10px] text-slate-400">High intent leads</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Select
            className="w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Call Statuses</option>
            <option value="CONNECTED">Connected</option>
            <option value="NOT_ANSWERED">Not Answered</option>
            <option value="BUSY">Line Busy</option>
            <option value="WRONG_NUMBER">Wrong Number</option>
          </Select>

          <Select
            className="w-48"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
          >
            <option value="ALL">All Outcomes</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="INTERESTED">Interested</option>
            <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
            <option value="CALLBACK_REQUESTED">Call Back Requested</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="NO_ANSWER">No Answer</option>
            <option value="CONVERTED">Converted to Client</option>
          </Select>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Call Number</th>
                <th className="py-3 px-3">Lead / Prospect</th>
                <th className="py-3 px-3">Sales Executive</th>
                <th className="py-3 px-3 text-center">Direction</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Duration</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">Call Time (IST)</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading call activity...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No call logs recorded. Click Log Phone Call to record a call.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {call.callNumber}
                    </td>

                    <td className="py-3 px-3">
                      <Link
                        href={`/crm/leads/${call.lead?.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400"
                      >
                        {call.lead?.businessName || "Unknown"}
                      </Link>
                      <p className="text-[10px] text-slate-400">{call.lead?.contactPerson} • {call.lead?.phone}</p>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {call.employee?.name}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {call.callDirection}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={call.callStatus}>{call.callStatus}</Badge>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {call.outcome}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {formatIST(call.callDateTime)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {call.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual Call Logger Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Prospecting Call"
        description="Manual call tracking with duration and follow-up integration. Ready for verified telephony provider integration."
      >
        <form onSubmit={handleCreateCall} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <Select
            label="Select Lead Prospect"
            required
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          >
            <option value="">Choose a prospect...</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.businessName} ({l.contactPerson} - {l.phone})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Call Direction"
              value={callDirection}
              onChange={(e) => setCallDirection(e.target.value)}
            >
              <option value="OUTBOUND">Outbound</option>
              <option value="INBOUND">Inbound</option>
            </Select>

            <Select
              label="Call Status"
              value={callStatus}
              onChange={(e) => setCallStatus(e.target.value)}
            >
              <option value="CONNECTED">Connected</option>
              <option value="NOT_ANSWERED">Not Answered</option>
              <option value="BUSY">Line Busy</option>
              <option value="WRONG_NUMBER">Wrong Number</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (Minutes)"
              type="number"
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
            />
            <Input
              label="Duration (Seconds)"
              type="number"
              value={durationSecs}
              onChange={(e) => setDurationSecs(Number(e.target.value))}
            />
          </div>

          <Select
            label="Call Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="QUALIFIED">Qualified</option>
            <option value="INTERESTED">Interested</option>
            <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
            <option value="CALLBACK_REQUESTED">Call Back Requested</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="NO_ANSWER">No Answer</option>
            <option value="CONVERTED">Converted to Sale</option>
          </Select>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={followupReq}
                onChange={(e) => setFollowupReq(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Schedule Follow-up from this Call
            </label>

            {followupReq && (
              <Input
                label="Follow-up Date & Time"
                type="datetime-local"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Call Notes / Customer Discussion
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What questions did the prospect ask? Next steps agreed..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Log Call Record
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
