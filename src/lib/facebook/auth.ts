const FB_API_VERSION = process.env.FB_API_VERSION || "v25.0";
const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const SCOPES = [
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "pages_show_list",
].join(",");

function requireFBCredentials() {
  if (!FB_APP_ID || !FB_APP_SECRET) {
    throw new Error("Missing FB_APP_ID or FB_APP_SECRET environment variables");
  }
  return { appId: FB_APP_ID, appSecret: FB_APP_SECRET };
}

export function getLoginUrl(csrfState: string): string {
  const { appId } = requireFBCredentials();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${BASE_URL}/api/ads/auth/callback`,
    scope: SCOPES,
    state: csrfState,
    response_type: "code",
  });
  return `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const { appId, appSecret } = requireFBCredentials();
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: `${BASE_URL}/api/ads/auth/callback`,
    code,
  });

  const res = await fetch(
    `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token?${params.toString()}`
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Failed to exchange code for token");
  }

  return res.json();
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const { appId, appSecret } = requireFBCredentials();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(
    `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token?${params.toString()}`
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Failed to get long-lived token");
  }

  return res.json();
}

export async function getUserProfile(accessToken: string): Promise<{
  id: string;
  name: string;
  email?: string;
}> {
  const res = await fetch(
    `https://graph.facebook.com/${FB_API_VERSION}/me?fields=id,name,email&access_token=${accessToken}`
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Failed to fetch user profile");
  }

  return res.json();
}
