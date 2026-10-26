import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { adaptRoute } from "./adapter";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", service: "mentneo-backend-api", timestamp: new Date().toISOString() });
});

// Import API Route Modules
// Auth
import * as authLogin from "./api/auth/login/route";
import * as authLogout from "./api/auth/logout/route";
import * as authMe from "./api/auth/me/route";
import * as authResetPassword from "./api/auth/reset-password/route";

// Analytics
import * as analyticsAdmin from "./api/analytics/admin/route";
import * as analyticsExecutive from "./api/analytics/executive/route";

// Audit Logs
import * as auditLogs from "./api/audit-logs/route";

// Calls & Follow-ups
import * as calls from "./api/calls/route";
import * as followUps from "./api/follow-ups/route";
import * as followUpById from "./api/follow-ups/[id]/route";

// Clients
import * as clients from "./api/clients/route";
import * as clientActivities from "./api/clients/[id]/activities/route";
import * as clientById from "./api/clients/[id]/route";

// Employees
import * as employees from "./api/employees/route";
import * as employeeById from "./api/employees/[id]/route";

// Leads
import * as leads from "./api/leads/route";
import * as leadTransfer from "./api/leads/[id]/transfer/route";
import * as leadById from "./api/leads/[id]/route";

// Notifications
import * as notifications from "./api/notifications/route";

// Packages
import * as packages from "./api/packages/route";

// Payments & Refunds
import * as payments from "./api/payments/route";
import * as paymentVerify from "./api/payments/[id]/verify/route";
import * as refunds from "./api/refunds/route";

// Reports
import * as reportsDaily from "./api/reports/daily/route";
import * as reportReview from "./api/reports/daily/[id]/review/route";
import * as reportById from "./api/reports/daily/[id]/route";

// Sales, Search, Settings, Targets, Users
import * as sales from "./api/sales/route";
import * as search from "./api/search/route";
import * as settings from "./api/settings/route";
import * as targets from "./api/targets/route";
import * as users from "./api/users/route";

// Mount Endpoints
// Auth
app.all("/api/auth/login", adaptRoute(authLogin));
app.all("/api/auth/logout", adaptRoute(authLogout));
app.all("/api/auth/me", adaptRoute(authMe));
app.all("/api/auth/reset-password", adaptRoute(authResetPassword));

// Analytics
app.all("/api/analytics/admin", adaptRoute(analyticsAdmin));
app.all("/api/analytics/executive", adaptRoute(analyticsExecutive));

// Audit Logs
app.all("/api/audit-logs", adaptRoute(auditLogs));

// Calls & Follow-ups
app.all("/api/calls", adaptRoute(calls));
app.all("/api/follow-ups/:id", adaptRoute(followUpById));
app.all("/api/follow-ups", adaptRoute(followUps));

// Clients (Notice: activities route must be registered before clientById)
app.all("/api/clients/:id/activities", adaptRoute(clientActivities));
app.all("/api/clients/:id", adaptRoute(clientById));
app.all("/api/clients", adaptRoute(clients));

// Employees
app.all("/api/employees/:id", adaptRoute(employeeById));
app.all("/api/employees", adaptRoute(employees));

// Leads (Notice: transfer route must be registered before leadById)
app.all("/api/leads/:id/transfer", adaptRoute(leadTransfer));
app.all("/api/leads/:id", adaptRoute(leadById));
app.all("/api/leads", adaptRoute(leads));

// Notifications
app.all("/api/notifications", adaptRoute(notifications));

// Packages
app.all("/api/packages", adaptRoute(packages));

// Payments & Refunds
app.all("/api/payments/:id/verify", adaptRoute(paymentVerify));
app.all("/api/payments", adaptRoute(payments));
app.all("/api/refunds", adaptRoute(refunds));

// Reports
app.all("/api/reports/daily/:id/review", adaptRoute(reportReview));
app.all("/api/reports/daily/:id", adaptRoute(reportById));
app.all("/api/reports/daily", adaptRoute(reportsDaily));

// Sales, Search, Settings, Targets, Users
app.all("/api/sales", adaptRoute(sales));
app.all("/api/search", adaptRoute(search));
app.all("/api/settings", adaptRoute(settings));
app.all("/api/targets", adaptRoute(targets));
app.all("/api/users", adaptRoute(users));

// Global 404 handler for API routes
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.status(404).send("Not found");
});

// Start Express server only in standalone / non-serverless mode
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Mentneo Backend API Server running on http://localhost:${PORT}`);
  });
}

export default app;
