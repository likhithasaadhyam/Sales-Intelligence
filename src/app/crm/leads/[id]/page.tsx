"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  MapPin,
  Mail,
  Phone,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  User,
  Plus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly, formatIST } from "@/lib/date-utils";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [lead, setLead] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Quick Call Modal
  const [showCallModal, setShowCallModal] = React.useState(false);
  const [callStatus, setCallStatus] = React.useState("CONNECTED");
  const [callDurationMins, setCallDurationMins] = React.useState(3);
  const [callOutcome, setCallOutcome] = React.useState("QUALIFIED");
  const [callFollowupReq, setCallFollowupReq] = React.useState(true);
  const [callNextDate, setCallNextDate] = React.useState("");
  const [callNotes, setCallNotes] = React.useState("");
  const [isSubmittingCall, setIsSubmittingCall] = React.useState(false);

  // Quick Follow-up Modal
  const [showFollowupModal, setShowFollowupModal] = React.useState(false);
  const [fuDate, setFuDate] = React.useState("");
  const [fuNotes, setFuNotes] = React.useState("");

  const fetchLead = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        const json = await res.json();
        setLead(json.lead);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) fetchLead();
  }, [id, fetchLead]);

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCall(true);

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          callStatus,
          durationMinutes: callDurationMins,
          outcome: callOutcome,
          followUpRequired: callFollowupReq,
          nextFollowUpDate: callNextDate || undefined,
          notes: callNotes,
        }),
      });

      if (res.ok) {
        setShowCallModal(false);
        setCallNotes("");
        fetchLead();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingCall(false);
    }
  };

  const handleScheduleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          scheduledAt: fuDate,
          notes: fuNotes,
        }),
      });
      if (res.ok) {
        setShowFollowupModal(false);
        setFuNotes("");
        fetchLead();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchLead();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading lead profile...</div>;
  }

  if (!lead) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-slate-500">Lead record not found</p>
        <Link href="/crm/leads">
          <Button variant="outline" size="sm">Back to Leads</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link
          href="/crm/leads"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads CRM
        </Link>
      </div>

      {/* Main Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {lead.businessName}
                </h1>
                <Badge status={lead.status}>{lead.status}</Badge>
                <Badge
                  variant={
                    lead.temperature === "HOT"
                      ? "danger"
                      : lead.temperature === "WARM"
                      ? "warning"
                      : "default"
                  }
                >
                  {lead.temperature} Temperature
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {lead.contactPerson}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.phone}
                </span>
                {lead.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {lead.email}
                  </span>
                )}
                {(lead.city || lead.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {[lead.city, lead.state].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Assigned to: <strong className="text-slate-700 dark:text-slate-200">{lead.assignedTo?.name}</strong>
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => setShowCallModal(true)}>
                <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> Log Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFollowupModal(true)}>
                <CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Schedule Follow-up
              </Button>
              <Link href={`/sales/records?leadId=${lead.id}&clientName=${encodeURIComponent(lead.businessName)}`}>
                <Button variant="teal" size="sm">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Record Deal
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Status Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Update Lead Stage:</span>
              <select
                value={lead.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
                <option value="PROPOSAL_SENT">Proposal Sent</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span>Estimated Value: <strong className="text-slate-900 dark:text-slate-100">{formatINR(BigInt(lead.estimatedDealValuePaise))}</strong></span>
              <span>Interested: <strong className="text-sky-600 dark:text-sky-400">{lead.packageInterested || "Standard"}</strong></span>
              <span>Next Follow-up: <strong className="text-amber-600">{lead.nextFollowUpDate ? formatISTDateOnly(lead.nextFollowUpDate) : "None scheduled"}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Call Logs & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Call Activity History ({lead.calls?.length || 0})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowCallModal(true)}>
              <Plus className="w-3 h-3 mr-1" /> Log Call
            </Button>
          </CardHeader>
          <CardContent>
            {lead.calls?.length > 0 ? (
              <div className="space-y-3">
                {lead.calls.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge status={c.callStatus}>{c.callStatus}</Badge>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.outcome}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{formatIST(c.callDateTime)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Duration: {Math.round(c.durationSeconds / 60)} mins • Logged by {c.employee?.name}
                    </p>
                    {c.notes && <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic">"{c.notes}"</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">No calls logged yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups & Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Scheduled Follow-ups ({lead.followUps?.length || 0})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowFollowupModal(true)}>
              <Plus className="w-3 h-3 mr-1" /> Schedule
            </Button>
          </CardHeader>
          <CardContent>
            {lead.followUps?.length > 0 ? (
              <div className="space-y-3">
                {lead.followUps.map((f: any) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge status={f.status}>{f.status}</Badge>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatIST(f.scheduledAt)}
                        </span>
                      </div>
                      {f.notes && <p className="text-[11px] text-slate-500 mt-1">{f.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">No follow-ups scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer History */}
      {lead.assignments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Transfer & Assignment Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {lead.assignments.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      Transferred from <strong>{a.previousEmployee?.name || "Unassigned"}</strong> → <strong>{a.newEmployee?.name}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">Reason: {a.reason || "Reassigned by management"}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">{formatIST(a.transferredAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Call Modal */}
      <Dialog
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        title={`Log Call with ${lead.businessName}`}
        description="Records call duration, outcome, and updates lead interaction history"
      >
        <form onSubmit={handleLogCall} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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

            <Input
              label="Duration (Minutes)"
              type="number"
              value={callDurationMins}
              onChange={(e) => setCallDurationMins(Number(e.target.value))}
            />
          </div>

          <Select
            label="Call Outcome"
            value={callOutcome}
            onChange={(e) => setCallOutcome(e.target.value)}
          >
            <option value="INTERESTED">Interested</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
            <option value="CALLBACK_REQUESTED">Call Back Requested</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="NO_ANSWER">No Answer</option>
            <option value="CONVERTED">Converted to Client</option>
          </Select>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={callFollowupReq}
                onChange={(e) => setCallFollowupReq(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Schedule Next Follow-up
            </label>

            {callFollowupReq && (
              <Input
                label="Follow-up Date & Time"
                type="datetime-local"
                value={callNextDate}
                onChange={(e) => setCallNextDate(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Call Notes
            </label>
            <textarea
              rows={3}
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="What was discussed? Customer objections, questions..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCallModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingCall}>
              Save Call Record
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Schedule Followup Modal */}
      <Dialog
        isOpen={showFollowupModal}
        onClose={() => setShowFollowupModal(false)}
        title="Schedule Follow-up"
        description="Creates reminder in personal calendar and triggers follow-up alert"
      >
        <form onSubmit={handleScheduleFollowup} className="space-y-4">
          <Input
            label="Follow-up Date & Time"
            type="datetime-local"
            required
            value={fuDate}
            onChange={(e) => setFuDate(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Agenda / Reminder Notes
            </label>
            <textarea
              rows={3}
              value={fuNotes}
              onChange={(e) => setFuNotes(e.target.value)}
              placeholder="e.g. Call regarding quotation revision, demo presentation..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFollowupModal(false)}
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
