import { NextResponse } from "next/server";
import { getSession, requireRole, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { calculateAchievementPercentage } from "@/lib/financials";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "SALES_EXECUTIVE") {
      return NextResponse.json({ error: "Forbidden: Sales Executives cannot view sales team management" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase();

    // Query all Sales Executives with profiles
    const users = await prisma.user.findMany({
      where: {
        role: "SALES_EXECUTIVE",
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { profile: { employeeCode: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        profile: {
          include: { team: true },
        },
        salesTargets: {
          where: { periodType: "MONTHLY" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Compute live performance metrics for each employee
    const employees = await Promise.all(
      users.map(async (u) => {
        const [
          callsToday,
          callsConnectedToday,
          newLeadsToday,
          qualifiedLeads,
          followupsCompletedToday,
          meetingsScheduled,
          dealsClosed,
          paidSales,
          salesPeriod,
          verifiedPayments,
          todayReport,
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
            where: { employeeId: u.id, scheduledAt: { gte: monthStart, lte: todayEnd } },
          }),
          prisma.sale.count({
            where: { employeeId: u.id, saleDate: { gte: monthStart, lte: todayEnd } },
          }),
          prisma.sale.count({
            where: { employeeId: u.id, paymentStatus: "PAID", saleDate: { gte: monthStart, lte: todayEnd } },
          }),
          prisma.sale.findMany({
            where: { employeeId: u.id, saleDate: { gte: monthStart, lte: todayEnd } },
            select: { finalDealValuePaise: true },
          }),
          prisma.paymentTransaction.findMany({
            where: {
              recordedById: u.id,
              verificationStatus: "VERIFIED",
              paymentDate: { gte: monthStart, lte: todayEnd },
            },
            select: { amountPaise: true },
          }),
          prisma.dailyWorkReport.findFirst({
            where: { employeeId: u.id, reportingDate: todayStart },
            select: { status: true, submittedAt: true },
          }),
        ]);

        let revenueGeneratedPaise = 0n;
        for (const s of salesPeriod) {
          revenueGeneratedPaise += s.finalDealValuePaise;
        }

        let amountCollectedPaise = 0n;
        for (const p of verifiedPayments) {
          amountCollectedPaise += p.amountPaise;
        }

        const pendingPaymentsPaise =
          revenueGeneratedPaise > amountCollectedPaise
            ? revenueGeneratedPaise - amountCollectedPaise
            : 0n;

        const target = u.salesTargets[0];
        const monthlyTargetPaidClients = target?.targetPaidClients || 30;
        const targetAchievementPct = calculateAchievementPercentage(paidSales, monthlyTargetPaidClients);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          employeeCode: u.profile?.employeeCode || "—",
          territory: u.profile?.territory || "Unassigned",
          teamName: u.profile?.team?.name || "General Sales",
          callsToday,
          connectedCalls: callsConnectedToday,
          newLeads: newLeadsToday,
          qualifiedLeads,
          followupsCompleted: followupsCompletedToday,
          meetingsScheduled,
          dealsClosed,
          paidClients: paidSales,
          revenueGeneratedPaise: revenueGeneratedPaise.toString(),
          amountCollectedPaise: amountCollectedPaise.toString(),
          pendingPaymentsPaise: pendingPaymentsPaise.toString(),
          monthlyTarget: monthlyTargetPaidClients,
          targetAchievementPct,
          dailyReportStatus: todayReport ? todayReport.status : "MISSING",
        };
      })
    );

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Fetch employees error:", error);
    return NextResponse.json({ error: "Failed to fetch sales team data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const body = await req.json();
    const { name, email, employeeCode, territory, teamId, role = "SALES_EXECUTIVE" } = body;

    if (!name || !email || !employeeCode) {
      return NextResponse.json({ error: "Name, email, and employee code are required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    const defaultPasswordHash = await hashPassword("Password123!");

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: defaultPasswordHash,
        role,
        status: "ACTIVE",
        profile: {
          create: {
            employeeCode: employeeCode.trim(),
            name: name.trim(),
            territory: territory?.trim() || null,
            teamId: teamId || null,
            status: "ACTIVE",
          },
        },
      },
      include: { profile: true },
    });

    // Create default monthly target for new sales executive
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await prisma.salesTarget.create({
      data: {
        employeeId: newUser.id,
        periodType: "MONTHLY",
        targetCalls: 1200,
        targetLeads: 240,
        targetFollowUps: 480,
        targetPaidClients: 30,
        targetSalesValuePaise: 95000000n, // ₹9,50,000
        targetCollectionsPaise: 95000000n,
        package25kCount: 15,
        package35kCount: 10,
        package45kCount: 5,
        startDate: startOfMonth,
        endDate: endOfMonth,
        createdById: actor.id,
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "CREATE",
      entityType: "USER",
      entityId: newUser.id,
      details: { name: newUser.name, email: newUser.email, code: employeeCode, role },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const body = await req.json();
    const { id, status, territory, name } = body;

    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(name && { name }),
        profile: {
          update: {
            ...(territory && { territory }),
            ...(status && { status }),
            ...(name && { name }),
          },
        },
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "USER",
      entityId: id,
      details: { updatedFields: { status, territory, name } },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}
