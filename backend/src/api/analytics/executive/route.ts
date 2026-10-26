import { NextResponse } from "../../../lib/next-compat";
import { getSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { getDateRangeFilter, DateRangePreset } from "../../../lib/date-utils";
import { calculateAchievementPercentage } from "../../../lib/financials";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rangePreset = (searchParams.get("range") || "thisMonth") as DateRangePreset;
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const requestedEmployeeId = searchParams.get("employeeId");

    // Enforce role isolation: Sales Executive can strictly ONLY access their own data
    let targetUserId = session.id;
    if (requestedEmployeeId) {
      if (session.role === "SALES_EXECUTIVE" && requestedEmployeeId !== session.id) {
        return NextResponse.json({ error: "Forbidden: Cross-employee access denied" }, { status: 403 });
      }
      targetUserId = requestedEmployeeId;
    }

    const { startDate, endDate } = getDateRangeFilter(rangePreset, customStart, customEnd);

    // Start of Today and End of Today for "Today" specific KPIs
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Fetch Calls (Today and Selected Period)
    const [callsToday, callsPeriod] = await Promise.all([
      prisma.callLog.findMany({
        where: {
          employeeId: targetUserId,
          callDateTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.callLog.findMany({
        where: {
          employeeId: targetUserId,
          callDateTime: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const callsMadeToday = callsToday.length;
    const connectedCallsToday = callsToday.filter((c) => c.callStatus === "CONNECTED").length;
    const unansweredCallsToday = callsToday.filter((c) => c.callStatus !== "CONNECTED").length;

    // 2. Fetch Leads (Created or Contacted)
    const [leadsCreatedPeriod, leadsToday] = await Promise.all([
      prisma.lead.findMany({
        where: {
          assignedToId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.lead.findMany({
        where: {
          assignedToId: targetUserId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    const qualifiedLeadsPeriod = leadsCreatedPeriod.filter(
      (l) => l.status === "QUALIFIED" || l.status === "CONVERTED" || l.status === "MEETING_SCHEDULED"
    ).length;

    // 3. Follow-ups
    const [followupsCompletedToday, followupsPending, followupsOverdue] = await Promise.all([
      prisma.followUp.count({
        where: {
          employeeId: targetUserId,
          status: "COMPLETED",
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.followUp.count({
        where: {
          employeeId: targetUserId,
          status: "PENDING",
        },
      }),
      prisma.followUp.count({
        where: {
          employeeId: targetUserId,
          status: "OVERDUE",
        },
      }),
    ]);

    // 4. Meetings
    const meetingsScheduled = await prisma.meeting.count({
      where: {
        employeeId: targetUserId,
        scheduledAt: { gte: startDate, lte: endDate },
      },
    });

    // 5. Sales & Revenue
    const salesPeriod = await prisma.sale.findMany({
      where: {
        employeeId: targetUserId,
        saleDate: { gte: startDate, lte: endDate },
      },
      include: {
        payments: true,
      },
    });

    const dealsClosed = salesPeriod.length;

    // Paid Clients: Count sales that are fully paid or have verified payment status
    const paidClients = salesPeriod.filter((s) => s.paymentStatus === "PAID").length;

    // Revenue Generated = Sum of finalDealValuePaise of finalized sales
    let revenueGeneratedPaise = 0n;
    for (const sale of salesPeriod) {
      revenueGeneratedPaise += sale.finalDealValuePaise;
    }

    // 6. Verified Collections & Outstanding
    // Strictly ONLY count VERIFIED payments
    const verifiedPayments = await prisma.paymentTransaction.findMany({
      where: {
        recordedById: targetUserId,
        verificationStatus: "VERIFIED",
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    let amountCollectedPaise = 0n;
    for (const p of verifiedPayments) {
      amountCollectedPaise += p.amountPaise;
    }

    // Calculate Outstanding = Final Deal Value - Net Verified Collections
    const pendingPaymentsPaise =
      revenueGeneratedPaise > amountCollectedPaise
        ? revenueGeneratedPaise - amountCollectedPaise
        : 0n;

    // 7. Active Monthly Target for this Executive
    const activeTarget = await prisma.salesTarget.findFirst({
      where: {
        employeeId: targetUserId,
        periodType: "MONTHLY",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    const targetPaidClients = activeTarget?.targetPaidClients || 30;
    const targetSalesValuePaise = activeTarget?.targetSalesValuePaise || 95000000n; // ₹9,50,000
    const targetCalls = activeTarget?.targetCalls || 1200;

    const remainingClients = Math.max(0, targetPaidClients - paidClients);
    const clientTargetAchievementPct = calculateAchievementPercentage(paidClients, targetPaidClients);
    const revenueTargetAchievementPct = calculateAchievementPercentage(
      revenueGeneratedPaise,
      targetSalesValuePaise
    );

    // 8. Package Distribution of Sales
    const packageStats: Record<string, { count: number; totalPaise: bigint }> = {
      "Mentneo Starter Growth": { count: 0, totalPaise: 0n },
      "Mentneo Professional Scale": { count: 0, totalPaise: 0n },
      "Mentneo Enterprise Accelerator": { count: 0, totalPaise: 0n },
    };

    for (const s of salesPeriod) {
      const name = s.packageName || "Other";
      if (!packageStats[name]) {
        packageStats[name] = { count: 0, totalPaise: 0n };
      }
      packageStats[name].count += 1;
      packageStats[name].totalPaise += s.finalDealValuePaise;
    }

    // 9. Personal Activity Timeline (Recent 15 events)
    const [recentCalls, recentSales, recentFollowups, recentReports] = await Promise.all([
      prisma.callLog.findMany({
        where: { employeeId: targetUserId },
        orderBy: { callDateTime: "desc" },
        take: 5,
        include: {
          lead: { select: { businessName: true, contactPerson: true } },
          client: { select: { businessName: true } },
        },
      }),
      prisma.sale.findMany({
        where: { employeeId: targetUserId },
        orderBy: { saleDate: "desc" },
        take: 5,
        include: { client: { select: { businessName: true } } },
      }),
      prisma.followUp.findMany({
        where: { employeeId: targetUserId },
        orderBy: { scheduledAt: "desc" },
        take: 5,
        include: {
          lead: { select: { businessName: true } },
          client: { select: { businessName: true } },
        },
      }),
      prisma.dailyWorkReport.findMany({
        where: { employeeId: targetUserId },
        orderBy: { reportingDate: "desc" },
        take: 5,
      }),
    ]);

    const timeline: { id: string; type: string; title: string; description: string; date: Date }[] = [];

    recentCalls.forEach((c) => {
      timeline.push({
        id: `call-${c.id}`,
        type: "CALL",
        title: `Logged ${c.callStatus.replace(/_/g, " ")} Call (${Math.round(c.durationSeconds / 60)} mins)`,
        description: `Prospect: ${c.lead?.businessName || c.client?.businessName || "Client"} (${c.outcome})`,
        date: c.callDateTime,
      });
    });

    recentSales.forEach((s) => {
      timeline.push({
        id: `sale-${s.id}`,
        type: "SALE",
        title: `Closed Deal: ${s.packageName}`,
        description: `Client: ${s.client.businessName}`,
        date: s.saleDate,
      });
    });

    recentFollowups.forEach((f) => {
      timeline.push({
        id: `fu-${f.id}`,
        type: "FOLLOW_UP",
        title: `Follow-up ${f.status.replace(/_/g, " ")}`,
        description: `With ${f.lead?.businessName || f.client?.businessName || "Client"}: ${f.notes || "Follow-up schedule"}`,
        date: f.scheduledAt,
      });
    });

    recentReports.forEach((r) => {
      timeline.push({
        id: `rep-${r.id}`,
        type: "REPORT",
        title: `Daily Work Report ${r.status}`,
        description: `Report for ${new Date(r.reportingDate).toLocaleDateString("en-IN")}`,
        date: r.updatedAt,
      });
    });

    timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    // 10. Funnel Breakdown for this executive
    const allAssignedLeads = await prisma.lead.findMany({
      where: { assignedToId: targetUserId },
      select: { status: true },
    });

    const funnel = {
      newLeads: allAssignedLeads.length,
      contacted: allAssignedLeads.filter((l) => l.status !== "NEW").length,
      qualified: allAssignedLeads.filter((l) =>
        ["QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)
      ).length,
      meetings: allAssignedLeads.filter((l) =>
        ["MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)
      ).length,
      proposals: allAssignedLeads.filter((l) =>
        ["PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"].includes(l.status)
      ).length,
      dealsClosed,
      paidClients,
    };

    return NextResponse.json({
      employee: {
        id: targetUserId,
        name: session.id === targetUserId ? session.name : "Employee",
      },
      kpis: {
        callsMadeToday,
        connectedCallsToday,
        unansweredCallsToday,
        newLeadsAddedToday: leadsToday.length,
        followupsCompletedToday,
        followupsPending,
        followupsOverdue,
        qualifiedLeadsPeriod,
        meetingsScheduled,
        dealsClosed,
        paidClients,
        revenueGeneratedPaise: revenueGeneratedPaise.toString(),
        amountCollectedPaise: amountCollectedPaise.toString(),
        pendingPaymentsPaise: pendingPaymentsPaise.toString(),
      },
      targets: {
        targetPaidClients,
        paidClientsAchieved: paidClients,
        remainingClients,
        clientTargetAchievementPct,
        targetSalesValuePaise: targetSalesValuePaise.toString(),
        revenueTargetAchievementPct,
        targetCalls,
      },
      packageBreakdown: Object.entries(packageStats).map(([name, data]) => ({
        name,
        count: data.count,
        totalPaise: data.totalPaise.toString(),
      })),
      funnel,
      timeline: timeline.slice(0, 10),
    });
  } catch (error) {
    console.error("Executive dashboard error:", error);
    return NextResponse.json({ error: "Failed to load executive dashboard data" }, { status: 500 });
  }
}
