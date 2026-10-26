import { NextResponse } from "../../lib/next-compat";
import { getSession, requireRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { recordAuditLog } from "../../lib/audit";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsMap, list: settings });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    await recordAuditLog({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "SETTING",
      details: body,
    });

    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN" || error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }
    console.error("Save settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
