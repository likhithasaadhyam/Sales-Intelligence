import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/financials";
import { notifyAdmins } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const verificationStatus = searchParams.get("status");

    let whereClause: any = {};
    if (session.role === "SALES_EXECUTIVE") {
      whereClause.recordedById = session.id;
    }

    if (verificationStatus && verificationStatus !== "ALL") {
      whereClause.verificationStatus = verificationStatus;
    }

    const payments = await prisma.paymentTransaction.findMany({
      where: whereClause,
      include: {
        sale: { select: { saleNumber: true, packageName: true, finalDealValuePaise: true } },
        client: { select: { id: true, clientNumber: true, businessName: true } },
        recordedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: "desc" },
    });

    // Compute verified vs unverified totals
    let verifiedTotalPaise = 0n;
    let pendingVerificationPaise = 0n;

    for (const p of payments) {
      if (p.verificationStatus === "VERIFIED") {
        verifiedTotalPaise += p.amountPaise;
      } else if (p.verificationStatus === "PENDING") {
        pendingVerificationPaise += p.amountPaise;
      }
    }

    return NextResponse.json({
      payments: payments.map((p) => ({
        ...p,
        amountPaise: p.amountPaise.toString(),
        sale: {
          ...p.sale,
          finalDealValuePaise: p.sale.finalDealValuePaise.toString(),
        },
      })),
      summary: {
        verifiedTotalPaise: verifiedTotalPaise.toString(),
        pendingVerificationPaise: pendingVerificationPaise.toString(),
        totalTransactions: payments.length,
      },
    });
  } catch (error) {
    console.error("Fetch payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
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
      saleId,
      amountRupees,
      paymentMethod = "UPI",
      transactionReference,
      paymentDate,
    } = body;

    if (!saleId || !amountRupees || !transactionReference) {
      return NextResponse.json({ error: "Sale, amount, and transaction reference are required" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { client: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const amountPaise = rupeesToPaise(amountRupees);
    const txnNumber = `TXN-2026-${Date.now().toString().slice(-6)}`;

    const newPayment = await prisma.paymentTransaction.create({
      data: {
        transactionNumber: txnNumber,
        saleId,
        clientId: sale.clientId,
        recordedById: session.id,
        amountPaise,
        paymentMethod,
        transactionReference: transactionReference.trim(),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        verificationStatus: "PENDING", // Strictly starts as PENDING until verified by admin/manager!
      },
    });

    // Notify admins to verify this payment
    await notifyAdmins(
      "Payment Verification Required",
      `${session.name} recorded a payment of ₹${amountRupees} from ${sale.client.businessName} (Ref: ${transactionReference}).`,
      "/sales/verification"
    );

    await recordAuditLog({
      actorId: session.id,
      action: "CREATE",
      entityType: "PAYMENT",
      entityId: newPayment.id,
      details: {
        transactionNumber: txnNumber,
        amountPaise: amountPaise.toString(),
        paymentMethod,
        reference: transactionReference,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...newPayment,
        amountPaise: newPayment.amountPaise.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
