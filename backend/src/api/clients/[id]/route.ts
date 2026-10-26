import { NextResponse } from "../../../lib/next-compat";
import { getSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { recordAuditLog } from "../../../lib/audit";
import { calculateOutstanding } from "../../../lib/financials";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = params.id;
    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        sales: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
            payments: {
              include: {
                recordedBy: { select: { id: true, name: true } },
                verifiedBy: { select: { id: true, name: true } },
                refunds: {
                  include: { processedBy: { select: { id: true, name: true } } },
                },
              },
              orderBy: { paymentDate: "desc" },
            },
            refunds: {
              include: { processedBy: { select: { id: true, name: true } } },
              orderBy: { processedAt: "desc" },
            },
          },
          orderBy: { saleDate: "desc" },
        },
        originalLead: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            calls: {
              include: { employee: { select: { id: true, name: true } } },
              orderBy: { callDateTime: "desc" },
            },
            followUps: {
              include: { employee: { select: { id: true, name: true } } },
              orderBy: { scheduledAt: "desc" },
            },
            meetings: {
              include: { employee: { select: { id: true, name: true } } },
              orderBy: { scheduledAt: "desc" },
            },
            assignments: {
              include: {
                previousEmployee: { select: { id: true, name: true } },
                newEmployee: { select: { id: true, name: true } },
                assignedBy: { select: { id: true, name: true } },
              },
              orderBy: { transferredAt: "desc" },
            },
          },
        },
        calls: {
          include: { employee: { select: { id: true, name: true } } },
          orderBy: { callDateTime: "desc" },
        },
        followUps: {
          include: { employee: { select: { id: true, name: true } } },
          orderBy: { scheduledAt: "desc" },
        },
        meetings: {
          include: { employee: { select: { id: true, name: true } } },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Role-based data access control
    const isExecutive = session.role === "SALES_EXECUTIVE";
    if (isExecutive) {
      const isAssigned = client.assignedToId === session.id;
      const isLeadAssigned = client.originalLead?.assignedToId === session.id;
      const hasSale = client.sales.some((s) => s.employeeId === session.id);
      if (!isAssigned && !isLeadAssigned && !hasSale) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to view this client" },
          { status: 403 }
        );
      }
    }

    // --- Financial Calculations (Integer Paise) ---
    let totalDealValuePaise = 0n;
    let totalDiscountPaise = 0n;
    let totalContractValuePaise = 0n;
    let totalVerifiedPaidPaise = 0n;
    let pendingVerificationPaise = 0n;
    let totalVerifiedRefundsPaise = 0n;

    const allPayments: any[] = [];
    const allRefunds: any[] = [];

    for (const sale of client.sales) {
      totalDealValuePaise += sale.finalDealValuePaise;
      totalDiscountPaise += sale.discountPaise;
      totalContractValuePaise += sale.totalContractValuePaise;

      for (const p of sale.payments) {
        allPayments.push({
          id: p.id,
          transactionNumber: p.transactionNumber,
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          packageName: sale.packageName,
          amountPaise: p.amountPaise.toString(),
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          transactionReference: p.transactionReference,
          verificationStatus: p.verificationStatus,
          verificationNotes: p.verificationNotes,
          verifiedAt: p.verifiedAt,
          recordedBy: p.recordedBy?.name || "System",
          verifiedBy: p.verifiedBy?.name || null,
        });

        if (p.verificationStatus === "VERIFIED") {
          totalVerifiedPaidPaise += p.amountPaise;
        } else if (p.verificationStatus === "PENDING") {
          pendingVerificationPaise += p.amountPaise;
        }

        for (const ref of p.refunds) {
          if (ref.verificationStatus === "VERIFIED") {
            totalVerifiedRefundsPaise += ref.amountPaise;
          }
          allRefunds.push({
            id: ref.id,
            refundNumber: ref.refundNumber,
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            amountPaise: ref.amountPaise.toString(),
            reason: ref.reason,
            verificationStatus: ref.verificationStatus,
            processedAt: ref.processedAt,
            processedBy: ref.processedBy?.name || "Admin",
          });
        }
      }

      for (const ref of sale.refunds) {
        if (!allRefunds.some((r) => r.id === ref.id)) {
          if (ref.verificationStatus === "VERIFIED") {
            totalVerifiedRefundsPaise += ref.amountPaise;
          }
          allRefunds.push({
            id: ref.id,
            refundNumber: ref.refundNumber,
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            amountPaise: ref.amountPaise.toString(),
            reason: ref.reason,
            verificationStatus: ref.verificationStatus,
            processedAt: ref.processedAt,
            processedBy: ref.processedBy?.name || "Admin",
          });
        }
      }
    }

    const netCollectionsPaise = totalVerifiedPaidPaise - totalVerifiedRefundsPaise;
    const outstandingPaise = calculateOutstanding(totalDealValuePaise, totalVerifiedPaidPaise);

    // --- Deduplicate and Compile Activity Collections ---
    // Calls
    const callMap = new Map<string, any>();
    if (client.originalLead?.calls) {
      client.originalLead.calls.forEach((c) => callMap.set(c.id, c));
    }
    client.calls.forEach((c) => callMap.set(c.id, c));
    const allCalls = Array.from(callMap.values());

    // Follow-ups
    const fuMap = new Map<string, any>();
    if (client.originalLead?.followUps) {
      client.originalLead.followUps.forEach((f) => fuMap.set(f.id, f));
    }
    client.followUps.forEach((f) => fuMap.set(f.id, f));
    const allFollowUps = Array.from(fuMap.values());

    // Meetings
    const meetMap = new Map<string, any>();
    if (client.originalLead?.meetings) {
      client.originalLead.meetings.forEach((m) => meetMap.set(m.id, m));
    }
    client.meetings.forEach((m) => meetMap.set(m.id, m));
    const allMeetings = Array.from(meetMap.values());

    // --- Compile Chronological Unified Timeline ---
    interface TimelineEvent {
      id: string;
      date: string;
      type: "CALL" | "FOLLOW_UP" | "MEETING" | "SALE" | "PAYMENT" | "REFUND" | "LEAD";
      title: string;
      description: string;
      employeeName: string;
      status?: string;
      badgeVariant?: string;
      meta?: any;
    }

    const timeline: TimelineEvent[] = [];

    // 1. Lead Creation & Conversion
    if (client.originalLead) {
      timeline.push({
        id: `lead-create-${client.originalLead.id}`,
        date: client.originalLead.createdAt.toISOString(),
        type: "LEAD",
        title: "Lead Created & Onboarded",
        description: `Source: ${client.originalLead.source.replace(/_/g, " ")} • Assigned to ${client.originalLead.assignedTo?.name || "Unassigned"}`,
        employeeName: client.originalLead.createdBy?.name || "System",
        status: client.originalLead.status,
      });

      // Lead Assignments
      client.originalLead.assignments?.forEach((asg) => {
        timeline.push({
          id: `lead-asg-${asg.id}`,
          date: asg.transferredAt.toISOString(),
          type: "LEAD",
          title: "Lead Assignment Transferred",
          description: `Transferred from ${asg.previousEmployee?.name || "None"} to ${asg.newEmployee?.name}${asg.reason ? ` • Reason: ${asg.reason}` : ""}`,
          employeeName: asg.assignedBy?.name || "Manager",
          status: "TRANSFERRED",
        });
      });
    }

    // 2. Calls
    allCalls.forEach((call) => {
      timeline.push({
        id: `call-${call.id}`,
        date: call.callDateTime.toISOString(),
        type: "CALL",
        title: `Phone Call (${call.callDirection})`,
        description: `Outcome: ${call.outcome.replace(/_/g, " ")}${call.durationSeconds > 0 ? ` • Duration: ${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : ""}${call.notes ? ` • Notes: ${call.notes}` : ""}`,
        employeeName: call.employee?.name || "Executive",
        status: call.callStatus,
        meta: { durationSeconds: call.durationSeconds, outcome: call.outcome },
      });
    });

    // 3. Follow-ups
    allFollowUps.forEach((fu) => {
      timeline.push({
        id: `fu-${fu.id}`,
        date: fu.scheduledAt.toISOString(),
        type: "FOLLOW_UP",
        title: "Scheduled Follow-up",
        description: `${fu.notes || "Follow-up discussion"}${fu.outcome ? ` • Outcome: ${fu.outcome}` : ""}`,
        employeeName: fu.employee?.name || "Executive",
        status: fu.status,
      });
    });

    // 4. Meetings
    allMeetings.forEach((m) => {
      timeline.push({
        id: `meet-${m.id}`,
        date: m.scheduledAt.toISOString(),
        type: "MEETING",
        title: `Meeting: ${m.title}`,
        description: `${m.agenda ? `Agenda: ${m.agenda} • ` : ""}${m.notes ? `Notes: ${m.notes}` : "Client discussion meeting"}`,
        employeeName: m.employee?.name || "Executive",
        status: m.status,
      });
    });

    // 5. Sales & Deals
    client.sales.forEach((s) => {
      timeline.push({
        id: `sale-${s.id}`,
        date: s.saleDate.toISOString(),
        type: "SALE",
        title: `Deal Closed: ${s.packageName}`,
        description: `Reference: ${s.saleNumber} • Value: ₹${(Number(s.finalDealValuePaise) / 100).toLocaleString("en-IN")}${s.invoiceNumber ? ` • Invoice: ${s.invoiceNumber}` : ""}${s.notes ? ` • ${s.notes}` : ""}`,
        employeeName: s.employee?.name || "Sales Executive",
        status: s.paymentStatus,
        meta: { saleNumber: s.saleNumber, valuePaise: s.finalDealValuePaise.toString() },
      });
    });

    // 6. Payments
    allPayments.forEach((p) => {
      timeline.push({
        id: `pay-${p.id}`,
        date: new Date(p.paymentDate).toISOString(),
        type: "PAYMENT",
        title: `Payment: ₹${(Number(p.amountPaise) / 100).toLocaleString("en-IN")}`,
        description: `Txn: ${p.transactionNumber} • Method: ${p.paymentMethod.replace(/_/g, " ")} • Ref: ${p.transactionReference}${p.verifiedBy ? ` • Verified by ${p.verifiedBy}` : ""}`,
        employeeName: p.recordedBy,
        status: p.verificationStatus,
        meta: { transactionNumber: p.transactionNumber, amountPaise: p.amountPaise },
      });
    });

    // 7. Refunds
    allRefunds.forEach((r) => {
      timeline.push({
        id: `ref-${r.id}`,
        date: new Date(r.processedAt).toISOString(),
        type: "REFUND",
        title: `Refund: ₹${(Number(r.amountPaise) / 100).toLocaleString("en-IN")}`,
        description: `Refund ID: ${r.refundNumber} • Reason: ${r.reason}`,
        employeeName: r.processedBy,
        status: r.verificationStatus,
        meta: { refundNumber: r.refundNumber, amountPaise: r.amountPaise },
      });
    });

    // Sort timeline descending (newest first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Format sales records for response
    const formattedSales = client.sales.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      packageName: s.packageName,
      saleDate: s.saleDate,
      totalContractValuePaise: s.totalContractValuePaise.toString(),
      discountPaise: s.discountPaise.toString(),
      finalDealValuePaise: s.finalDealValuePaise.toString(),
      paymentStatus: s.paymentStatus,
      invoiceNumber: s.invoiceNumber,
      notes: s.notes,
      employee: s.employee,
      paymentsCount: s.payments.length,
    }));

    return NextResponse.json({
      client: {
        id: client.id,
        clientNumber: client.clientNumber,
        businessName: client.businessName,
        contactPerson: client.contactPerson,
        phone: client.phone,
        email: client.email,
        businessCategory: client.businessCategory,
        website: client.website,
        city: client.city,
        state: client.state,
        postalCode: client.postalCode,
        address: client.address,
        gstNumber: client.gstNumber,
        status: client.status,
        notes: client.notes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        assignedTo: client.assignedTo || client.originalLead?.assignedTo || client.sales[0]?.employee || null,
        originalLead: client.originalLead
          ? {
              id: client.originalLead.id,
              leadNumber: client.originalLead.leadNumber,
              source: client.originalLead.source,
              createdAt: client.originalLead.createdAt,
              conversionDate: client.sales[0]?.saleDate || client.createdAt,
            }
          : null,
      },
      metrics: {
        totalDeals: client.sales.length,
        totalContractValuePaise: totalContractValuePaise.toString(),
        totalDiscountPaise: totalDiscountPaise.toString(),
        totalDealValuePaise: totalDealValuePaise.toString(),
        totalVerifiedPaidPaise: totalVerifiedPaidPaise.toString(),
        pendingVerificationPaise: pendingVerificationPaise.toString(),
        totalVerifiedRefundsPaise: totalVerifiedRefundsPaise.toString(),
        netCollectionsPaise: netCollectionsPaise.toString(),
        outstandingPaise: outstandingPaise.toString(),
        totalCalls: allCalls.length,
        pendingFollowUps: allFollowUps.filter((f) => f.status === "PENDING" || f.status === "OVERDUE").length,
        completedFollowUps: allFollowUps.filter((f) => f.status === "COMPLETED").length,
        totalMeetings: allMeetings.length,
        upcomingMeetings: allMeetings.filter((m) => m.status === "SCHEDULED" && new Date(m.scheduledAt) >= new Date()).length,
      },
      sales: formattedSales,
      payments: allPayments,
      refunds: allRefunds,
      calls: allCalls,
      followUps: allFollowUps,
      meetings: allMeetings,
      timeline,
    });
  } catch (error) {
    console.error("Fetch client detail error:", error);
    return NextResponse.json({ error: "Failed to fetch client details" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = params.id;
    const body = await req.json();

    const existing = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // RBAC: Executive can only edit if assigned
    if (session.role === "SALES_EXECUTIVE" && existing.assignedToId !== session.id) {
      return NextResponse.json({ error: "Forbidden: You cannot edit this client" }, { status: 403 });
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(body.businessName && { businessName: body.businessName.trim() }),
        ...(body.contactPerson && { contactPerson: body.contactPerson.trim() }),
        ...(body.phone && { phone: body.phone.trim() }),
        ...(body.email !== undefined && { email: body.email ? body.email.trim() : null }),
        ...(body.businessCategory !== undefined && { businessCategory: body.businessCategory ? body.businessCategory.trim() : null }),
        ...(body.website !== undefined && { website: body.website ? body.website.trim() : null }),
        ...(body.address !== undefined && { address: body.address ? body.address.trim() : null }),
        ...(body.city !== undefined && { city: body.city ? body.city.trim() : null }),
        ...(body.state !== undefined && { state: body.state ? body.state.trim() : null }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode ? body.postalCode.trim() : null }),
        ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber ? body.gstNumber.trim() : null }),
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes ? body.notes.trim() : null }),
        ...(body.assignedToId !== undefined && session.role !== "SALES_EXECUTIVE" && { assignedToId: body.assignedToId || null }),
      },
    });

    await recordAuditLog({
      actorId: session.id,
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: clientId,
      details: { updatedFields: Object.keys(body) },
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
