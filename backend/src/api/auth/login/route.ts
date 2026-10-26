import { NextResponse } from "../../../lib/next-compat";
import { cookies } from "../../../lib/next-compat";
import { prisma } from "../../../lib/prisma";
import { verifyPassword, signToken } from "../../../lib/auth";
import { recordAuditLog } from "../../../lib/audit";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "This account has been deactivated. Please contact Super Admin." }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "SUPER_ADMIN" | "ADMIN_MANAGER" | "SALES_EXECUTIVE",
      employeeCode: user.profile?.employeeCode,
      teamId: user.profile?.teamId,
    };

    const token = signToken(payload);

    cookies().set("mentneo_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    await recordAuditLog({
      actorId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
