/**
 * Financial Calculation and Currency Utilities for MENTNEO Sales Intelligence.
 * Strictly adheres to integer paise arithmetic to avoid floating point issues.
 * 1 INR = 100 paise.
 */

const ZERO_PAISE = BigInt(0);
const HUNDRED_PAISE = BigInt(100);

export function rupeesToPaise(val: number | string): bigint {
  if (typeof val === "string") {
    // Clean string of commas, spaces, currency symbols
    const cleaned = val.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned || isNaN(Number(cleaned))) return ZERO_PAISE;
    const parts = cleaned.split(".");
    const rupees = BigInt(parts[0] || "0");
    const decimal = (parts[1] || "").padEnd(2, "0").slice(0, 2);
    const paise = BigInt(decimal);
    return rupees * HUNDRED_PAISE + (rupees < ZERO_PAISE ? -paise : paise);
  }
  const rounded = Math.round(val * 100);
  return BigInt(rounded);
}

export function paiseToRupees(paise: bigint | number): number {
  if (typeof paise === "bigint") {
    return Number(paise) / 100;
  }
  return paise / 100;
}

/**
 * Format paise into Indian Rupee format (e.g. ₹12,34,567 or ₹12,34,567.50)
 * Uses Indian numbering system: 3 digits for hundreds, then groups of 2.
 */
export function formatINR(paise: bigint | number | null | undefined, includeDecimals = false): string {
  if (paise === null || paise === undefined) return "₹0";

  const numPaise = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  const isNegative = numPaise < ZERO_PAISE;
  const absPaise = isNegative ? -numPaise : numPaise;

  const rupees = absPaise / HUNDRED_PAISE;
  const remPaise = absPaise % HUNDRED_PAISE;

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

  const decimalPart = includeDecimals || remPaise > ZERO_PAISE
    ? `.${remPaise.toString().padStart(2, "0")}`
    : "";

  return `${isNegative ? "-" : ""}₹${formattedRupees}${decimalPart}`;
}

export function calculateNetCollections(
  verifiedPaymentsPaise: bigint,
  verifiedRefundsPaise: bigint = ZERO_PAISE
): bigint {
  const net = verifiedPaymentsPaise - verifiedRefundsPaise;
  return net > ZERO_PAISE ? net : ZERO_PAISE;
}

export function calculateOutstanding(
  finalDealValuePaise: bigint,
  netVerifiedPaymentsPaise: bigint
): bigint {
  const outstanding = finalDealValuePaise - netVerifiedPaymentsPaise;
  return outstanding > ZERO_PAISE ? outstanding : ZERO_PAISE;
}

export function calculateAchievementPercentage(
  achieved: bigint | number,
  target: bigint | number
): number {
  const numAchieved = typeof achieved === "bigint" ? Number(achieved) : achieved;
  const numTarget = typeof target === "bigint" ? Number(target) : target;

  if (numTarget <= 0) return 0;
  const pct = (numAchieved / numTarget) * 100;
  return Math.min(Math.round(pct * 10) / 10, 999.9);
}
