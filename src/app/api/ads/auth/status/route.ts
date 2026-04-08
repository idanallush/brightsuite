import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getServerSession();

  if (!session.fbAccessToken) {
    return NextResponse.json({
      connected: false,
      userName: "",
      tokenExpiresIn: null,
      accountCount: 0,
    });
  }

  const tokenExpiresIn = session.fbTokenExpiry
    ? session.fbTokenExpiry - Date.now()
    : null;

  // Check if token is expired
  if (session.fbTokenExpiry && session.fbTokenExpiry < Date.now()) {
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
      `https://graph.facebook.com/${process.env.FB_API_VERSION || "v25.0"}/me/adaccounts?fields=id&limit=100&access_token=${session.fbAccessToken}`
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
    userName: session.fbUserName || "",
    userId: session.fbUserId || "",
    tokenExpiresIn,
    tokenExpiry: session.fbTokenExpiry || null,
    accountCount,
  });
}
