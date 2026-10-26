"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  ArrowLeft,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { formatINR } from "@/lib/financials";
import { formatIST } from "@/lib/date-utils";

export default function PaymentVerificationQueuePage() {
  const [pendingPayments, setPendingPayments] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Verification Action Dialog State
  const [actionPayment, setActionPayment] = React.useState<any>(null);
  const [actionDecision, setActionDecision] = React.useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [actionNotes, setActionNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [resPayments, resMe] = await Promise.all([
        fetch("/api/payments?status=PENDING"),
        fetch("/api/auth/me"),
      ]);
      if (resPayments.ok) {
        const json = await resPayments.json();
        setPendingPayments(json.payments || []);
      }
      if (resMe.ok) {
        const json = await resMe.json();
        setCurrentUser(json.user);
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

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionPayment) return;
    setIsSubmitting(true);
    setErrorBanner("");

    try {
      const res = await fetch(`/api/payments/${actionPayment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionDecision,
          notes: actionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to verify transaction");
      } else {
        setActionPayment(null);
        setActionNotes("");
        fetchData();
      }
    } catch {
      setErrorBanner("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdminOrManager = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_MANAGER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
              Payment Verification Queue
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
              {pendingPayments.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enforces strict two-person financial verification. Employees cannot verify their own recorded payments.
          </p>
        </div>

        <Link href="/sales/collections">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Collections Register
          </Button>
        </Link>
      </div>

      {/* Two-Person Rule Information Banner */}
      <Card className="bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950/40 dark:to-teal-950/40 border-sky-200 dark:border-sky-800">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sky-900 dark:text-sky-100">
              Two-Person Financial Integrity Protocol Active
            </p>
            <p className="text-sky-800/80 dark:text-sky-300">
              Only verified payments count toward confirmed company revenue and executive monthly paid-client targets.
              The backend prohibits users from verifying transactions they personally recorded.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-3">Client Company</th>
                <th className="py-3 px-3">Sale Deal</th>
                <th className="py-3 px-3 text-right">Amount Received</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3">Bank UTR / Reference</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3">Recorded Time</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading pending verification queue...</td>
                </tr>
              ) : pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    🎉 Verification queue is empty! All recorded payments have been verified.
                  </td>
                </tr>
              ) : (
                pendingPayments.map((p) => {
                  const isSelfRecorded = currentUser?.id === p.recordedById;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {p.transactionNumber}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {p.client?.businessName}
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.sale?.saleNumber} • {p.sale?.packageName}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {formatINR(BigInt(p.amountPaise))}
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="outline">{p.paymentMethod.replace(/_/g, " ")}</Badge>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {p.transactionReference}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{p.recordedBy?.name}</span>
                        {isSelfRecorded && (
                          <span className="block text-[10px] text-amber-600 font-semibold">(Recorded by you)</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {formatIST(p.paymentDate)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isSelfRecorded ? (
                          <span className="text-[11px] text-slate-400 italic">Self-approval prohibited</span>
                        ) : isAdminOrManager ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="teal"
                              size="sm"
                              onClick={() => {
                                setActionPayment(p);
                                setActionDecision("VERIFIED");
                                setActionNotes("");
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setActionPayment(p);
                                setActionDecision("REJECTED");
                                setActionNotes("");
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400">Admin only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Verification Decision Modal */}
      <Dialog
        isOpen={Boolean(actionPayment)}
        onClose={() => setActionPayment(null)}
        title={actionDecision === "VERIFIED" ? "Verify Payment Transaction" : "Reject Payment Transaction"}
        description={`Confirming ${actionDecision.toLowerCase()} for ${actionPayment?.transactionNumber} (${actionPayment ? formatINR(BigInt(actionPayment.amountPaise)) : ""}) from ${actionPayment?.client?.businessName}`}
      >
        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          {errorBanner && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {errorBanner}
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
            <p className="text-slate-500">Transaction Reference: <strong className="text-slate-900 dark:text-slate-100">{actionPayment?.transactionReference}</strong></p>
            <p className="text-slate-500">Payment Method: <strong className="text-slate-900 dark:text-slate-100">{actionPayment?.paymentMethod}</strong></p>
            <p className="text-slate-500">Recorded by: <strong className="text-slate-900 dark:text-slate-100">{actionPayment?.recordedBy?.name}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Verification Notes / Corporate Bank Reference
            </label>
            <textarea
              rows={3}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={
                actionDecision === "VERIFIED"
                  ? "e.g. Verified credited in HDFC current a/c on 26 Oct 2026..."
                  : "e.g. UTR number not found in bank statement. Please check with customer..."
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionPayment(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              variant={actionDecision === "VERIFIED" ? "teal" : "destructive"}
            >
              {actionDecision === "VERIFIED" ? "Confirm Verification" : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
