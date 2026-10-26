import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { status = "COMPLETED", outcome, notes } = await req.json();

    const followUp = await prisma.followUp.findUnique({ where: { id } });
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (session.role === "SALES_EXECUTIVE" && followUp.employeeId !== session.id) {
      return NextResponse.json({ error: "Forbidden: Not your follow-up" }, { status: 403 });
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status,
        outcome: outcome?.trim() || null,
        notes: notes ? `${followUp.notes ? followUp.notes + "\n" : ""}${notes}` : followUp.notes,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    await recordAuditLog({
      actorId: session.id,
      action: "UPDATE",
      entityType: "LEAD",
      entityId: followUp.leadId,
      details: { action: "FOLLOWUP_COMPLETED", followUpId: id, status, outcome },
    });

    return NextResponse.json({ success: true, followUp: updated });
  } catch (error) {
    console.error("Update follow-up error:", error);
    return NextResponse.json({ error: "Failed to update follow-up" }, { status: 500 });
  }
}
