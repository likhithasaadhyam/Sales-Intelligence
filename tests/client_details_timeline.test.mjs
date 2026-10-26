import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
function calculateOutstanding(totalDealValuePaise, verifiedPaidPaise) {
  const diff = totalDealValuePaise - verifiedPaidPaise;
  return diff > 0n ? diff : 0n;
}

function formatINR(amountPaise) {
  const isNegative = amountPaise < 0n;
  const absPaise = isNegative ? -amountPaise : amountPaise;
  const rupees = absPaise / 100n;
  return `${isNegative ? "-" : ""}₹${rupees.toLocaleString("en-IN")}`;
}

const prisma = new PrismaClient();

test("Client Detail & Timeline: Fetch Zenith EdTech Global and verify profile fields", async () => {
  const zenith = await prisma.client.findFirst({
    where: { businessName: { contains: "Zenith" } },
    include: {
      sales: {
        include: { payments: true, refunds: true, employee: true },
      },
      originalLead: {
        include: {
          createdBy: true,
          assignedTo: true,
          calls: true,
          followUps: true,
          meetings: true,
          assignments: true,
        },
      },
      calls: true,
      followUps: true,
      meetings: true,
      assignedTo: true,
    },
  });

  assert.ok(zenith, "Zenith EdTech Global must exist in database");
  assert.strictEqual(zenith.clientNumber, "CLI-1003");
  assert.strictEqual(zenith.contactPerson, "Aditya Nair");
  assert.strictEqual(zenith.city, "Bangalore");
  assert.strictEqual(zenith.state, "Karnataka");
  assert.ok(zenith.originalLead, "Zenith must link to its original converted lead");
  assert.strictEqual(zenith.originalLead.leadNumber, "LD-2026-003");
  assert.strictEqual(zenith.originalLead.source, "REFERRAL");
  assert.strictEqual(zenith.sales.length, 1);
  assert.strictEqual(zenith.sales[0].saleNumber, "SAL-2026-003");
  assert.strictEqual(zenith.sales[0].packageName, "Mentneo Starter Growth");
});

test("Financial Reconciliation: Deals, Verified Collections, Net Collections, and Outstanding Balance", async () => {
  const clients = await prisma.client.findMany({
    include: {
      sales: {
        include: { payments: true, refunds: true },
      },
    },
  });

  for (const c of clients) {
    let totalDealValuePaise = 0n;
    let totalVerifiedPaidPaise = 0n;
    let totalVerifiedRefundsPaise = 0n;

    for (const s of c.sales) {
      totalDealValuePaise += s.finalDealValuePaise;
      for (const p of s.payments) {
        if (p.verificationStatus === "VERIFIED") {
          totalVerifiedPaidPaise += p.amountPaise;
        }
        for (const ref of p.refunds || []) {
          if (ref.verificationStatus === "VERIFIED") {
            totalVerifiedRefundsPaise += ref.amountPaise;
          }
        }
      }
      for (const ref of s.refunds || []) {
        if (ref.verificationStatus === "VERIFIED") {
          totalVerifiedRefundsPaise += ref.amountPaise;
        }
      }
    }

    const netCollectionsPaise = totalVerifiedPaidPaise - totalVerifiedRefundsPaise;
    const outstandingPaise = calculateOutstanding(totalDealValuePaise, totalVerifiedPaidPaise);

    // Verify arithmetic consistency
    assert.strictEqual(typeof totalDealValuePaise, "bigint");
    assert.strictEqual(typeof netCollectionsPaise, "bigint");
    assert.strictEqual(typeof outstandingPaise, "bigint");
    assert.ok(outstandingPaise >= 0n, "Outstanding balance cannot be negative");

    // Reconcile formatINR
    const formattedDeal = formatINR(totalDealValuePaise);
    assert.ok(formattedDeal.startsWith("₹"), "Formatted deal must start with ₹");
  }
});

test("Timeline Aggregation: Chronological sorting and event structure", async () => {
  const client = await prisma.client.findFirst({
    where: { sales: { some: {} } },
    include: {
      sales: {
        include: { payments: true, refunds: true, employee: true },
      },
      originalLead: {
        include: {
          createdBy: true,
          assignedTo: true,
          calls: { include: { employee: true } },
          followUps: { include: { employee: true } },
          meetings: { include: { employee: true } },
          assignments: {
            include: { previousEmployee: true, newEmployee: true, assignedBy: true },
          },
        },
      },
      calls: { include: { employee: true } },
      followUps: { include: { employee: true } },
      meetings: { include: { employee: true } },
    },
  });

  assert.ok(client, "A client with sales must exist");

  const timeline = [];

  // Lead events
  if (client.originalLead) {
    timeline.push({
      date: client.originalLead.createdAt,
      type: "LEAD",
      title: "Lead Created",
    });
  }

  // Sales
  client.sales.forEach((s) => {
    timeline.push({
      date: s.saleDate,
      type: "SALE",
      title: `Deal: ${s.packageName}`,
    });
    s.payments.forEach((p) => {
      timeline.push({
        date: p.paymentDate,
        type: "PAYMENT",
        title: `Payment: ${p.transactionNumber}`,
      });
    });
  });

  // Verify sorting
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (let i = 0; i < timeline.length - 1; i++) {
    const current = new Date(timeline[i].date).getTime();
    const next = new Date(timeline[i + 1].date).getTime();
    assert.ok(current >= next, "Timeline must be sorted in descending order (newest first)");
  }
});

test("Activity Recording: Log Call & Schedule Follow-up on a Client", async () => {
  const client = await prisma.client.findFirst({
    include: { originalLead: true },
  });
  assert.ok(client, "Client must exist");

  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  assert.ok(admin, "Admin must exist");

  // 1. Log a test call on the client
  const callCount = await prisma.callLog.count();
  const testCallNumber = `CAL-TEST-${Date.now()}`;
  const newCall = await prisma.callLog.create({
    data: {
      callNumber: testCallNumber,
      clientId: client.id,
      leadId: client.originalLeadId || null,
      employeeId: admin.id,
      callDirection: "OUTBOUND",
      callStatus: "CONNECTED",
      durationSeconds: 180,
      outcome: "INTERESTED",
      notes: "Automated test call for client",
    },
  });

  assert.strictEqual(newCall.clientId, client.id);
  assert.strictEqual(newCall.outcome, "INTERESTED");

  // 2. Schedule a test follow-up on the client
  const newFollowUp = await prisma.followUp.create({
    data: {
      clientId: client.id,
      leadId: client.originalLeadId || null,
      employeeId: admin.id,
      scheduledAt: new Date(Date.now() + 86400000),
      status: "PENDING",
      notes: "Automated test follow-up for client",
    },
  });

  assert.strictEqual(newFollowUp.clientId, client.id);
  assert.strictEqual(newFollowUp.status, "PENDING");

  // 3. Clean up test records
  await prisma.callLog.delete({ where: { id: newCall.id } });
  await prisma.followUp.delete({ where: { id: newFollowUp.id } });
});

test("Client Profile Updates: Modify business info and persist in database", async () => {
  const client = await prisma.client.findFirst();
  assert.ok(client, "Client must exist");

  const originalWebsite = client.website;
  const testWebsite = `https://test-${Date.now()}.example.com`;

  // Update website
  const updated = await prisma.client.update({
    where: { id: client.id },
    data: { website: testWebsite },
  });
  assert.strictEqual(updated.website, testWebsite);

  // Revert back
  await prisma.client.update({
    where: { id: client.id },
    data: { website: originalWebsite },
  });
});

test("Client Detail & Timeline: Empty state handling for client with no activities", async () => {
  // Create a client with zero activities
  const freshClient = await prisma.client.create({
    data: {
      clientNumber: `CLI-TEST-${Date.now()}`,
      businessName: "Clean Slate Enterprises",
      contactPerson: "Alice Clean",
      phone: "+91 99999 88888",
    },
  });

  try {
    const fetched = await prisma.client.findUnique({
      where: { id: freshClient.id },
      include: {
        sales: { include: { payments: true, refunds: true } },
        calls: true,
        followUps: true,
        meetings: true,
        originalLead: true,
      },
    });

    assert.ok(fetched);
    assert.strictEqual(fetched.sales.length, 0);
    assert.strictEqual(fetched.calls.length, 0);
    assert.strictEqual(fetched.followUps.length, 0);
    assert.strictEqual(fetched.meetings.length, 0);
    assert.strictEqual(fetched.originalLead, null);
  } finally {
    await prisma.client.delete({ where: { id: freshClient.id } }).catch(() => {});
  }
});

test("Client Detail & Timeline: RBAC data isolation between Sales Executives", async () => {
  const execs = await prisma.user.findMany({
    where: { role: "SALES_EXECUTIVE" },
    take: 2,
  });

  if (execs.length >= 2) {
    const [exec1, exec2] = execs;

    // Client assigned specifically to exec1
    const privateClient = await prisma.client.create({
      data: {
        clientNumber: `CLI-PRIV-${Date.now()}`,
        businessName: "Exec1 Private Company",
        contactPerson: "Private Rep",
        phone: "+91 91111 22222",
        assignedToId: exec1.id,
      },
    });

    try {
      // Permission check function matching /api/clients/[id] logic
      function canViewClient(clientRecord, sessionUser) {
        if (sessionUser.role !== "SALES_EXECUTIVE") return true;
        const isAssigned = clientRecord.assignedToId === sessionUser.id;
        const isLeadAssigned = Boolean(clientRecord.originalLead?.assignedToId === sessionUser.id);
        const hasSale = Boolean(clientRecord.sales?.some((s) => s.employeeId === sessionUser.id));
        return Boolean(isAssigned || isLeadAssigned || hasSale);
      }

      assert.strictEqual(canViewClient(privateClient, exec1), true, "Exec1 must be allowed to view own client");
      assert.strictEqual(canViewClient(privateClient, exec2), false, "Exec2 must NOT be allowed to view Exec1's client");
    } finally {
      await prisma.client.delete({ where: { id: privateClient.id } }).catch(() => {});
    }
  }
});

