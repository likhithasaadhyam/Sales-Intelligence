import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise, calculateNetCollections, calculateOutstanding } from "@/lib/financials";
import { getDateRangeFilter, DateRangePreset } from "@/lib/date-utils";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rangePreset = (searchParams.get("range") || "thisMonth") as DateRangePreset;
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const paymentStatus = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    const { startDate, endDate } = getDateRangeFilter(rangePreset, customStart, customEnd);

    let whereClause: any = {
      saleDate: { gte: startDate, lte: endDate },
    };

    if (session.role === "SALES_EXECUTIVE") {
      whereClause.employeeId = session.id;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      whereClause.paymentStatus = paymentStatus;
    }

    const [sales, allOpenLeads, allVerifiedPaymentsInPeriod, allRefundsInPeriod] = await Promise.all([
      prisma.sale.findMany({
        where: whereClause,
        include: {
          client: true,
          employee: { select: { id: true, name: true, email: true } },
          payments: true,
          refunds: true,
        },
        orderBy: { saleDate: "desc" },
      }),
      // Pipeline Value = Sum of estimated values of open opportunities
      prisma.lead.findMany({
        where: {
          status: { in: ["QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION"] },
          ...(session.role === "SALES_EXECUTIVE" ? { assignedToId: session.id } : {}),
        },
        select: { estimatedDealValuePaise: true },
      }),
      // Verified payments in period
      prisma.paymentTransaction.findMany({
        where: {
          verificationStatus: "VERIFIED",
          paymentDate: { gte: startDate, lte: endDate },
          ...(session.role === "SALES_EXECUTIVE" ? { recordedById: session.id } : {}),
        },
        select: { amountPaise: true },
      }),
      // Verified refunds in period
      prisma.refund.findMany({
        where: {
          verificationStatus: "VERIFIED",
          processedAt: { gte: startDate, lte: endDate },
        },
        select: { amountPaise: true },
      }),
    ]);

    // Financial Metrics Calculation (Integer Paise)
    let pipelineValuePaise = 0n;
    for (const lead of allOpenLeads) {
      pipelineValuePaise += lead.estimatedDealValuePaise;
    }

    let revenueGeneratedPaise = 0n;
    for (const sale of sales) {
      revenueGeneratedPaise += sale.finalDealValuePaise;
    }

    let verifiedPaymentsPaise = 0n;
    for (const p of allVerifiedPaymentsInPeriod) {
      verifiedPaymentsPaise += p.amountPaise;
    }

    let refundsPaise = 0n;
    for (const r of allRefundsInPeriod) {
      refundsPaise += r.amountPaise;
    }

    const netCollectionsPaise = calculateNetCollections(verifiedPaymentsPaise, refundsPaise);
    const outstandingReceivablesPaise = calculateOutstanding(revenueGeneratedPaise, verifiedPaymentsPaise);

    const paidClientsCount = sales.filter((s) => s.paymentStatus === "PAID").length;

    return NextResponse.json({
      sales: sales.map((s) => {
        let verifiedSalePaymentsPaise = 0n;
        for (const p of s.payments) {
          if (p.verificationStatus === "VERIFIED") {
            verifiedSalePaymentsPaise += p.amountPaise;
          }
        }
        const saleOutstanding = calculateOutstanding(s.finalDealValuePaise, verifiedSalePaymentsPaise);

        return {
          ...s,
          totalContractValuePaise: s.totalContractValuePaise.toString(),
          discountPaise: s.discountPaise.toString(),
          finalDealValuePaise: s.finalDealValuePaise.toString(),
          verifiedPaymentsTotalPaise: verifiedSalePaymentsPaise.toString(),
          outstandingAmountPaise: saleOutstanding.toString(),
          payments: s.payments.map((p) => ({
            ...p,
            amountPaise: p.amountPaise.toString(),
          })),
        };
      }),
      metrics: {
        pipelineValuePaise: pipelineValuePaise.toString(),
        dealsClosed: sales.length,
        revenueGeneratedPaise: revenueGeneratedPaise.toString(),
        amountCollectedPaise: verifiedPaymentsPaise.toString(),
        refundsPaise: refundsPaise.toString(),
        netCollectionsPaise: netCollectionsPaise.toString(),
        outstandingReceivablesPaise: outstandingReceivablesPaise.toString(),
        paidClientsCount,
      },
    });
  } catch (error) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales records" }, { status: 500 });
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
      clientName,
      clientContact,
      clientPhone,
      clientEmail,
      clientCity,
      clientState,
      packageName,
      totalContractValueRupees,
      discountRupees = 0,
      paymentStatus = "PENDING",
      nextPaymentDueDate,
      invoiceNumber,
      notes,
    } = body;

    if (!clientName || !packageName || !totalContractValueRupees) {
      return NextResponse.json({ error: "Client name, package, and contract value are required" }, { status: 400 });
    }

    const contractPaise = rupeesToPaise(totalContractValueRupees);
    const discountPaise = rupeesToPaise(discountRupees);
    const finalDealValuePaise = contractPaise - discountPaise;

    // Find or create Client record
    let client = await prisma.client.findFirst({
      where: {
        businessName: { equals: clientName.trim() },
      },
    });

    if (!client) {
      const clientCount = await prisma.client.count();
      const clientNumber = `CLI-2026-${String(clientCount + 1).padStart(4, "0")}`;

      client = await prisma.client.create({
        data: {
          clientNumber,
          businessName: clientName.trim(),
          contactPerson: clientContact?.trim() || clientName.trim(),
          phone: clientPhone?.trim() || "+91 99999 00000",
          email: clientEmail?.trim() || null,
          city: clientCity?.trim() || null,
          state: clientState?.trim() || null,
        },
      });
    }

    const saleCount = await prisma.sale.count();
    const saleNumber = `SAL-2026-${String(saleCount + 1).padStart(4, "0")}`;

    const newSale = await prisma.sale.create({
      data: {
        saleNumber,
        leadId: leadId || null,
        clientId: client.id,
        employeeId: session.id,
        packageName,
        saleDate: new Date(),
        totalContractValuePaise: contractPaise,
        discountPaise,
        finalDealValuePaise,
        paymentStatus,
        nextPaymentDueDate: nextPaymentDueDate ? new Date(nextPaymentDueDate) : null,
        invoiceNumber: invoiceNumber?.trim() || `INV-2026-${String(saleCount + 1).padStart(4, "0")}`,
        notes: notes?.trim() || null,
      },
      include: {
        client: true,
      },
    });

    // If linked to lead, mark lead as CONVERTED
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "CONVERTED" },
      });
    }

    await recordAuditLog({
      actorId: session.id,
      action: "CREATE",
      entityType: "SALE",
      entityId: newSale.id,
      details: {
        saleNumber,
        clientName: client.businessName,
        packageName,
        finalDealValuePaise: finalDealValuePaise.toString(),
        paymentStatus,
      },
    });

    return NextResponse.json({
      success: true,
      sale: {
        ...newSale,
        totalContractValuePaise: newSale.totalContractValuePaise.toString(),
        discountPaise: newSale.discountPaise.toString(),
        finalDealValuePaise: newSale.finalDealValuePaise.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    return NextResponse.json({ error: "Failed to record sale" }, { status: 500 });
  }
}
