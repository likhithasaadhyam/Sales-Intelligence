import { NextResponse } from "../../../../../lib/next-compat";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole(["SUPER_ADMIN", "ADMIN_MANAGER"]);
    const { id } = params;
    const { status, feedback } = await req.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status must be either APPROVED or REJECTED" }, { status: 400 });
    }

    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Update report review state and create approval audit entry
    const [updatedReport] = await prisma.$transaction([
      prisma.dailyWorkReport.update({
        where: { id },
        data: {
          status,
          reviewerFeedback: feedback?.trim() || null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.reportApproval.create({
        data: {
          reportId: id,
          reviewerId: actor.id,
          status,
          feedback: feedback?.trim() || null,
        },
      }),
    ]);

    // Send notification to employee
    await createNotification({
      userId: report.employeeId,
      title: `Daily Work Report ${status}`,
      message: `Your report for ${new Date(report.reportingDate).toLocaleDateString("en-IN")} was ${status.toLowerCase()} by ${actor.name}.${feedback ? ` Feedback: "${feedback}"` : ""}`,
      type: status === "REJECTED" ? "REPORT_REJECTED" : "REPORT_DEADLINE",
      linkUrl: `/reports/daily`,
    });

    await recordAuditLog({
      actorId: actor.id,
      action: status === "APPROVED" ? "APPROVE" : "REJECT",
      entityType: "REPORT",
      entityId: id,
      details: {
        employeeName: report.employee.name,
        status,
        feedback,
      },
    });

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error("Report review error:", error);
    return NextResponse.json({ error: "Failed to review report" }, { status: 500 });
  }
}
