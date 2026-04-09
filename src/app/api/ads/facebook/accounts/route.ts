import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fetchAdAccounts } from "@/lib/ads/facebook-accounts";
import { FacebookApiError } from "@/lib/facebook/client";
import { getFbToken } from "@/lib/facebook/connection";

export async function GET() {
  const session = await getServerSession();

  // Try DB first, fall back to session
  const accessToken = (session.userId ? await getFbToken(session.userId) : null) ?? session.fbAccessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accounts = await fetchAdAccounts(accessToken);
    return NextResponse.json({ accounts });
  } catch (err) {
    if (err instanceof FacebookApiError && err.isTokenExpired) {
      session.fbAccessToken = undefined;
      session.fbTokenExpiry = undefined;
      await session.save();
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    console.error("Failed to fetch ad accounts:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
