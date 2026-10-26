"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Calendar,
  CalendarClock,
  Clock,
  Briefcase,
  TrendingUp,
  Receipt,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  PhoneCall,
  Users,
  Edit,
  Plus,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly, formatIST } from "@/lib/date-utils";

type TabKey = "overview" | "timeline" | "details" | "deals" | "payments" | "followups" | "notes";
type ActivityFilter = "ALL" | "CALL" | "FOLLOW_UP" | "MEETING" | "SALE" | "PAYMENT" | "LEAD";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");

  // Timeline Filters
  const [timelineFilter, setTimelineFilter] = React.useState<ActivityFilter>("ALL");
  const [timelineSort, setTimelineSort] = React.useState<"newest" | "oldest">("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Modals
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showCallModal, setShowCallModal] = React.useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = React.useState(false);
  const [showMeetingModal, setShowMeetingModal] = React.useState(false);

  // Edit Client Form State
  const [editForm, setEditForm] = React.useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    businessCategory: "",
    website: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    gstNumber: "",
    status: "ACTIVE",
    notes: "",
  });

  // Log Call Form State
  const [callForm, setCallForm] = React.useState({
    callDirection: "OUTBOUND",
    callStatus: "CONNECTED",
    durationMinutes: 3,
    outcome: "INTERESTED",
    followUpRequired: false,
    nextFollowUpDate: "",
    notes: "",
  });

  // Follow-up Form State
  const [followUpForm, setFollowUpForm] = React.useState({
    scheduledAt: "",
    notes: "",
  });

  // Meeting Form State
  const [meetingForm, setMeetingForm] = React.useState({
    title: "",
    scheduledAt: "",
    agenda: "",
    notes: "",
  });

  // Client Notes State
  const [clientNotes, setClientNotes] = React.useState("");
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchClientDetails = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Client record not found.");
        if (res.status === 403) throw new Error("You do not have permission to view this client.");
        throw new Error("Failed to load client details.");
      }
      const json = await res.json();
      setData(json);
      setClientNotes(json.client.notes || "");
      setEditForm({
        businessName: json.client.businessName || "",
        contactPerson: json.client.contactPerson || "",
        phone: json.client.phone || "",
        email: json.client.email || "",
        businessCategory: json.client.businessCategory || "",
        website: json.client.website || "",
        address: json.client.address || "",
        city: json.client.city || "",
        state: json.client.state || "",
        postalCode: json.client.postalCode || "",
        gstNumber: json.client.gstNumber || "",
        status: json.client.status || "ACTIVE",
        notes: json.client.notes || "",
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    if (clientId) fetchClientDetails();
  }, [clientId, fetchClientDetails]);

  // Submit Edit Client
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchClientDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Log Call
  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "CALL",
          ...callForm,
        }),
      });
      if (res.ok) {
        setShowCallModal(false);
        setCallForm({
          callDirection: "OUTBOUND",
          callStatus: "CONNECTED",
          durationMinutes: 3,
          outcome: "INTERESTED",
          followUpRequired: false,
          nextFollowUpDate: "",
          notes: "",
        });
        fetchClientDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Schedule Follow-up
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "FOLLOW_UP",
          ...followUpForm,
        }),
      });
      if (res.ok) {
        setShowFollowUpModal(false);
        setFollowUpForm({ scheduledAt: "", notes: "" });
        fetchClientDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Schedule Meeting
  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "MEETING",
          ...meetingForm,
        }),
      });
      if (res.ok) {
        setShowMeetingModal(false);
        setMeetingForm({ title: "", scheduledAt: "", agenda: "", notes: "" });
        fetchClientDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "NOTE",
          notes: clientNotes,
        }),
      });
      if (res.ok) {
        fetchClientDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Filtered & Sorted Timeline
  const filteredTimeline = React.useMemo(() => {
    if (!data?.timeline) return [];
    let items = [...data.timeline];

    if (timelineFilter !== "ALL") {
      items = items.filter((item) => item.type === timelineFilter);
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      items = items.filter((item) => new Date(item.date).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).setHours(23, 59, 59, 999);
      items = items.filter((item) => new Date(item.date).getTime() <= toTime);
    }

    if (timelineSort === "oldest") {
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return items;
  }, [data?.timeline, timelineFilter, timelineSort, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading client profile and verified records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          Unable to Load Client Profile
        </h2>
        <p className="text-xs text-slate-400 mb-4">{error || "Client record could not be retrieved."}</p>
        <Link href="/crm/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Clients Directory
          </Button>
        </Link>
      </div>
    );
  }

  const { client, metrics, sales, payments, refunds, calls, followUps, meetings } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/crm/clients"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Clients Directory
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Client
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCallModal(true)}>
            <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> Log Call
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFollowUpModal(true)}>
            <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> Schedule Follow-up
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowMeetingModal(true)}>
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Record Meeting
          </Button>
        </div>
      </div>

      {/* 1. Client Profile Header */}
      <Card className="border-sky-500/20 bg-gradient-to-r from-sky-500/5 via-transparent to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold">
                  {client.clientNumber}
                </span>
                <Badge status={client.status}>{client.status}</Badge>
                {client.businessCategory && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    {client.businessCategory}
                  </span>
                )}
                {client.originalLead?.source && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium">
                    Lead Source: {client.originalLead.source.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {client.businessName}
                </h1>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Primary Contact: <strong className="text-slate-900 dark:text-slate-100">{client.contactPerson}</strong>
                </p>
              </div>

              {/* Contact Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{client.email || <span className="text-slate-400 italic">Not provided</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {[client.city, client.state, client.postalCode].filter(Boolean).join(", ") || (
                      <span className="text-slate-400 italic">Location not provided</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {client.website ? (
                    <a
                      href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                    >
                      {client.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Website not provided</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>Onboarded: {formatISTDateOnly(client.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>Account Rep: <strong>{client.assignedTo?.name || "Unassigned"}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Status / Highlights */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[220px]">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Account Health</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {metrics.outstandingPaise === "0" ? "Fully Paid" : "Balance Due"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      metrics.outstandingPaise === "0"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                    }`}
                  >
                    {metrics.outstandingPaise === "0" ? "CLEAR" : "RECEIVABLE"}
                  </span>
                </div>
              </div>

              {client.originalLead && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 text-xs">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Original Lead</p>
                  <Link
                    href={`/crm/leads/${client.originalLead.id}`}
                    className="font-mono text-sky-600 dark:text-sky-400 font-bold hover:underline flex items-center justify-between"
                  >
                    {client.originalLead.leadNumber} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Deals</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.totalDeals}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Purchased Packages</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">Final Deal Value</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatINR(BigInt(metrics.totalDealValuePaise))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total Revenue</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Verified Paid</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(BigInt(metrics.totalVerifiedPaidPaise))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Cash Collections</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[11px] font-semibold text-rose-500 uppercase">Verified Refunds</p>
          <p className="text-xl font-bold text-rose-500 mt-1">
            {formatINR(BigInt(metrics.totalVerifiedRefundsPaise))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Issued Refunds</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase">Net Collections</p>
          <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {formatINR(BigInt(metrics.netCollectionsPaise))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Paid minus Refunds</p>
        </Card>

        <Card className="p-3.5">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Outstanding</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatINR(BigInt(metrics.outstandingPaise))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pending Balance</p>
        </Card>
      </div>

      {/* Activity Count Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-sky-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Calls Logged:</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{metrics.totalCalls}</span>
        </Card>

        <Card className="p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-purple-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Follow-ups:</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {metrics.pendingFollowUps} Pending • {metrics.completedFollowUps} Done
          </span>
        </Card>

        <Card className="p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Meetings:</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {metrics.totalMeetings} Total • {metrics.upcomingMeetings} Upcoming
          </span>
        </Card>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
        {[
          { key: "overview", label: "Overview & Summary", icon: TrendingUp },
          { key: "timeline", label: `Activity Timeline (${filteredTimeline.length})`, icon: Clock },
          { key: "details", label: "Contact & Business", icon: Building },
          { key: "deals", label: `Deals & Packages (${sales.length})`, icon: Receipt },
          { key: "payments", label: `Payments & Ledger (${payments.length})`, icon: CreditCard },
          { key: "followups", label: `Follow-ups & Meetings (${followUps.length + meetings.length})`, icon: CalendarClock },
          { key: "notes", label: "Client Notes", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-sky-500 text-sky-600 dark:text-sky-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Deals Snapshot */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-sky-500" /> Active Deals & Packages
                </CardTitle>
                <button
                  onClick={() => setActiveTab("deals")}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                >
                  View All ({sales.length})
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {sales.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No sales deals logged for this client.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sales.slice(0, 3).map((s: any) => (
                      <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{s.packageName}</p>
                          <p className="text-[11px] text-slate-400">
                            Deal {s.saleNumber} • Closed {formatISTDateOnly(s.saleDate)} • Rep: {s.employee?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(BigInt(s.finalDealValuePaise))}
                          </p>
                          <Badge status={s.paymentStatus}>{s.paymentStatus}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Timeline Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Recent Client Activity
                </CardTitle>
                <button
                  onClick={() => setActiveTab("timeline")}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Full Timeline ({data.timeline.length})
                </button>
              </CardHeader>
              <CardContent className="p-4">
                {data.timeline.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No activities logged yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.timeline.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                            <span className="text-[10px] text-slate-400">{formatIST(item.date)}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">By {item.employeeName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Account Snapshot */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Account Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Primary Location</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {[client.city, client.state].filter(Boolean).join(", ") || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tax / GST Number</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                    {client.gstNumber || "Not registered"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Client Status</span>
                  <Badge status={client.status}>{client.status}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Executive</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {client.assignedTo?.name || "Unassigned"}
                  </span>
                  {client.assignedTo?.email && (
                    <span className="text-[10px] text-slate-400 block">{client.assignedTo.email}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Note Card */}
            <Card>
              <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Important Client Note
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
                  {isSavingNotes ? "Saving..." : "Save"}
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <textarea
                  rows={4}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Record essential client context, key stakeholder preferences, or delivery instructions..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CHRONOLOGICAL ACTIVITY TIMELINE */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Timeline Filter Controls */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Type Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {[
                    { key: "ALL", label: "All Activities" },
                    { key: "CALL", label: "Calls" },
                    { key: "FOLLOW_UP", label: "Follow-ups" },
                    { key: "MEETING", label: "Meetings" },
                    { key: "SALE", label: "Deals & Sales" },
                    { key: "PAYMENT", label: "Payments" },
                    { key: "LEAD", label: "Lead History" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setTimelineFilter(f.key as ActivityFilter)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        timelineFilter === f.key
                          ? "bg-sky-500 text-white font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort Order Toggle */}
                <button
                  onClick={() => setTimelineSort(timelineSort === "newest" ? "oldest" : "newest")}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort: {timelineSort === "newest" ? "Newest First" : "Oldest First"}
                </button>
              </div>

              {/* Date Range Filtering */}
              <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Filter by Date:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">From:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline Feed */}
          <Card>
            <CardContent className="p-6">
              {filteredTimeline.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No activities match your selected filters</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Try clearing the filters or log a new call or meeting above.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
                  {filteredTimeline.map((event: any) => {
                    let dotColor = "bg-sky-500";
                    let typeLabel = "ACTIVITY";

                    if (event.type === "CALL") {
                      dotColor = "bg-sky-500";
                      typeLabel = "CALL";
                    } else if (event.type === "FOLLOW_UP") {
                      dotColor = "bg-purple-500";
                      typeLabel = "FOLLOW-UP";
                    } else if (event.type === "MEETING") {
                      dotColor = "bg-indigo-500";
                      typeLabel = "MEETING";
                    } else if (event.type === "SALE") {
                      dotColor = "bg-emerald-500";
                      typeLabel = "DEAL CLOSED";
                    } else if (event.type === "PAYMENT") {
                      dotColor = "bg-teal-500";
                      typeLabel = "PAYMENT";
                    } else if (event.type === "REFUND") {
                      dotColor = "bg-rose-500";
                      typeLabel = "REFUND";
                    } else if (event.type === "LEAD") {
                      dotColor = "bg-amber-500";
                      typeLabel = "LEAD ONBOARDING";
                    }

                    return (
                      <div key={event.id} className="relative group">
                        {/* Dot on Timeline line */}
                        <div
                          className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${dotColor}`}
                        />

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 hover:border-sky-500/30 transition-all text-xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {typeLabel}
                              </span>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{event.title}</h3>
                              {event.status && <Badge status={event.status}>{event.status}</Badge>}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{formatIST(event.date)}</span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300">{event.description}</p>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span>Responsible: <strong>{event.employeeName}</strong></span>
                            <span>Recorded in Database</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: CONTACT & BUSINESS DETAILS */}
      {activeTab === "details" && (
        <Card>
          <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Detailed Business & Legal Information
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Verified profile details for invoices and contracts</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Details
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[11px] uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block">Primary Contact Person</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {client.contactPerson}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone Number</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{client.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email Address</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {client.email || <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Company Website</span>
                    {client.website ? (
                      <a
                        href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        {client.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[11px] uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Business & Billing Location
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block">Business / Organization Name</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {client.businessName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Business Category / Industry</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {client.businessCategory || <span className="text-slate-400 italic">Not specified</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">GST / Tax Identification Number</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      {client.gstNumber || <span className="text-slate-400 italic">Not registered</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Full Physical / Billing Address</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {[client.address, client.city, client.state, client.postalCode].filter(Boolean).join(", ") || (
                        <span className="text-slate-400 italic">Address not provided</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: DEALS & PACKAGES */}
      {activeTab === "deals" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Deal Number</th>
                  <th className="py-3 px-3">Package / Service</th>
                  <th className="py-3 px-3">Sale Date</th>
                  <th className="py-3 px-3">Sales Executive</th>
                  <th className="py-3 px-3 text-right">Contract Value</th>
                  <th className="py-3 px-3 text-right">Final Value</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No sales packages recorded for this client.
                    </td>
                  </tr>
                ) : (
                  sales.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-semibold text-sky-600 dark:text-sky-400">
                        {s.saleNumber}
                        {s.invoiceNumber && (
                          <span className="block text-[10px] text-slate-400">{s.invoiceNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {s.packageName}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatISTDateOnly(s.saleDate)}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{s.employee?.name}</td>
                      <td className="py-3 px-3 text-right text-slate-500 line-through">
                        {s.discountPaise !== "0" ? formatINR(BigInt(s.totalContractValuePaise)) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(BigInt(s.finalDealValuePaise))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge status={s.paymentStatus}>{s.paymentStatus}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: PAYMENTS & REFUNDS LEDGER */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          {/* Collections Ledger */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-500" /> Payment Transactions
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Txn Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Method & Reference</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Verification Status</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No payments recorded for this client.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {p.transactionNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{formatISTDateOnly(p.paymentDate)}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {p.paymentMethod.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{p.transactionReference}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(BigInt(p.amountPaise))}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge status={p.verificationStatus}>{p.verificationStatus}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {p.recordedBy}
                          {p.verifiedBy && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                              Verified by {p.verifiedBy}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Refunds Ledger */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> Issued Refunds
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Refund Number</th>
                    <th className="py-3 px-3">Processed Date</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-4">Processed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {refunds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No refunds issued for this client.
                      </td>
                    </tr>
                  ) : (
                    refunds.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-rose-600">{r.refundNumber}</td>
                        <td className="py-3 px-3 text-slate-500">{formatISTDateOnly(r.processedAt)}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.reason}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600">
                          {formatINR(BigInt(r.amountPaise))}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{r.processedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: FOLLOW-UPS & MEETINGS */}
      {activeTab === "followups" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Follow-ups */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-purple-500" /> Follow-ups
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowFollowUpModal(true)}>
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {followUps.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No follow-ups recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {followUps.map((fu: any) => (
                    <div key={fu.id} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatIST(fu.scheduledAt)}
                        </span>
                        <Badge status={fu.status}>{fu.status}</Badge>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">{fu.notes || "Follow-up discussion"}</p>
                      <p className="text-[10px] text-slate-400">Assigned: {fu.employee?.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meetings */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Scheduled Meetings
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowMeetingModal(true)}>
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {meetings.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No meetings recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {meetings.map((m: any) => (
                    <div key={m.id} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{m.title}</span>
                        <Badge status={m.status}>{m.status}</Badge>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">{formatIST(m.scheduledAt)}</p>
                      {m.agenda && <p className="text-slate-500 dark:text-slate-400">Agenda: {m.agenda}</p>}
                      <p className="text-[10px] text-slate-400">Organizer: {m.employee?.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 7: NOTES */}
      {activeTab === "notes" && (
        <Card>
          <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Work History & Internal Client Notes
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanent records of onboarding milestones, delivery coordination, and client agreements
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
              {isSavingNotes ? "Saving Notes..." : "Save Notes"}
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <textarea
              rows={8}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Record detailed notes about this client account..."
              className="w-full text-xs p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </CardContent>
        </Card>
      )}

      {/* --- ACTION DIALOGS --- */}

      {/* Edit Client Modal */}
      <Dialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Client Information"
        description="Update profile, address, and legal details for this client account"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
          <Input
            label="Business Name"
            value={editForm.businessName}
            onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
            required
          />
          <Input
            label="Contact Person"
            value={editForm.contactPerson}
            onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Business Category"
              value={editForm.businessCategory}
              onChange={(e) => setEditForm({ ...editForm, businessCategory: e.target.value })}
            />
            <Input
              label="Website"
              value={editForm.website}
              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
            />
          </div>
          <Input
            label="Street Address"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="City"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            />
            <Input
              label="State"
              value={editForm.state}
              onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
            />
            <Input
              label="Postal Code"
              value={editForm.postalCode}
              onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="GST Number"
              value={editForm.gstNumber}
              onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value })}
            />
            <Select
              label="Lifecycle Status"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "ONBOARDING", label: "Onboarding" },
                { value: "AT_RISK", label: "At Risk" },
                { value: "CHURNED", label: "Churned" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Log Call Modal */}
      <Dialog
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        title="Log Client Phone Call"
        description="Record telephone or WhatsApp call discussion and outcomes"
      >
        <form onSubmit={handleCallSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Call Direction"
              value={callForm.callDirection}
              onChange={(e) => setCallForm({ ...callForm, callDirection: e.target.value })}
              options={[
                { value: "OUTBOUND", label: "Outbound Call" },
                { value: "INBOUND", label: "Inbound Call" },
              ]}
            />
            <Select
              label="Call Status"
              value={callForm.callStatus}
              onChange={(e) => setCallForm({ ...callForm, callStatus: e.target.value })}
              options={[
                { value: "CONNECTED", label: "Connected" },
                { value: "NOT_ANSWERED", label: "Not Answered" },
                { value: "BUSY", label: "Busy" },
                { value: "WRONG_NUMBER", label: "Wrong Number" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (Minutes)"
              type="number"
              min="0"
              value={callForm.durationMinutes}
              onChange={(e) => setCallForm({ ...callForm, durationMinutes: Number(e.target.value) })}
            />
            <Select
              label="Call Outcome"
              value={callForm.outcome}
              onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
              options={[
                { value: "INTERESTED", label: "Interested in Add-on" },
                { value: "SUPPORT_REQUESTED", label: "Support / Service Request" },
                { value: "CALLBACK_REQUESTED", label: "Callback Requested" },
                { value: "MEETING_SCHEDULED", label: "Review Meeting Scheduled" },
                { value: "SATISFIED", label: "Satisfied Customer" },
                { value: "ESCALATION", label: "Service Escalation" },
              ]}
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Call Notes</label>
            <textarea
              rows={3}
              value={callForm.notes}
              onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
              placeholder="What was discussed during the call..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowCallModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Log Call"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Schedule Follow-up Modal */}
      <Dialog
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        title="Schedule Follow-up"
        description="Set an automated reminder for your next interaction with this client"
      >
        <form onSubmit={handleFollowUpSubmit} className="space-y-3 text-xs">
          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={followUpForm.scheduledAt}
            onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledAt: e.target.value })}
            required
          />
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Follow-up Purpose & Notes</label>
            <textarea
              rows={3}
              value={followUpForm.notes}
              onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
              placeholder="E.g. Check onboarding progress, send updated invoice..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Follow-up"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Record Meeting Modal */}
      <Dialog
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        title="Record / Schedule Meeting"
        description="Schedule a product review or account milestone meeting"
      >
        <form onSubmit={handleMeetingSubmit} className="space-y-3 text-xs">
          <Input
            label="Meeting Title"
            value={meetingForm.title}
            onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
            placeholder="E.g. Monthly Progress Review, Executive Demo"
            required
          />
          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={meetingForm.scheduledAt}
            onChange={(e) => setMeetingForm({ ...meetingForm, scheduledAt: e.target.value })}
            required
          />
          <Input
            label="Meeting Agenda"
            value={meetingForm.agenda}
            onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
            placeholder="Topics to discuss..."
          />
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Notes / Discussion</label>
            <textarea
              rows={3}
              value={meetingForm.notes}
              onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
              placeholder="Meeting discussion notes or action items..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowMeetingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Meeting"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
