import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';

// DELETE /api/writer/copy-archive/:id — delete an archive item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getTurso();
    await db.execute({ sql: 'DELETE FROM copy_archive WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Copy archive DELETE error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
