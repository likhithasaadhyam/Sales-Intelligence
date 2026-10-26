import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    // Require at least 2 characters to trigger search
    if (q.length < 2) {
      return NextResponse.json({
        query: q,
        total: 0,
        results: {
          leads: [],
          clients: [],
          sales: [],
          reports: [],
          employees: [],
          calls: [],
          followUps: [],
          payments: [],
        },
      });
    }

    const isExecutive = session.role === "SALES_EXECUTIVE";
    const limit = 5;

    // Execute parallel Prisma queries with RBAC constraints
    const [leads, clients, sales, reports, employees, calls, followUps, payments] = await Promise.all([
      // 1. Leads
      prisma.lead.findMany({
        where: {
          ...(isExecutive ? { assignedToId: session.id } : {}),
          OR: [
            { businessName: { contains: q } },
            { contactPerson: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
            { leadNumber: { contains: q } },
            { packageInterested: { contains: q } },
          ],
        },
        take: limit,
        select: {
          id: true,
          leadNumber: true,
          businessName: true,
          contactPerson: true,
          phone: true,
          status: true,
          assignedTo: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),

      // 2. Clients
      prisma.client.findMany({
        where: {
          OR: [
            { businessName: { contains: q } },
            { contactPerson: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
            { clientNumber: { contains: q } },
            { city: { contains: q } },
          ],
        },
        take: limit,
        select: {
          id: true,
          clientNumber: true,
          businessName: true,
          contactPerson: true,
          phone: true,
          city: true,
        },
        orderBy: { updatedAt: "desc" },
      }),

      // 3. Sales Records
      prisma.sale.findMany({
        where: {
          ...(isExecutive ? { employeeId: session.id } : {}),
          OR: [
            { saleNumber: { contains: q } },
            { packageName: { contains: q } },
            { invoiceNumber: { contains: q } },
            { client: { businessName: { contains: q } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          saleNumber: true,
          packageName: true,
          finalDealValuePaise: true,
          paymentStatus: true,
          saleDate: true,
          client: { select: { businessName: true } },
          employee: { select: { name: true } },
        },
        orderBy: { saleDate: "desc" },
      }),

      // 4. Daily Work Reports
      prisma.dailyWorkReport.findMany({
        where: {
          ...(isExecutive ? { employeeId: session.id } : {}),
          OR: [
            { employee: { name: { contains: q } } },
            { mainActivities: { contains: q } },
            { packageSold: { contains: q } },
            { status: { contains: q } },
          ],
        },
        take: limit,
        select: {
          id: true,
          reportingDate: true,
          status: true,
          callsMade: true,
          dealsClosed: true,
          packageSold: true,
          employee: { select: { id: true, name: true } },
        },
        orderBy: { reportingDate: "desc" },
      }),

      // 5. Employees / Team Members
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { profile: { employeeCode: { contains: q } } },
            { profile: { territory: { contains: q } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: {
            select: {
              employeeCode: true,
              territory: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),

      // 6. Call Activity
      prisma.callLog.findMany({
        where: {
          ...(isExecutive ? { employeeId: session.id } : {}),
          OR: [
            { callNumber: { contains: q } },
            { outcome: { contains: q } },
            { notes: { contains: q } },
            { lead: { businessName: { contains: q } } },
            { lead: { contactPerson: { contains: q } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          callNumber: true,
          outcome: true,
          callStatus: true,
          callDateTime: true,
          lead: { select: { id: true, businessName: true, contactPerson: true } },
          employee: { select: { name: true } },
        },
        orderBy: { callDateTime: "desc" },
      }),

      // 7. Follow-ups
      prisma.followUp.findMany({
        where: {
          ...(isExecutive ? { employeeId: session.id } : {}),
          OR: [
            { notes: { contains: q } },
            { status: { contains: q } },
            { lead: { businessName: { contains: q } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          notes: true,
          lead: { select: { id: true, businessName: true } },
          employee: { select: { name: true } },
        },
        orderBy: { scheduledAt: "desc" },
      }),

      // 8. Payments (Subject to RBAC: executive only sees their own collections)
      prisma.paymentTransaction.findMany({
        where: {
          ...(isExecutive ? { recordedById: session.id } : {}),
          OR: [
            { transactionNumber: { contains: q } },
            { transactionReference: { contains: q } },
            { paymentMethod: { contains: q } },
            { client: { businessName: { contains: q } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          transactionNumber: true,
          transactionReference: true,
          amountPaise: true,
          paymentMethod: true,
          verificationStatus: true,
          paymentDate: true,
          client: { select: { businessName: true } },
        },
        orderBy: { paymentDate: "desc" },
      }),
    ]);

    // Format BigInt values to string for JSON serialization
    const formattedSales = sales.map((s) => ({
      ...s,
      finalDealValuePaise: s.finalDealValuePaise.toString(),
    }));

    const formattedPayments = payments.map((p) => ({
      ...p,
      amountPaise: p.amountPaise.toString(),
    }));

    const totalCount =
      leads.length +
      clients.length +
      formattedSales.length +
      reports.length +
      employees.length +
      calls.length +
      followUps.length +
      formattedPayments.length;

    return NextResponse.json({
      query: q,
      total: totalCount,
      results: {
        leads,
        clients,
        sales: formattedSales,
        reports,
        employees,
        calls,
        followUps,
        payments: formattedPayments,
      },
    });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json({ error: "Failed to perform global search" }, { status: 500 });
  }
}
