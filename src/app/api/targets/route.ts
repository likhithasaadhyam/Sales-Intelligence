import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/financials";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const period = searchParams.get("period");

    const targets = await prisma.salesTarget.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(period ? { periodType: period } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({
      targets: targets.map((t) => ({
        ...t,
        targetSalesValuePaise: t.targetSalesValuePaise.toString(),
        targetCollectionsPaise: t.targetCollectionsPaise.toString(),
      })),
    });
  } catch (error) {
    console.error("Targets get error:", error);
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN", "ADMIN_MANAGER"]);
    const body = await req.json();

    const {
      employeeId,
      teamId,
      periodType = "MONTHLY",
      targetCalls = 1200,
      targetLeads = 240,
      targetFollowUps = 480,
      targetPaidClients = 30,
      targetSalesValueRupees = 950000,
      targetCollectionsRupees = 950000,
      package25kCount = 15,
      package35kCount = 10,
      package45kCount = 5,
      startDate,
      endDate,
    } = body;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const targetSalesValuePaise = rupeesToPaise(targetSalesValueRupees);
    const targetCollectionsPaise = rupeesToPaise(targetCollectionsRupees);

    const target = await prisma.salesTarget.create({
      data: {
        employeeId: employeeId || null,
        teamId: teamId || null,
        periodType,
        targetCalls: Number(targetCalls),
        targetLeads: Number(targetLeads),
        targetFollowUps: Number(targetFollowUps),
        targetPaidClients: Number(targetPaidClients),
        targetSalesValuePaise,
        targetCollectionsPaise,
        package25kCount: Number(package25kCount),
        package35kCount: Number(package35kCount),
        package45kCount: Number(package45kCount),
        startDate: start,
        endDate: end,
        createdById: actor.id,
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "CREATE",
      entityType: "TARGET",
      entityId: target.id,
      details: {
        employeeId,
        teamId,
        periodType,
        targetPaidClients,
        targetSalesValueRupees,
      },
    });

    return NextResponse.json({
      success: true,
      target: {
        ...target,
        targetSalesValuePaise: target.targetSalesValuePaise.toString(),
        targetCollectionsPaise: target.targetCollectionsPaise.toString(),
      },
    });
  } catch (error) {
    console.error("Targets post error:", error);
    return NextResponse.json({ error: "Failed to configure target" }, { status: 500 });
  }
}
