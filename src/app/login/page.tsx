"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@mentneo.com");
  const [password, setPassword] = React.useState("Password123!");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      if (data.user.role === "SALES_EXECUTIVE") {
        router.push("/dashboard");
      } else {
        router.push("/admin/overview");
      }
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const quickLogins = [
    { label: "Super Admin", email: "admin@mentneo.com", role: "Full Access" },
    { label: "Sales Manager", email: "manager@mentneo.com", role: "Team Oversight" },
    { label: "Teja (Executive)", email: "teja@mentneo.com", role: "Executive View" },
    { label: "Narendra (Executive)", email: "narendra@mentneo.com", role: "Executive View" },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#070b19] px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 text-white font-black text-2xl shadow-xl shadow-sky-950 mb-1">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            MENTNEO Sales Intelligence
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access sales operations, CRM, calls, and performance dashboards
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mentneo.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm mt-2"
              isLoading={isLoading}
            >
              Sign In to Platform <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Demo Quick Logins */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" /> Demo Quick Switch
              </span>
              <span className="text-[10px] text-slate-500">Auto-fills credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickLogins.map((ql) => (
                <button
                  key={ql.email}
                  type="button"
                  onClick={() => {
                    setEmail(ql.email);
                    setPassword("Password123!");
                  }}
                  className={`p-2 rounded-lg text-left text-xs border transition-all ${
                    email === ql.email
                      ? "bg-sky-950/50 border-sky-600/60 text-sky-300"
                      : "bg-slate-950/40 border-slate-800/70 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <p className="font-medium truncate">{ql.label}</p>
                  <p className="text-[10px] text-slate-500">{ql.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Role-Based Access Control & Integer-Precision Finance</span>
        </div>
      </div>
    </div>
  );
}
