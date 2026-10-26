import { NextResponse } from "../../lib/next-compat";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/financials";

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN", "ADMIN_MANAGER"]);
    const { saleId, paymentTransactionId, amountRupees, reason } = await req.json();

    if (!saleId || !amountRupees || !reason) {
      return NextResponse.json({ error: "Sale ID, amount, and reason are required" }, { status: 400 });
    }

    const amountPaise = rupeesToPaise(amountRupees);
    const refundNumber = `REF-2026-${Date.now().toString().slice(-6)}`;

    const refund = await prisma.refund.create({
      data: {
        refundNumber,
        saleId,
        paymentTransactionId: paymentTransactionId || null,
        amountPaise,
        reason: reason.trim(),
        processedById: actor.id,
        verificationStatus: "VERIFIED",
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "SALE",
      entityId: saleId,
      details: { action: "REFUND_PROCESSED", refundNumber, amountPaise: amountPaise.toString(), reason },
    });

    return NextResponse.json({
      success: true,
      refund: {
        ...refund,
        amountPaise: refund.amountPaise.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Process refund error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
