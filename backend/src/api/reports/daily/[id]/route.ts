import { NextResponse } from "../../../../lib/next-compat";
import { getSession } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { recordAuditLog } from "../../../../lib/audit";
import { rupeesToPaise } from "../../../../lib/financials";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvals: {
          orderBy: { reviewedAt: "desc" },
          include: { reviewer: { select: { name: true } } },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Role check
    if (session.role === "SALES_EXECUTIVE" && report.employeeId !== session.id) {
      return NextResponse.json({ error: "Forbidden: Cannot view another employee report" }, { status: 403 });
    }

    return NextResponse.json({
      report: {
        ...report,
        dealValuePaise: report.dealValuePaise.toString(),
        revenueGeneratedPaise: report.revenueGeneratedPaise.toString(),
        amountCollectedPaise: report.amountCollectedPaise.toString(),
        amountUpiPaise: report.amountUpiPaise.toString(),
        amountBankTransferPaise: report.amountBankTransferPaise.toString(),
        amountCashPaise: report.amountCashPaise.toString(),
        amountGatewayPaise: report.amountGatewayPaise.toString(),
        pendingAmountPaise: report.pendingAmountPaise.toString(),
        refundsPaise: report.refundsPaise.toString(),
      },
    });
  } catch (error) {
    console.error("Fetch report detail error:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
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

    const existing = await prisma.dailyWorkReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (session.role === "SALES_EXECUTIVE" && existing.employeeId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If report is approved, only Super Admin can edit
    if (existing.status === "APPROVED" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Approved reports cannot be edited without Super Admin authorization" }, { status: 403 });
    }

    const updated = await prisma.dailyWorkReport.update({
      where: { id },
      data: {
        ...body,
        ...(body.status === "SUBMITTED" && { submittedAt: new Date() }),
      },
    });

    await recordAuditLog({
      actorId: session.id,
      action: "UPDATE",
      entityType: "REPORT",
      entityId: id,
      details: { previousStatus: existing.status, updatedStatus: updated.status },
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
