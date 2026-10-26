"use client";

import * as React from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Download,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR } from "@/lib/financials";
import { formatIST } from "@/lib/date-utils";

export default function PaymentCollectionsPage() {
  const [payments, setPayments] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>({});
  const [sales, setSales] = React.useState<any[]>([]);
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [loading, setLoading] = React.useState(true);

  // Record Payment Modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedSaleId, setSelectedSaleId] = React.useState("");
  const [amountRupees, setAmountRupees] = React.useState(25000);
  const [paymentMethod, setPaymentMethod] = React.useState("UPI");
  const [transactionReference, setTransactionReference] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    try {
      const [resPayments, resSales] = await Promise.all([
        fetch(`/api/payments?status=${statusFilter}`),
        fetch("/api/sales"),
      ]);
      if (resPayments.ok) {
        const json = await resPayments.json();
        setPayments(json.payments || []);
        setSummary(json.summary || {});
      }
      if (resSales.ok) {
        const jsonSales = await resSales.json();
        setSales(jsonSales.sales || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId || !amountRupees || !transactionReference) {
      setFormError("All fields are required");
      return;
    }
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: selectedSaleId,
          amountRupees,
          paymentMethod,
          transactionReference,
          paymentDate: paymentDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to record payment");
      } else {
        setShowAddModal(false);
        setTransactionReference("");
        fetchPayments();
      }
    } catch {
      setFormError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Transaction ID",
      "Sale ID",
      "Client",
      "Amount",
      "Payment Method",
      "Transaction Reference",
      "Verification Status",
      "Recorded By",
      "Payment Date",
    ];

    const rows = payments.map((p) => [
      `"${p.transactionNumber}"`,
      `"${p.sale?.saleNumber || ""}"`,
      `"${p.client?.businessName || ""}"`,
      `"${formatINR(BigInt(p.amountPaise))}"`,
      `"${p.paymentMethod}"`,
      `"${p.transactionReference}"`,
      `"${p.verificationStatus}"`,
      `"${p.recordedBy?.name || ""}"`,
      `"${formatIST(p.paymentDate)}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Payment_Collections_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Payment Collections Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cash register tracking client payments, UPI/NEFT/Gateway transaction references, and verification status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/sales/verification">
            <Button variant="outline" size="sm" className="border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verification Queue
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Collections CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Verified Collections */}
        <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Collected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatINR(BigInt(summary.verifiedTotalPaise || 0))}
            </p>
            <span className="text-[11px] text-slate-500">Verified in corporate bank account</span>
          </CardContent>
        </Card>

        {/* Pending Verification */}
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Verification</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {formatINR(BigInt(summary.pendingVerificationPaise || 0))}
            </p>
            <span className="text-[11px] text-slate-500">Requires manager/admin sign-off</span>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Transactions</span>
              <Receipt className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.totalTransactions || 0}
            </p>
            <span className="text-[11px] text-slate-500">Recorded payment events</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Verification Filter:</span>
            <Select
              className="w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Transactions</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PENDING">Pending Verification</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-3">Sale & Client</th>
                <th className="py-3 px-3 text-right">Amount Received</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3">Transaction Reference</th>
                <th className="py-3 px-3 text-center">Verification Status</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-4">Payment Time (IST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading payment collections...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment transactions recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.transactionNumber}
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{p.client?.businessName}</p>
                      <p className="text-[10px] text-slate-400">{p.sale?.saleNumber} • {p.sale?.packageName}</p>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {formatINR(BigInt(p.amountPaise))}
                    </td>

                    <td className="py-3 px-3">
                      <Badge variant="outline">{p.paymentMethod.replace(/_/g, " ")}</Badge>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {p.transactionReference}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={p.verificationStatus}>{p.verificationStatus}</Badge>
                      {p.verifiedBy && (
                        <p className="text-[10px] text-slate-400 mt-0.5">by {p.verifiedBy.name}</p>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {p.recordedBy?.name}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatIST(p.paymentDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Client Payment Transaction"
        description="Records incoming payment against an established sale. Enters admin verification queue."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <Select
            label="Select Sale Deal"
            required
            value={selectedSaleId}
            onChange={(e) => setSelectedSaleId(e.target.value)}
          >
            <option value="">Select a sale...</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.client?.businessName} ({s.saleNumber} - {formatINR(BigInt(s.finalDealValuePaise))})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Received (₹)"
              type="number"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(Number(e.target.value))}
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              allowCustom
              customOptionLabel="Custom / Other"
              customInputLabel="Enter custom payment method"
              customInputPlaceholder="e.g. Cheque, Demand Draft, Wire Transfer / SWIFT..."
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
              <option value="CASH">Cash</option>
              <option value="PAYMENT_GATEWAY">Payment Gateway (Razorpay)</option>
            </Select>
          </div>

          <Input
            label="Transaction Reference / UTR Number"
            required
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="e.g. UPI/398284729103 or NEFT/ICICI/948271"
          />

          <Input
            label="Payment Date & Time (IST)"
            type="datetime-local"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />

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
              Submit Payment for Verification
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
