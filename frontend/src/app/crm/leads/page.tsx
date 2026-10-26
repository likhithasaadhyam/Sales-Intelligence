"use client";

import * as React from "react";
import Link from "next/link";
import {
  Contact2,
  Search,
  Plus,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly } from "@/lib/date-utils";
import { useSearch } from "@/lib/search-context";

export default function LeadManagementPage() {
  const [leads, setLeads] = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const { searchQuery: search, setSearchQuery: setSearch } = useSearch();
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [tempFilter, setTempFilter] = React.useState("ALL");
  const [sourceFilter, setSourceFilter] = React.useState("ALL");

  // Add Lead Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [source, setSource] = React.useState("WEBSITE");
  const [dealValueRupees, setDealValueRupees] = React.useState(25000);
  const [pkgInterested, setPkgInterested] = React.useState("Mentneo Starter Growth");
  const [temperature, setTemperature] = React.useState("HOT");
  const [assignedToId, setAssignedToId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Transfer Modal State
  const [transferLead, setTransferLead] = React.useState<any>(null);
  const [transferNewEmployeeId, setTransferNewEmployeeId] = React.useState("");
  const [transferReason, setTransferReason] = React.useState("");

  const fetchLeads = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/leads?status=${statusFilter}&temperature=${tempFilter}&source=${sourceFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tempFilter, sourceFilter]);

  React.useEffect(() => {
    fetchLeads();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      });
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees || []));
  }, [fetchLeads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactPerson,
          phone,
          email,
          city,
          state,
          source,
          estimatedDealValueRupees: dealValueRupees,
          packageInterested: pkgInterested,
          temperature,
          assignedToId: assignedToId || undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create lead");
      } else {
        setShowAddModal(false);
        // Reset form
        setBusinessName("");
        setContactPerson("");
        setPhone("");
        setEmail("");
        setNotes("");
        fetchLeads();
      }
    } catch {
      setFormError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferLead || !transferNewEmployeeId) return;

    try {
      const res = await fetch(`/api/leads/${transferLead.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmployeeId: transferNewEmployeeId,
          reason: transferReason,
        }),
      });
      if (res.ok) {
        setTransferLead(null);
        setTransferReason("");
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Lead ID",
      "Business Name",
      "Contact Person",
      "Phone",
      "Email",
      "City",
      "State",
      "Source",
      "Assigned To",
      "Estimated Deal Value",
      "Temperature",
      "Status",
      "Next Follow-up Date",
      "Created At",
    ];

    const rows = leads.map((l) => [
      `"${l.leadNumber}"`,
      `"${l.businessName}"`,
      `"${l.contactPerson}"`,
      `"${l.phone}"`,
      `"${l.email || ""}"`,
      `"${l.city || ""}"`,
      `"${l.state || ""}"`,
      `"${l.source}"`,
      `"${l.assignedTo?.name || ""}"`,
      `"${formatINR(BigInt(l.estimatedDealValuePaise))}"`,
      `"${l.temperature}"`,
      `"${l.status}"`,
      `"${l.nextFollowUpDate ? formatISTDateOnly(l.nextFollowUpDate) : ""}"`,
      `"${formatISTDateOnly(l.createdAt)}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Leads_CRM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAdminOrManager = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_MANAGER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Lead CRM Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage sales prospects, qualification temperatures, follow-ups, and lead assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Leads CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Lead
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by business, contact, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
              <option value="NOT_INTERESTED">Not Interested</option>
            </Select>

            {/* Temperature Filter */}
            <Select
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
            >
              <option value="ALL">All Temperatures</option>
              <option value="HOT">Hot 🔥</option>
              <option value="WARM">Warm ⚡</option>
              <option value="COLD">Cold ❄️</option>
            </Select>

            {/* Source Filter */}
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="ALL">All Sources</option>
              <option value="INBOUND">Inbound</option>
              <option value="WEBSITE">Website</option>
              <option value="SOCIAL">Social Media</option>
              <option value="REFERRAL">Referral</option>
              <option value="COLD_CALL">Cold Call</option>
              <option value="CAMPAIGN">Marketing Campaign</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Lead / Business</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Assigned To</th>
                <th className="py-3 px-3 text-right">Est. Deal Value</th>
                <th className="py-3 px-3 text-center">Temp</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Next Follow-up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading CRM leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No leads found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4">
                      <div>
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          {lead.businessName}
                        </Link>
                        <p className="text-[10px] text-slate-400">{lead.leadNumber} • {lead.source}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{lead.contactPerson}</p>
                      <p className="text-[10px] text-slate-400">{lead.phone}</p>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {lead.assignedTo?.name || "Unassigned"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(BigInt(lead.estimatedDealValuePaise))}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={
                          lead.temperature === "HOT"
                            ? "danger"
                            : lead.temperature === "WARM"
                            ? "warning"
                            : "default"
                        }
                      >
                        {lead.temperature}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={lead.status}>{lead.status}</Badge>
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {lead.nextFollowUpDate ? formatISTDateOnly(lead.nextFollowUpDate) : "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/crm/leads/${lead.id}`}>
                          <button
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View Lead Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        {isAdminOrManager && (
                          <button
                            onClick={() => {
                              setTransferLead(lead);
                              setTransferNewEmployeeId(lead.assignedToId);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Re-assign / Transfer Lead"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Lead to CRM"
        description="Duplicate phone numbers are automatically checked to maintain database integrity"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Business / Company Name"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Retail Tech"
            />
            <Input
              label="Contact Person Name"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@apexretail.in"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Lead Temperature"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            >
              <option value="HOT">Hot 🔥</option>
              <option value="WARM">Warm ⚡</option>
              <option value="COLD">Cold ❄️</option>
            </Select>

            <Select
              label="Lead Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              allowCustom
              customOptionLabel="Custom / Other"
              customInputLabel="Enter custom lead source"
              customInputPlaceholder="e.g. Trade Expo, College Seminar, Partner..."
            >
              <option value="INBOUND">Inbound</option>
              <option value="WEBSITE">Website</option>
              <option value="SOCIAL">Social Media</option>
              <option value="REFERRAL">Referral</option>
              <option value="COLD_CALL">Cold Call</option>
              <option value="CAMPAIGN">Marketing Campaign</option>
            </Select>

            <Select
              label="Package Interested In"
              value={pkgInterested}
              onChange={(e) => setPkgInterested(e.target.value)}
              allowCustom
              customOptionLabel="Custom / Other"
              customInputLabel="Enter custom package tier"
              customInputPlaceholder="e.g. Custom Multi-Year Enterprise..."
            >
              <option value="Mentneo Starter Growth">₹25,000 Starter Growth</option>
              <option value="Mentneo Professional Scale">₹35,000 Professional Scale</option>
              <option value="Mentneo Enterprise Accelerator">₹45,000 Enterprise Accelerator</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Hyderabad"
            />
            <Input
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Telangana"
            />
            <Input
              label="Estimated Deal Value (₹)"
              type="number"
              value={dealValueRupees}
              onChange={(e) => setDealValueRupees(Number(e.target.value))}
            />
          </div>

          {isAdminOrManager && (
            <Select
              label="Assign to Sales Executive"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">Self / Current User</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </Select>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Lead Notes / Context
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Prospect requirements, budget, initial discussion notes..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

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
              Add Lead to CRM
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Transfer Lead Modal */}
      <Dialog
        isOpen={Boolean(transferLead)}
        onClose={() => setTransferLead(null)}
        title="Transfer / Re-assign Lead"
        description={`Re-assign "${transferLead?.businessName}" to a different sales executive with audit logging.`}
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            label="New Assigned Sales Executive"
            required
            value={transferNewEmployeeId}
            onChange={(e) => setTransferNewEmployeeId(e.target.value)}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeCode})
              </option>
            ))}
          </Select>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Transfer Reason (Audit Record)
            </label>
            <textarea
              required
              rows={2}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Territory realignment, executive workload balancing..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTransferLead(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
