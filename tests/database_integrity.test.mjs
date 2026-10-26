import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test("Database integrity: Required roles exist", async () => {
  const roles = await prisma.systemRole.findMany();
  const codes = roles.map((r) => r.code);
  assert.ok(codes.includes("SUPER_ADMIN"));
  assert.ok(codes.includes("ADMIN_MANAGER"));
  assert.ok(codes.includes("SALES_EXECUTIVE"));
});

test("Database integrity: Initial 6 sales executives exist in database", async () => {
  const requiredExecutives = ["Teja", "Narendra", "Rushika", "Surendra", "Pujitha", "Gowtham"];
  const users = await prisma.user.findMany({
    where: { role: "SALES_EXECUTIVE" },
    select: { name: true, email: true },
  });

  const names = users.map((u) => u.name);
  for (const reqName of requiredExecutives) {
    assert.ok(names.includes(reqName), `Executive ${reqName} must exist in database`);
  }
});

test("Database integrity: Configurable standard packages exist in integer paise", async () => {
  const pkgs = await prisma.package.findMany({ where: { isActive: true } });
  const codes = pkgs.map((p) => p.code);

  assert.ok(codes.includes("PKG-25K"));
  assert.ok(codes.includes("PKG-35K"));
  assert.ok(codes.includes("PKG-45K"));

  const pkg25 = pkgs.find((p) => p.code === "PKG-25K");
  assert.equal(pkg25.pricePaise, 2500000n, "₹25,000 must be stored as 2,500,000 paise");

  const pkg35 = pkgs.find((p) => p.code === "PKG-35K");
  assert.equal(pkg35.pricePaise, 3500000n, "₹35,000 must be stored as 3,500,000 paise");

  const pkg45 = pkgs.find((p) => p.code === "PKG-45K");
  assert.equal(pkg45.pricePaise, 4500000n, "₹45,000 must be stored as 4,500,000 paise");
});

test("Database integrity: Team monthly targets match sales plan", async () => {
  const teamTarget = await prisma.salesTarget.findFirst({
    where: { teamId: { not: null }, periodType: "MONTHLY" },
  });

  assert.ok(teamTarget, "Team monthly target must be configured in database");
  assert.equal(teamTarget.targetPaidClients, 180, "Team target must be 180 paid clients");
  assert.equal(teamTarget.targetSalesValuePaise, 570000000n, "Team target sales value must be ₹57,00,000 (570,000,000 paise)");
  assert.equal(teamTarget.package25kCount, 90);
  assert.equal(teamTarget.package35kCount, 60);
  assert.equal(teamTarget.package45kCount, 30);
});

test.after(async () => {
  await prisma.$disconnect();
});
