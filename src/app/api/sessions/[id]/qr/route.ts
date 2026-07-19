import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, attendance, student } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { buildQrPayload, buildRotatingCode, QR_ROTATION_SECONDS } from '@/lib/security'
import type { QrPayload } from '@/lib/types'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/qr — current rotating QR payload (teacher displays this)
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
  if (!sessionRow.qrSecret) {
    return NextResponse.json({ error: 'QR belum dikonfigurasi untuk sesi ini' }, { status: 400 })
  }
  const courseRows = await db.select().from(course).where(eq(course.id, sessionRow.courseId)).limit(1)
  const courseRow = courseRows[0]

  const now = new Date()
  const payload = buildQrPayload(sessionRow.id, sessionRow.qrSecret, now)
  const qr: QrPayload = payload
  const nextRotation = (Math.floor(now.getTime() / 1000 / QR_ROTATION_SECONDS) + 1) * QR_ROTATION_SECONDS * 1000

  // Real-time attendee count + list of names
  const verifiedAttendees = await db
    .select({
      sessionId: attendance.sessionId,
      studentId: attendance.studentId,
      status: attendance.status,
      checkInTime: attendance.checkInTime,
    })
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionRow.id), eq(attendance.verified, 1)))
    .orderBy(attendance.checkInTime)

  // Fetch student names
  const attendeeStudentIds = Array.from(new Set(verifiedAttendees.map((a) => a.studentId)))
  let attendeeList: { name: string; studentCode: string; status: string; checkInTime: string }[] = []
  if (attendeeStudentIds.length > 0) {
    const allStudents = await db
      .select({ id: student.id, name: student.name, studentCode: student.studentCode })
      .from(student)
    const map = new Map(allStudents.map((s) => [s.id, s]))
    attendeeList = verifiedAttendees.map((a) => {
      const s = map.get(a.studentId)
      return {
        name: s?.name ?? '',
        studentCode: s?.studentCode ?? '',
        status: a.status,
        checkInTime: a.checkInTime,
      }
    })
  }
  const attendeeCount = verifiedAttendees.length

  // Total students for this session
  const conditions = []
  if (sessionRow.courseId) conditions.push(eq(student.courseId, sessionRow.courseId))
  if (courseRow?.code) conditions.push(eq(student.courseCode, courseRow.code))
  const [totalRow] = await db
    .select({ n: count() })
    .from(student)
    .where(conditions.length > 0 ? or(...conditions) : undefined)
  const totalStudents = Number(totalRow?.n ?? 0)

  const slotsRemaining = Math.max(0, sessionRow.maxAttendees - attendeeCount)
  const isFull = attendeeCount >= sessionRow.maxAttendees

  // 6-digit rotating code (same window as QR)
  const rotatingCode = buildRotatingCode(sessionRow.id, sessionRow.qrSecret, now)

  return NextResponse.json({
    qr,
    rotatingCode,
    course: { code: courseRow?.code ?? '', name: courseRow?.name ?? '' },
    session: {
      id: sessionRow.id,
      sessionNumber: sessionRow.sessionNumber,
      title: sessionRow.title,
      room: sessionRow.room,
      mode: sessionRow.mode,
      platform: sessionRow.platform,
      teacher: sessionRow.teacher,
      topicOfDay: sessionRow.topicOfDay,
      maxAttendees: sessionRow.maxAttendees,
    },
    attendeeCount,
    attendeeList,
    totalStudents,
    slotsRemaining,
    isFull,
    serverTime: now.toISOString(),
    nextRotationAt: new Date(nextRotation).toISOString(),
    rotationSeconds: QR_ROTATION_SECONDS,
  })
}
