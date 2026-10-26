import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/financials";
import { createNotification, notifyAdmins } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    let whereClause: any = {};

    if (session.role === "SALES_EXECUTIVE") {
      whereClause.employeeId = session.id;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== "ALL") whereClause.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      whereClause.reportingDate = d;
    }

    const reports = await prisma.dailyWorkReport.findMany({
      where: whereClause,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { reportingDate: "desc" },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        ...r,
        dealValuePaise: r.dealValuePaise.toString(),
        revenueGeneratedPaise: r.revenueGeneratedPaise.toString(),
        amountCollectedPaise: r.amountCollectedPaise.toString(),
        amountUpiPaise: r.amountUpiPaise.toString(),
        amountBankTransferPaise: r.amountBankTransferPaise.toString(),
        amountCashPaise: r.amountCashPaise.toString(),
        amountGatewayPaise: r.amountGatewayPaise.toString(),
        pendingAmountPaise: r.pendingAmountPaise.toString(),
        refundsPaise: r.refundsPaise.toString(),
      })),
    });
  } catch (error) {
    console.error("Fetch reports error:", error);
    return NextResponse.json({ error: "Failed to fetch daily work reports" }, { status: 500 });
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
      reportingDate,
      action = "SUBMIT", // DRAFT or SUBMIT
      // Calls
      callsMade = 0,
      connectedCalls = 0,
      unansweredCalls = 0,
      interestedProspects = 0,
      followUpCalls = 0,
      whatsappFollowups = 0,
      meetingsScheduled = 0,
      // Leads
      newLeadsReceived = 0,
      newLeadsAdded = 0,
      leadsContacted = 0,
      qualifiedLeads = 0,
      hotLeads = 0,
      warmLeads = 0,
      coldLeads = 0,
      followupsCompleted = 0,
      // Sales
      proposalsSent = 0,
      meetingsCompleted = 0,
      negotiationsInProgress = 0,
      dealsClosed = 0,
      newClientsAcquired = 0,
      packageSold,
      dealValueRupees = 0,
      // Financials
      revenueGeneratedRupees = 0,
      amountCollectedRupees = 0,
      amountUpiRupees = 0,
      amountBankTransferRupees = 0,
      amountCashRupees = 0,
      amountGatewayRupees = 0,
      pendingAmountRupees = 0,
      refundsRupees = 0,
      // Qualitative
      mainActivities,
      clientConversations,
      challengesFaced,
      reasonMissedTargets,
      tomorrowPlan,
      additionalNotes,
    } = body;

    const repDate = reportingDate ? new Date(reportingDate) : new Date();
    repDate.setHours(0, 0, 0, 0);

    const status = action === "DRAFT" ? "DRAFT" : "SUBMITTED";

    const reportData = {
      callsMade: Number(callsMade),
      connectedCalls: Number(connectedCalls),
      unansweredCalls: Number(unansweredCalls),
      interestedProspects: Number(interestedProspects),
      followUpCalls: Number(followUpCalls),
      whatsappFollowups: Number(whatsappFollowups),
      meetingsScheduled: Number(meetingsScheduled),
      newLeadsReceived: Number(newLeadsReceived),
      newLeadsAdded: Number(newLeadsAdded),
      leadsContacted: Number(leadsContacted),
      qualifiedLeads: Number(qualifiedLeads),
      hotLeads: Number(hotLeads),
      warmLeads: Number(warmLeads),
      coldLeads: Number(coldLeads),
      followupsCompleted: Number(followupsCompleted),
      proposalsSent: Number(proposalsSent),
      meetingsCompleted: Number(meetingsCompleted),
      negotiationsInProgress: Number(negotiationsInProgress),
      dealsClosed: Number(dealsClosed),
      newClientsAcquired: Number(newClientsAcquired),
      packageSold: packageSold || null,
      dealValuePaise: rupeesToPaise(dealValueRupees),
      revenueGeneratedPaise: rupeesToPaise(revenueGeneratedRupees),
      amountCollectedPaise: rupeesToPaise(amountCollectedRupees),
      amountUpiPaise: rupeesToPaise(amountUpiRupees),
      amountBankTransferPaise: rupeesToPaise(amountBankTransferRupees),
      amountCashPaise: rupeesToPaise(amountCashRupees),
      amountGatewayPaise: rupeesToPaise(amountGatewayRupees),
      pendingAmountPaise: rupeesToPaise(pendingAmountRupees),
      refundsPaise: rupeesToPaise(refundsRupees),
      mainActivities: mainActivities?.trim() || null,
      clientConversations: clientConversations?.trim() || null,
      challengesFaced: challengesFaced?.trim() || null,
      reasonMissedTargets: reasonMissedTargets?.trim() || null,
      tomorrowPlan: tomorrowPlan?.trim() || null,
      additionalNotes: additionalNotes?.trim() || null,
      status,
      ...(status === "SUBMITTED" && { submittedAt: new Date() }),
    };

    // Upsert so if the user already has a draft for today, it saves or submits cleanly
    const report = await prisma.dailyWorkReport.upsert({
      where: {
        employeeId_reportingDate: {
          employeeId: session.id,
          reportingDate: repDate,
        },
      },
      update: reportData,
      create: {
        employeeId: session.id,
        reportingDate: repDate,
        ...reportData,
      },
    });

    if (status === "SUBMITTED") {
      await notifyAdmins(
        "New Daily Work Report Submitted",
        `${session.name} submitted their daily report for ${repDate.toLocaleDateString("en-IN")}.`,
        `/reports/daily`
      );
    }

    await recordAuditLog({
      actorId: session.id,
      action: status === "SUBMITTED" ? "CREATE" : "UPDATE",
      entityType: "REPORT",
      entityId: report.id,
      details: {
        action,
        reportingDate: repDate.toISOString(),
        callsMade,
        dealsClosed,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        dealValuePaise: report.dealValuePaise.toString(),
        revenueGeneratedPaise: report.revenueGeneratedPaise.toString(),
        amountCollectedPaise: report.amountCollectedPaise.toString(),
      },
    });
  } catch (error) {
    console.error("Create daily report error:", error);
    return NextResponse.json({ error: "Failed to submit daily work report" }, { status: 500 });
  }
}
