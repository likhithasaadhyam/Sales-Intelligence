import { NextResponse } from "../../../lib/next-compat";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAchievementPercentage } from "@/lib/financials";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Enforce role isolation: Sales Executive can only access their own profile
    if (session.role === "SALES_EXECUTIVE" && session.id !== id) {
      return NextResponse.json({ error: "Forbidden: Cannot access other employee profile" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: { include: { team: true } },
        salesTargets: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        calls: {
          orderBy: { callDateTime: "desc" },
          take: 10,
          include: { lead: { select: { businessName: true, contactPerson: true } } },
        },
        sales: {
          orderBy: { saleDate: "desc" },
          take: 10,
          include: { client: { select: { businessName: true } } },
        },
        dailyReports: {
          orderBy: { reportingDate: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Compute month-to-date aggregates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [totalCalls, totalLeads, closedSales, verifiedPayments] = await Promise.all([
      prisma.callLog.count({ where: { employeeId: id, callDateTime: { gte: monthStart } } }),
      prisma.lead.count({ where: { assignedToId: id } }),
      prisma.sale.findMany({ where: { employeeId: id, saleDate: { gte: monthStart } } }),
      prisma.paymentTransaction.findMany({
        where: { recordedById: id, verificationStatus: "VERIFIED", paymentDate: { gte: monthStart } },
      }),
    ]);

    let revenuePaise = 0n;
    for (const s of closedSales) revenuePaise += s.finalDealValuePaise;

    let collectedPaise = 0n;
    for (const p of verifiedPayments) collectedPaise += p.amountPaise;

    const activeTarget = user.salesTargets[0];
    const targetClients = activeTarget?.targetPaidClients || 30;
    const paidClientsCount = closedSales.filter((s) => s.paymentStatus === "PAID").length;

    return NextResponse.json({
      employee: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        employeeCode: user.profile?.employeeCode || "—",
        territory: user.profile?.territory || "Unassigned",
        team: user.profile?.team?.name || "General Inside Sales",
        joiningDate: user.profile?.joiningDate,
      },
      stats: {
        totalCalls,
        totalLeads,
        dealsClosed: closedSales.length,
        paidClients: paidClientsCount,
        revenueGeneratedPaise: revenuePaise.toString(),
        amountCollectedPaise: collectedPaise.toString(),
        targetPaidClients: targetClients,
        targetAchievementPct: calculateAchievementPercentage(paidClientsCount, targetClients),
      },
      targets: user.salesTargets,
      recentCalls: user.calls,
      recentSales: user.sales,
      dailyReports: user.dailyReports,
    });
  } catch (error) {
    console.error("Employee detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
