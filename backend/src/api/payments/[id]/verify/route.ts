import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { formatINR } from "@/lib/financials";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole(["SUPER_ADMIN", "ADMIN_MANAGER"]);
    const { id } = params;
    const { status = "VERIFIED", notes } = await req.json();

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status must be VERIFIED or REJECTED" }, { status: 400 });
    }

    const payment = await prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        sale: {
          include: { payments: true },
        },
        client: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment transaction not found" }, { status: 404 });
    }

    // STRICT BUSINESS RULE: Two-Person Rule! Verifier cannot be the recorder.
    if (payment.recordedById === actor.id) {
      return NextResponse.json({
        error: "Forbidden: Employees cannot verify their own financial transactions. Another authorized manager or Super Admin must verify this payment.",
      }, { status: 403 });
    }

    // Update payment transaction state
    const updatedPayment = await prisma.paymentTransaction.update({
      where: { id },
      data: {
        verificationStatus: status,
        verifiedById: actor.id,
        verificationNotes: notes?.trim() || null,
        verifiedAt: new Date(),
      },
    });

    // If verified, recalculate the Sale's overall paymentStatus
    if (status === "VERIFIED") {
      let totalVerifiedForSale = 0n;
      for (const p of payment.sale.payments) {
        if (p.id === id || p.verificationStatus === "VERIFIED") {
          totalVerifiedForSale += p.amountPaise;
        }
      }

      const isFullyPaid = totalVerifiedForSale >= payment.sale.finalDealValuePaise;
      const nextSaleStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";

      await prisma.sale.update({
        where: { id: payment.saleId },
        data: {
          paymentStatus: nextSaleStatus,
        },
      });
    }

    // Send notification to the sales executive who recorded it
    await createNotification({
      userId: payment.recordedById,
      title: `Payment ${status}: ${payment.client.businessName}`,
      message: `Your recorded payment of ${formatINR(payment.amountPaise)} was ${status.toLowerCase()} by ${actor.name}.${notes ? ` Note: "${notes}"` : ""}`,
      type: "PAYMENT_VERIFIED",
      linkUrl: `/sales/collections`,
    });

    await recordAuditLog({
      actorId: actor.id,
      action: status === "VERIFIED" ? "VERIFY" : "REJECT",
      entityType: "PAYMENT",
      entityId: id,
      details: {
        transactionNumber: payment.transactionNumber,
        amountPaise: payment.amountPaise.toString(),
        client: payment.client.businessName,
        status,
        verifier: actor.name,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...updatedPayment,
        amountPaise: updatedPayment.amountPaise.toString(),
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Failed to verify payment transaction" }, { status: 500 });
  }
}
