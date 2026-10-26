import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");

    let whereClause: any = {};
    if (action && action !== "ALL") whereClause.action = action;
    if (entityType && entityType !== "ALL") whereClause.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN" || error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden: Super Admin authorization required to view audit logs" }, { status: 403 });
    }
    console.error("Fetch audit logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
