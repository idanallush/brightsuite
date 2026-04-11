import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { deleteGoogleConnection } from '@/lib/google/connection';

export async function POST() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  await deleteGoogleConnection(auth.session.userId);
  return NextResponse.json({ success: true });
}
