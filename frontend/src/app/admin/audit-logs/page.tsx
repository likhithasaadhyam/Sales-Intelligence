"use client";

import * as React from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  FileCode,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { formatIST } from "@/lib/date-utils";

export default function AuditLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionFilter, setActionFilter] = React.useState("ALL");
  const [entityFilter, setEntityFilter] = React.useState("ALL");
  const [selectedLog, setSelectedLog] = React.useState<any>(null);
  const [errorMsg, setErrorMsg] = React.useState("");

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?action=${actionFilter}&entityType=${entityFilter}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Failed to load audit logs");
      } else {
        setLogs(json.logs || []);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportCSV = () => {
    const headers = ["Timestamp (IST)", "Actor Name", "Actor Role", "Action", "Entity Type", "Entity ID", "Details"];
    const rows = logs.map((l) => [
      `"${formatIST(l.createdAt)}"`,
      `"${l.actor?.name || "System"}"`,
      `"${l.actor?.role || "SYSTEM"}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId || ""}"`,
      `"${(l.detailsJson || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mentneo_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-sky-600" />
            System Audit Logs & Security History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable log of all administrative changes, financial verifications, lead transfers, and user logins
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export Audit Trail CSV
        </Button>
      </div>

      {errorMsg ? (
        <Card className="border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="p-6 text-center text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {errorMsg}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <Select
                className="w-48"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="VERIFY">VERIFY</option>
                <option value="REJECT">REJECT</option>
                <option value="APPROVE">APPROVE</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="LOGIN">LOGIN</option>
              </Select>

              <Select
                className="w-48"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="ALL">All Entity Types</option>
                <option value="USER">USER</option>
                <option value="LEAD">LEAD</option>
                <option value="SALE">SALE</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="TARGET">TARGET</option>
                <option value="REPORT">REPORT</option>
                <option value="PACKAGE">PACKAGE</option>
                <option value="SETTING">SETTING</option>
              </Select>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-3">Actor / User</th>
                    <th className="py-3 px-3 text-center">Action</th>
                    <th className="py-3 px-3 text-center">Entity Type</th>
                    <th className="py-3 px-3">Entity ID</th>
                    <th className="py-3 px-4">Audit Details / Diff</th>
                    <th className="py-3 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">Loading audit records...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">No audit logs matching filters.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {formatIST(log.createdAt)}
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{log.actor?.name || "System"}</p>
                          <p className="text-[10px] text-slate-400">{log.actor?.role || "SYSTEM"}</p>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              log.action === "VERIFY" || log.action === "APPROVE"
                                ? "success"
                                : log.action === "REJECT" || log.action === "DELETE"
                                ? "danger"
                                : log.action === "CREATE"
                                ? "teal"
                                : "info"
                            }
                          >
                            {log.action}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline">{log.entityType}</Badge>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                          {log.entityId || "—"}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate max-w-xs">
                          {log.detailsJson || "—"}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 rounded text-slate-400 hover:text-sky-600"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Inspect Dialog */}
      <Dialog
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Entry Inspector"
        description={`Action: ${selectedLog?.action} on ${selectedLog?.entityType}`}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div>
                <span className="text-slate-500 block">Actor:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedLog.actor?.name || "System"} ({selectedLog.actor?.email})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatIST(selectedLog.createdAt)}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Payload / Before-After Metadata:
              </span>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.detailsJson), null, 2);
                  } catch {
                    return selectedLog.detailsJson || "No extra metadata.";
                  }
                })()}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
