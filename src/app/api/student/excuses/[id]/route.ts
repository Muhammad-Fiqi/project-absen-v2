import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import { cancelExcuse } from '@/lib/quota'

export const runtime = 'nodejs'

// DELETE /api/student/excuses/[id] — staff-only. Cancels a student's izin
// (daily excuse). Once cancelled, the day counts toward the quota again.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await cancelExcuse(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ success: true, studentId: result.studentId, dateKey: result.dateKey })
}
