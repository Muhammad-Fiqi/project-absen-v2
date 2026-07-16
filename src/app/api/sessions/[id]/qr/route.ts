import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import { buildQrPayload, buildRotatingCode, QR_ROTATION_SECONDS } from '@/lib/security'
import type { QrPayload } from '@/lib/types'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/qr — current rotating QR payload (teacher displays this)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  // Only teacher should generate the display QR.
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const session = await db.session.findUnique({ where: { id }, include: { course: true } })
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }
  if (!session.qrSecret) {
    return NextResponse.json({ error: 'QR belum dikonfigurasi untuk sesi ini' }, { status: 400 })
  }
  const now = new Date()
  const payload = buildQrPayload(session.id, session.qrSecret, now)
  const qr: QrPayload = payload
  // Also compute next rotation time
  const nextRotation = (Math.floor(now.getTime() / 1000 / QR_ROTATION_SECONDS) + 1) * QR_ROTATION_SECONDS * 1000
  // Real-time attendee count + list of names
  const verifiedAttendees = await db.attendance.findMany({
    where: { sessionId: session.id, verified: true },
    include: { student: { select: { name: true, studentCode: true } } },
    orderBy: { checkInTime: 'asc' },
  })
  const attendeeList = verifiedAttendees.map((a) => ({
    name: a.student.name,
    studentCode: a.student.studentCode,
    status: a.status,
    checkInTime: a.checkInTime.toISOString(),
  }))
  const attendeeCount = verifiedAttendees.length
  const totalStudents = await db.student.count({
    where: { OR: [{ courseId: session.courseId }, { courseCode: session.course.code }] },
  })
  const slotsRemaining = Math.max(0, session.maxAttendees - attendeeCount)
  const isFull = attendeeCount >= session.maxAttendees

  // 6-digit rotating code (same window as QR)
  const rotatingCode = buildRotatingCode(session.id, session.qrSecret, now)

  return NextResponse.json({
    qr,
    rotatingCode,
    course: { code: session.course.code, name: session.course.name },
    session: {
      id: session.id,
      sessionNumber: session.sessionNumber,
      title: session.title,
      room: session.room,
      mode: session.mode,
      platform: session.platform,
      teacher: session.teacher,
      topicOfDay: session.topicOfDay,
      maxAttendees: session.maxAttendees,
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