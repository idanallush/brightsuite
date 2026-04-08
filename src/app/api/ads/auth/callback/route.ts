import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserProfile,
} from "@/lib/facebook/auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle user denied permission
  if (error) {
    return NextResponse.redirect(`${BASE_URL}/ads?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/ads?error=no_code`);
  }

  const session = await getServerSession();

  // Validate CSRF state
  if (!state || state !== session.csrfState) {
    return NextResponse.redirect(`${BASE_URL}/ads?error=invalid_state`);
  }

  try {
    // Exchange code for short-lived token
    const shortLived = await exchangeCodeForToken(code);

    // Exchange for long-lived token (60 days)
    const longLived = await getLongLivedToken(shortLived.access_token);

    // Fetch user profile (optional — don't let rate limits break login)
    let profileId = "unknown";
    let profileName = "User";
    try {
      const profile = await getUserProfile(longLived.access_token);
      profileId = profile.id;
      profileName = profile.name;
    } catch (profileErr) {
      console.warn("Profile fetch failed, continuing with defaults:", profileErr);
    }

    // Store in BrightSuite session
    session.fbAccessToken = longLived.access_token;
    session.fbTokenExpiry = Date.now() + longLived.expires_in * 1000;
    session.fbUserId = profileId;
    session.fbUserName = profileName;
    session.csrfState = undefined;
    await session.save();

    return NextResponse.redirect(`${BASE_URL}/ads/dashboard`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${BASE_URL}/ads?error=auth_failed&message=${encodeURIComponent(
        err instanceof Error ? err.message : "Unknown error"
      )}`
    );
  }
}
