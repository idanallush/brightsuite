import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { deleteFbConnection } from '@/lib/facebook/connection';
import { getServerSession } from '@/lib/auth/session';

export async function POST() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  await deleteFbConnection(session.userId);

  // Also clear session (backward compat)
  const sess = await getServerSession();
  sess.fbAccessToken = undefined;
  sess.fbTokenExpiry = undefined;
  sess.fbUserId = undefined;
  sess.fbUserName = undefined;
  await sess.save();

  return NextResponse.json({ success: true });
}
