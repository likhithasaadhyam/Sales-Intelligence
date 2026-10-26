import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    let whereClause: any = {};
    if (session.role === "SALES_EXECUTIVE") {
      whereClause.employeeId = session.id;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    // Auto-identify overdue follow-ups: PENDING and scheduled in the past
    const now = new Date();
    await prisma.followUp.updateMany({
      where: {
        status: "PENDING",
        scheduledAt: { lt: now },
      },
      data: {
        status: "OVERDUE",
      },
    });

    const followUps = await prisma.followUp.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            businessName: true,
            contactPerson: true,
            phone: true,
            status: true,
          },
        },
        client: {
          select: {
            id: true,
            clientNumber: true,
            businessName: true,
            contactPerson: true,
            phone: true,
          },
        },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const overdueCount = followUps.filter((f) => f.status === "OVERDUE").length;
    const pendingCount = followUps.filter((f) => f.status === "PENDING").length;
    const completedCount = followUps.filter((f) => f.status === "COMPLETED").length;

    return NextResponse.json({
      followUps,
      counts: {
        overdue: overdueCount,
        pending: pendingCount,
        completed: completedCount,
        total: followUps.length,
      },
    });
  } catch (error) {
    console.error("Fetch follow-ups error:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId, scheduledAt, notes } = await req.json();

    if (!leadId || !scheduledAt) {
      return NextResponse.json({ error: "Lead ID and scheduled date/time are required" }, { status: 400 });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        employeeId: session.id,
        scheduledAt: new Date(scheduledAt),
        status: "PENDING",
        notes: notes?.trim() || null,
      },
    });

    // Update lead's nextFollowUpDate
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUpDate: new Date(scheduledAt) },
    });

    return NextResponse.json({ success: true, followUp }, { status: 201 });
  } catch (error) {
    console.error("Create follow-up error:", error);
    return NextResponse.json({ error: "Failed to schedule follow-up" }, { status: 500 });
  }
}
