import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function POST() {
  const session = await getServerSession();
  // Clear only FB-related fields, not the whole BrightSuite session
  session.fbAccessToken = undefined;
  session.fbTokenExpiry = undefined;
  session.fbUserId = undefined;
  session.fbUserName = undefined;
  await session.save();
  return NextResponse.redirect(BASE_URL);
}

export async function GET() {
  const session = await getServerSession();
  session.fbAccessToken = undefined;
  session.fbTokenExpiry = undefined;
  session.fbUserId = undefined;
  session.fbUserName = undefined;
  await session.save();
  return NextResponse.redirect(BASE_URL);
}
