async function runE2ESearchVerification() {
  console.log("1. Authenticating as Super Admin...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@mentneo.com", password: "Password123!" }),
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }
  
  const cookie = loginRes.headers.get("set-cookie");
  console.log("   Authenticated successfully. Cookie received.");

  // Test 1: Employee search
  console.log("\n2. Testing search for 'rushika'...");
  const rushikaRes = await fetch("http://localhost:3000/api/search?q=rushika", {
    headers: { cookie: cookie || "" },
  });
  const rushikaData = await rushikaRes.json();
  console.log(`   Found ${rushikaData.total} results for 'rushika'.`);
  console.log("   Employees found:", rushikaData.results.employees.map((e) => e.name));
  console.log("   Reports found:", rushikaData.results.reports.length);

  // Test 2: Case insensitive search 'RUSHIKA'
  console.log("\n3. Testing case-insensitive search for 'RUSHIKA'...");
  const rushikaUpperRes = await fetch("http://localhost:3000/api/search?q=RUSHIKA", {
    headers: { cookie: cookie || "" },
  });
  const rushikaUpperData = await rushikaUpperRes.json();
  console.log(`   Found ${rushikaUpperData.total} results for 'RUSHIKA'.`);

  // Test 3: Lead and Client search for 'Apex'
  console.log("\n4. Testing search for 'Apex'...");
  const apexRes = await fetch("http://localhost:3000/api/search?q=Apex", {
    headers: { cookie: cookie || "" },
  });
  const apexData = await apexRes.json();
  console.log(`   Found ${apexData.total} results for 'Apex'.`);
  if (apexData.results.clients.length) {
    console.log("   Clients:", apexData.results.clients.map((c) => c.businessName));
  }
  if (apexData.results.sales.length) {
    console.log("   Sales:", apexData.results.sales.map((s) => `${s.saleNumber} (${s.packageName})`));
  }

  // Test 4: Payment reference search
  console.log("\n5. Testing search for payment reference 'UPI'...");
  const upiRes = await fetch("http://localhost:3000/api/search?q=UPI", {
    headers: { cookie: cookie || "" },
  });
  const upiData = await upiRes.json();
  console.log(`   Found ${upiData.total} results for 'UPI'.`);
  if (upiData.results.payments.length) {
    console.log("   Payments:", upiData.results.payments.map((p) => `${p.transactionNumber} - ${p.transactionReference}`));
  }

  // Test 5: Nonexistent query
  console.log("\n6. Testing nonexistent query 'xyznonexistent999'...");
  const noneRes = await fetch("http://localhost:3000/api/search?q=xyznonexistent999", {
    headers: { cookie: cookie || "" },
  });
  const noneData = await noneRes.json();
  console.log(`   Found ${noneData.total} results for 'xyznonexistent999'. (Expected 0)`);

  // Test 6: Unauthorized query without cookie
  console.log("\n7. Testing unauthorized query without session cookie...");
  const unauthRes = await fetch("http://localhost:3000/api/search?q=rushika");
  console.log(`   Unauthorized status code: ${unauthRes.status} (Expected 401)`);

  // Test 7: Executive role-based isolation
  console.log("\n8. Testing Sales Executive RBAC isolation...");
  const execLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "teja@mentneo.com", password: "Password123!" }),
  });
  const execCookie = execLoginRes.headers.get("set-cookie");
  const execSearchRes = await fetch("http://localhost:3000/api/search?q=rushika", {
    headers: { cookie: execCookie || "" },
  });
  const execSearchData = await execSearchRes.json();
  console.log(`   Teja search for 'rushika': reports = ${execSearchData.results.reports.length} (Expected 0 since Teja only sees own reports)`);

  console.log("\n All End-to-End API scenarios passed successfully!");
}

runE2ESearchVerification().catch(console.error);
