import { NextResponse } from "../../../../lib/next-compat";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole(["SUPER_ADMIN", "ADMIN_MANAGER"]);
    const { id } = params;
    const { newEmployeeId, reason } = await req.json();

    if (!newEmployeeId) {
      return NextResponse.json({ error: "New employee ID is required" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const previousEmployeeId = lead.assignedToId;

    // Perform database transaction for lead transfer and audit record
    const [updatedLead, transferRecord] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: { assignedToId: newEmployeeId },
      }),
      prisma.leadAssignment.create({
        data: {
          leadId: id,
          previousEmployeeId,
          newEmployeeId,
          assignedById: actor.id,
          reason: reason?.trim() || "Lead re-assigned by sales management",
        },
      }),
    ]);

    // Send notification to the new assignee
    await createNotification({
      userId: newEmployeeId,
      title: "New Lead Assigned",
      message: `You have been assigned lead: ${lead.businessName} (${lead.leadNumber})`,
      type: "LEAD_ASSIGNED",
      linkUrl: `/crm/leads/${id}`,
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "TRANSFER",
      entityType: "LEAD",
      entityId: id,
      details: {
        leadNumber: lead.leadNumber,
        previousEmployeeId,
        newEmployeeId,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      lead: {
        ...updatedLead,
        estimatedDealValuePaise: updatedLead.estimatedDealValuePaise.toString(),
      },
      transferRecord,
    });
  } catch (error) {
    console.error("Lead transfer error:", error);
    return NextResponse.json({ error: "Failed to transfer lead" }, { status: 500 });
  }
}
