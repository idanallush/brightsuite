import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getServerSession();

  if (!session.userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
    tools: session.tools || [],
  });
}
