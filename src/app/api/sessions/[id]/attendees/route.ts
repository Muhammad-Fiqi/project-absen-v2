import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/attendees — list all students + their attendance for a session
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const session = await db.session.findUnique({
    where: { id },
    include: { course: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }
  const students = await db.student.findMany({
    where: { OR: [{ courseId: session.courseId }, { courseCode: session.course.code }] },
    orderBy: { studentCode: 'asc' },
  })
  const attendances = await db.attendance.findMany({ where: { sessionId: id } })
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
            checkInTime: a.checkInTime.toISOString(),
            verified: a.verified,
            qrVerified: a.qrVerified,
            notes: a.notes,
          }
        : null,
    }
  })
  return NextResponse.json({ session, attendees })
}