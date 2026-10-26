"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  CalendarCheck,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIST } from "@/lib/date-utils";

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"ALL" | "UNREAD">("ALL");

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { markAll: true }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-sky-600" />
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time notifications for lead assignments, due follow-ups, payment verifications, and report reviews
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAsRead()}
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Mark All as Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === "ALL"
              ? "bg-sky-600 text-white font-semibold"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("UNREAD")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === "UNREAD"
              ? "bg-sky-600 text-white font-semibold"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-xs text-slate-400">
              Loading notifications...
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-xs text-slate-400">
              No notifications found in this view.
            </CardContent>
          </Card>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              className={`transition-all ${
                !n.read
                  ? "border-sky-300 dark:border-sky-800 bg-sky-50/20 dark:bg-sky-950/20 shadow-sm"
                  : ""
              }`}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    )}
                    <Badge variant="outline">{n.type.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                  <p className="text-[10px] text-slate-400">{formatIST(n.createdAt)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {n.linkUrl && (
                    <Link href={n.linkUrl}>
                      <Button variant="secondary" size="sm">
                        View <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
