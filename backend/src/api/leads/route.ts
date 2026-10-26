import { NextResponse } from "../../lib/next-compat";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/financials";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase();
    const status = searchParams.get("status");
    const temperature = searchParams.get("temperature");
    const source = searchParams.get("source");
    const assignedToId = searchParams.get("assignedToId");

    // Role-based scope
    let whereClause: any = {};

    if (session.role === "SALES_EXECUTIVE") {
      // Sales executive can strictly only access assigned leads
      whereClause.assignedToId = session.id;
    } else if (assignedToId) {
      whereClause.assignedToId = assignedToId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }
    if (temperature && temperature !== "ALL") {
      whereClause.temperature = temperature;
    }
    if (source && source !== "ALL") {
      whereClause.source = source;
    }

    if (search) {
      whereClause.OR = [
        { businessName: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { leadNumber: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      leads: leads.map((l) => ({
        ...l,
        estimatedDealValuePaise: l.estimatedDealValuePaise.toString(),
      })),
    });
  } catch (error) {
    console.error("Fetch leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
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
      businessName,
      contactPerson,
      phone,
      email,
      businessCategory,
      city,
      state,
      source = "WEBSITE",
      estimatedDealValueRupees = 25000,
      packageInterested = "Mentneo Starter Growth",
      temperature = "WARM",
      status = "NEW",
      notes,
      assignedToId,
    } = body;

    if (!businessName || !contactPerson || !phone) {
      return NextResponse.json({ error: "Business name, contact person, and phone are required" }, { status: 400 });
    }

    // Check duplicate phone number to prevent accidental duplicate leads
    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    const existing = await prisma.lead.findFirst({
      where: {
        phone: { contains: cleanPhone },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: `A lead with this phone number already exists: ${existing.businessName} (${existing.leadNumber})`,
      }, { status: 409 });
    }

    const leadCount = await prisma.lead.count();
    const leadNumber = `LD-2026-${String(leadCount + 1).padStart(3, "0")}`;

    const targetAssigneeId =
      session.role === "SALES_EXECUTIVE"
        ? session.id
        : assignedToId || session.id;

    const estimatedDealValuePaise = rupeesToPaise(estimatedDealValueRupees);

    const lead = await prisma.lead.create({
      data: {
        leadNumber,
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        businessCategory: businessCategory?.trim() || null,
        city: city?.trim() || null,
        source: source?.trim() || "OTHER",
        assignedToId: targetAssigneeId,
        createdById: session.id,
        estimatedDealValuePaise,
        packageInterested: packageInterested?.trim() || null,
        temperature,
        status,
        notes: notes?.trim() || null,
        lastContactDate: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      actorId: session.id,
      action: "CREATE",
      entityType: "LEAD",
      entityId: lead.id,
      details: { leadNumber, businessName, contactPerson, assignedTo: targetAssigneeId },
    });

    return NextResponse.json({
      success: true,
      lead: {
        ...lead,
        estimatedDealValuePaise: lead.estimatedDealValuePaise.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
