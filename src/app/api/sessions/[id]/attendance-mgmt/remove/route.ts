import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendance, session } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// DELETE /api/sessions/[id]/attendance-mgmt/remove — remove student from session (kick)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: sessionId } = await params
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Verify session exists
    const sessionRows = await db.select().from(session).where(eq(session.id, sessionId)).limit(1)
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if attendance record exists
    const attendanceRows = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.sessionId, sessionId),
          eq(attendance.studentId, studentId)
        )
      )
      .limit(1)

    if (attendanceRows.length === 0) {
      return NextResponse.json({ error: 'Student not found in this session' }, { status: 404 })
    }

    // Delete the attendance record
    await db.delete(attendance)
      .where(
        and(
          eq(attendance.sessionId, sessionId),
          eq(attendance.studentId, studentId)
        )
      )

    return NextResponse.json({ success: true, message: 'Student removed from session' })
  } catch (error) {
    console.error('Error removing student from session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}