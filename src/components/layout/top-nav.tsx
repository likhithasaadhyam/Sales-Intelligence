"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  X,
  Users,
  Target,
  Building,
  Receipt,
  FileSpreadsheet,
  PhoneCall,
  CalendarClock,
  CreditCard,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/financials";
import { formatISTDateOnly } from "@/lib/date-utils";

interface TopNavProps {
  userName?: string;
  userRole?: string;
  onOpenMobile: () => void;
  onLogout: () => void;
  onSwitchUser?: (email: string) => void;
}

interface SearchItem {
  id: string;
  category: "leads" | "clients" | "sales" | "reports" | "employees" | "calls" | "followUps" | "payments";
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
  badgeVariant?: string;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={i}
            className="bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function TopNav({
  userName = "User",
  userRole = "SALES_EXECUTIVE",
  onOpenMobile,
  onLogout,
  onSwitchUser,
}: TopNavProps) {
  const router = useRouter();

  // Search State
  const [globalQuery, setGlobalQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  // User & Persona Menus
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = React.useState<number>(1);

  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Flattened results list for easy keyboard navigation (ArrowUp / ArrowDown / Enter)
  const flattenedItems = React.useMemo(() => {
    if (!searchResults?.results) return [];
    const items: SearchItem[] = [];
    const { results } = searchResults;

    // 1. Employees
    if (results.employees?.length) {
      results.employees.forEach((emp: any) => {
        items.push({
          id: `emp-${emp.id}`,
          category: "employees",
          title: emp.name,
          subtitle: `${emp.role.replace(/_/g, " ")} • ${emp.email}${
            emp.profile?.employeeCode ? ` • ${emp.profile.employeeCode}` : ""
          }`,
          url: `/admin/employees/${emp.id}`,
          badge: emp.profile?.territory || emp.role.split("_")[0],
        });
      });
    }

    // 2. Leads
    if (results.leads?.length) {
      results.leads.forEach((l: any) => {
        items.push({
          id: `lead-${l.id}`,
          category: "leads",
          title: l.businessName,
          subtitle: `${l.contactPerson} • ${l.phone} • Assigned: ${l.assignedTo?.name || "Unassigned"}`,
          url: `/crm/leads/${l.id}`,
          badge: l.status,
        });
      });
    }

    // 3. Clients
    if (results.clients?.length) {
      results.clients.forEach((c: any) => {
        items.push({
          id: `client-${c.id}`,
          category: "clients",
          title: c.businessName,
          subtitle: `${c.contactPerson} • ${c.phone}${c.city ? ` • ${c.city}` : ""}`,
          url: `/crm/clients/${c.id}`,
          badge: c.clientNumber,
        });
      });
    }

    // 4. Sales Records
    if (results.sales?.length) {
      results.sales.forEach((s: any) => {
        items.push({
          id: `sale-${s.id}`,
          category: "sales",
          title: `${s.client?.businessName || "Deal"} (${s.saleNumber})`,
          subtitle: `${s.packageName} • ${formatINR(BigInt(s.finalDealValuePaise || 0))} • Rep: ${s.employee?.name}`,
          url: `/sales/records`,
          badge: s.paymentStatus,
        });
      });
    }

    // 5. Daily Work Reports
    if (results.reports?.length) {
      results.reports.forEach((r: any) => {
        items.push({
          id: `report-${r.id}`,
          category: "reports",
          title: `Report: ${r.employee?.name} (${formatISTDateOnly(r.reportingDate)})`,
          subtitle: `${r.callsMade} calls made • ${r.dealsClosed} deals closed${
            r.packageSold ? ` • Package: ${r.packageSold}` : ""
          }`,
          url: `/reports/daily`,
          badge: r.status,
        });
      });
    }

    // 6. Calls
    if (results.calls?.length) {
      results.calls.forEach((c: any) => {
        items.push({
          id: `call-${c.id}`,
          category: "calls",
          title: `${c.lead?.businessName || "Call"} (${c.callNumber})`,
          subtitle: `Outcome: ${c.outcome} • Logged by ${c.employee?.name}`,
          url: `/activity/calls`,
          badge: c.callStatus,
        });
      });
    }

    // 7. Follow-ups
    if (results.followUps?.length) {
      results.followUps.forEach((f: any) => {
        items.push({
          id: `fu-${f.id}`,
          category: "followUps",
          title: `Follow-up: ${f.lead?.businessName || "Lead"}`,
          subtitle: `${f.notes || "Scheduled reminder"} • Rep: ${f.employee?.name}`,
          url: `/activity/follow-ups`,
          badge: f.status,
        });
      });
    }

    // 8. Payments
    if (results.payments?.length) {
      results.payments.forEach((p: any) => {
        items.push({
          id: `pay-${p.id}`,
          category: "payments",
          title: `${p.client?.businessName || "Payment"} (${p.transactionNumber})`,
          subtitle: `${formatINR(BigInt(p.amountPaise || 0))} • Method: ${p.paymentMethod} • Ref: ${p.transactionReference}`,
          url: `/sales/collections`,
          badge: p.verificationStatus,
        });
      });
    }

    return items;
  }, [searchResults]);

  // Debounced API Search
  React.useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const trimmed = globalQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Global search fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [globalQuery]);

  // Click Outside to Dismiss
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard Navigation Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || flattenedItems.length === 0) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < flattenedItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flattenedItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && flattenedItems[activeIndex]) {
        handleSelectItem(flattenedItems[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    setGlobalQuery("");
    router.push(item.url);
  };

  const demoPersonas = [
    { name: "Super Admin", email: "admin@mentneo.com", role: "SUPER_ADMIN" },
    { name: "Vikram Sharma (Manager)", email: "manager@mentneo.com", role: "ADMIN_MANAGER" },
    { name: "Teja (Executive)", email: "teja@mentneo.com", role: "SALES_EXECUTIVE" },
    { name: "Narendra (Executive)", email: "narendra@mentneo.com", role: "SALES_EXECUTIVE" },
    { name: "Rushika (Executive)", email: "rushika@mentneo.com", role: "SALES_EXECUTIVE" },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar with Live Floating Dropdown */}
        <div ref={searchContainerRef} className="relative hidden md:block w-72 lg:w-[420px]">
          <div className="relative">
            {isLoading ? (
              <Loader2 className="absolute left-3 top-2.5 w-4 h-4 text-sky-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            )}
            <input
              type="text"
              placeholder="Search leads, clients, reports, sales, team..."
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onFocus={() => {
                if (globalQuery.trim().length >= 2) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-full h-9 pl-9 pr-8 rounded-lg text-xs bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => {
                  setGlobalQuery("");
                  setIsOpen(false);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Floating Search Results Dropdown */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-2 w-full min-w-[380px] lg:min-w-[500px] max-h-[75vh] overflow-y-auto rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-3">
              {/* Header stats */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                <span>
                  {isLoading ? (
                    "Searching company database..."
                  ) : searchResults?.total > 0 ? (
                    <>Found <strong className="text-sky-500">{searchResults.total}</strong> results</>
                  ) : (
                    "No results found"
                  )}
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                  ↑↓ to navigate • Enter to select • ESC to close
                </span>
              </div>

              {/* Empty state */}
              {!isLoading && searchResults?.total === 0 && (
                <div className="py-8 text-center px-4">
                  <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No results found for "{globalQuery}"
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Try searching for sales executive names, company names, contact numbers, deal numbers, or transaction UTR references.
                  </p>
                </div>
              )}

              {/* Grouped Results Display */}
              {searchResults?.total > 0 && (
                <div className="space-y-3">
                  {/* Category: Employees */}
                  {searchResults.results.employees?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5 text-sky-500" /> Employees & Team
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.employees.map((emp: any) => {
                          const item = flattenedItems.find((f) => f.id === `emp-${emp.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `emp-${emp.id}`) === activeIndex;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  <HighlightMatch text={emp.name} query={globalQuery} />
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  <HighlightMatch text={emp.email} query={globalQuery} /> • {emp.role.replace(/_/g, " ")}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Leads */}
                  {searchResults.results.leads?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5 text-teal-500" /> Leads & Prospects
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.leads.map((l: any) => {
                          const item = flattenedItems.find((f) => f.id === `lead-${l.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `lead-${l.id}`) === activeIndex;
                          return (
                            <button
                              key={l.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    <HighlightMatch text={l.businessName} query={globalQuery} />
                                  </span>
                                  <Badge status={l.status}>{l.status}</Badge>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  <HighlightMatch text={l.contactPerson} query={globalQuery} /> • {l.phone}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Clients */}
                  {searchResults.results.clients?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Building className="w-3.5 h-3.5 text-indigo-500" /> Clients
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.clients.map((c: any) => {
                          const item = flattenedItems.find((f) => f.id === `client-${c.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `client-${c.id}`) === activeIndex;
                          return (
                            <button
                              key={c.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  <HighlightMatch text={c.businessName} query={globalQuery} />
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  <HighlightMatch text={c.contactPerson} query={globalQuery} /> • {c.phone} {c.city ? `• ${c.city}` : ""}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Sales */}
                  {searchResults.results.sales?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Receipt className="w-3.5 h-3.5 text-emerald-500" /> Sales Records
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.sales.map((s: any) => {
                          const item = flattenedItems.find((f) => f.id === `sale-${s.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `sale-${s.id}`) === activeIndex;
                          return (
                            <button
                              key={s.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    <HighlightMatch text={s.client?.businessName || "Deal"} query={globalQuery} />
                                  </span>
                                  <Badge status={s.paymentStatus}>{s.paymentStatus}</Badge>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {s.packageName} • {formatINR(BigInt(s.finalDealValuePaise || 0))} • Rep: {s.employee?.name}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Daily Reports */}
                  {searchResults.results.reports?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" /> Daily Work Reports
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.reports.map((r: any) => {
                          const item = flattenedItems.find((f) => f.id === `report-${r.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `report-${r.id}`) === activeIndex;
                          return (
                            <button
                              key={r.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    <HighlightMatch text={r.employee?.name} query={globalQuery} />
                                  </span>
                                  <Badge status={r.status}>{r.status}</Badge>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Date: {formatISTDateOnly(r.reportingDate)} • {r.callsMade} calls made • {r.dealsClosed} deals closed
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Call Activity */}
                  {searchResults.results.calls?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <PhoneCall className="w-3.5 h-3.5 text-sky-500" /> Calls
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.calls.map((c: any) => {
                          const item = flattenedItems.find((f) => f.id === `call-${c.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `call-${c.id}`) === activeIndex;
                          return (
                            <button
                              key={c.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    <HighlightMatch text={c.lead?.businessName || c.callNumber} query={globalQuery} />
                                  </span>
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                    {c.outcome}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Status: {c.callStatus} • Rep: {c.employee?.name}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Follow-ups */}
                  {searchResults.results.followUps?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <CalendarClock className="w-3.5 h-3.5 text-purple-500" /> Follow-ups
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.followUps.map((f: any) => {
                          const item = flattenedItems.find((f) => f.id === `fu-${f.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `fu-${f.id}`) === activeIndex;
                          return (
                            <button
                              key={f.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    <HighlightMatch text={f.lead?.businessName || "Follow-up"} query={globalQuery} />
                                  </span>
                                  <Badge status={f.status}>{f.status}</Badge>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                                  {f.notes || "Scheduled reminder"} • Rep: {f.employee?.name}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Payments */}
                  {searchResults.results.payments?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 text-rose-500" /> Payments & Collections
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.results.payments.map((p: any) => {
                          const item = flattenedItems.find((f) => f.id === `pay-${p.id}`);
                          const isHighlighted =
                            flattenedItems.findIndex((f) => f.id === `pay-${p.id}`) === activeIndex;
                          return (
                            <button
                              key={p.id}
                              onClick={() => item && handleSelectItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    <HighlightMatch text={p.client?.businessName || p.transactionNumber} query={globalQuery} />
                                  </span>
                                  <Badge status={p.verificationStatus}>{p.verificationStatus}</Badge>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {formatINR(BigInt(p.amountPaise || 0))} • Ref:{" "}
                                  <HighlightMatch text={p.transactionReference} query={globalQuery} />
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Demo Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors"
            title="Quickly switch demo personas"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Role:</span>
            <span className="max-w-[100px] truncate">{userName.split(" ")[0]}</span>
            <ChevronDown className="w-3 h-3 text-sky-500" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Persona
                </p>
              </div>
              {demoPersonas.map((persona) => (
                <button
                  key={persona.email}
                  onClick={async () => {
                    setShowRoleSwitcher(false);
                    if (onSwitchUser) {
                      onSwitchUser(persona.email);
                    } else {
                      await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: persona.email, password: "Password123!" }),
                      });
                      window.location.reload();
                    }
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{persona.name}</p>
                    <p className="text-[10px] text-slate-400">{persona.role.replace(/_/g, " ")}</p>
                  </div>
                  {userName.includes(persona.name.split(" ")[0]) && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {userName.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-tight">
                {userName}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {userRole.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 md:hidden">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{userName}</p>
                <p className="text-[11px] text-slate-400">{userRole}</p>
              </div>
              <Link
                href="/notifications"
                onClick={() => setShowUserMenu(false)}
                className="block px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Notifications
              </Link>
              {userRole === "SUPER_ADMIN" && (
                <Link
                  href="/admin/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  System Settings
                </Link>
              )}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
