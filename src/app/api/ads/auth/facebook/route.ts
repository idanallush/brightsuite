import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getLoginUrl } from "@/lib/facebook/auth";

export async function GET() {
  const session = await getServerSession();

  // Generate CSRF state token
  const csrfState = crypto.randomUUID();
  session.csrfState = csrfState;
  await session.save();

  const loginUrl = getLoginUrl(csrfState);
  return NextResponse.redirect(loginUrl);
}
