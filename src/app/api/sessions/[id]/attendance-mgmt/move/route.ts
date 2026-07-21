import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendance, session, student } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// POST /api/sessions/[id]/attendance-mgmt/move — move student from this session to another
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: sourceSessionId } = await params
    const { targetSessionId, studentId } = await req.json()

    if (!targetSessionId || !studentId) {
      return NextResponse.json({ error: 'Target session ID and student ID are required' }, { status: 400 })
    }

    // Verify source session exists
    const sourceSessionRows = await db
      .select()
      .from(session)
      .where(eq(session.id, sourceSessionId))
      .limit(1)

    if (sourceSessionRows.length === 0) {
      return NextResponse.json({ error: 'Source session not found' }, { status: 404 })
    }

    // Verify target session exists
    const targetSessionRows = await db
      .select()
      .from(session)
      .where(eq(session.id, targetSessionId))
      .limit(1)

    if (targetSessionRows.length === 0) {
      return NextResponse.json({ error: 'Target session not found' }, { status: 404 })
    }

    // Verify student exists
    const studentRows = await db
      .select()
      .from(student)
      .where(eq(student.id, studentId))
      .limit(1)

    if (studentRows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if student is in source session
    const sourceAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.sessionId, sourceSessionId),
          eq(attendance.studentId, studentId)
        )
      )
      .limit(1)

    // Remove from source session if exists
    if (sourceAttendance.length > 0) {
      await db.delete(attendance)
        .where(
          and(
            eq(attendance.sessionId, sourceSessionId),
            eq(attendance.studentId, studentId)
          )
        )
    }

    // Check if student already exists in target session (avoid duplicates)
    const targetAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.sessionId, targetSessionId),
          eq(attendance.studentId, studentId)
        )
      )
      .limit(1)

    // If not already in target session, add them
    if (targetAttendance.length === 0) {
      await db.insert(attendance).values({
        id: newId('at'),
        sessionId: targetSessionId,
        studentId: studentId,
        status: 'present', // Default to present when moved by teacher
        checkInTime: new Date().toISOString(),
        dayKey: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        qrVerified: 0,
        verified: 1, // Mark as verified since it's teacher-initiated
        notes: 'Moved by teacher',
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Student moved successfully' 
    })
  } catch (error) {
    console.error('Error moving student between sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}