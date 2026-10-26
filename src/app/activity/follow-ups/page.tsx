"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Phone,
  Eye,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatIST } from "@/lib/date-utils";

export default function FollowUpCalendarPage() {
  const [followUps, setFollowUps] = React.useState<any[]>([]);
  const [counts, setCounts] = React.useState<any>({});
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Complete Followup Modal
  const [completeTarget, setCompleteTarget] = React.useState<any>(null);
  const [completeOutcome, setCompleteOutcome] = React.useState("CONNECTED");
  const [completeNotes, setCompleteNotes] = React.useState("");

  // New Followup Modal
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [newLeadId, setNewLeadId] = React.useState("");
  const [newDate, setNewDate] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [resFU, resLeads] = await Promise.all([
        fetch("/api/follow-ups"),
        fetch("/api/leads"),
      ]);
      if (resFU.ok) {
        const json = await resFU.json();
        setFollowUps(json.followUps || []);
        setCounts(json.counts || {});
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
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;

    try {
      const res = await fetch(`/api/follow-ups/${completeTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          outcome: completeOutcome,
          notes: completeNotes,
        }),
      });

      if (res.ok) {
        setCompleteTarget(null);
        setCompleteNotes("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadId || !newDate) return;

    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: newLeadId,
          scheduledAt: newDate,
          notes: newNotes,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setNewNotes("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const overdueList = followUps.filter((f) => f.status === "OVERDUE");
  const pendingList = followUps.filter((f) => f.status === "PENDING");
  const completedList = followUps.filter((f) => f.status === "COMPLETED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Follow-up Calendar & Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track pending callbacks, customer check-ins, and highlight overdue tasks
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowScheduleModal(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule Follow-up
        </Button>
      </div>

      {/* Counts Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue Follow-ups</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{counts.overdue || 0}</p>
            <span className="text-[11px] text-slate-500">Requires urgent attention</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Pending</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.pending || 0}</p>
            <span className="text-[11px] text-slate-500">Scheduled on calendar</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{counts.completed || 0}</p>
            <span className="text-[11px] text-slate-500">Successfully called</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Follow-ups</span>
              <CalendarCheck className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.total || 0}</p>
            <span className="text-[11px] text-slate-500">Lifetime follow-ups</span>
          </CardContent>
        </Card>
      </div>

      {/* OVERDUE ALERTS SECTION */}
      {overdueList.length > 0 && (
        <Card className="border-rose-400 dark:border-rose-800 shadow-md">
          <CardHeader className="bg-rose-50/50 dark:bg-rose-950/30 rounded-t-xl border-b border-rose-200 dark:border-rose-900/40">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle className="text-rose-900 dark:text-rose-100">
                Action Required: Overdue Follow-ups ({overdueList.length})
              </CardTitle>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              These follow-up reminders have passed their scheduled time and need immediate customer contact.
            </p>
          </CardHeader>
          <div className="divide-y divide-rose-100 dark:divide-rose-950">
            {overdueList.map((fu) => (
              <div key={fu.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/crm/leads/${fu.lead?.id}`}
                      className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-sky-600"
                    >
                      {fu.lead?.businessName}
                    </Link>
                    <Badge variant="danger">OVERDUE</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Contact: {fu.lead?.contactPerson} ({fu.lead?.phone}) • Scheduled for: <strong className="text-rose-600">{formatIST(fu.scheduledAt)}</strong>
                  </p>
                  {fu.notes && <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{fu.notes}"</p>}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() => {
                      setCompleteTarget(fu);
                      setCompleteNotes("");
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Complete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PENDING / UPCOMING SCHEDULE */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Scheduled Follow-ups ({pendingList.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Lead / Prospect</th>
                <th className="py-3 px-3">Contact Details</th>
                <th className="py-3 px-3">Assigned Executive</th>
                <th className="py-3 px-3">Scheduled Date & Time (IST)</th>
                <th className="py-3 px-3">Agenda / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading follow-ups...</td>
                </tr>
              ) : pendingList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No upcoming follow-ups scheduled. Click Schedule Follow-up to add one.
                  </td>
                </tr>
              ) : (
                pendingList.map((fu) => (
                  <tr key={fu.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <Link href={`/crm/leads/${fu.lead?.id}`} className="hover:text-sky-600">
                        {fu.lead?.businessName}
                      </Link>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {fu.lead?.contactPerson} • {fu.lead?.phone}
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {fu.employee?.name}
                    </td>

                    <td className="py-3 px-3 text-sky-600 dark:text-sky-400 font-semibold">
                      {formatIST(fu.scheduledAt)}
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {fu.notes || "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCompleteTarget(fu);
                          setCompleteNotes("");
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Done
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Complete Followup Dialog */}
      <Dialog
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title={`Complete Follow-up: ${completeTarget?.lead?.businessName}`}
        description="Record the discussion outcome to keep the lead interaction timeline updated"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <Select
            label="Follow-up Call Outcome"
            value={completeOutcome}
            onChange={(e) => setCompleteOutcome(e.target.value)}
          >
            <option value="CONNECTED">Connected & Discussed</option>
            <option value="QUALIFIED">Qualified for Proposal</option>
            <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="RESCHEDULED">Rescheduled to Future Date</option>
          </Select>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Follow-up Completion Notes
            </label>
            <textarea
              rows={3}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Summary of conversation and agreements..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompleteTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save & Mark Completed
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Schedule Followup Modal */}
      <Dialog
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Follow-up"
        description="Select a prospect and set follow-up reminder date"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Prospect / Lead"
            required
            value={newLeadId}
            onChange={(e) => setNewLeadId(e.target.value)}
          >
            <option value="">Select a lead...</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.businessName} ({l.contactPerson})
              </option>
            ))}
          </Select>

          <Input
            label="Scheduled Date & Time (IST)"
            type="datetime-local"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reminder Notes
            </label>
            <textarea
              rows={3}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Call to finalize payment gateway advance payment..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Schedule Follow-up
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
