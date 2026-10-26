import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "purple"
    | "teal"
    | "outline";
  status?: string;
}

export function Badge({ className = "", variant, status, children, ...props }: BadgeProps) {
  // If status is provided, auto-map to standard semantic colors
  let resolvedVariant = variant || "default";

  if (status) {
    const s = status.toUpperCase().replace(/\s+/g, "_");
    if (["PAID", "VERIFIED", "APPROVED", "CONVERTED", "ACTIVE", "COMPLETED", "CONNECTED"].includes(s)) {
      resolvedVariant = "success";
    } else if (["PENDING", "PARTIALLY_PAID", "NEGOTIATION", "SUBMITTED", "WARM", "INTERESTED"].includes(s)) {
      resolvedVariant = "warning";
    } else if (["OVERDUE", "REJECTED", "LOST", "SUSPENDED", "HOT", "CANCELLED", "NOT_ANSWERED"].includes(s)) {
      resolvedVariant = "danger";
    } else if (["NEW", "QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "DRAFT"].includes(s)) {
      resolvedVariant = "info";
    } else if (["COLD", "NOT_INTERESTED", "INACTIVE", "BUSY"].includes(s)) {
      resolvedVariant = "default";
    }
  }

  const variantStyles = {
    default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    outline: "bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[resolvedVariant]} ${className}`}
      {...props}
    >
      {children || (status ? status.replace(/_/g, " ") : null)}
    </span>
  );
}
