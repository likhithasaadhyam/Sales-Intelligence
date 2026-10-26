import test from "node:test";
import assert from "node:assert/strict";

// Financial functions under test
function rupeesToPaise(val) {
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned || isNaN(Number(cleaned))) return 0n;
    const parts = cleaned.split(".");
    const rupees = BigInt(parts[0] || "0");
    const decimal = (parts[1] || "").padEnd(2, "0").slice(0, 2);
    const paise = BigInt(decimal);
    return rupees * 100n + (rupees < 0n ? -paise : paise);
  }
  const rounded = Math.round(val * 100);
  return BigInt(rounded);
}

function paiseToRupees(paise) {
  if (typeof paise === "bigint") {
    return Number(paise) / 100;
  }
  return paise / 100;
}

function formatINR(paise, includeDecimals = false) {
  if (paise === null || paise === undefined) return "₹0";

  const numPaise = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  const isNegative = numPaise < 0n;
  const absPaise = isNegative ? -numPaise : numPaise;

  const rupees = absPaise / 100n;
  const remPaise = absPaise % 100n;

  const rupeesStr = rupees.toString();
  let formattedRupees = "";

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.slice(-3);
    const remaining = rupeesStr.slice(0, -3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formattedRupees = `${formattedRemaining},${lastThree}`;
  }

  const decimalPart = includeDecimals || remPaise > 0n
    ? `.${remPaise.toString().padStart(2, "0")}`
    : "";

  return `${isNegative ? "-" : ""}₹${formattedRupees}${decimalPart}`;
}

function calculateNetCollections(verifiedPaymentsPaise, verifiedRefundsPaise = 0n) {
  const net = verifiedPaymentsPaise - verifiedRefundsPaise;
  return net > 0n ? net : 0n;
}

function calculateOutstanding(finalDealValuePaise, netVerifiedPaymentsPaise) {
  const outstanding = finalDealValuePaise - netVerifiedPaymentsPaise;
  return outstanding > 0n ? outstanding : 0n;
}

function calculateAchievementPercentage(achieved, target) {
  const numAchieved = typeof achieved === "bigint" ? Number(achieved) : achieved;
  const numTarget = typeof target === "bigint" ? Number(target) : target;

  if (numTarget <= 0) return 0;
  const pct = (numAchieved / numTarget) * 100;
  return Math.min(Math.round(pct * 10) / 10, 999.9);
}

test("rupeesToPaise converts without floating-point inaccuracies", () => {
  assert.equal(rupeesToPaise(25000), 2500000n);
  assert.equal(rupeesToPaise(35000), 3500000n);
  assert.equal(rupeesToPaise(45000), 4500000n);
  assert.equal(rupeesToPaise("950000"), 95000000n); // ₹9.5 Lakhs
  assert.equal(rupeesToPaise("5700000"), 570000000n); // ₹57 Lakhs
  assert.equal(rupeesToPaise("19.99"), 1999n);
});

test("formatINR formats with Indian digit grouping (Lakhs and Crores)", () => {
  assert.equal(formatINR(2500000n), "₹25,000");
  assert.equal(formatINR(3500000n), "₹35,000");
  assert.equal(formatINR(95000000n), "₹9,50,000"); // ₹9.5 Lakhs
  assert.equal(formatINR(570000000n), "₹57,00,000"); // ₹57 Lakhs
  assert.equal(formatINR(1000000000n), "₹1,00,00,000"); // ₹1 Crore
});

test("Financial separation: Revenue vs Net Collections vs Outstanding", () => {
  const dealValue = rupeesToPaise(45000); // ₹45,000 deal
  const advancePayment = rupeesToPaise(25000); // ₹25,000 advance
  const refund = rupeesToPaise(5000); // ₹5,000 refund

  // Verified collection = ₹25,000
  // Net collection = ₹25,000 - ₹5,000 = ₹20,000
  const netCollections = calculateNetCollections(advancePayment, refund);
  assert.equal(netCollections, rupeesToPaise(20000));

  // Outstanding amount = Final deal value - verified collected advance
  const outstanding = calculateOutstanding(dealValue, advancePayment);
  assert.equal(outstanding, rupeesToPaise(20000)); // ₹20,000 balance remaining
});

test("Target achievement percentage calculation", () => {
  // 12 achieved out of 30 target = 40%
  assert.equal(calculateAchievementPercentage(12, 30), 40.0);
  // 30 achieved out of 30 target = 100%
  assert.equal(calculateAchievementPercentage(30, 30), 100.0);
  // Zero target safeguard
  assert.equal(calculateAchievementPercentage(10, 0), 0);
});
