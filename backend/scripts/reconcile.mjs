import fs from 'fs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const neon = new PrismaClient();
  const backupPath = fs.existsSync('backend/prisma/backups/sqlite-export-latest.json')
    ? 'backend/prisma/backups/sqlite-export-latest.json'
    : 'prisma/backups/sqlite-export-latest.json';
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // Calculate totals from backup (SQLite source)
  const sqliteSales = backup.sale || [];
  const sqlitePayments = backup.paymentTransaction || [];
  const sqliteRefunds = backup.refund || [];

  const sqliteSalesTotal = sqliteSales.reduce((sum, s) => sum + BigInt(s.finalDealValuePaise || 0), 0n);
  const sqlitePaymentsTotal = sqlitePayments.reduce((sum, p) => sum + BigInt(p.amountPaise || 0), 0n);
  const sqliteRefundsTotal = sqliteRefunds.reduce((sum, r) => sum + BigInt(r.amountPaise || 0), 0n);
  const sqliteOutstanding = sqliteSalesTotal - sqlitePaymentsTotal + sqliteRefundsTotal;

  // Calculate totals from Neon DB
  const neonSales = await neon.sale.aggregate({ _sum: { finalDealValuePaise: true } });
  const neonPayments = await neon.paymentTransaction.aggregate({ _sum: { amountPaise: true } });
  const neonRefunds = await neon.refund.aggregate({ _sum: { amountPaise: true } });

  const neonSalesTotal = neonSales._sum.finalDealValuePaise || 0n;
  const neonPaymentsTotal = neonPayments._sum.amountPaise || 0n;
  const neonRefundsTotal = neonRefunds._sum.amountPaise || 0n;
  const neonOutstanding = neonSalesTotal - neonPaymentsTotal + neonRefundsTotal;

  console.log('=== FINANCIAL RECONCILIATION ===');
  console.log('SQLite Sales Total (Paise):', sqliteSalesTotal.toString(), '(INR ' + (Number(sqliteSalesTotal) / 100).toLocaleString('en-IN') + ')');
  console.log('Neon Sales Total (Paise):  ', neonSalesTotal.toString(), '(INR ' + (Number(neonSalesTotal) / 100).toLocaleString('en-IN') + ')');
  console.log('SQLite Payments Total:     ', sqlitePaymentsTotal.toString(), '(INR ' + (Number(sqlitePaymentsTotal) / 100).toLocaleString('en-IN') + ')');
  console.log('Neon Payments Total:       ', neonPaymentsTotal.toString(), '(INR ' + (Number(neonPaymentsTotal) / 100).toLocaleString('en-IN') + ')');
  console.log('SQLite Refunds Total:      ', sqliteRefundsTotal.toString(), '(INR ' + (Number(sqliteRefundsTotal) / 100).toLocaleString('en-IN') + ')');
  console.log('Neon Refunds Total:        ', neonRefundsTotal.toString(), '(INR ' + (Number(neonRefundsTotal) / 100).toLocaleString('en-IN') + ')');
  console.log('SQLite Outstanding:        ', sqliteOutstanding.toString(), '(INR ' + (Number(sqliteOutstanding) / 100).toLocaleString('en-IN') + ')');
  console.log('Neon Outstanding:          ', neonOutstanding.toString(), '(INR ' + (Number(neonOutstanding) / 100).toLocaleString('en-IN') + ')');

  // Counts comparison
  const models = [
    ['user', 'User', neon.user],
    ['systemRole', 'SystemRole', neon.systemRole],
    ['team', 'Team', neon.team],
    ['employeeProfile', 'EmployeeProfile', neon.employeeProfile],
    ['salesTarget', 'SalesTarget', neon.salesTarget],
    ['lead', 'Lead', neon.lead],
    ['leadAssignment', 'LeadAssignment', neon.leadAssignment],
    ['callLog', 'CallLog', neon.callLog],
    ['followUp', 'FollowUp', neon.followUp],
    ['meeting', 'Meeting', neon.meeting],
    ['client', 'Client', neon.client],
    ['package', 'Package', neon.package],
    ['sale', 'Sale', neon.sale],
    ['paymentTransaction', 'PaymentTransaction', neon.paymentTransaction],
    ['refund', 'Refund', neon.refund],
    ['dailyWorkReport', 'DailyWorkReport', neon.dailyWorkReport],
    ['dailyReportActivity', 'DailyReportActivity', neon.dailyReportActivity],
    ['reportApproval', 'ReportApproval', neon.reportApproval],
    ['notification', 'Notification', neon.notification],
    ['auditLog', 'AuditLog', neon.auditLog],
    ['systemSetting', 'SystemSetting', neon.systemSetting]
  ];

  console.log('\n=== TABLE COUNTS RECONCILIATION ===');
  let allPass = true;
  for (const [key, name, delegate] of models) {
    const srcCount = (backup[key] || []).length;
    const destCount = await delegate.count();
    const match = srcCount === destCount;
    if (!match) allPass = false;
    console.log(`${name.padEnd(20)} | SQLite: ${String(srcCount).padEnd(4)} | Neon: ${String(destCount).padEnd(4)} | [${match ? 'PASS' : 'FAIL'}]`);
  }

  console.log(`\nALL TABLES MATCH: ${allPass ? 'PASS' : 'FAIL'}`);
  await neon.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
