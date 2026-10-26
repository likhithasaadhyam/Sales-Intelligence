import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Server-side authentication reader for Next.js App Router (Server Components & Pages)
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

