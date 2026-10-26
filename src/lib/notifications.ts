import { prisma } from "./prisma";

export interface CreateNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type: "LEAD_ASSIGNED" | "FOLLOW_UP_DUE" | "REPORT_DEADLINE" | "REPORT_REJECTED" | "PAYMENT_VERIFIED" | "TARGET_ASSIGNED" | "ADMIN_ALERT";
  linkUrl?: string;
}

export async function createNotification(options: CreateNotificationOptions) {
  try {
    return await prisma.notification.create({
      data: {
        userId: options.userId,
        title: options.title,
        message: options.message,
        type: options.type,
        linkUrl: options.linkUrl,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function notifyAdmins(title: string, message: string, linkUrl?: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN_MANAGER"] } },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title,
        message,
        type: "ADMIN_ALERT",
        linkUrl,
      });
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
