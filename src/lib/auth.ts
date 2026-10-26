import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "mentneo-super-secret-jwt-key-2026-production";
const COOKIE_NAME = "mentneo_session";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN_MANAGER" | "SALES_EXECUTIVE";
  employeeCode?: string;
  teamId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Server-side authentication reader for Next.js App Router (Server Components & Route Handlers)
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Strict role validator for API routes. Throws or returns 401/403.
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Check if the active user is authorized to view or edit an employee's data.
 * - SUPER_ADMIN: Can access all
 * - ADMIN_MANAGER: Can access own team
 * - SALES_EXECUTIVE: Can strictly only access their own user ID
 */
export async function verifyEmployeeAccess(targetEmployeeUserId: string): Promise<boolean> {
  const user = await getSession();
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "SALES_EXECUTIVE") {
    return user.id === targetEmployeeUserId;
  }
  if (user.role === "ADMIN_MANAGER") {
    if (user.id === targetEmployeeUserId) return true;
    // Check if target employee belongs to manager's team
    const targetProfile = await prisma.employeeProfile.findUnique({
      where: { userId: targetEmployeeUserId },
    });
    if (!targetProfile || !targetProfile.teamId) return false;
    const team = await prisma.team.findUnique({
      where: { id: targetProfile.teamId },
    });
    return team?.leaderId === user.id;
  }
  return false;
}
