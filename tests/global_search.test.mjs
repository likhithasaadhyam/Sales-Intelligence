import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mirror of the search logic in /api/search with RBAC support
async function executeGlobalSearch(q, session) {
  const trimmed = q?.trim() || "";
  if (trimmed.length < 2) {
    return {
      query: trimmed,
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
    };
  }

  const isExecutive = session.role === "SALES_EXECUTIVE";
  const limit = 5;

  const [leads, clients, sales, reports, employees, calls, followUps, payments] = await Promise.all([
    // 1. Leads
    prisma.lead.findMany({
      where: {
        ...(isExecutive ? { assignedToId: session.id } : {}),
        OR: [
          { businessName: { contains: trimmed } },
          { contactPerson: { contains: trimmed } },
          { phone: { contains: trimmed } },
          { email: { contains: trimmed } },
          { leadNumber: { contains: trimmed } },
          { packageInterested: { contains: trimmed } },
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
    }),

    // 2. Clients
    prisma.client.findMany({
      where: {
        OR: [
          { businessName: { contains: trimmed } },
          { contactPerson: { contains: trimmed } },
          { phone: { contains: trimmed } },
          { email: { contains: trimmed } },
          { clientNumber: { contains: trimmed } },
          { city: { contains: trimmed } },
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
    }),

    // 3. Sales Records
    prisma.sale.findMany({
      where: {
        ...(isExecutive ? { employeeId: session.id } : {}),
        OR: [
          { saleNumber: { contains: trimmed } },
          { packageName: { contains: trimmed } },
          { invoiceNumber: { contains: trimmed } },
          { client: { businessName: { contains: trimmed } } },
        ],
      },
      take: limit,
      select: {
        id: true,
        saleNumber: true,
        packageName: true,
        finalDealValuePaise: true,
        paymentStatus: true,
        client: { select: { businessName: true } },
        employee: { select: { name: true } },
      },
    }),

    // 4. Daily Work Reports
    prisma.dailyWorkReport.findMany({
      where: {
        ...(isExecutive ? { employeeId: session.id } : {}),
        OR: [
          { employee: { name: { contains: trimmed } } },
          { mainActivities: { contains: trimmed } },
          { packageSold: { contains: trimmed } },
          { status: { contains: trimmed } },
        ],
      },
      take: limit,
      select: {
        id: true,
        reportingDate: true,
        status: true,
        employee: { select: { id: true, name: true } },
      },
    }),

    // 5. Employees / Team Members
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: trimmed } },
          { email: { contains: trimmed } },
          { profile: { employeeCode: { contains: trimmed } } },
          { profile: { territory: { contains: trimmed } } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),

    // 6. Calls
    prisma.callLog.findMany({
      where: {
        ...(isExecutive ? { employeeId: session.id } : {}),
        OR: [
          { callNumber: { contains: trimmed } },
          { outcome: { contains: trimmed } },
          { notes: { contains: trimmed } },
          { lead: { businessName: { contains: trimmed } } },
        ],
      },
      take: limit,
      select: {
        id: true,
        callNumber: true,
        outcome: true,
        employee: { select: { name: true } },
      },
    }),

    // 7. Follow-ups
    prisma.followUp.findMany({
      where: {
        ...(isExecutive ? { employeeId: session.id } : {}),
        OR: [
          { notes: { contains: trimmed } },
          { status: { contains: trimmed } },
          { lead: { businessName: { contains: trimmed } } },
        ],
      },
      take: limit,
      select: {
        id: true,
        status: true,
        notes: true,
        employee: { select: { name: true } },
      },
    }),

    // 8. Payments
    prisma.paymentTransaction.findMany({
      where: {
        ...(isExecutive ? { recordedById: session.id } : {}),
        OR: [
          { transactionNumber: { contains: trimmed } },
          { transactionReference: { contains: trimmed } },
          { paymentMethod: { contains: trimmed } },
          { client: { businessName: { contains: trimmed } } },
        ],
      },
      take: limit,
      select: {
        id: true,
        transactionNumber: true,
        transactionReference: true,
        amountPaise: true,
        paymentMethod: true,
        client: { select: { businessName: true } },
      },
    }),
  ]);

  const formattedSales = sales.map((s) => ({
    ...s,
    finalDealValuePaise: s.finalDealValuePaise.toString(),
  }));

  const formattedPayments = payments.map((p) => ({
    ...p,
    amountPaise: p.amountPaise.toString(),
  }));

  const total =
    leads.length +
    clients.length +
    formattedSales.length +
    reports.length +
    employees.length +
    calls.length +
    followUps.length +
    formattedPayments.length;

  return {
    query: trimmed,
    total,
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
  };
}

test("Global Search - Admin Session: Search for employee 'Rushika'", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  assert.ok(admin, "Super admin user must exist");

  const variations = ["rushika", "Rushika", "RUSHIKA", "  rushika  "];
  for (const q of variations) {
    const res = await executeGlobalSearch(q, admin);
    assert.ok(res.total > 0, `Search for '${q}' should return results`);
    assert.ok(res.results.employees.length > 0, `Should find Rushika in employees`);
    const emp = res.results.employees.find((e) => e.name.toLowerCase().includes("rushika"));
    assert.ok(emp, "Rushika employee object found");
  }
});

test("Global Search - Lead and Client searches across modules", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

  // Get a real lead from DB
  const sampleLead = await prisma.lead.findFirst();
  assert.ok(sampleLead, "Sample lead must exist");

  const leadQuery = sampleLead.businessName.slice(0, 5);
  const leadRes = await executeGlobalSearch(leadQuery, admin);
  assert.ok(leadRes.total > 0, `Searching '${leadQuery}' should find records`);
  assert.ok(
    leadRes.results.leads.some((l) => l.businessName.toLowerCase().includes(leadQuery.toLowerCase())),
    "Found lead with matching business name"
  );

  // Get a real client from DB
  const sampleClient = await prisma.client.findFirst();
  assert.ok(sampleClient, "Sample client must exist");

  const clientQuery = sampleClient.businessName.slice(0, 5);
  const clientRes = await executeGlobalSearch(clientQuery, admin);
  assert.ok(clientRes.total > 0, `Searching '${clientQuery}' should find records`);
  assert.ok(
    clientRes.results.clients.some((c) => c.businessName.toLowerCase().includes(clientQuery.toLowerCase())),
    "Found client with matching business name"
  );
});

test("Global Search - Search for Payment reference / transaction number", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  const samplePayment = await prisma.paymentTransaction.findFirst();
  assert.ok(samplePayment, "Sample payment must exist");

  const refPart = samplePayment.transactionReference.slice(0, 6);
  const res = await executeGlobalSearch(refPart, admin);
  assert.ok(res.total > 0, `Searching payment reference '${refPart}' should return result`);
  assert.ok(
    res.results.payments.some((p) => p.transactionReference.includes(refPart)),
    "Matching payment transaction found"
  );
});

test("Global Search - Nonexistent query returns 0 results cleanly", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  const res = await executeGlobalSearch("xyz_totally_nonexistent_query_99999", admin);
  assert.strictEqual(res.total, 0, "Nonexistent query should yield total 0");
  assert.strictEqual(res.results.leads.length, 0);
  assert.strictEqual(res.results.clients.length, 0);
  assert.strictEqual(res.results.sales.length, 0);
  assert.strictEqual(res.results.reports.length, 0);
  assert.strictEqual(res.results.employees.length, 0);
  assert.strictEqual(res.results.payments.length, 0);
});

test("Global Search - Minimum length guard (< 2 chars)", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  const singleChar = await executeGlobalSearch("a", admin);
  assert.strictEqual(singleChar.total, 0);
  const whitespaceOnly = await executeGlobalSearch("    ", admin);
  assert.strictEqual(whitespaceOnly.total, 0);
});

test("Global Search - RBAC isolation between Sales Executives", async () => {
  // Find two distinct sales executives
  const execs = await prisma.user.findMany({
    where: { role: "SALES_EXECUTIVE" },
    take: 2,
  });

  if (execs.length >= 2) {
    const [exec1, exec2] = execs;

    // Create a distinct lead assigned specifically to exec1
    const testName = `ExecOneSpecial_${Date.now()}`;
    const lead1 = await prisma.lead.create({
      data: {
        leadNumber: `LD-TEST-${Date.now()}`,
        businessName: testName,
        contactPerson: "Private Person",
        phone: "9876543210",
        email: `private1_${Date.now()}@example.com`,
        source: "COLD_CALL",
        packageInterested: "DIAMOND",
        assignedTo: { connect: { id: exec1.id } },
        createdBy: { connect: { id: exec1.id } },
      },
    });

    try {
      // Exec1 searching for testName MUST find it
      const searchExec1 = await executeGlobalSearch(testName, exec1);
      assert.ok(
        searchExec1.results.leads.some((l) => l.id === lead1.id),
        "Exec1 must find their own assigned lead"
      );

      // Exec2 searching for testName MUST NOT find it (RBAC isolation)
      const searchExec2 = await executeGlobalSearch(testName, exec2);
      assert.ok(
        !searchExec2.results.leads.some((l) => l.id === lead1.id),
        "Exec2 must NOT see Exec1's assigned lead"
      );
    } finally {
      await prisma.lead.delete({ where: { id: lead1.id } }).catch(() => {});
    }
  }
});
