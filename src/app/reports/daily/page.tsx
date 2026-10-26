"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  MessageSquare,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly, formatIST } from "@/lib/date-utils";

export default function DailyReportsListingPage() {
  const [reports, setReports] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // View / Review Dialog State
  const [selectedReport, setSelectedReport] = React.useState<any>(null);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [reviewStatus, setReviewStatus] = React.useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewFeedback, setReviewFeedback] = React.useState("");
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchReports();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      });
  }, [fetchReports]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setIsSubmittingReview(true);

    try {
      const res = await fetch(`/api/reports/daily/${selectedReport.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewStatus,
          feedback: reviewFeedback,
        }),
      });

      if (res.ok) {
        setShowReviewModal(false);
        setSelectedReport(null);
        setReviewFeedback("");
        fetchReports();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const isAdminOrManager = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_MANAGER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Daily Work Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review sales activities, call counts, deal closures, and approve daily operational reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/reports/daily/new">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Submit Daily Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
            <Select
              className="w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Reports</option>
              <option value="SUBMITTED">Submitted (Pending Review)</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </Select>
          </div>

          <span className="text-xs text-slate-400">
            Total Reports: <strong>{reports.length}</strong>
          </span>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Reporting Date</th>
                <th className="py-3 px-3">Sales Executive</th>
                <th className="py-3 px-3 text-center">Calls (Conn / Total)</th>
                <th className="py-3 px-3 text-center">New Leads</th>
                <th className="py-3 px-3 text-center">Deals Closed</th>
                <th className="py-3 px-3 text-right">Revenue Reported</th>
                <th className="py-3 px-3 text-right">Collected Today</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading daily work reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No daily reports found. Click Submit Daily Report to file one.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {formatISTDateOnly(report.reportingDate)}
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {report.employee?.name}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{report.connectedCalls}</span>
                      <span className="text-slate-400"> / {report.callsMade}</span>
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {report.newLeadsAdded}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-teal-600 dark:text-teal-400">
                      {report.dealsClosed}
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      {formatINR(BigInt(report.revenueGeneratedPaise || 0))}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(BigInt(report.amountCollectedPaise || 0))}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={report.status}>{report.status}</Badge>
                      {report.reviewerFeedback && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px] mx-auto mt-0.5" title={report.reviewerFeedback}>
                          "{report.reviewerFeedback}"
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Full Report Summary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdminOrManager && report.status === "SUBMITTED" && (
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowReviewModal(true);
                              setReviewStatus("APPROVED");
                            }}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="Review & Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
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

      {/* View Full Report Dialog */}
      <Dialog
        isOpen={Boolean(selectedReport) && !showReviewModal}
        onClose={() => setSelectedReport(null)}
        title={`Daily Work Report — ${selectedReport?.employee?.name}`}
        description={`Reporting Date: ${selectedReport ? formatISTDateOnly(selectedReport.reportingDate) : ""}`}
        maxWidth="xl"
      >
        {selectedReport && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <Badge status={selectedReport.status}>{selectedReport.status}</Badge>
              {selectedReport.reviewedBy && (
                <span className="text-slate-400">Reviewed by: {selectedReport.reviewedBy.name}</span>
              )}
            </div>

            {/* Quick Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-slate-500 block">Calls Made</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedReport.callsMade} ({selectedReport.connectedCalls} conn)</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-slate-500 block">Leads Added</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedReport.newLeadsAdded}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-slate-500 block">Deals Closed</span>
                <span className="font-bold text-sm text-teal-600">{selectedReport.dealsClosed}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-slate-500 block">Collected Today</span>
                <span className="font-bold text-sm text-emerald-600">{formatINR(BigInt(selectedReport.amountCollectedPaise || 0))}</span>
              </div>
            </div>

            {/* Qualitative Notes */}
            <div className="space-y-2">
              <div>
                <strong className="text-slate-700 dark:text-slate-300 block">Main Activities Completed:</strong>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  {selectedReport.mainActivities || "No activities specified."}
                </p>
              </div>

              {selectedReport.clientConversations && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300 block">Client Conversations:</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                    {selectedReport.clientConversations}
                  </p>
                </div>
              )}

              {selectedReport.challengesFaced && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300 block">Challenges Faced:</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                    {selectedReport.challengesFaced}
                  </p>
                </div>
              )}

              {selectedReport.tomorrowPlan && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300 block">Tomorrow’s Plan:</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                    {selectedReport.tomorrowPlan}
                  </p>
                </div>
              )}

              {selectedReport.reviewerFeedback && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <strong className="text-amber-800 dark:text-amber-300 block">Manager / Reviewer Feedback:</strong>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">"{selectedReport.reviewerFeedback}"</p>
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Submitted at: {selectedReport.submittedAt ? formatIST(selectedReport.submittedAt) : "Draft"}
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                {isAdminOrManager && selectedReport.status === "SUBMITTED" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowReviewModal(true)}
                  >
                    Review Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Review Report: ${selectedReport?.employee?.name}`}
        description="Approve report or reject with feedback for executive resubmission"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <Select
            label="Decision"
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value as any)}
          >
            <option value="APPROVED">Approve Report ✅</option>
            <option value="REJECTED">Reject with Correction Request ❌</option>
          </Select>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Feedback to Sales Executive {reviewStatus === "REJECTED" && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              required={reviewStatus === "REJECTED"}
              rows={3}
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder={
                reviewStatus === "APPROVED"
                  ? "Optional: Great work today on closing the deal..."
                  : "Please clarify the reason for missed call target and correct the revenue figure..."
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowReviewModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmittingReview}
              variant={reviewStatus === "APPROVED" ? "primary" : "destructive"}
            >
              {reviewStatus === "APPROVED" ? "Approve Report" : "Reject Report"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
