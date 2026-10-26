import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper replicating Select component custom value logic
const CUSTOM_OPTION_VALUE = "__CUSTOM__";

function resolveSelectState(standardOptions, currentValue, isCustomModeExplicit, customDraftText) {
  const standardSet = new Set(standardOptions);
  const isNonStandard =
    currentValue !== undefined &&
    currentValue !== "" &&
    currentValue !== null &&
    !standardSet.has(currentValue);

  const isCustomMode = isCustomModeExplicit || isNonStandard;
  const displayedSelectValue = isCustomMode ? CUSTOM_OPTION_VALUE : currentValue;
  const customText = isNonStandard && currentValue !== CUSTOM_OPTION_VALUE ? currentValue : customDraftText;

  return {
    isCustomMode,
    displayedSelectValue,
    customText,
    effectiveValue: isCustomMode ? customText.trim() : currentValue,
  };
}

test("Custom Dropdown: Standard option is recognized and does not trigger custom mode", () => {
  const standardOutcomes = ["QUALIFIED", "INTERESTED", "MEETING_SCHEDULED", "CALLBACK_REQUESTED"];
  const state = resolveSelectState(standardOutcomes, "QUALIFIED", false, "");

  assert.strictEqual(state.isCustomMode, false);
  assert.strictEqual(state.displayedSelectValue, "QUALIFIED");
  assert.strictEqual(state.effectiveValue, "QUALIFIED");
});

test("Custom Dropdown: Selecting Custom / Other enables custom input and uses entered text", () => {
  const standardSources = ["WEBSITE", "REFERRAL", "COLD_CALL", "CAMPAIGN"];
  const state = resolveSelectState(standardSources, CUSTOM_OPTION_VALUE, true, "  Fintech Summit 2026  ");

  assert.strictEqual(state.isCustomMode, true);
  assert.strictEqual(state.displayedSelectValue, CUSTOM_OPTION_VALUE);
  assert.strictEqual(state.effectiveValue, "Fintech Summit 2026", "Should trim unnecessary whitespace");
});

test("Custom Dropdown: Pre-existing custom value from database is restored automatically into custom input", () => {
  const standardPackages = ["Mentneo Starter Growth", "Mentneo Professional Scale", "Mentneo Enterprise Accelerator"];
  const databaseRecordValue = "Custom Multi-Year Enterprise Cohort";

  const state = resolveSelectState(standardPackages, databaseRecordValue, false, "");

  assert.strictEqual(state.isCustomMode, true, "Should automatically recognize non-standard value as custom");
  assert.strictEqual(state.displayedSelectValue, CUSTOM_OPTION_VALUE);
  assert.strictEqual(state.customText, "Custom Multi-Year Enterprise Cohort");
  assert.strictEqual(state.effectiveValue, "Custom Multi-Year Enterprise Cohort");
});

test("Custom Dropdown: Switching back from Custom to standard option clears custom mode", () => {
  const standardMethods = ["UPI", "BANK_TRANSFER", "CASH", "PAYMENT_GATEWAY"];
  // User selects standard "UPI" after previously typing a custom value
  const state = resolveSelectState(standardMethods, "UPI", false, "");

  assert.strictEqual(state.isCustomMode, false);
  assert.strictEqual(state.displayedSelectValue, "UPI");
  assert.strictEqual(state.effectiveValue, "UPI");
});

test("Custom Dropdown: Empty custom value validation", () => {
  const standardOutcomes = ["QUALIFIED", "INTERESTED"];
  const state = resolveSelectState(standardOutcomes, CUSTOM_OPTION_VALUE, true, "   ");

  assert.strictEqual(state.effectiveValue, "", "Whitespace-only custom value should trim to empty string");
});

test("Database Persistence: Custom Call Outcome and Call Status persist safely", async () => {
  const executive = await prisma.user.findFirst({ where: { role: "SALES_EXECUTIVE" } });
  const lead = await prisma.lead.findFirst();

  assert.ok(executive && lead, "Executive and Lead required");

  const customOutcome = "In-Person Demo at Client Corporate Office";
  const customStatus = "Direct Reception Transfer";

  const call = await prisma.callLog.create({
    data: {
      callNumber: `TEST-CAL-${Date.now()}`,
      leadId: lead.id,
      employeeId: executive.id,
      callDirection: "OUTBOUND",
      callStatus: customStatus,
      durationSeconds: 180,
      outcome: customOutcome,
      notes: "Test call with custom outcome",
    },
  });

  const fetched = await prisma.callLog.findUnique({ where: { id: call.id } });
  assert.strictEqual(fetched.outcome, customOutcome);
  assert.strictEqual(fetched.callStatus, customStatus);

  // Clean up
  await prisma.callLog.delete({ where: { id: call.id } });
});

test("Database Persistence: Custom Lead Source and Custom Package persist safely", async () => {
  const executive = await prisma.user.findFirst({ where: { role: "SALES_EXECUTIVE" } });
  assert.ok(executive);

  const customSource = "Hyderabad Tech Startup Expo 2026";
  const customPackage = "Custom Enterprise Multi-Seat Accelerator";

  const lead = await prisma.lead.create({
    data: {
      leadNumber: `TEST-LD-${Date.now()}`,
      businessName: "Test Custom Dropdown Tech",
      contactPerson: "Test Contact",
      phone: `+91 99999 ${Math.floor(10000 + Math.random() * 90000)}`,
      source: customSource,
      assignedToId: executive.id,
      createdById: executive.id,
      packageInterested: customPackage,
    },
  });

  const fetched = await prisma.lead.findUnique({ where: { id: lead.id } });
  assert.strictEqual(fetched.source, customSource);
  assert.strictEqual(fetched.packageInterested, customPackage);

  // Clean up
  await prisma.lead.delete({ where: { id: lead.id } });
});

test("Database Persistence: Custom Payment Method persists safely", async () => {
  const sale = await prisma.sale.findFirst();
  const executive = await prisma.user.findFirst({ where: { role: "SALES_EXECUTIVE" } });
  assert.ok(sale && executive);

  const customMethod = "Company Corporate Demand Draft";

  const payment = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TEST-TXN-${Date.now()}`,
      saleId: sale.id,
      clientId: sale.clientId,
      recordedById: executive.id,
      amountPaise: 2500000n,
      paymentMethod: customMethod,
      transactionReference: "DD/HDFC/8492019",
      verificationStatus: "PENDING",
    },
  });

  const fetched = await prisma.paymentTransaction.findUnique({ where: { id: payment.id } });
  assert.strictEqual(fetched.paymentMethod, customMethod);

  // Clean up
  await prisma.paymentTransaction.delete({ where: { id: payment.id } });
});
