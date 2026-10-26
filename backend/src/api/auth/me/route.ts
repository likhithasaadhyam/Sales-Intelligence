import { NextResponse } from "../../../lib/next-compat";
import { getSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      profile: {
        select: {
          employeeCode: true,
          territory: true,
          teamId: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account inactive or not found" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: user.profile?.employeeCode,
      territory: user.profile?.territory,
      teamId: user.profile?.teamId,
      teamName: user.profile?.team?.name,
    },
  });
}
