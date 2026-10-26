import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Mentneo Sales Intelligence Platform...");

  // 1. Roles
  const roles = [
    { code: "SUPER_ADMIN", name: "Super Admin", description: "Complete access to company performance, management, targets, and settings" },
    { code: "ADMIN_MANAGER", name: "Admin / Sales Manager", description: "Team-level performance oversight, lead assignment, and report reviews" },
    { code: "SALES_EXECUTIVE", name: "Sales Executive", description: "Manage personal leads, calls, sales, daily work reports, and target tracking" }
  ];

  for (const r of roles) {
    await prisma.systemRole.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }

  // 2. Packages (Prices in paise)
  const packagesData = [
    { code: "PKG-25K", name: "Mentneo Starter Growth", pricePaise: 2500000n, description: "Entry-level sales intelligence package (₹25,000)" },
    { code: "PKG-35K", name: "Mentneo Professional Scale", pricePaise: 3500000n, description: "Mid-tier sales intelligence package (₹35,000)" },
    { code: "PKG-45K", name: "Mentneo Enterprise Accelerator", pricePaise: 4500000n, description: "Advanced enterprise sales intelligence package (₹45,000)" },
  ];

  for (const pkg of packagesData) {
    await prisma.package.upsert({
      where: { code: pkg.code },
      update: { name: pkg.name, pricePaise: pkg.pricePaise, description: pkg.description },
      create: pkg,
    });
  }

  // 3. System Settings
  const settingsData = [
    { key: "COMPANY_NAME", value: "MENTNEO", description: "Company branding name" },
    { key: "REPORTING_DEADLINE_IST", value: "20:00", description: "Daily work report cutoff in Indian Standard Time (8:00 PM)" },
    { key: "CURRENCY_SYMBOL", value: "₹", description: "Default Indian Rupee currency display" },
    { key: "TWO_PERSON_PAYMENT_VERIFICATION", value: "true", description: "Require admin verification for all recorded payments" },
  ];

  for (const s of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  // Password hash for demo users
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 4. Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@mentneo.com" },
    update: { name: "Mentneo Administrator", role: "SUPER_ADMIN" },
    create: {
      email: "admin@mentneo.com",
      name: "Mentneo Administrator",
      passwordHash: defaultPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  // 5. Sales Manager User
  const manager = await prisma.user.upsert({
    where: { email: "manager@mentneo.com" },
    update: { name: "Vikram Sharma (Sales Manager)", role: "ADMIN_MANAGER" },
    create: {
      email: "manager@mentneo.com",
      name: "Vikram Sharma (Sales Manager)",
      passwordHash: defaultPasswordHash,
      role: "ADMIN_MANAGER",
      status: "ACTIVE",
    },
  });

  // 6. Team: Mentneo Alpha Sales Team
  let team = await prisma.team.findFirst({ where: { name: "Alpha Sales Team" } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Alpha Sales Team",
        department: "Inside Sales",
        leaderId: manager.id,
      },
    });
  }

  // 7. Initial 6 Sales Executives
  const initialExecutives = [
    { name: "Teja", email: "teja@mentneo.com", code: "MNT-001", territory: "South Zone - Hyderabad / Bangalore" },
    { name: "Narendra", email: "narendra@mentneo.com", code: "MNT-002", territory: "West Zone - Mumbai / Pune" },
    { name: "Rushika", email: "rushika@mentneo.com", code: "MNT-003", territory: "North Zone - Delhi NCR" },
    { name: "Surendra", email: "surendra@mentneo.com", code: "MNT-004", territory: "South Zone - Chennai" },
    { name: "Pujitha", email: "pujitha@mentneo.com", code: "MNT-005", territory: "Central Zone - Ahmedabad / Indore" },
    { name: "Gowtham", email: "gowtham@mentneo.com", code: "MNT-006", territory: "East Zone - Kolkata / Bhubaneswar" },
  ];

  const executiveUsers = [];

  for (const exec of initialExecutives) {
    const user = await prisma.user.upsert({
      where: { email: exec.email },
      update: { name: exec.name, role: "SALES_EXECUTIVE" },
      create: {
        email: exec.email,
        name: exec.name,
        passwordHash: defaultPasswordHash,
        role: "SALES_EXECUTIVE",
        status: "ACTIVE",
      },
    });

    executiveUsers.push(user);

    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {
        employeeCode: exec.code,
        name: exec.name,
        teamId: team.id,
        territory: exec.territory,
        reportingToId: manager.id,
      },
      create: {
        userId: user.id,
        employeeCode: exec.code,
        name: exec.name,
        phone: "+91 98765 43210",
        teamId: team.id,
        territory: exec.territory,
        reportingToId: manager.id,
        status: "ACTIVE",
      },
    });
  }

  // 8. Monthly Sales Targets (Current Month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Team Target: 180 paid clients, ₹57,00,000 target sales value
  await prisma.salesTarget.create({
    data: {
      teamId: team.id,
      periodType: "MONTHLY",
      targetCalls: 7200,
      targetLeads: 1440,
      targetFollowUps: 2880,
      targetPaidClients: 180,
      targetSalesValuePaise: 570000000n, // ₹57,00,000
      targetCollectionsPaise: 570000000n,
      package25kCount: 90,
      package35kCount: 60,
      package45kCount: 30,
      startDate: startOfMonth,
      endDate: endOfMonth,
      createdById: superAdmin.id,
    },
  });

  // Individual Monthly Targets for each of the 6 Executives:
  // 30 paid clients, 15 of 25k, 10 of 35k, 5 of 45k, ₹9,50,000 target sales value
  for (const execUser of executiveUsers) {
    await prisma.salesTarget.create({
      data: {
        employeeId: execUser.id,
        periodType: "MONTHLY",
        targetCalls: 1200,
        targetLeads: 240,
        targetFollowUps: 480,
        targetPaidClients: 30,
        targetSalesValuePaise: 95000000n, // ₹9,50,000
        targetCollectionsPaise: 95000000n,
        package25kCount: 15,
        package35kCount: 10,
        package45kCount: 5,
        startDate: startOfMonth,
        endDate: endOfMonth,
        createdById: superAdmin.id,
      },
    });
  }

  // 9. Sample Demo Clients, Leads, Calls, Sales & Payments (Demo Seed Data)
  console.log("Seeding CRM leads, calls, sales, payments, and work reports...");

  const demoClientsData = [
    { clientNumber: "CLI-1001", businessName: "Apex Retail Solutions Pvt Ltd", contactPerson: "Rohan Varma", phone: "+91 99887 76655", email: "rohan@apexretail.in", city: "Hyderabad", state: "Telangana" },
    { clientNumber: "CLI-1002", businessName: "NexGen Logistics LLP", contactPerson: "Sunita Patel", phone: "+91 98223 34455", email: "sunita@nexgenlogistics.com", city: "Mumbai", state: "Maharashtra" },
    { clientNumber: "CLI-1003", businessName: "Zenith EdTech Global", contactPerson: "Aditya Nair", phone: "+91 97441 12233", email: "aditya@zenithed.io", city: "Bangalore", state: "Karnataka" },
    { clientNumber: "CLI-1004", businessName: "GreenPulse Agrotech", contactPerson: "Kavita Rao", phone: "+91 98877 66554", email: "kavita@greenpulse.in", city: "Pune", state: "Maharashtra" },
  ];

  const clients = [];
  for (const c of demoClientsData) {
    const client = await prisma.client.create({ data: c });
    clients.push(client);
  }

  // Demo Leads
  const demoLeads = [
    {
      leadNumber: "LD-2026-001",
      businessName: "Apex Retail Solutions Pvt Ltd",
      contactPerson: "Rohan Varma",
      phone: "+91 99887 76655",
      email: "rohan@apexretail.in",
      businessCategory: "Retail Tech",
      city: "Hyderabad",
      state: "Telangana",
      source: "WEBSITE",
      assignedToId: executiveUsers[0].id, // Teja
      createdById: manager.id,
      estimatedDealValuePaise: 3500000n,
      packageInterested: "Mentneo Professional Scale",
      temperature: "HOT",
      status: "CONVERTED",
      notes: "Demo lead: Interested in multi-location inventory sales intelligence.",
      lastContactDate: new Date(),
    },
    {
      leadNumber: "LD-2026-002",
      businessName: "NexGen Logistics LLP",
      contactPerson: "Sunita Patel",
      phone: "+91 98223 34455",
      email: "sunita@nexgenlogistics.com",
      businessCategory: "Supply Chain",
      city: "Mumbai",
      state: "Maharashtra",
      source: "INBOUND",
      assignedToId: executiveUsers[1].id, // Narendra
      createdById: manager.id,
      estimatedDealValuePaise: 4500000n,
      packageInterested: "Mentneo Enterprise Accelerator",
      temperature: "HOT",
      status: "CONVERTED",
      notes: "Demo lead: Confirmed pilot and signed agreement.",
      lastContactDate: new Date(),
    },
    {
      leadNumber: "LD-2026-003",
      businessName: "Zenith EdTech Global",
      contactPerson: "Aditya Nair",
      phone: "+91 97441 12233",
      email: "aditya@zenithed.io",
      businessCategory: "Education",
      city: "Bangalore",
      state: "Karnataka",
      source: "REFERRAL",
      assignedToId: executiveUsers[2].id, // Rushika
      createdById: manager.id,
      estimatedDealValuePaise: 2500000n,
      packageInterested: "Mentneo Starter Growth",
      temperature: "HOT",
      status: "CONVERTED",
      notes: "Demo lead: Paid via bank transfer.",
      lastContactDate: new Date(),
    },
    {
      leadNumber: "LD-2026-004",
      businessName: "CloudScale Infra Labs",
      contactPerson: "Priya Menon",
      phone: "+91 91234 56789",
      email: "priya@cloudscale.net",
      businessCategory: "Cloud SaaS",
      city: "Hyderabad",
      state: "Telangana",
      source: "CAMPAIGN",
      assignedToId: executiveUsers[0].id, // Teja
      createdById: executiveUsers[0].id,
      estimatedDealValuePaise: 3500000n,
      packageInterested: "Mentneo Professional Scale",
      temperature: "HOT",
      status: "NEGOTIATION",
      notes: "Demo lead: Proposal sent, discussing payment milestones.",
      lastContactDate: new Date(),
      nextFollowUpDate: new Date(Date.now() + 86400000), // Tomorrow
    },
    {
      leadNumber: "LD-2026-005",
      businessName: "BlueHorizon Logistics",
      contactPerson: "Rajeev Singhania",
      phone: "+91 94567 89012",
      email: "rajeev@bluehorizon.com",
      businessCategory: "Logistics",
      city: "Delhi",
      state: "Delhi",
      source: "COLD_CALL",
      assignedToId: executiveUsers[3].id, // Surendra
      createdById: executiveUsers[3].id,
      estimatedDealValuePaise: 2500000n,
      packageInterested: "Mentneo Starter Growth",
      temperature: "WARM",
      status: "QUALIFIED",
      notes: "Demo lead: Meeting completed, interest confirmed.",
      lastContactDate: new Date(),
      nextFollowUpDate: new Date(), // Today
    },
    {
      leadNumber: "LD-2026-006",
      businessName: "FinTech Orbit India",
      contactPerson: "Neha Deshmukh",
      phone: "+91 93333 44444",
      email: "neha@fintechorbit.co.in",
      businessCategory: "FinTech",
      city: "Pune",
      state: "Maharashtra",
      source: "WEBSITE",
      assignedToId: executiveUsers[4].id, // Pujitha
      createdById: manager.id,
      estimatedDealValuePaise: 4500000n,
      packageInterested: "Mentneo Enterprise Accelerator",
      temperature: "WARM",
      status: "MEETING_SCHEDULED",
      notes: "Demo lead: Zoom presentation scheduled for next week.",
      lastContactDate: new Date(),
      nextFollowUpDate: new Date(Date.now() + 172800000), // 2 days later
    },
    {
      leadNumber: "LD-2026-007",
      businessName: "Vanguard MedTech",
      contactPerson: "Dr. K. Srinivas",
      phone: "+91 91111 22233",
      email: "srinivas@vanguardmed.org",
      businessCategory: "Healthcare",
      city: "Chennai",
      state: "Tamil Nadu",
      source: "SOCIAL",
      assignedToId: executiveUsers[5].id, // Gowtham
      createdById: executiveUsers[5].id,
      estimatedDealValuePaise: 2500000n,
      packageInterested: "Mentneo Starter Growth",
      temperature: "COLD",
      status: "CONTACTED",
      notes: "Demo lead: Needs follow up next week after medical conference.",
      lastContactDate: new Date(),
      nextFollowUpDate: new Date(Date.now() - 86400000), // Overdue follow-up for testing!
    },
  ];

  const leads = [];
  for (const ld of demoLeads) {
    const lead = await prisma.lead.create({ data: ld });
    leads.push(lead);
  }

  // Demo Call Logs
  const demoCalls = [
    {
      callNumber: "CAL-2026-001",
      leadId: leads[0].id,
      employeeId: executiveUsers[0].id,
      callDirection: "OUTBOUND",
      callStatus: "CONNECTED",
      durationSeconds: 320,
      outcome: "QUALIFIED",
      followUpRequired: true,
      nextFollowUpDate: new Date(Date.now() + 86400000),
      notes: "Demo call: Rohan was very receptive to our analytics suite.",
    },
    {
      callNumber: "CAL-2026-002",
      leadId: leads[1].id,
      employeeId: executiveUsers[1].id,
      callDirection: "OUTBOUND",
      callStatus: "CONNECTED",
      durationSeconds: 480,
      outcome: "CONVERTED",
      followUpRequired: false,
      notes: "Demo call: Final review call, contract signed.",
    },
    {
      callNumber: "CAL-2026-003",
      leadId: leads[3].id,
      employeeId: executiveUsers[0].id,
      callDirection: "OUTBOUND",
      callStatus: "CONNECTED",
      durationSeconds: 240,
      outcome: "MEETING_SCHEDULED",
      followUpRequired: true,
      nextFollowUpDate: new Date(Date.now() + 86400000),
      notes: "Demo call: Discussed discount and contract terms.",
    },
    {
      callNumber: "CAL-2026-004",
      leadId: leads[4].id,
      employeeId: executiveUsers[3].id,
      callDirection: "OUTBOUND",
      callStatus: "NOT_ANSWERED",
      durationSeconds: 0,
      outcome: "NO_ANSWER",
      followUpRequired: true,
      nextFollowUpDate: new Date(),
      notes: "Demo call: Customer did not pick up. Sent follow-up WhatsApp.",
    },
    {
      callNumber: "CAL-2026-005",
      leadId: leads[6].id,
      employeeId: executiveUsers[5].id,
      callDirection: "OUTBOUND",
      callStatus: "CONNECTED",
      durationSeconds: 150,
      outcome: "CALLBACK_REQUESTED",
      followUpRequired: true,
      nextFollowUpDate: new Date(Date.now() - 86400000),
      notes: "Demo call: Overdue callback reminder.",
    },
  ];

  for (const call of demoCalls) {
    await prisma.callLog.create({ data: call });
  }

  // Demo Follow-ups (including Pending, Overdue, and Completed)
  await prisma.followUp.create({
    data: {
      leadId: leads[3].id,
      employeeId: executiveUsers[0].id,
      scheduledAt: new Date(Date.now() + 86400000),
      status: "PENDING",
      notes: "Demo follow-up: Send finalized proposal with 10% volume discount.",
    },
  });

  await prisma.followUp.create({
    data: {
      leadId: leads[4].id,
      employeeId: executiveUsers[3].id,
      scheduledAt: new Date(),
      status: "PENDING",
      notes: "Demo follow-up: Call back regarding starter package demo.",
    },
  });

  await prisma.followUp.create({
    data: {
      leadId: leads[6].id,
      employeeId: executiveUsers[5].id,
      scheduledAt: new Date(Date.now() - 86400000), // Overdue
      status: "OVERDUE",
      notes: "Demo overdue follow-up: Review requirements with Dr. Srinivas.",
    },
  });

  // Demo Sales & Payment Transactions
  // Sale 1: Teja closed Apex Retail on ₹35,000 package
  const sale1 = await prisma.sale.create({
    data: {
      saleNumber: "SAL-2026-001",
      leadId: leads[0].id,
      clientId: clients[0].id,
      employeeId: executiveUsers[0].id,
      packageName: "Mentneo Professional Scale",
      saleDate: new Date(),
      totalContractValuePaise: 3500000n,
      discountPaise: 0n,
      finalDealValuePaise: 3500000n, // ₹35,000
      paymentStatus: "PAID",
      invoiceNumber: "INV-2026-001",
      notes: "Demo sale: Fully paid in advance via UPI.",
    },
  });

  // Verified Payment for Sale 1
  await prisma.paymentTransaction.create({
    data: {
      transactionNumber: "TXN-2026-001",
      saleId: sale1.id,
      clientId: clients[0].id,
      recordedById: executiveUsers[0].id,
      verifiedById: superAdmin.id,
      paymentDate: new Date(),
      amountPaise: 3500000n, // ₹35,000
      paymentMethod: "UPI",
      transactionReference: "UPI/398284729103/HDFC",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified in company bank account",
      verifiedAt: new Date(),
    },
  });

  // Sale 2: Narendra closed NexGen on ₹45,000 package, partially paid
  const sale2 = await prisma.sale.create({
    data: {
      saleNumber: "SAL-2026-002",
      leadId: leads[1].id,
      clientId: clients[1].id,
      employeeId: executiveUsers[1].id,
      packageName: "Mentneo Enterprise Accelerator",
      saleDate: new Date(),
      totalContractValuePaise: 4500000n,
      discountPaise: 0n,
      finalDealValuePaise: 4500000n, // ₹45,000
      paymentStatus: "PARTIALLY_PAID",
      nextPaymentDueDate: new Date(Date.now() + 14 * 86400000),
      invoiceNumber: "INV-2026-002",
      notes: "Demo sale: Advance ₹25,000 paid, balance ₹20,000 due in 14 days.",
    },
  });

  // Verified Advance Payment of ₹25,000 for Sale 2
  await prisma.paymentTransaction.create({
    data: {
      transactionNumber: "TXN-2026-002",
      saleId: sale2.id,
      clientId: clients[1].id,
      recordedById: executiveUsers[1].id,
      verifiedById: manager.id,
      paymentDate: new Date(),
      amountPaise: 2500000n, // ₹25,000
      paymentMethod: "BANK_TRANSFER",
      transactionReference: "NEFT/ICICI/9482716382",
      verificationStatus: "VERIFIED",
      verificationNotes: "Verified via ICICI corporate banking",
      verifiedAt: new Date(),
    },
  });

  // Sale 3: Rushika closed Zenith EdTech on ₹25,000 package - PENDING VERIFICATION
  const sale3 = await prisma.sale.create({
    data: {
      saleNumber: "SAL-2026-003",
      leadId: leads[2].id,
      clientId: clients[2].id,
      employeeId: executiveUsers[2].id,
      packageName: "Mentneo Starter Growth",
      saleDate: new Date(),
      totalContractValuePaise: 2500000n,
      discountPaise: 0n,
      finalDealValuePaise: 2500000n, // ₹25,000
      paymentStatus: "PENDING",
      invoiceNumber: "INV-2026-003",
      notes: "Demo sale: Client paid ₹25,000 via gateway, awaiting admin verification.",
    },
  });

  // Unverified Payment (PENDING verification in admin queue)
  await prisma.paymentTransaction.create({
    data: {
      transactionNumber: "TXN-2026-003",
      saleId: sale3.id,
      clientId: clients[2].id,
      recordedById: executiveUsers[2].id,
      paymentDate: new Date(),
      amountPaise: 2500000n, // ₹25,000
      paymentMethod: "PAYMENT_GATEWAY",
      transactionReference: "RAZORPAY_pay_OxK9284jkl29",
      verificationStatus: "PENDING",
      verificationNotes: null,
    },
  });

  // Demo Daily Work Reports
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Teja's Submitted Report
  await prisma.dailyWorkReport.create({
    data: {
      employeeId: executiveUsers[0].id,
      reportingDate: todayDate,
      status: "SUBMITTED",
      callsMade: 52,
      connectedCalls: 38,
      unansweredCalls: 14,
      interestedProspects: 8,
      followUpCalls: 18,
      whatsappFollowups: 25,
      meetingsScheduled: 3,
      newLeadsReceived: 6,
      newLeadsAdded: 4,
      leadsContacted: 22,
      qualifiedLeads: 5,
      hotLeads: 3,
      warmLeads: 6,
      coldLeads: 2,
      followupsCompleted: 16,
      proposalsSent: 2,
      meetingsCompleted: 2,
      negotiationsInProgress: 1,
      dealsClosed: 1,
      newClientsAcquired: 1,
      packageSold: "Mentneo Professional Scale",
      dealValuePaise: 3500000n,
      revenueGeneratedPaise: 3500000n,
      amountCollectedPaise: 3500000n,
      amountUpiPaise: 3500000n,
      pendingAmountPaise: 0n,
      mainActivities: "Contacted 22 enterprise retail prospects. Closed Apex Retail on ₹35k scale plan.",
      clientConversations: "Apex Retail confirmed full upfront payment; requested expedited onboarding.",
      challengesFaced: "Some retail prospects requested custom payment terms.",
      tomorrowPlan: "Focus on closing CloudScale Infra and conduct 4 scheduled demos.",
      submittedAt: new Date(),
    },
  });

  // Narendra's Approved Report (Yesterday)
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.dailyWorkReport.create({
    data: {
      employeeId: executiveUsers[1].id,
      reportingDate: yesterday,
      status: "APPROVED",
      callsMade: 48,
      connectedCalls: 32,
      unansweredCalls: 16,
      interestedProspects: 6,
      followUpCalls: 15,
      whatsappFollowups: 20,
      meetingsScheduled: 2,
      newLeadsReceived: 5,
      newLeadsAdded: 5,
      leadsContacted: 20,
      qualifiedLeads: 4,
      hotLeads: 2,
      warmLeads: 5,
      coldLeads: 3,
      followupsCompleted: 12,
      proposalsSent: 1,
      meetingsCompleted: 2,
      negotiationsInProgress: 2,
      dealsClosed: 1,
      newClientsAcquired: 1,
      packageSold: "Mentneo Enterprise Accelerator",
      dealValuePaise: 4500000n,
      revenueGeneratedPaise: 4500000n,
      amountCollectedPaise: 2500000n,
      amountBankTransferPaise: 2500000n,
      pendingAmountPaise: 2000000n,
      mainActivities: "Demo with NexGen Logistics leadership, signed agreement with ₹25k advance.",
      reviewerFeedback: "Good closure. Please ensure the ₹20,000 balance is collected on schedule.",
      reviewedById: manager.id,
      submittedAt: yesterday,
      reviewedAt: new Date(),
    },
  });

  // Rushika's Submitted Report (Today)
  await prisma.dailyWorkReport.create({
    data: {
      employeeId: executiveUsers[2].id, // Rushika
      reportingDate: todayDate,
      status: "SUBMITTED",
      callsMade: 45,
      connectedCalls: 32,
      unansweredCalls: 13,
      interestedProspects: 7,
      followUpCalls: 14,
      whatsappFollowups: 22,
      meetingsScheduled: 2,
      newLeadsReceived: 5,
      newLeadsAdded: 3,
      leadsContacted: 18,
      qualifiedLeads: 4,
      hotLeads: 3,
      warmLeads: 4,
      coldLeads: 2,
      followupsCompleted: 14,
      proposalsSent: 2,
      meetingsCompleted: 2,
      negotiationsInProgress: 1,
      dealsClosed: 1,
      newClientsAcquired: 1,
      packageSold: "Mentneo Starter Growth",
      dealValuePaise: 2500000n,
      revenueGeneratedPaise: 2500000n,
      amountCollectedPaise: 2500000n,
      amountGatewayPaise: 2500000n,
      pendingAmountPaise: 0n,
      mainActivities: "Conducted onboarding and product walkthrough for Zenith EdTech. Closed ₹25,000 starter package.",
      clientConversations: "Zenith EdTech confirmed payment via gateway, asked for additional team login credentials.",
      challengesFaced: "Client onboarding scheduling delayed due to customer team availability.",
      tomorrowPlan: "Follow up with 6 hot leads in education sector and schedule demos.",
      submittedAt: new Date(),
    },
  });

  // Notifications
  await prisma.notification.create({
    data: {
      userId: superAdmin.id,
      title: "New Payment Pending Verification",
      message: "Rushika recorded a payment of ₹25,000 from Zenith EdTech awaiting verification.",
      type: "ADMIN_ALERT",
      linkUrl: "/sales/verification",
    },
  });

  await prisma.notification.create({
    data: {
      userId: executiveUsers[0].id,
      title: "Daily Report Submitted Successfully",
      message: "Your daily work report for today has been submitted for manager review.",
      type: "REPORT_DEADLINE",
      linkUrl: "/reports/daily",
    },
  });

  await prisma.notification.create({
    data: {
      userId: executiveUsers[5].id,
      title: "Overdue Follow-up Alert",
      message: "Follow-up with Dr. K. Srinivas (Vanguard MedTech) is overdue.",
      type: "FOLLOW_UP_DUE",
      linkUrl: "/activity/follow-ups",
    },
  });

  // Audit Logs
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: "CREATE",
      entityType: "TARGET",
      entityId: team.id,
      detailsJson: JSON.stringify({ message: "Configured Alpha Sales Team monthly target: 180 paid clients, ₹57,00,000" }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: "VERIFY",
      entityType: "PAYMENT",
      entityId: "TXN-2026-001",
      detailsJson: JSON.stringify({ amountPaise: 3500000, client: "Apex Retail Solutions Pvt Ltd", status: "VERIFIED" }),
    },
  });

  console.log("Seeding complete! Admin credentials: admin@mentneo.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
