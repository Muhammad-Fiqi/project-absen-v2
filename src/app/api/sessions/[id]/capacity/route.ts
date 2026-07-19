import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, attendance } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/capacity — student can see real-time capacity & who's checked in
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: sessionId } = await params

  const sessionRows = await db.select().from(session).where(eq(session.id, sessionId)).limit(1)
  const sessionRow = sessionRows[0]
  if (!sessionRow) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }
  const courseRows = await db.select().from(course).where(eq(course.id, sessionRow.courseId)).limit(1)
  const courseRow = courseRows[0]

  // Check if student already has attendance for this session
  const myRows = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.studentId, studentSess.id)))
    .limit(1)
  const myAttendance = myRows[0]

  // Verified attendees (names + codes only, for transparency)
  const verifiedAttendees = await db
    .select({
      id: attendance.id,
      sessionId: attendance.sessionId,
      studentId: attendance.studentId,
      status: attendance.status,
      checkInTime: attendance.checkInTime,
    })
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.verified, 1)))
    .orderBy(attendance.checkInTime)

  // Fetch related students in one shot
  const attendeeStudentIds = Array.from(new Set(verifiedAttendees.map((a) => a.studentId)))
  let studentNameMap = new Map<string, { name: string; studentCode: string }>()
  if (attendeeStudentIds.length > 0) {
    const attendeeStudents = await db
      .select({ id: student.id, name: student.name, studentCode: student.studentCode })
      .from(student)
    // small dataset — filter in JS to avoid building OR chain
    for (const s of attendeeStudents) {
      if (attendeeStudentIds.includes(s.id)) {
        studentNameMap.set(s.id, { name: s.name, studentCode: s.studentCode })
      }
    }
  }

  const attendeeList = verifiedAttendees.map((a) => {
    const s = studentNameMap.get(a.studentId)
    return {
      studentCode: s?.studentCode ?? '',
      name: s?.name ?? '',
      status: a.status,
      checkInTime: a.checkInTime,
    }
  })

  const attendeeCount = verifiedAttendees.length
  const isFull = attendeeCount >= sessionRow.maxAttendees
  const slotsRemaining = Math.max(0, sessionRow.maxAttendees - attendeeCount)

  // Check if student already attended today (different session)
  const todayKey = new Date().toISOString().slice(0, 10)
  let todayAttendance: typeof myAttendance | null = null
  if (!myAttendance) {
    const todayRows = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, studentSess.id),
          eq(attendance.dayKey, todayKey),
          eq(attendance.verified, 1)
        )
      )
      .limit(1)
    todayAttendance = todayRows[0] ?? null
  }

  return NextResponse.json({
    session: {
      id: sessionRow.id,
      title: sessionRow.title,
      sessionNumber: sessionRow.sessionNumber,
      mode: sessionRow.mode,
      platform: sessionRow.platform,
      room: sessionRow.room,
      teacher: sessionRow.teacher,
      maxAttendees: sessionRow.maxAttendees,
      startTime: sessionRow.startTime,
      endTime: sessionRow.endTime,
      status: sessionRow.status,
    },
    capacity: {
      max: sessionRow.maxAttendees,
      filled: attendeeCount,
      remaining: slotsRemaining,
      isFull,
      attendeeList,
    },
    myStatus: myAttendance
      ? {
          attended: true,
          status: myAttendance.status,
          verified: !!myAttendance.verified,
          checkInTime: myAttendance.checkInTime,
        }
      : {
          attended: false,
          canCheckIn: !isFull && !todayAttendance,
          blockedReason: isFull
            ? 'Kelas sudah penuh'
            : todayAttendance
            ? 'Anda sudah absen di sesi lain hari ini'
            : null,
        },
  })
}
