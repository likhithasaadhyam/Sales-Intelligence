import { NextResponse } from "../../../lib/next-compat";
import { getSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { getDateRangeFilter, DateRangePreset, formatISTDateOnly } from "../../../lib/date-utils";
import { calculateAchievementPercentage, calculateOutstanding, calculateNetCollections } from "../../../lib/financials";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "SALES_EXECUTIVE") {
      return NextResponse.json({ error: "Forbidden: Sales Executive cannot access admin overview" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rangePreset = (searchParams.get("range") || "thisMonth") as DateRangePreset;
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;

    const { startDate, endDate } = getDateRangeFilter(rangePreset, customStart, customEnd);

    // Today range boundaries for "Today" specific KPIs
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // 1. Fetch Employees
    const [executives, activeExecutivesCount] = await Promise.all([
      prisma.user.findMany({
        where: { role: "SALES_EXECUTIVE" },
        include: {
          profile: { include: { team: true } },
          salesTargets: {
            where: { periodType: "MONTHLY" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.user.count({
        where: { role: "SALES_EXECUTIVE", status: "ACTIVE" },
      }),
    ]);

    const totalSalesExecutives = executives.length;

    // 2. Calls Data
    const [callsToday, callsInPeriod] = await Promise.all([
      prisma.callLog.findMany({
        where: { callDateTime: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.callLog.findMany({
        where: { callDateTime: { gte: startDate, lte: endDate } },
      }),
    ]);

    const totalCallsToday = callsToday.length;

    // 3. Leads Data
    const [leadsToday, leadsInPeriod, allLeads] = await Promise.all([
      prisma.lead.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.lead.findMany({
        select: { status: true, source: true, temperature: true, estimatedDealValuePaise: true },
      }),
    ]);

    const totalLeadsToday = leadsToday.length;
    const qualifiedLeadsInPeriod = leadsInPeriod.filter((l) =>
      ["QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)
    ).length;

    // 4. Follow-ups
    const [followupsDueToday, followupsOverdue] = await Promise.all([
      prisma.followUp.count({
        where: {
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: "PENDING",
        },
      }),
      prisma.followUp.count({
        where: { status: "OVERDUE" },
      }),
    ]);

    // 5. Sales & Deals
    const [salesToday, salesInPeriod, monthSales] = await Promise.all([
      prisma.sale.findMany({
        where: { saleDate: { gte: todayStart, lte: todayEnd } },
        include: { payments: true },
      }),
      prisma.sale.findMany({
        where: { saleDate: { gte: startDate, lte: endDate } },
        include: { payments: true, client: true, employee: true },
      }),
      prisma.sale.findMany({
        where: { saleDate: { gte: monthStart, lte: todayEnd } },
      }),
    ]);

    const dealsClosedToday = salesToday.length;

    let todayRevenuePaise = 0n;
    for (const s of salesToday) todayRevenuePaise += s.finalDealValuePaise;

    let periodRevenuePaise = 0n;
    for (const s of salesInPeriod) periodRevenuePaise += s.finalDealValuePaise;

    let monthRevenuePaise = 0n;
    for (const s of monthSales) monthRevenuePaise += s.finalDealValuePaise;

    // 6. Verified Collections
    const [paymentsToday, paymentsInPeriod, refundsInPeriod] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where: {
          verificationStatus: "VERIFIED",
          paymentDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.paymentTransaction.findMany({
        where: {
          verificationStatus: "VERIFIED",
          paymentDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.refund.findMany({
        where: {
          verificationStatus: "VERIFIED",
          processedAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    let todayCollectedPaise = 0n;
    for (const p of paymentsToday) todayCollectedPaise += p.amountPaise;

    let periodCollectedPaise = 0n;
    for (const p of paymentsInPeriod) periodCollectedPaise += p.amountPaise;

    let periodRefundsPaise = 0n;
    for (const r of refundsInPeriod) periodRefundsPaise += r.amountPaise;

    const netPeriodCollectionsPaise = calculateNetCollections(periodCollectedPaise, periodRefundsPaise);
    const pendingPaymentsPaise = calculateOutstanding(periodRevenueGenerated(), periodCollectedPaise);

    function periodRevenueGenerated() {
      return periodRevenuePaise;
    }

    const paidClientsCount = salesInPeriod.filter((s) => s.paymentStatus === "PAID").length;

    // Monthly Target from team target
    const teamTarget = await prisma.salesTarget.findFirst({
      where: {
        teamId: { not: null },
        periodType: "MONTHLY",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    const targetMonthlyRevenuePaise = teamTarget?.targetSalesValuePaise || 570000000n; // ₹57,00,000
    const targetMonthlyPaidClients = teamTarget?.targetPaidClients || 180;

    const monthlyTargetAchievementPct = calculateAchievementPercentage(monthRevenuePaise, targetMonthlyRevenuePaise);
    const overallConversionRate = allLeads.length > 0 ? Math.round((paidClientsCount / allLeads.length) * 100) : 0;

    // 7. Chart Data Calculations
    // A. Revenue Trend (Line chart comparing revenue generated vs verified collections by day)
    const dayMap = new Map<string, { date: string; revenue: number; collections: number }>();
    const d = new Date(startDate);
    while (d <= endDate) {
      const key = formatISTDateOnly(d);
      dayMap.set(key, { date: key, revenue: 0, collections: 0 });
      d.setDate(d.getDate() + 1);
    }

    for (const s of salesInPeriod) {
      const key = formatISTDateOnly(s.saleDate);
      if (dayMap.has(key)) {
        dayMap.get(key)!.revenue += Number(s.finalDealValuePaise) / 100;
      }
    }

    for (const p of paymentsInPeriod) {
      const key = formatISTDateOnly(p.paymentDate);
      if (dayMap.has(key)) {
        dayMap.get(key)!.collections += Number(p.amountPaise) / 100;
      }
    }

    const revenueTrendData = Array.from(dayMap.values()).slice(-14);

    // B & J. Employee Performance & Rankings
    const employeeTable = await Promise.all(
      executives.map(async (u) => {
        const [
          uCallsToday,
          uConnectedCallsToday,
          uLeadsToday,
          uQualifiedLeads,
          uFollowupsToday,
          uMeetingsMonth,
          uDealsClosed,
          uSales,
          uVerifiedPayments,
          uReportToday,
        ] = await Promise.all([
          prisma.callLog.count({
            where: { employeeId: u.id, callDateTime: { gte: todayStart, lte: todayEnd } },
          }),
          prisma.callLog.count({
            where: { employeeId: u.id, callStatus: "CONNECTED", callDateTime: { gte: todayStart, lte: todayEnd } },
          }),
          prisma.lead.count({
            where: { assignedToId: u.id, createdAt: { gte: todayStart, lte: todayEnd } },
          }),
          prisma.lead.count({
            where: {
              assignedToId: u.id,
              status: { in: ["QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"] },
            },
          }),
          prisma.followUp.count({
            where: { employeeId: u.id, status: "COMPLETED", updatedAt: { gte: todayStart, lte: todayEnd } },
          }),
          prisma.meeting.count({
            where: { employeeId: u.id, scheduledAt: { gte: startDate, lte: endDate } },
          }),
          prisma.sale.count({
            where: { employeeId: u.id, saleDate: { gte: startDate, lte: endDate } },
          }),
          prisma.sale.findMany({
            where: { employeeId: u.id, saleDate: { gte: startDate, lte: endDate } },
          }),
          prisma.paymentTransaction.findMany({
            where: {
              recordedById: u.id,
              verificationStatus: "VERIFIED",
              paymentDate: { gte: startDate, lte: endDate },
            },
          }),
          prisma.dailyWorkReport.findFirst({
            where: { employeeId: u.id, reportingDate: todayStart },
            select: { status: true },
          }),
        ]);

        let uRev = 0n;
        for (const s of uSales) uRev += s.finalDealValuePaise;

        let uCol = 0n;
        for (const p of uVerifiedPayments) uCol += p.amountPaise;

        const uPending = calculateOutstanding(uRev, uCol);
        const uPaidClients = uSales.filter((s) => s.paymentStatus === "PAID").length;

        const uTarget = u.salesTargets[0];
        const monthlyTargetPaidClients = uTarget?.targetPaidClients || 30;
        const targetAchv = calculateAchievementPercentage(uPaidClients, monthlyTargetPaidClients);

        return {
          id: u.id,
          name: u.name,
          employeeCode: u.profile?.employeeCode || "—",
          territory: u.profile?.territory || "General",
          callsToday: uCallsToday,
          connectedCalls: uConnectedCallsToday,
          newLeads: uLeadsToday,
          qualifiedLeads: uQualifiedLeads,
          followupsCompleted: uFollowupsToday,
          meetingsScheduled: uMeetingsMonth,
          dealsClosed: uDealsClosed,
          paidClients: uPaidClients,
          revenueGeneratedPaise: uRev.toString(),
          amountCollectedPaise: uCol.toString(),
          pendingPaymentsPaise: uPending.toString(),
          monthlyTarget: monthlyTargetPaidClients,
          targetAchievementPct: targetAchv,
          dailyReportStatus: uReportToday ? uReportToday.status : "MISSING",
          revenueRupees: Number(uRev) / 100,
          collectedRupees: Number(uCol) / 100,
        };
      })
    );

    // Rankings sorted by revenue
    const employeeRankings = [...employeeTable].sort((a, b) => b.revenueRupees - a.revenueRupees);

    // C. Target Achievement Chart Data
    const targetAchievementData = employeeTable.map((emp) => ({
      name: emp.name,
      achieved: emp.paidClients,
      target: emp.monthlyTarget,
      pct: emp.targetAchievementPct,
    }));

    // D. Funnel Data
    const salesFunnel = [
      { stage: "New Leads", count: allLeads.length },
      { stage: "Contacted", count: allLeads.filter((l) => l.status !== "NEW").length },
      { stage: "Qualified", count: allLeads.filter((l) => ["QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)).length },
      { stage: "Meetings", count: allLeads.filter((l) => ["MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)).length },
      { stage: "Proposals", count: allLeads.filter((l) => ["PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)).length },
      { stage: "Closed Deals", count: salesInPeriod.length },
      { stage: "Paid Clients", count: paidClientsCount },
    ];

    // E. Daily Calls Analysis
    const callDaysMap = new Map<string, { date: string; total: number; connected: number }>();
    for (const c of callsInPeriod) {
      const key = formatISTDateOnly(c.callDateTime);
      if (!callDaysMap.has(key)) {
        callDaysMap.set(key, { date: key, total: 0, connected: 0 });
      }
      const entry = callDaysMap.get(key)!;
      entry.total += 1;
      if (c.callStatus === "CONNECTED") entry.connected += 1;
    }
    const dailyCallsAnalysis = Array.from(callDaysMap.values()).slice(-7);

    // G. Package Performance (₹25k, ₹35k, ₹45k)
    const pkgMap: Record<string, { name: string; clients: number; revenuePaise: bigint; collectedPaise: bigint }> = {
      "Mentneo Starter Growth": { name: "Starter Growth (₹25k)", clients: 0, revenuePaise: 0n, collectedPaise: 0n },
      "Mentneo Professional Scale": { name: "Professional Scale (₹35k)", clients: 0, revenuePaise: 0n, collectedPaise: 0n },
      "Mentneo Enterprise Accelerator": { name: "Enterprise Accelerator (₹45k)", clients: 0, revenuePaise: 0n, collectedPaise: 0n },
    };

    for (const s of salesInPeriod) {
      const name = s.packageName || "Other";
      if (!pkgMap[name]) {
        pkgMap[name] = { name, clients: 0, revenuePaise: 0n, collectedPaise: 0n };
      }
      pkgMap[name].clients += 1;
      pkgMap[name].revenuePaise += s.finalDealValuePaise;
      for (const p of s.payments) {
        if (p.verificationStatus === "VERIFIED") {
          pkgMap[name].collectedPaise += p.amountPaise;
        }
      }
    }

    const packagePerformance = Object.values(pkgMap).map((p) => ({
      name: p.name,
      clients: p.clients,
      revenueRupees: Number(p.revenuePaise) / 100,
      collectedRupees: Number(p.collectedPaise) / 100,
    }));

    // H. Lead Source Analysis
    const sourceMap: Record<string, number> = {};
    for (const l of allLeads) {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    }
    const leadSourceData = Object.entries(sourceMap).map(([source, count]) => ({
      source: source.replace(/_/g, " "),
      count,
    }));

    return NextResponse.json({
      cards: {
        totalSalesExecutives,
        activeSalesExecutives: activeExecutivesCount,
        totalCallsToday,
        totalLeadsToday,
        followupsDue: followupsDueToday + followupsOverdue,
        qualifiedLeads: qualifiedLeadsInPeriod,
        dealsClosedToday,
        paidClients: paidClientsCount,
        todayRevenueGeneratedPaise: todayRevenuePaise.toString(),
        todayAmountCollectedPaise: todayCollectedPaise.toString(),
        pendingPaymentsPaise: pendingPaymentsPaise.toString(),
        monthlyRevenuePaise: monthRevenuePaise.toString(),
        monthlyTargetAchievement: monthlyTargetAchievementPct,
        overallConversionRate,
        periodRevenueGeneratedPaise: periodRevenuePaise.toString(),
        periodAmountCollectedPaise: periodCollectedPaise.toString(),
        periodRefundsPaise: periodRefundsPaise.toString(),
        netPeriodCollectionsPaise: netPeriodCollectionsPaise.toString(),
      },
      charts: {
        revenueTrend: revenueTrendData,
        employeePerformance: employeeTable.map((e) => ({
          name: e.name,
          calls: e.callsToday,
          leads: e.newLeads,
          paidClients: e.paidClients,
          revenue: e.revenueRupees,
          collected: e.collectedRupees,
        })),
        targetAchievement: targetAchievementData,
        salesFunnel,
        dailyCallsAnalysis,
        packagePerformance,
        leadSourceAnalysis: leadSourceData,
        employeeRankings,
      },
      employeeTable,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to generate admin analytics" }, { status: 500 });
  }
}
