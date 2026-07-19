import { NextRequest, NextResponse } from 'next/server'
import { eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, student, attendance } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/attendees — list all students + their attendance for a session
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const sessionRows = await db.select().from(session).where(eq(session.id, id)).limit(1)
  const sessionRow = sessionRows[0]
  if (!sessionRow) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  const courseRows = await db.select().from(course).where(eq(course.id, sessionRow.courseId)).limit(1)
  const courseRow = courseRows[0]

  // Students matching course by id OR course code
  const conditions = []
  if (sessionRow.courseId) conditions.push(eq(student.courseId, sessionRow.courseId))
  if (courseRow?.code) conditions.push(eq(student.courseCode, courseRow.code))
  const students = await db
    .select()
    .from(student)
    .where(conditions.length > 0 ? or(...conditions) : undefined)
    .orderBy(student.studentCode)

  const attendances = await db.select().from(attendance).where(eq(attendance.sessionId, id))
  const attMap = new Map(attendances.map((a) => [a.studentId, a]))

  const attendees = students.map((s) => {
    const a = attMap.get(s.id)
    return {
      studentId: s.id,
      studentCode: s.studentCode,
      name: s.name,
      email: s.email,
      phone: s.phone,
      attendance: a
        ? {
            id: a.id,
            status: a.status,
            checkInTime: a.checkInTime,
            verified: !!a.verified,
            qrVerified: !!a.qrVerified,
            notes: a.notes,
          }
        : null,
    }
  })

  return NextResponse.json({
    session: { ...sessionRow, course: courseRow ?? null },
    attendees,
  })
}
