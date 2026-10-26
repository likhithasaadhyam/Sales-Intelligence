import { NextResponse } from "../../../lib/next-compat";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/financials";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        calls: {
          orderBy: { callDateTime: "desc" },
          include: { employee: { select: { name: true } } },
        },
        followUps: {
          orderBy: { scheduledAt: "desc" },
          include: { employee: { select: { name: true } } },
        },
        meetings: {
          orderBy: { scheduledAt: "desc" },
          include: { employee: { select: { name: true } } },
        },
        sales: {
          include: { payments: true },
        },
        assignments: {
          orderBy: { transferredAt: "desc" },
          include: {
            previousEmployee: { select: { name: true } },
            newEmployee: { select: { name: true } },
            assignedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Role check: Sales Executive can only access their assigned leads
    if (session.role === "SALES_EXECUTIVE" && lead.assignedToId !== session.id) {
      return NextResponse.json({ error: "Forbidden: You are not assigned to this lead" }, { status: 403 });
    }

    return NextResponse.json({
      lead: {
        ...lead,
        estimatedDealValuePaise: lead.estimatedDealValuePaise.toString(),
        sales: lead.sales.map((s) => ({
          ...s,
          totalContractValuePaise: s.totalContractValuePaise.toString(),
          discountPaise: s.discountPaise.toString(),
          finalDealValuePaise: s.finalDealValuePaise.toString(),
          payments: s.payments.map((p) => ({
            ...p,
            amountPaise: p.amountPaise.toString(),
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Fetch lead detail error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (session.role === "SALES_EXECUTIVE" && existingLead.assignedToId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      businessName,
      contactPerson,
      phone,
      email,
      status,
      temperature,
      packageInterested,
      notes,
      estimatedDealValueRupees,
      nextFollowUpDate,
    } = body;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(businessName && { businessName }),
        ...(contactPerson && { contactPerson }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(status && { status }),
        ...(temperature && { temperature }),
        ...(packageInterested && { packageInterested }),
        ...(notes !== undefined && { notes }),
        ...(estimatedDealValueRupees !== undefined && {
          estimatedDealValuePaise: rupeesToPaise(estimatedDealValueRupees),
        }),
        ...(nextFollowUpDate !== undefined && {
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        }),
        lastContactDate: new Date(),
      },
    });

    await recordAuditLog({
      actorId: session.id,
      action: "UPDATE",
      entityType: "LEAD",
      entityId: id,
      details: {
        previousStatus: existingLead.status,
        newStatus: status || existingLead.status,
        previousTemperature: existingLead.temperature,
        newTemperature: temperature || existingLead.temperature,
      },
    });

    return NextResponse.json({
      success: true,
      lead: {
        ...updated,
        estimatedDealValuePaise: updated.estimatedDealValuePaise.toString(),
      },
    });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
