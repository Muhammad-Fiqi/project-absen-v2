import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import { cancelExcuse } from '@/lib/quota'
import { attendance } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

// DELETE /api/student/excuses/[id] — staff-only. Cancels a student's daily
// excuse and returns the used excuse slot without changing attendance quota.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const source = new URL(req.url).searchParams.get('source')
  if (source === 'attendance') {
    const deleted = await db.delete(attendance).where(eq(attendance.id, id)).returning({ id: attendance.id })
    if (deleted.length === 0) return NextResponse.json({ error: 'Data izin tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ success: true })
  }
  const result = await cancelExcuse(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ success: true, studentId: result.studentId, dateKey: result.dateKey })
}
