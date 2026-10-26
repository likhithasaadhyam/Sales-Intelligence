import { NextResponse } from "../../../lib/next-compat";
import { cookies } from "@/lib/next-compat";

export async function POST() {
  cookies().set("mentneo_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
