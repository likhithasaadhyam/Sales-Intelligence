import { NextResponse } from "../../lib/next-compat";
import { getSession } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { recordAuditLog } from "../../lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const outcome = searchParams.get("outcome");

    let whereClause: any = {};

    // Role-based isolation
    if (session.role === "SALES_EXECUTIVE") {
      whereClause.employeeId = session.id;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== "ALL") whereClause.callStatus = status;
    if (outcome && outcome !== "ALL") whereClause.outcome = outcome;

    const calls = await prisma.callLog.findMany({
      where: whereClause,
      include: {
        lead: {
          select: { id: true, leadNumber: true, businessName: true, contactPerson: true, phone: true },
        },
        client: {
          select: { id: true, clientNumber: true, businessName: true, contactPerson: true, phone: true },
        },
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { callDateTime: "desc" },
    });

    // Compute call metrics
    const totalCalls = calls.length;
    const connectedCalls = calls.filter((c) => c.callStatus === "CONNECTED").length;
    const unansweredCalls = calls.filter((c) => c.callStatus !== "CONNECTED").length;
    const totalDurationSeconds = calls.reduce((acc, c) => acc + c.durationSeconds, 0);
    const avgDurationSeconds = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
    const qualifiedOutcomes = calls.filter((c) => ["QUALIFIED", "CONVERTED", "MEETING_SCHEDULED"].includes(c.outcome)).length;

    return NextResponse.json({
      calls,
      metrics: {
        totalCalls,
        connectedCalls,
        unansweredCalls,
        avgDurationSeconds,
        qualifiedOutcomes,
        connectionRate: totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Fetch calls error:", error);
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      leadId,
      callDirection = "OUTBOUND",
      callStatus,
      durationMinutes = 0,
      durationSeconds = 0,
      outcome,
      followUpRequired = false,
      nextFollowUpDate,
      notes,
    } = body;

    if (!leadId || !callStatus || !outcome) {
      return NextResponse.json({ error: "Lead, call status, and outcome are required" }, { status: 400 });
    }

    // Check lead assignment
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (session.role === "SALES_EXECUTIVE" && lead.assignedToId !== session.id) {
      return NextResponse.json({ error: "Forbidden: You are not assigned to this lead" }, { status: 403 });
    }

    const totalDuration = Number(durationMinutes) * 60 + Number(durationSeconds);
    const callCount = await prisma.callLog.count();
    const callNumber = `CAL-2026-${String(callCount + 1).padStart(4, "0")}`;

    const newCall = await prisma.callLog.create({
      data: {
        callNumber,
        leadId,
        employeeId: session.id,
        callDirection,
        callStatus: callStatus.trim(),
        durationSeconds: totalDuration,
        outcome: outcome.trim(),
        followUpRequired: Boolean(followUpRequired),
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        notes: notes?.trim() || null,
      },
    });

    // Update lead's lastContactDate and optionally update status
    let newLeadStatus = lead.status;
    if (outcome === "QUALIFIED") newLeadStatus = "QUALIFIED";
    else if (outcome === "MEETING_SCHEDULED") newLeadStatus = "MEETING_SCHEDULED";
    else if (outcome === "NOT_INTERESTED") newLeadStatus = "NOT_INTERESTED";
    else if (callStatus === "CONNECTED" && lead.status === "NEW") newLeadStatus = "CONTACTED";

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastContactDate: new Date(),
        status: newLeadStatus,
        ...(nextFollowUpDate && { nextFollowUpDate: new Date(nextFollowUpDate) }),
      },
    });

    // Auto-create Follow-up record if followUpRequired is checked
    if (followUpRequired && nextFollowUpDate) {
      await prisma.followUp.create({
        data: {
          leadId,
          employeeId: session.id,
          scheduledAt: new Date(nextFollowUpDate),
          status: "PENDING",
          notes: `Follow-up from call #${callNumber}: ${outcome}`,
        },
      });
    }

    await recordAuditLog({
      actorId: session.id,
      action: "CREATE",
      entityType: "LEAD",
      entityId: leadId,
      details: { callNumber, outcome, callStatus, durationSeconds: totalDuration },
    });

    return NextResponse.json({ success: true, call: newCall }, { status: 201 });
  } catch (error) {
    console.error("Create call log error:", error);
    return NextResponse.json({ error: "Failed to record call log" }, { status: 500 });
  }
}
