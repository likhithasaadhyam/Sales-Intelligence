import { NextResponse } from "../../lib/next-compat";
import { getSession, requireRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { recordAuditLog } from "../../lib/audit";
import { rupeesToPaise } from "../../lib/financials";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { pricePaise: "asc" },
    });

    return NextResponse.json({
      packages: packages.map((p) => ({
        ...p,
        pricePaise: p.pricePaise.toString(),
      })),
    });
  } catch (error) {
    console.error("Fetch packages error:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const { name, code, priceRupees, description } = await req.json();

    if (!name || !code || !priceRupees) {
      return NextResponse.json({ error: "Name, code, and price are required" }, { status: 400 });
    }

    const pricePaise = rupeesToPaise(priceRupees);

    const pkg = await prisma.package.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        pricePaise,
        description: description?.trim() || null,
        isActive: true,
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "CREATE",
      entityType: "PACKAGE",
      entityId: pkg.id,
      details: { name, code, priceRupees },
    });

    return NextResponse.json({
      success: true,
      package: {
        ...pkg,
        pricePaise: pkg.pricePaise.toString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN" || error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }
    console.error("Create package error:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireRole(["SUPER_ADMIN"]);
    const { id, name, priceRupees, isActive, description } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(priceRupees !== undefined && { pricePaise: rupeesToPaise(priceRupees) }),
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "PACKAGE",
      entityId: id,
      details: { name, priceRupees, isActive },
    });

    return NextResponse.json({
      success: true,
      package: {
        ...updated,
        pricePaise: updated.pricePaise.toString(),
      },
    });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN" || error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Update package error:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}
