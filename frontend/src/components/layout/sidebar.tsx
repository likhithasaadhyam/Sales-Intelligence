"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  PhoneCall,
  Contact2,
  Briefcase,
  TrendingUp,
  Receipt,
  Target,
  BarChart3,
  Bell,
  ShieldAlert,
  Settings,
  CalendarCheck,
  CheckCircle2,
  PackageCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
}

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function Sidebar({
  userRole = "SALES_EXECUTIVE",
  userName = "User",
  userEmail = "",
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  const isAdminOrManager = userRole === "SUPER_ADMIN" || userRole === "ADMIN_MANAGER";
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const adminNavItems: NavItem[] = [
    { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
    { label: "Sales Team", href: "/admin/sales-team", icon: Users },
    { label: "Daily Work Reports", href: "/reports/daily", icon: FileSpreadsheet },
    { label: "Call Activity", href: "/activity/calls", icon: PhoneCall },
    { label: "Lead Management", href: "/crm/leads", icon: Contact2 },
    { label: "Clients & Conversions", href: "/crm/clients", icon: Briefcase },
    { label: "Sales & Revenue", href: "/sales/records", icon: TrendingUp },
    { label: "Payment Collections", href: "/sales/collections", icon: Receipt },
    { label: "Payment Verification", href: "/sales/verification", icon: CheckCircle2, badge: "Review" },
    { label: "Targets & Performance", href: "/admin/targets", icon: Target },
    { label: "Reports & Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Follow-up Calendar", href: "/activity/follow-ups", icon: CalendarCheck },
    { label: "Notifications", href: "/notifications", icon: Bell },
    ...(isSuperAdmin
      ? [
          { label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldAlert },
          { label: "User & Roles", href: "/admin/users", icon: UserCheck },
          { label: "Packages", href: "/admin/packages", icon: PackageCheck },
          { label: "Settings", href: "/admin/settings", icon: Settings },
        ]
      : []),
  ];

  const executiveNavItems: NavItem[] = [
    { label: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Submit Daily Report", href: "/reports/daily/new", icon: FileSpreadsheet, highlight: true },
    { label: "My Daily Reports", href: "/reports/daily", icon: FileSpreadsheet },
    { label: "My Leads", href: "/crm/leads", icon: Contact2 },
    { label: "Call Activity", href: "/activity/calls", icon: PhoneCall },
    { label: "Follow-ups", href: "/activity/follow-ups", icon: CalendarCheck },
    { label: "Sales Records", href: "/sales/records", icon: TrendingUp },
    { label: "Collections", href: "/sales/collections", icon: Receipt },
    { label: "Clients", href: "/crm/clients", icon: Briefcase },
    { label: "Notifications", href: "/notifications", icon: Bell },
  ];

  const navItems = isAdminOrManager ? adminNavItems : executiveNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0b1329] text-slate-300 transition-all duration-300 border-r border-slate-800 shadow-xl ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-[#070d1e]">
          <Link
            href={isAdminOrManager ? "/admin/overview" : "/dashboard"}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 text-white font-black text-lg shadow-md shadow-sky-950">
              M
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-white tracking-wider text-base leading-none">
                  MENTNEO
                </span>
                <span className="text-[10px] tracking-widest text-sky-400 font-semibold uppercase mt-0.5">
                  Sales Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse toggle button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Pill */}
        {!isCollapsed && (
          <div className="px-4 py-2 bg-[#090f23] border-b border-slate-800/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {userRole.replace(/_/g, " ")}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Live
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin/overview" && item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-sky-600 text-white font-semibold shadow-md shadow-sky-950/50"
                    : item.highlight
                    ? "bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-sky-400"}`} />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070d1e]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{userName}</p>
                <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
