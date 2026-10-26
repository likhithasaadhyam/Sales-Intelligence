"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN_MANAGER" | "SALES_EXECUTIVE";
  employeeCode?: string;
  teamId?: string | null;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/login" || pathname === "/forgot-password";

  const [user, setUser] = React.useState<UserSession | null>(null);
  const [loading, setLoading] = React.useState(!isAuthPage);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (isAuthPage) return;

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pathname, isAuthPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  const handleSwitchUser = async (email: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.role === "SALES_EXECUTIVE") {
          router.push("/dashboard");
        } else {
          router.push("/admin/overview");
        }
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Loading MENTNEO Sales Intelligence...
          </p>
        </div>
      </div>
    );
  }

  const role = user?.role || "SALES_EXECUTIVE";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex">
      {/* Sidebar */}
      <Sidebar
        userRole={role}
        userName={user?.name || "User"}
        userEmail={user?.email || ""}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <TopNav
          userName={user?.name || "User"}
          userRole={role}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
