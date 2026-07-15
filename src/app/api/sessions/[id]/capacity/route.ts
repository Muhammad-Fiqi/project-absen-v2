import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/capacity — student can see real-time capacity & who's checked in
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const student = await getCurrentStudent()
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: sessionId } = await params
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { course: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  // Check if student already has attendance for this session
  const myAttendance = await db.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: student.id } },
  })

  // Get verified attendees (names + codes only, for transparency)
  const verifiedAttendees = await db.attendance.findMany({
    where: { sessionId, verified: true },
    include: { student: { select: { name: true, studentCode: true } } },
    orderBy: { checkInTime: 'asc' },
  })

  const attendeeList = verifiedAttendees.map((a) => ({
    studentCode: a.student.studentCode,
    name: a.student.name,
    status: a.status,
    checkInTime: a.checkInTime.toISOString(),
  }))

  const attendeeCount = verifiedAttendees.length
  const isFull = attendeeCount >= session.maxAttendees
  const slotsRemaining = Math.max(0, session.maxAttendees - attendeeCount)

  // Check if student already attended today (different session)
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayAttendance = myAttendance
    ? null // already checked in THIS session
    : await db.attendance.findFirst({
        where: { studentId: student.id, dayKey: todayKey, verified: true },
      })

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      sessionNumber: session.sessionNumber,
      mode: session.mode,
      platform: session.platform,
      room: session.room,
      teacher: session.teacher,
      maxAttendees: session.maxAttendees,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      status: session.status,
    },
    capacity: {
      max: session.maxAttendees,
      filled: attendeeCount,
      remaining: slotsRemaining,
      isFull,
      attendeeList,
    },
    myStatus: myAttendance
      ? {
          attended: true,
          status: myAttendance.status,
          verified: myAttendance.verified,
          checkInTime: myAttendance.checkInTime.toISOString(),
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