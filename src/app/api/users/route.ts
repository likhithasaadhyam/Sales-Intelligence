import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const users = await prisma.user.findMany({
      include: {
        profile: { include: { team: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        employeeCode: u.profile?.employeeCode || "—",
        territory: u.profile?.territory || "—",
        team: u.profile?.team?.name || "General",
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN" || error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const { id, role, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(status && { status }),
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "USER",
      entityId: id,
      details: { role, status },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN" || error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
