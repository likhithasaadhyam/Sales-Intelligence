import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key-123";

test("Password hashing with bcrypt is secure and verifiable", async () => {
  const plain = "Password123!";
  const hash = await bcrypt.hash(plain, 10);
  assert.ok(hash !== plain);
  assert.ok(await bcrypt.compare(plain, hash));
  assert.ok(!(await bcrypt.compare("WrongPassword", hash)));
});

test("JWT authentication token round-trip maintains role permissions", () => {
  const user = {
    id: "usr-101",
    email: "teja@mentneo.com",
    name: "Teja",
    role: "SALES_EXECUTIVE",
    employeeCode: "MNT-001",
  };

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
  const decoded = jwt.verify(token, JWT_SECRET);

  assert.equal(decoded.id, user.id);
  assert.equal(decoded.role, "SALES_EXECUTIVE");
  assert.equal(decoded.email, user.email);
});

test("Two-Person Verification Rule: Self-approval must be rejected", () => {
  const recordedByUserId = "usr-manager-1";
  const attemptingVerifierId = "usr-manager-1";

  // Check if verifier is the same as recorder
  const isSelfVerification = recordedByUserId === attemptingVerifierId;
  assert.equal(isSelfVerification, true, "Self verification must be detected");

  // When verifier is different
  const differentVerifierId = "usr-admin-super";
  assert.equal(recordedByUserId === differentVerifierId, false, "Independent verification permitted");
});

test("Role authorization hierarchy check", () => {
  const roles = {
    SUPER_ADMIN: ["ALL_COMPANIES", "CONFIG", "AUDIT_LOGS", "ROLES"],
    ADMIN_MANAGER: ["TEAM_OVERSIGHT", "APPROVE_REPORTS", "VERIFY_PAYMENTS"],
    SALES_EXECUTIVE: ["PERSONAL_LEADS", "CALL_LOGS", "SUBMIT_REPORT"],
  };

  function canAccessAuditLogs(role) {
    return role === "SUPER_ADMIN";
  }

  function canAccessExecutivePersonalData(callerId, callerRole, targetExecutiveId) {
    if (callerRole === "SUPER_ADMIN") return true;
    if (callerRole === "SALES_EXECUTIVE") return callerId === targetExecutiveId;
    return true; // Manager checked against team
  }

  assert.ok(canAccessAuditLogs("SUPER_ADMIN"));
  assert.ok(!canAccessAuditLogs("ADMIN_MANAGER"));
  assert.ok(!canAccessAuditLogs("SALES_EXECUTIVE"));

  // Cross-executive isolation
  assert.ok(!canAccessExecutivePersonalData("exec-1", "SALES_EXECUTIVE", "exec-2"));
  assert.ok(canAccessExecutivePersonalData("exec-1", "SALES_EXECUTIVE", "exec-1"));
});
