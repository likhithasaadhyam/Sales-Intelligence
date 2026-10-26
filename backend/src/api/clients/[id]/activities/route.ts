import { NextResponse } from "../../../../lib/next-compat";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = params.id;
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { originalLead: true, sales: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Role check: Executive can only record activities for clients assigned to them or their sales
    if (session.role === "SALES_EXECUTIVE") {
      const isAssigned = client.assignedToId === session.id;
      const isLeadAssigned = client.originalLead?.assignedToId === session.id;
      const hasSale = client.sales.some((s) => s.employeeId === session.id);
      if (!isAssigned && !isLeadAssigned && !hasSale) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { activityType } = body;

    if (activityType === "CALL") {
      const {
        callDirection = "OUTBOUND",
        callStatus = "CONNECTED",
        durationMinutes = 0,
        durationSeconds = 0,
        outcome = "INTERESTED",
        followUpRequired = false,
        nextFollowUpDate,
        notes,
      } = body;

      const totalDuration = Number(durationMinutes) * 60 + Number(durationSeconds);
      const callCount = await prisma.callLog.count();
      const callNumber = `CAL-2026-${String(callCount + 1).padStart(4, "0")}`;

      const call = await prisma.callLog.create({
        data: {
          callNumber,
          clientId: client.id,
          leadId: client.originalLeadId || null,
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

      await recordAuditLog({
        actorId: session.id,
        action: "CREATE",
        entityType: "CLIENT",
        entityId: call.id,
        details: { clientId: client.id, activity: "CALL", outcome, callNumber },
      });

      return NextResponse.json({ success: true, activity: call }, { status: 201 });
    }

    if (activityType === "FOLLOW_UP") {
      const { scheduledAt, notes } = body;
      if (!scheduledAt) {
        return NextResponse.json({ error: "Scheduled date/time is required" }, { status: 400 });
      }

      const followUp = await prisma.followUp.create({
        data: {
          clientId: client.id,
          leadId: client.originalLeadId || null,
          employeeId: session.id,
          scheduledAt: new Date(scheduledAt),
          status: "PENDING",
          notes: notes?.trim() || null,
        },
      });

      await recordAuditLog({
        actorId: session.id,
        action: "CREATE",
        entityType: "CLIENT",
        entityId: followUp.id,
        details: { clientId: client.id, activity: "FOLLOW_UP", scheduledAt },
      });

      return NextResponse.json({ success: true, activity: followUp }, { status: 201 });
    }

    if (activityType === "MEETING") {
      const { title, scheduledAt, agenda, notes } = body;
      if (!title || !scheduledAt) {
        return NextResponse.json({ error: "Meeting title and scheduled date are required" }, { status: 400 });
      }

      const meeting = await prisma.meeting.create({
        data: {
          clientId: client.id,
          leadId: client.originalLeadId || null,
          employeeId: session.id,
          title: title.trim(),
          scheduledAt: new Date(scheduledAt),
          status: "SCHEDULED",
          agenda: agenda?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      await recordAuditLog({
        actorId: session.id,
        action: "CREATE",
        entityType: "CLIENT",
        entityId: meeting.id,
        details: { clientId: client.id, activity: "MEETING", title, scheduledAt },
      });

      return NextResponse.json({ success: true, activity: meeting }, { status: 201 });
    }

    if (activityType === "NOTE") {
      const { notes } = body;
      if (!notes) {
        return NextResponse.json({ error: "Note content is required" }, { status: 400 });
      }

      const updated = await prisma.client.update({
        where: { id: client.id },
        data: { notes: notes.trim() },
      });

      await recordAuditLog({
        actorId: session.id,
        action: "UPDATE",
        entityType: "CLIENT",
        entityId: client.id,
        details: { action: "NOTE_UPDATED" },
      });

      return NextResponse.json({ success: true, client: updated }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  } catch (error) {
    console.error("Create client activity error:", error);
    return NextResponse.json({ error: "Failed to record client activity" }, { status: 500 });
  }
}
