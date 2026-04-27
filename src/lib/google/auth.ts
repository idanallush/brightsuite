const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function requireGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth credentials — set GOOGLE_CLIENT_ID/SECRET (or GOOGLE_ADS_CLIENT_ID/SECRET as fallback)',
    );
  }
  return { clientId, clientSecret };
}

export function getGoogleLoginUrl(csrfState: string): string {
  const { clientId } = requireGoogleCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${BASE_URL}/api/auth/google/callback`,
    scope: 'openid email profile',
    state: csrfState,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  id_token: string;
  access_token: string;
}> {
  const { clientId, clientSecret } = requireGoogleCredentials();

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${BASE_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error_description || 'Failed to exchange code for tokens');
  }

  return res.json();
}

export async function verifyGoogleToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture: string;
}> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!res.ok) {
    throw new Error('Failed to verify Google ID token');
  }

  const data = await res.json();

  if (!data.email) {
    throw new Error('Google token missing email claim');
  }

  return {
    sub: data.sub,
    email: data.email,
    name: data.name || data.email,
    picture: data.picture || '',
  };
}
