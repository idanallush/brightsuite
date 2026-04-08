import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getUserProfile, getLongLivedToken } from "@/lib/facebook/auth";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    // Try to exchange for a long-lived token
    let finalToken = accessToken;
    let expiresIn = 60 * 24 * 60 * 60; // default 60 days assumption
    try {
      const longLived = await getLongLivedToken(accessToken);
      finalToken = longLived.access_token;
      expiresIn = longLived.expires_in;
    } catch {
      // If exchange fails, the token is likely already long-lived — use as-is
    }

    // Validate token by fetching user profile
    const profile = await getUserProfile(finalToken);

    // Save to BrightSuite session
    const session = await getServerSession();
    session.fbAccessToken = finalToken;
    session.fbUserId = profile.id;
    session.fbUserName = profile.name;
    session.fbTokenExpiry = Date.now() + expiresIn * 1000;
    await session.save();

    return NextResponse.json({
      success: true,
      userName: profile.name,
      userId: profile.id,
    });
  } catch (err) {
    console.error("Set token error:", err);
    return NextResponse.json(
      { error: "Invalid token or Facebook API error" },
      { status: 400 }
    );
  }
}
