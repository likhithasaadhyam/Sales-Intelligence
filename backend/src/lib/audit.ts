import { prisma } from "./prisma";

export interface AuditLogOptions {
  actorId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "VERIFY" | "REJECT" | "TRANSFER" | "APPROVE" | "LOGIN";
  entityType: "USER" | "LEAD" | "SALE" | "PAYMENT" | "TARGET" | "REPORT" | "PACKAGE" | "SETTING" | "TEAM" | "CLIENT";
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditLog(options: AuditLogOptions) {
  try {
    const detailsJson =
      typeof options.details === "object"
        ? JSON.stringify(options.details)
        : options.details || null;

    await prisma.auditLog.create({
      data: {
        actorId: options.actorId || null,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        detailsJson,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
