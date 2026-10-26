import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runE2EClientDetailVerification() {
  console.log("=== Client Detail & Activity Timeline E2E Verification ===");

  // 1. Authenticate as Super Admin
  console.log("\n1. Authenticating as Super Admin...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@mentneo.com", password: "Password123!" }),
  });
  if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
  const cookie = loginRes.headers.get("set-cookie");
  console.log("   Authenticated successfully. Session cookie received.");

  // 2. Fetch clients list to get Zenith EdTech Global ID
  console.log("\n2. Fetching clients list...");
  const listRes = await fetch("http://localhost:3000/api/clients", {
    headers: { cookie: cookie || "" },
  });
  const listData = await listRes.json();
  const zenith = listData.clients.find((c) => c.businessName.includes("Zenith"));
  if (!zenith) throw new Error("Zenith EdTech Global not found in clients list");
  console.log(`   Found Zenith EdTech Global (ID: ${zenith.id}, Number: ${zenith.clientNumber})`);

  // 3. Fetch detailed profile & activity timeline
  console.log("\n3. Fetching Zenith EdTech Global detail & timeline via /api/clients/[id]...");
  const detailRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}`, {
    headers: { cookie: cookie || "" },
  });
  if (!detailRes.ok) throw new Error(`Fetch detail failed with status ${detailRes.status}`);
  const detailData = await detailRes.json();

  console.log("   Profile verified:");
  console.log(`     - Business Name: ${detailData.client.businessName}`);
  console.log(`     - Contact Person: ${detailData.client.contactPerson}`);
  console.log(`     - Phone: ${detailData.client.phone}`);
  console.log(`     - Location: ${detailData.client.city}, ${detailData.client.state}`);
  console.log(`     - Original Lead: ${detailData.client.originalLead?.leadNumber || "None"}`);
  console.log(`     - Assigned Rep: ${detailData.client.assignedTo?.name || "Unassigned"}`);
  console.log(`     - Total Deals: ${detailData.metrics.totalDeals}`);
  console.log(`     - Deal Value (Paise): ${detailData.metrics.totalDealValuePaise}`);
  console.log(`     - Net Collections (Paise): ${detailData.metrics.netCollectionsPaise}`);
  console.log(`     - Outstanding (Paise): ${detailData.metrics.outstandingPaise}`);
  console.log(`     - Timeline Events Count: ${detailData.timeline.length}`);

  // 4. Log a phone call for this client
  console.log("\n4. Logging a new phone call for Zenith EdTech Global...");
  const callRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie || "" },
    body: JSON.stringify({
      activityType: "CALL",
      callDirection: "OUTBOUND",
      callStatus: "CONNECTED",
      durationMinutes: 5,
      outcome: "INTERESTED",
      notes: "E2E verification call: Discussed platform scaling roadmap.",
    }),
  });
  if (!callRes.ok) throw new Error(`Log call failed with status ${callRes.status}`);
  const callData = await callRes.json();
  console.log(`   Call logged successfully (Call Number: ${callData.activity.callNumber})`);

  // 5. Schedule a follow-up for this client
  console.log("\n5. Scheduling a follow-up for Zenith EdTech Global...");
  const fuRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie || "" },
    body: JSON.stringify({
      activityType: "FOLLOW_UP",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      notes: "E2E verification follow-up: Send security compliance whitepaper.",
    }),
  });
  if (!fuRes.ok) throw new Error(`Schedule follow-up failed with status ${fuRes.status}`);
  const fuData = await fuRes.json();
  console.log(`   Follow-up scheduled successfully (ID: ${fuData.activity.id})`);

  // 6. Record a meeting for this client
  console.log("\n6. Recording a meeting for Zenith EdTech Global...");
  const meetRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie || "" },
    body: JSON.stringify({
      activityType: "MEETING",
      title: "Quarterly Review & Renewal Planning",
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      agenda: "Review API throughput and upgrade options",
      notes: "Prepared demo benchmark deck",
    }),
  });
  if (!meetRes.ok) throw new Error(`Record meeting failed with status ${meetRes.status}`);
  const meetData = await meetRes.json();
  console.log(`   Meeting recorded successfully (Title: ${meetData.activity.title})`);

  // 7. Verify updated timeline includes newly created activities
  console.log("\n7. Verifying updated timeline contains new activities...");
  const updatedDetailRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}`, {
    headers: { cookie: cookie || "" },
  });
  const updatedData = await updatedDetailRes.json();
  const hasCall = updatedData.timeline.some((e) => e.id === `call-${callData.activity.id}`);
  const hasFu = updatedData.timeline.some((e) => e.id === `fu-${fuData.activity.id}`);
  const hasMeet = updatedData.timeline.some((e) => e.id === `meet-${meetData.activity.id}`);

  console.log(`   - Call in timeline: ${hasCall}`);
  console.log(`   - Follow-up in timeline: ${hasFu}`);
  console.log(`   - Meeting in timeline: ${hasMeet}`);
  if (!hasCall || !hasFu || !hasMeet) throw new Error("Timeline did not update with new activities!");

  // 8. Test Edit Client profile
  console.log("\n8. Testing client profile edit (PATCH /api/clients/[id])...");
  const patchRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: cookie || "" },
    body: JSON.stringify({
      website: "https://zenith-edtech.example.com",
      businessCategory: "EdTech & Learning Platforms",
      notes: "Key enterprise client managed by North Zone sales team.",
    }),
  });
  if (!patchRes.ok) throw new Error(`Edit client failed with status ${patchRes.status}`);
  console.log("   Client profile updated successfully.");

  // 9. Unauthorized request test
  console.log("\n9. Testing unauthorized access without session cookie...");
  const unauthRes = await fetch(`http://localhost:3000/api/clients/${zenith.id}`);
  console.log(`   Unauthorized status: ${unauthRes.status} (Expected 401)`);
  if (unauthRes.status !== 401) throw new Error("Expected 401 Unauthorized");

  // 10. Clean up test activities created during E2E verification
  await prisma.callLog.delete({ where: { id: callData.activity.id } });
  await prisma.followUp.delete({ where: { id: fuData.activity.id } });
  await prisma.meeting.delete({ where: { id: meetData.activity.id } });
  console.log("\n=== All Client Detail & Timeline E2E Verification steps passed! ===");
}

runE2EClientDetailVerification().catch(console.error);
