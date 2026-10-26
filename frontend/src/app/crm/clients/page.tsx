"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Search,
  Plus,
  Download,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly } from "@/lib/date-utils";

export default function ClientManagementPage() {
  const router = useRouter();
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  // Add Client Modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [gstNumber, setGstNumber] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchClients = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setClients(json.clients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactPerson,
          phone,
          email,
          city,
          state,
          gstNumber,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setBusinessName("");
        setContactPerson("");
        setPhone("");
        setEmail("");
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Client ID",
      "Business Name",
      "Contact Person",
      "Phone",
      "Email",
      "City",
      "State",
      "Deals Closed",
      "Total Contract Value",
      "Verified Collections",
      "Outstanding Receivables",
    ];

    const rows = clients.map((c) => [
      `"${c.clientNumber}"`,
      `"${c.businessName}"`,
      `"${c.contactPerson}"`,
      `"${c.phone}"`,
      `"${c.email || ""}"`,
      `"${c.city || ""}"`,
      `"${c.state || ""}"`,
      c.totalDeals,
      `"${formatINR(BigInt(c.totalSpentPaise))}"`,
      `"${formatINR(BigInt(c.totalCollectedPaise))}"`,
      `"${formatINR(BigInt(c.outstandingPaise))}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Clients_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Client & Customer Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Directory of converted client accounts, purchase history, and outstanding balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Clients CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Client Account
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client business name, contact person, or client ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Client Number</th>
                <th className="py-3 px-3">Business Name</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3 text-center">Deals Count</th>
                <th className="py-3 px-3 text-right">Total Deal Value</th>
                <th className="py-3 px-3 text-right">Verified Collected</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading client directory...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No clients found. When a lead is converted or closed, they appear here.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/crm/clients/${client.id}`)}
                    className="cursor-pointer hover:bg-sky-50/60 dark:hover:bg-sky-950/20 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">
                      {client.clientNumber}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      <Link
                        href={`/crm/clients/${client.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {client.businessName}
                      </Link>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{client.contactPerson}</p>
                      <p className="text-[10px] text-slate-400">{client.phone}</p>
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {[client.city, client.state].filter(Boolean).join(", ") || "—"}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-sky-600 dark:text-sky-400">
                      {client.totalDeals}
                    </td>

                    <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(BigInt(client.totalSpentPaise))}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(BigInt(client.totalCollectedPaise))}
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {formatINR(BigInt(client.outstandingPaise))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Client Dialog */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Client Account"
        description="Creates an established client profile for direct sale contracts"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input
            label="Business / Organization Name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Apex Retail Tech Pvt Ltd"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person Name"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Rohan Varma"
            />
            <Input
              label="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 99887 76655"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rohan@apexretail.in"
            />
            <Input
              label="GST Number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="e.g. 36AABCU9603R1ZX"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create Client
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
