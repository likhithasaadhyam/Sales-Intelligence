import { NextResponse } from "../../lib/next-compat";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { calculateOutstanding } from "@/lib/financials";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase();

    const clients = await prisma.client.findMany({
      where: search
        ? {
            OR: [
              { businessName: { contains: search } },
              { contactPerson: { contains: search } },
              { phone: { contains: search } },
              { clientNumber: { contains: search } },
            ],
          }
        : {},
      include: {
        sales: {
          include: { payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = clients.map((c) => {
      let totalDealValuePaise = 0n;
      let totalVerifiedPaidPaise = 0n;

      for (const s of c.sales) {
        totalDealValuePaise += s.finalDealValuePaise;
        for (const p of s.payments) {
          if (p.verificationStatus === "VERIFIED") {
            totalVerifiedPaidPaise += p.amountPaise;
          }
        }
      }

      const outstandingPaise = calculateOutstanding(totalDealValuePaise, totalVerifiedPaidPaise);

      return {
        id: c.id,
        clientNumber: c.clientNumber,
        businessName: c.businessName,
        contactPerson: c.contactPerson,
        phone: c.phone,
        email: c.email,
        city: c.city,
        state: c.state,
        totalDeals: c.sales.length,
        totalSpentPaise: totalDealValuePaise.toString(),
        totalCollectedPaise: totalVerifiedPaidPaise.toString(),
        outstandingPaise: outstandingPaise.toString(),
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({ clients: enriched });
  } catch (error) {
    console.error("Fetch clients error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessName, contactPerson, phone, email, city, state, address, gstNumber } = await req.json();

    if (!businessName || !contactPerson || !phone) {
      return NextResponse.json({ error: "Business name, contact person, and phone are required" }, { status: 400 });
    }

    const count = await prisma.client.count();
    const clientNumber = `CLI-2026-${String(count + 1).padStart(4, "0")}`;

    const client = await prisma.client.create({
      data: {
        clientNumber,
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
      },
    });

    await recordAuditLog({
      actorId: session.id,
      action: "CREATE",
      entityType: "USER",
      entityId: client.id,
      details: { clientNumber, businessName },
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
