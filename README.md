# MENTNEO Sales Intelligence Dashboard

Production-ready enterprise sales operations and revenue intelligence platform for **MENTNEO**.

---

## 🌟 Architecture & Technical Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript (ES2022)
- **Styling:** Tailwind CSS + Enterprise Design System (Deep Navy `#0b1329`, White/Light Gray Surfaces, Teal `#0d9488` & Blue Accents, Persistent Light/Dark theme)
- **Database & ORM:** Prisma ORM with 20 fully related models
  - **Local Development:** SQLite (`file:./dev.db`) for rapid local iteration, relational integrity, foreign keys, and zero-daemon friction.
  - **Production Deployment:** PostgreSQL via standard `DATABASE_URL` connection string.
- **Financial Precision Standard:** All monetary values are strictly stored and calculated as **integer paise** (`1 INR = 100 paise`). Floating-point arithmetic is strictly prohibited to prevent financial rounding drift.
- **Analytics & Charting:** Recharts for interactive analytics, funnels, revenue trends, and employee comparisons.
- **Exports:** CSV exports, Excel (`.xlsx`) via SheetJS, and printable / PDF formatted reporting.

---

## 👥 User Roles & Access Control Matrix

| Role | Access Scope | Key Capabilities |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Company-wide | Complete oversight, employee CRUD, quota configuration, package management, audit logs, system settings, report approvals, payment verifications |
| **ADMIN_MANAGER** | Team-scoped | Team performance monitoring, lead re-assignment, daily work report review & feedback, payment verification (independent verifier) |
| **SALES_EXECUTIVE** | Strictly Personal | Personal dashboard, assigned leads CRM, manual call logger, follow-up calendar, daily work report draft & submission, sales and payment recording |

### 🔒 Two-Person Payment Verification Rule
Employees cannot verify their own recorded financial transactions. The backend enforces `recordedById !== actorId` on the payment verification endpoint (`/api/payments/[id]/verify`). Only a separate authorized verifier (`SUPER_ADMIN` or `ADMIN_MANAGER`) can confirm receipts into corporate bank accounts.

---

## 🗄️ Database Design: 20 Required Entities

1. `User` - User identity, role, and activation status
2. `SystemRole` - System role definitions (`SUPER_ADMIN`, `ADMIN_MANAGER`, `SALES_EXECUTIVE`)
3. `Team` - Department hierarchy and sales team units
4. `EmployeeProfile` - Extended employee metadata, territory, employee code, and reporting lines
5. `SalesTarget` - Configurable quotas (Daily calls/leads/follow-ups, Weekly/Monthly paid clients, Revenue in paise, Package breakdown, Effective dates)
6. `Lead` - Complete CRM lead records, stage, temperature, source, and estimated deal value
7. `LeadAssignment` - Lead transfer audit log with reasons and actor tracking
8. `CallLog` - Inbound/outbound call logs, durations, outcomes, and automated follow-up triggers
9. `FollowUp` - Scheduled follow-up calendar items with automated overdue tracking
10. `Meeting` - Scheduled client demonstrations and meetings
11. `Sale` - Finalized contract records, discounts, final deal values, and payment status
12. `Client` - Converted business accounts, GST numbers, contact info, and lifetime purchase metrics
13. `Package` - Standard product offerings (₹25k, ₹35k, ₹45k) in integer paise
14. `PaymentTransaction` - Recorded transactions, verifier info, verification status, and bank UTRs
15. `Refund` - Authorized refunds recorded against sales and collections
16. `DailyWorkReport` - Formal end-of-day reports across calls, leads, sales, financials, and work summaries
17. `DailyReportActivity` - Relation links connecting daily reports to underlying CRM records
18. `Notification` - In-app alerts for assignments, due follow-ups, payment verifications, and report reviews
19. `AuditLog` - Immutable record of administrative, security, and financial operations with JSON diffs
20. `ReportApproval` - History of report reviews, approvals, and rejections with manager feedback
21. `SystemSetting` - Dynamic configuration for reporting deadlines (IST) and verification rules

---

## 📄 23 Complete Required Pages

1. [`/login`](src/app/login/page.tsx) — Enterprise sign-in with quick demo persona switcher
2. [`/forgot-password`](src/app/forgot-password/page.tsx) — Account password recovery flow
3. [`/admin/overview`](src/app/admin/overview/page.tsx) — Executive command center with 14 summary KPIs and 10 Recharts analytics
4. [`/dashboard`](src/app/dashboard/page.tsx) — Sales Executive personal cockpit, 14 personal cards, target milestone bar, and quick actions
5. [`/admin/sales-team`](src/app/admin/sales-team/page.tsx) — Sales team directory, performance table, add executive modal, and CSV export
6. [`/admin/employees/[id]`](src/app/admin/employees/[id]/page.tsx) — Individual employee profile, target progress, calls, sales, and report history
7. [`/reports/daily/new`](src/app/reports/daily/new/page.tsx) — Comprehensive 6-section Daily Work Report form (Draft & Submit)
8. [`/reports/daily`](src/app/reports/daily/page.tsx) — Daily work reports listing, filtering, review dialog, and rejection resubmission
9. [`/crm/leads`](src/app/crm/leads/page.tsx) — CRM lead management table with duplicate phone detection, filters, and transfer modal
10. [`/crm/leads/[id]`](src/app/crm/leads/[id]/page.tsx) — Lead detail page with call history, follow-up scheduling, and stage updates
11. [`/activity/calls`](src/app/activity/calls/page.tsx) — Call activity module with connected ratios, duration tracking, and manual call logger
12. [`/activity/follow-ups`](src/app/activity/follow-ups/page.tsx) — Follow-up calendar with highlighted overdue alerts and completion tracking
13. [`/crm/clients`](src/app/crm/clients/page.tsx) — Converted client directory, purchase history, and outstanding receivables
14. [`/sales/records`](src/app/sales/records/page.tsx) — Deal management tracking 7 distinct financial metrics, discounts, and refunds
15. [`/sales/collections`](src/app/sales/collections/page.tsx) — Cash collections register, bank UTR tracking, and payment recording
16. [`/sales/verification`](src/app/sales/verification/page.tsx) — Two-person payment verification queue preventing self-approval
17. [`/admin/targets`](src/app/admin/targets/page.tsx) — Target configuration screen (team plan & employee quotas)
18. [`/admin/analytics`](src/app/admin/analytics/page.tsx) — Daily, Weekly, and Monthly report views with Excel (.xlsx), CSV, and Print exports
19. [`/notifications`](src/app/notifications/page.tsx) — In-app notification center with read/unread filtering
20. [`/admin/audit-logs`](src/app/admin/audit-logs/page.tsx) — Searchable administrative and financial audit trail with JSON inspector
21. [`/admin/users`](src/app/admin/users/page.tsx) — User and role management for Super Admin
22. [`/admin/packages`](src/app/admin/packages/page.tsx) — Product package management (₹25k, ₹35k, ₹45k) in paise precision
23. [`/admin/settings`](src/app/admin/settings/page.tsx) — General company settings, 8:00 PM IST reporting deadline, and DB architecture status

---

## 🎯 Initial Sales Plan Configuration (Database Seeded)

- **Sales Team Size:** 6 Executives (Teja, Narendra, Rushika, Surendra, Pujitha, Gowtham)
- **Monthly Quota Per Executive:**
  - 15 clients on ₹25,000 package
  - 10 clients on ₹35,000 package
  - 5 clients on ₹45,000 package
  - **30 Paid Clients Total** | **₹9,50,000 Target Sales Value**
- **Team Monthly Target:**
  - **180 Paid Clients Total** | **₹57,00,000 Target Sales Value**
- **Default Credentials:**
  - Super Admin: `admin@mentneo.com` / `Password123!`
  - Sales Manager: `manager@mentneo.com` / `Password123!`
  - Executives: `teja@mentneo.com`, `narendra@mentneo.com`, etc. / `Password123!`

---

## 🚀 Local Setup & Execution Instructions

### 1. Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database & Seed Demo Data
```bash
npx prisma db push
npm run prisma:seed
```

### 4. Run Automated Tests
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production
```bash
npm run build
npm start
```

---

## 🐘 Production PostgreSQL Deployment Guide

1. Set the PostgreSQL connection string in your production environment:
   ```env
   DATABASE_URL="postgresql://db_user:secure_password@postgres_host:5432/mentneo_sales?schema=public"
   JWT_SECRET="generate-a-cryptographically-secure-random-32-char-string"
   ```
2. Update `prisma/schema.prisma` datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run Prisma deployment migration:
   ```bash
   npx prisma migrate deploy
   # Or for initial sync:
   npx prisma db push
   ```
4. Seed initial roles, packages, and admin account:
   ```bash
   node scripts/seed.mjs
   ```

---

## 🛡️ Backup & Disaster Recovery Guidance

- **SQLite (Development):** The database resides at `./dev.db`. Create hourly copies using standard file snapshots or `sqlite3 dev.db ".backup backup.db"`.
- **PostgreSQL (Production):**
  - Automated daily backups using `pg_dump`:
    ```bash
    pg_dump -Fc -U db_user -d mentneo_sales > mentneo_backup_$(date +%Y%m%d_%H%M%S).dump
    ```
  - Restore procedure:
    ```bash
    pg_restore -c -U db_user -d mentneo_sales mentneo_backup_filename.dump
    ```
  - Enable Write-Ahead Logging (WAL) archiving for Point-In-Time Recovery (PITR).
