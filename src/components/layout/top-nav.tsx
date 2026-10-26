"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  User,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface TopNavProps {
  userName?: string;
  userRole?: string;
  onOpenMobile: () => void;
  onLogout: () => void;
  onSwitchUser?: (email: string) => void;
}

export function TopNav({
  userName = "User",
  userRole = "SALES_EXECUTIVE",
  onOpenMobile,
  onLogout,
  onSwitchUser,
}: TopNavProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = React.useState<number>(1);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/crm/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
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

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-72 lg:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, clients, sales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Demo Persona Switcher (Convenient for Pair-Programming & Evaluation) */}
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
                      // Call login API directly
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
