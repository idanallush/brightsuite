import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { logAudit } from '@/lib/audit';

export async function POST() {
  const session = await getServerSession();

  if (session.userId) {
    await logAudit({
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      action: 'logout',
    });
  }

  session.destroy();
  return NextResponse.json({ ok: true });
}
