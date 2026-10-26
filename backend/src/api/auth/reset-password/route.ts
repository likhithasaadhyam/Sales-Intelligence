import { NextResponse } from "../../../lib/next-compat";
import { prisma } from "../../../lib/prisma";
import { hashPassword } from "../../../lib/auth";
import { recordAuditLog } from "../../../lib/audit";

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return success without revealing user existence (security best practice)
      return NextResponse.json({ success: true, message: "If the account exists, the password has been reset." });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await recordAuditLog({
      actorId: user.id,
      action: "UPDATE",
      entityType: "USER",
      entityId: user.id,
      details: { action: "PASSWORD_RESET", email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. You may now log in.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
