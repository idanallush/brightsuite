import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getFbConnection } from "@/lib/facebook/connection";

export async function GET() {
  const session = await getServerSession();

  if (!session.userId) {
    return NextResponse.json({
      connected: false,
      userName: "",
      tokenExpiresIn: null,
      accountCount: 0,
    });
  }

  // Try DB first (unified source of truth)
  const dbConn = await getFbConnection(session.userId);
  let accessToken: string | undefined;
  let tokenExpiry: number | undefined;
  let userName: string | undefined;
  let userId: string | undefined;

  if (dbConn) {
    accessToken = dbConn.accessToken;
    tokenExpiry = dbConn.tokenExpiresAt ? new Date(dbConn.tokenExpiresAt).getTime() : undefined;
    userName = dbConn.fbUserName ?? undefined;
    userId = dbConn.fbUserId;

    // Sync back to session if session is empty (backward compat)
    if (!session.fbAccessToken) {
      session.fbAccessToken = accessToken;
      session.fbTokenExpiry = tokenExpiry;
      session.fbUserId = userId;
      session.fbUserName = userName;
      await session.save();
    }
  } else if (session.fbAccessToken) {
    // Fallback to session (legacy)
    accessToken = session.fbAccessToken;
    tokenExpiry = session.fbTokenExpiry;
    userName = session.fbUserName;
    userId = session.fbUserId;
  }

  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      userName: "",
      tokenExpiresIn: null,
      accountCount: 0,
    });
  }

  const tokenExpiresIn = tokenExpiry ? tokenExpiry - Date.now() : null;

  // Check if token is expired
  if (tokenExpiry && tokenExpiry < Date.now()) {
    session.fbAccessToken = undefined;
    session.fbTokenExpiry = undefined;
    session.fbUserId = undefined;
    session.fbUserName = undefined;
    await session.save();
    return NextResponse.json({
      connected: false,
      userName: "",
      tokenExpiresIn: null,
      accountCount: 0,
      tokenExpired: true,
    });
  }

  // Fetch account count
  let accountCount = 0;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${process.env.FB_API_VERSION || "v25.0"}/me/adaccounts?fields=id&limit=100&access_token=${accessToken}`
    );
    if (res.ok) {
      const data = await res.json();
      accountCount = data.data?.length || 0;
    } else if (res.status === 401 || res.status === 400) {
      session.fbAccessToken = undefined;
      session.fbTokenExpiry = undefined;
      session.fbUserId = undefined;
      session.fbUserName = undefined;
      await session.save();
      return NextResponse.json({
        connected: false,
        userName: "",
        tokenExpiresIn: null,
        accountCount: 0,
        tokenExpired: true,
      });
    }
  } catch {
    // Ignore - we'll just show 0
  }

  return NextResponse.json({
    connected: true,
    userName: userName || "",
    userId: userId || "",
    tokenExpiresIn,
    tokenExpiry: tokenExpiry || null,
    accountCount,
  });
}
