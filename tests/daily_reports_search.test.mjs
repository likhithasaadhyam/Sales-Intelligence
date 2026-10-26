import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper matching client-side filter logic implemented in DailyReportsListingPage
function filterDailyReports(reports, searchQuery, statusFilter = "ALL") {
  const q = searchQuery.trim().toLowerCase();
  return reports.filter((report) => {
    // 1. Status Filter
    if (statusFilter !== "ALL" && report.status !== statusFilter) {
      return false;
    }

    // 2. Search Query (Sales Executive name, date, status, notes)
    if (!q) return true;

    const employeeName = (report.employee?.name || "").toLowerCase();
    const employeeEmail = (report.employee?.email || "").toLowerCase();
    const statusText = (report.status || "").toLowerCase();
    const activities = (report.mainActivities || "").toLowerCase();
    const conversations = (report.clientConversations || "").toLowerCase();

    return (
      employeeName.includes(q) ||
      employeeEmail.includes(q) ||
      statusText.includes(q) ||
      activities.includes(q) ||
      conversations.includes(q)
    );
  });
}

test("Search logic: 'rushika', 'Rushika', and 'RUSHIKA' return only Rushika's reports", async () => {
  const reports = await prisma.dailyWorkReport.findMany({
    include: { employee: true },
  });

  assert.ok(reports.length >= 2, "Expected at least 2 reports in the database");

  const variations = ["rushika", "Rushika", "RUSHIKA", "  rushika  ", "  RUSHIKA  "];
  for (const query of variations) {
    const results = filterDailyReports(reports, query, "ALL");
    assert.ok(results.length > 0, `Query '${query}' should return at least 1 report`);
    for (const r of results) {
      assert.strictEqual(
        r.employee.name.toLowerCase(),
        "rushika",
        `Query '${query}' returned non-Rushika report: ${r.employee.name}`
      );
      assert.notStrictEqual(r.employee.name, "Teja");
      assert.notStrictEqual(r.employee.name, "Narendra");
    }
  }
});

test("Search logic: 'teja' returns only Teja's reports and excludes Narendra and Rushika", async () => {
  const reports = await prisma.dailyWorkReport.findMany({
    include: { employee: true },
  });

  const results = filterDailyReports(reports, "teja", "ALL");
  assert.ok(results.length > 0, "Query 'teja' should return at least 1 report");
  for (const r of results) {
    assert.strictEqual(r.employee.name.toLowerCase(), "teja");
    assert.notStrictEqual(r.employee.name, "Narendra");
    assert.notStrictEqual(r.employee.name, "Rushika");
  }
});

test("Search logic: Unmatched search returns 0 results for empty state", async () => {
  const reports = await prisma.dailyWorkReport.findMany({
    include: { employee: true },
  });

  const results = filterDailyReports(reports, "nonexistent_employee_xyz", "ALL");
  assert.strictEqual(results.length, 0, "Unmatched search should return 0 results");
});

test("Search logic: Empty search restores all reports under selected status", async () => {
  const reports = await prisma.dailyWorkReport.findMany({
    include: { employee: true },
  });

  const allResults = filterDailyReports(reports, "", "ALL");
  assert.strictEqual(allResults.length, reports.length);

  const whitespaceResults = filterDailyReports(reports, "    ", "ALL");
  assert.strictEqual(whitespaceResults.length, reports.length);
});

test("Search logic: Combined status filter and search query", async () => {
  const reports = await prisma.dailyWorkReport.findMany({
    include: { employee: true },
  });

  // Rushika is SUBMITTED
  const rushikaSubmitted = filterDailyReports(reports, "rushika", "SUBMITTED");
  assert.ok(rushikaSubmitted.length > 0);
  assert.strictEqual(rushikaSubmitted[0].employee.name, "Rushika");

  // Rushika is NOT APPROVED -> should return 0
  const rushikaApproved = filterDailyReports(reports, "rushika", "APPROVED");
  assert.strictEqual(rushikaApproved.length, 0);

  // Narendra is APPROVED
  const narendraApproved = filterDailyReports(reports, "narendra", "APPROVED");
  assert.ok(narendraApproved.length > 0);
  assert.strictEqual(narendraApproved[0].employee.name, "Narendra");
});

test("Database Server Query: Prisma OR filter matches search param safely", async () => {
  const rushikaDbReports = await prisma.dailyWorkReport.findMany({
    where: {
      OR: [
        { employee: { name: { contains: "rushika" } } },
        { employee: { email: { contains: "rushika" } } },
        { mainActivities: { contains: "rushika" } },
      ],
    },
    include: { employee: true },
  });

  assert.ok(rushikaDbReports.length > 0);
  for (const r of rushikaDbReports) {
    assert.strictEqual(r.employee.name, "Rushika");
  }

  const tejaDbReports = await prisma.dailyWorkReport.findMany({
    where: {
      OR: [
        { employee: { name: { contains: "teja" } } },
        { employee: { email: { contains: "teja" } } },
        { mainActivities: { contains: "teja" } },
      ],
    },
    include: { employee: true },
  });

  assert.ok(tejaDbReports.length > 0);
  for (const r of tejaDbReports) {
    assert.strictEqual(r.employee.name, "Teja");
  }
});
