import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth'
import { verifyQrPayload } from '@/lib/security'
import type { AttendanceSubmitRequest, AttendanceSubmitResponse } from '@/lib/types'

export const runtime = 'nodejs'

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// POST /api/sessions/[id]/attendance — submit QR-only attendance
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const student = await getCurrentStudent()
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: sessionId } = await params
  const body = (await req.json()) as AttendanceSubmitRequest

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { course: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  // Full student (for quota)
  const fullStudent = await db.student.findUnique({ where: { id: student.id } })
  if (!fullStudent) {
    return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
  }

  // Check existing attendance for THIS session (prevent double submission)
  const existing = await db.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: student.id } },
  })
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        message: 'Anda sudah melakukan absensi untuk sesi ini',
        status: existing.status,
        checks: {},
      } as AttendanceSubmitResponse,
      { status: 409 }
    )
  }

  const now = new Date()
  const checks: AttendanceSubmitResponse['checks'] = {}

  // === QUOTA CHECK ===
  const verifiedCount = await db.attendance.count({
    where: { studentId: student.id, verified: true },
  })
  const remaining = Math.max(0, fullStudent.sessionQuota - verifiedCount)
  const quotaOk = remaining > 0
  checks.quota = {
    passed: quotaOk,
    reason: quotaOk ? undefined : `Kuota sesi Anda habis (${fullStudent.sessionQuota}/${fullStudent.sessionQuota}). Silakan perpanjang/extend ke pengajar.`,
    remaining,
  }
  if (!quotaOk) {
    const response: AttendanceSubmitResponse = {
      success: false,
      status: 'absent',
      verified: false,
      message: `Kuota sesi habis (${verifiedCount}/${fullStudent.sessionQuota}). Hubungi pengajar untuk perpanjang kuota.`,
      checks,
      quotaRemaining: 0,
    }
    return NextResponse.json(response, { status: 403 })
  }

  // === ONE-SESSION-PER-DAY CHECK ===
  const dk = dayKey(session.date)
  const todayAttendance = await db.attendance.findFirst({
    where: { studentId: student.id, dayKey: dk, verified: true },
    include: { session: true },
  })
  if (todayAttendance) {
    checks.daily = {
      passed: false,
      reason: `Anda sudah absen sesi lain hari ini (${new Date(todayAttendance.session.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · ${todayAttendance.session.mode === 'online' ? todayAttendance.session.platform : 'Offline'}). Materi sama setiap sesi — cukup 1 sesi/hari.`,
      attendedSession: todayAttendance.sessionId,
    }
    const response: AttendanceSubmitResponse = {
      success: false,
      status: 'absent',
      verified: false,
      message: 'Anda sudah absen hari ini. Materi sama di semua sesi — cukup ikut 1 sesi per hari.',
      checks,
      quotaRemaining: remaining,
    }
    return NextResponse.json(response, { status: 409 })
  } else {
    checks.daily = { passed: true }
  }

  // === TIME WINDOW CHECK ===
  const opensAt = new Date(session.startTime.getTime() - session.course.graceMinutesBefore * 60 * 1000)
  const closesAt = new Date(session.endTime.getTime() + session.course.graceMinutesAfter * 60 * 1000)
  const inTimeWindow = now.getTime() >= opensAt.getTime() && now.getTime() <= closesAt.getTime()
  const timeOpen = session.status === 'active' ? true : inTimeWindow
  let isLate = false
  if (!timeOpen) {
    checks.time = { passed: false, reason: now.getTime() < opensAt.getTime() ? 'Absensi belum dibuka' : 'Absensi sudah ditutup' }
  } else {
    isLate = now.getTime() > session.startTime.getTime() + 5 * 60 * 1000
    checks.time = { passed: true }
  }

  // === CAPACITY CHECK ===
  const currentAttendeeCount = await db.attendance.count({
    where: { sessionId, verified: true },
  })
  const capacityOk = currentAttendeeCount < session.maxAttendees
  checks.capacity = {
    passed: capacityOk,
    reason: capacityOk ? undefined : `Kapasitas sesi penuh (${currentAttendeeCount}/${session.maxAttendees})`,
  }

  // === QR CHECK ===
  let qrValid = false
  if (body.qr && session.qrSecret) {
    const v = verifyQrPayload(body.qr, session.qrSecret, now)
    checks.qr = { passed: v.valid, reason: v.reason }
    qrValid = v.valid
  } else {
    checks.qr = { passed: false, reason: 'QR tidak disertakan' }
  }

  // === DETERMINE VERIFICATION ===
  const verified = qrValid && timeOpen && quotaOk && checks.daily.passed && capacityOk
  const status = !timeOpen ? 'absent' : isLate ? 'late' : 'present'

  const attendance = await db.attendance.create({
    data: {
      sessionId,
      studentId: student.id,
      status: verified ? status : 'absent',
      checkInTime: now,
      dayKey: dk,
      qrVerified: qrValid,
      verified,
      notes: !verified ? 'QR verification failed or checks not passed' : null,
    },
  })

  const newRemaining = verified ? remaining - 1 : remaining
  const response: AttendanceSubmitResponse = {
    success: verified,
    status: verified ? status : 'absent',
    verified,
    message: verified
      ? status === 'late'
        ? `Absensi tercatat (TERLAMBAT). Sisa kuota: ${newRemaining} sesi.`
        : `Absensi berhasil! Sisa kuota: ${newRemaining} sesi.`
      : `Absensi GAGAL — QR tidak terverifikasi. Kuota tidak terpotong.`,
    checks,
    quotaRemaining: newRemaining,
  }
  return NextResponse.json(response, { status: verified ? 200 : 422 })
}