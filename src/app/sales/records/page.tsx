"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Download,
  Plus,
  Search,
  Clock,
  Layers,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateFilterSelector } from "@/components/ui/date-filter-selector";
import { DateRangePreset, formatISTDateOnly } from "@/lib/date-utils";
import { formatINR, paiseToRupees } from "@/lib/financials";

export default function SalesRecordsPage() {
  const [sales, setSales] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState<any>({});
  const [dateRange, setDateRange] = React.useState<DateRangePreset>("thisMonth");
  const [customStart, setCustomStart] = React.useState<string>();
  const [customEnd, setCustomEnd] = React.useState<string>();
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [loading, setLoading] = React.useState(true);

  // Record Sale Modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [clientName, setClientName] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [packageName, setPackageName] = React.useState("Mentneo Professional Scale");
  const [totalContractValueRupees, setTotalContractValueRupees] = React.useState(35000);
  const [discountRupees, setDiscountRupees] = React.useState(0);
  const [paymentStatus, setPaymentStatus] = React.useState("PAID");
  const [nextPaymentDueDate, setNextPaymentDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Refund Modal
  const [refundSale, setRefundSale] = React.useState<any>(null);
  const [refundAmountRupees, setRefundAmountRupees] = React.useState(0);
  const [refundReason, setRefundReason] = React.useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = React.useState(false);

  const fetchSales = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/sales?range=${dateRange}&status=${statusFilter}`;
      if (customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSales(json.sales || []);
        setMetrics(json.metrics || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd, statusFilter]);

  React.useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientEmail,
          packageName,
          totalContractValueRupees,
          discountRupees,
          paymentStatus,
          nextPaymentDueDate: nextPaymentDueDate || undefined,
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setClientName("");
        setClientPhone("");
        setClientEmail("");
        setNotes("");
        fetchSales();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundSale || !refundAmountRupees || !refundReason) return;
    setIsSubmittingRefund(true);

    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: refundSale.id,
          amountRupees: refundAmountRupees,
          reason: refundReason,
        }),
      });

      if (res.ok) {
        setRefundSale(null);
        setRefundReason("");
        fetchSales();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Sale ID",
      "Invoice Number",
      "Client Business",
      "Executive",
      "Package Name",
      "Contract Value",
      "Discount",
      "Final Deal Value",
      "Verified Collections",
      "Outstanding Receivables",
      "Payment Status",
      "Sale Date",
    ];

    const rows = sales.map((s) => [
      `"${s.saleNumber}"`,
      `"${s.invoiceNumber || ""}"`,
      `"${s.client?.businessName}"`,
      `"${s.employee?.name}"`,
      `"${s.packageName}"`,
      `"${formatINR(BigInt(s.totalContractValuePaise))}"`,
      `"${formatINR(BigInt(s.discountPaise))}"`,
      `"${formatINR(BigInt(s.finalDealValuePaise))}"`,
      `"${formatINR(BigInt(s.verifiedPaymentsTotalPaise))}"`,
      `"${formatINR(BigInt(s.outstandingAmountPaise))}"`,
      `"${s.paymentStatus}"`,
      `"${formatISTDateOnly(s.saleDate)}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Sales_Records_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Sales & Revenue Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track finalized deals, discounts, contract values, outstanding receivables, and verified cash collections
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateFilterSelector
            value={dateRange}
            customStartDate={customStart}
            customEndDate={customEnd}
            onChange={(range, start, end) => {
              setDateRange(range);
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Record Closed Sale
          </Button>
        </div>
      </div>

      {/* 7 Required Separate Financial Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Pipeline Value */}
        <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">1. Pipeline Value</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {formatINR(BigInt(metrics.pipelineValuePaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Open opportunities</span>
          </CardContent>
        </Card>

        {/* 2. Deals Closed */}
        <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">2. Deals Closed</span>
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
              {metrics.dealsClosed || 0}
            </p>
            <span className="text-[10px] text-slate-400">Contracts finalized</span>
          </CardContent>
        </Card>

        {/* 3. Revenue Generated */}
        <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 truncate block">3. Revenue Generated</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {formatINR(BigInt(metrics.revenueGeneratedPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Finalized deal values</span>
          </CardContent>
        </Card>

        {/* 4. Amount Collected */}
        <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate block">4. Amount Collected</span>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {formatINR(BigInt(metrics.amountCollectedPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Verified cash</span>
          </CardContent>
        </Card>

        {/* 5. Outstanding Receivables */}
        <Card className="hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 truncate block">5. Outstanding</span>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
              {formatINR(BigInt(metrics.outstandingReceivablesPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Receivables pending</span>
          </CardContent>
        </Card>

        {/* 6. Refunds */}
        <Card className="hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-rose-500 truncate block">6. Refunds</span>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 truncate">
              {formatINR(BigInt(metrics.refundsPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Processed returns</span>
          </CardContent>
        </Card>

        {/* 7. Net Collections */}
        <Card className="hover:border-teal-300 dark:hover:border-teal-800 transition-colors bg-teal-50/20 dark:bg-teal-950/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 truncate block">7. Net Collections</span>
            <p className="text-sm font-bold text-teal-700 dark:text-teal-300 truncate">
              {formatINR(BigInt(metrics.netCollectionsPaise || 0))}
            </p>
            <span className="text-[10px] text-slate-400">Collected - Refunds</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Payment Status:</span>
            <Select
              className="w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Payment States</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PENDING">Pending Payment</option>
              <option value="OVERDUE">Overdue</option>
              <option value="REFUNDED">Refunded</option>
            </Select>
          </div>
          <span className="text-xs text-slate-400">
            Total Sales: <strong>{sales.length}</strong>
          </span>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Sale # / Invoice</th>
                <th className="py-3 px-3">Client Company</th>
                <th className="py-3 px-3">Executive</th>
                <th className="py-3 px-3">Package Tier</th>
                <th className="py-3 px-3 text-right">Contract Value</th>
                <th className="py-3 px-3 text-right">Final Deal Value</th>
                <th className="py-3 px-3 text-right">Verified Cash</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">Loading sales records...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No sales recorded for this period. Click Record Closed Sale to add one.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4">
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sale.saleNumber}</p>
                      <p className="text-[10px] text-slate-400">{sale.invoiceNumber} • {formatISTDateOnly(sale.saleDate)}</p>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{sale.client?.businessName}</p>
                      <p className="text-[10px] text-slate-400">{sale.client?.contactPerson}</p>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {sale.employee?.name}
                    </td>

                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {sale.packageName}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-500">
                      {formatINR(BigInt(sale.totalContractValuePaise))}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(BigInt(sale.finalDealValuePaise))}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(BigInt(sale.verifiedPaymentsTotalPaise))}
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                      {formatINR(BigInt(sale.outstandingAmountPaise))}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={sale.paymentStatus}>{sale.paymentStatus}</Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/sales/collections?saleId=${sale.id}`}>
                          <Button variant="secondary" size="sm">
                            <Receipt className="w-3.5 h-3.5 mr-1" /> Payments
                          </Button>
                        </Link>
                        {sale.paymentStatus === "PAID" && (
                          <button
                            onClick={() => {
                              setRefundSale(sale);
                              setRefundAmountRupees(paiseToRupees(BigInt(sale.finalDealValuePaise)));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            title="Process Refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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

      {/* Record Sale Modal */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Closed Sale Deal"
        description="Records finalized sales deal and initializes payment receivable tracking"
      >
        <form onSubmit={handleCreateSale} className="space-y-4">
          <Input
            label="Client Business Name"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Acme Tech Solutions Pvt Ltd"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="e.g. +91 99887 76655"
            />
            <Input
              label="Contact Email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="e.g. acme@solution.in"
            />
          </div>

          <Select
            label="Sales Package Sold"
            value={packageName}
            onChange={(e) => {
              setPackageName(e.target.value);
              if (e.target.value.includes("25,000")) setTotalContractValueRupees(25000);
              else if (e.target.value.includes("35,000")) setTotalContractValueRupees(35000);
              else if (e.target.value.includes("45,000")) setTotalContractValueRupees(45000);
            }}
          >
            <option value="Mentneo Starter Growth">Mentneo Starter Growth (₹25,000)</option>
            <option value="Mentneo Professional Scale">Mentneo Professional Scale (₹35,000)</option>
            <option value="Mentneo Enterprise Accelerator">Mentneo Enterprise Accelerator (₹45,000)</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contract Value (₹)"
              type="number"
              required
              value={totalContractValueRupees}
              onChange={(e) => setTotalContractValueRupees(Number(e.target.value))}
            />
            <Input
              label="Discount Offered (₹)"
              type="number"
              value={discountRupees}
              onChange={(e) => setDiscountRupees(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Initial Payment Status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="PAID">Paid in Full</option>
              <option value="PARTIALLY_PAID">Partially Paid (Advance)</option>
              <option value="PENDING">Pending Payment</option>
            </Select>

            <Input
              label="Next Payment Due Date"
              type="date"
              value={nextPaymentDueDate}
              onChange={(e) => setNextPaymentDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Deal Notes / Payment Terms
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client onboarding requirements, milestone schedules..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
              Record Sale Deal
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog
        isOpen={Boolean(refundSale)}
        onClose={() => setRefundSale(null)}
        title={`Process Refund — ${refundSale?.client?.businessName}`}
        description="Records authorized refund against verified sale collections with audit trail"
      >
        <form onSubmit={handleProcessRefund} className="space-y-4">
          <Input
            label="Refund Amount (₹)"
            type="number"
            required
            value={refundAmountRupees}
            onChange={(e) => setRefundAmountRupees(Number(e.target.value))}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Refund Reason (Audit Log)
            </label>
            <textarea
              required
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Contract cancellation within 7 days SLA, adjustment..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundSale(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="destructive" isLoading={isSubmittingRefund}>
              Process Refund
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
