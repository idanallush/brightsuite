import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fetchAdAccounts } from "@/lib/ads/facebook-accounts";
import { FacebookApiError } from "@/lib/facebook/client";

export async function GET() {
  const session = await getServerSession();

  if (!session.fbAccessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accounts = await fetchAdAccounts(session.fbAccessToken);
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
