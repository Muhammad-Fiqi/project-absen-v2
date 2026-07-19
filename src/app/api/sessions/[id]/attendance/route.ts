import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, attendance, student } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'
import { verifyQrPayload, verifyRotatingCode } from '@/lib/security'
import type { AttendanceSubmitRequest, AttendanceSubmitResponse } from '@/lib/types'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// POST /api/sessions/[id]/attendance — submit QR-only attendance
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: sessionId } = await params
  const body = (await req.json()) as AttendanceSubmitRequest

  // Look up session + course
  const sessionRows = await db
    .select()
    .from(session)
    .where(eq(session.id, sessionId))
    .limit(1)
  const sessionRow = sessionRows[0]
  if (!sessionRow) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  const courseRows = await db
    .select()
    .from(course)
    .where(eq(course.id, sessionRow.courseId))
    .limit(1)
  const courseRow = courseRows[0]
  if (!courseRow) {
    return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
  }

  // Full student (for quota)
  const studentRows = await db
    .select()
    .from(student)
    .where(eq(student.id, studentSess.id))
    .limit(1)
  const fullStudent = studentRows[0]
  if (!fullStudent) {
    return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
  }

  // Check existing attendance for THIS session (prevent double submission)
  const existingRows = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.studentId, studentSess.id)))
    .limit(1)
  const existing = existingRows[0]
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
  const [usedCountRow] = await db
    .select({ n: count() })
    .from(attendance)
    .where(and(eq(attendance.studentId, studentSess.id), eq(attendance.verified, 1)))
  const verifiedCount = Number(usedCountRow?.n ?? 0)
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
  const sessionDate = new Date(sessionRow.date)
  const dk = dayKey(sessionDate)
  const todayAttendanceRows = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, studentSess.id),
        eq(attendance.dayKey, dk),
        eq(attendance.verified, 1)
      )
    )
    .limit(1)
  const todayAttendance = todayAttendanceRows[0]
  if (todayAttendance) {
    // Look up that session for display
    const otherSessionRows = await db
      .select()
      .from(session)
      .where(eq(session.id, todayAttendance.sessionId))
      .limit(1)
    const otherSession = otherSessionRows[0]
    checks.daily = {
      passed: false,
      reason: `Anda sudah absen sesi lain hari ini (${otherSession ? new Date(otherSession.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''} · ${otherSession && otherSession.mode === 'online' ? otherSession.platform : 'Offline'}). Materi sama setiap sesi — cukup 1 sesi/hari.`,
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
  const startTime = new Date(sessionRow.startTime)
  const endTime = new Date(sessionRow.endTime)
  const opensAt = new Date(startTime.getTime() - courseRow.graceMinutesBefore * 60 * 1000)
  const closesAt = new Date(endTime.getTime() + courseRow.graceMinutesAfter * 60 * 1000)
  const inTimeWindow = now.getTime() >= opensAt.getTime() && now.getTime() <= closesAt.getTime()
  const timeOpen = sessionRow.status === 'active' ? true : inTimeWindow
  let isLate = false
  if (!timeOpen) {
    checks.time = { passed: false, reason: now.getTime() < opensAt.getTime() ? 'Absensi belum dibuka' : 'Absensi sudah ditutup' }
  } else {
    isLate = now.getTime() > startTime.getTime() + 5 * 60 * 1000
    checks.time = { passed: true }
  }

  // === CAPACITY CHECK ===
  const [capRow] = await db
    .select({ n: count() })
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.verified, 1)))
  const currentAttendeeCount = Number(capRow?.n ?? 0)
  const capacityOk = currentAttendeeCount < sessionRow.maxAttendees
  checks.capacity = {
    passed: capacityOk,
    reason: capacityOk ? undefined : `Kapasitas sesi penuh (${currentAttendeeCount}/${sessionRow.maxAttendees})`,
  }

  // === QR OR CODE CHECK ===
  let qrValid = false
  let verifyMethod = 'none'
  if (body.qr && sessionRow.qrSecret) {
    // Method 1: QR scan
    const v = verifyQrPayload(body.qr, sessionRow.qrSecret, now)
    checks.qr = { passed: v.valid, reason: v.reason }
    qrValid = v.valid
    verifyMethod = 'qr'
  } else if (body.code && sessionRow.qrSecret) {
    // Method 2: Manual 6-digit code
    const v = verifyRotatingCode(body.code, sessionId, sessionRow.qrSecret, now)
    checks.code = { passed: v.valid, reason: v.reason }
    qrValid = v.valid
    verifyMethod = 'code'
  } else {
    checks.qr = { passed: false, reason: 'QR atau kode tidak disertakan' }
  }

  // === DETERMINE VERIFICATION ===
  const verified = qrValid && timeOpen && quotaOk && checks.daily.passed && capacityOk
  const status = !timeOpen ? 'absent' : isLate ? 'late' : 'present'

  const [created] = await db
    .insert(attendance)
    .values({
      id: newId('a'),
      sessionId,
      studentId: studentSess.id,
      status: verified ? status : 'absent',
      checkInTime: now.toISOString(),
      dayKey: dk,
      qrVerified: qrValid ? 1 : 0,
      verified: verified ? 1 : 0,
      notes: !verified ? `${verifyMethod === 'code' ? 'Kode' : 'QR'} verification failed or checks not passed` : null,
    })
    .returning()

  const newRemaining = verified ? remaining - 1 : remaining
  const response: AttendanceSubmitResponse = {
    success: verified,
    status: verified ? status : 'absent',
    verified,
    message: verified
      ? status === 'late'
        ? `Absensi tercatat (TERLAMBAT). Sisa kuota: ${newRemaining} sesi.`
        : `Absensi berhasil! Sisa kuota: ${newRemaining} sesi.`
      : `Absensi GAGAL — ${verifyMethod === 'code' ? 'Kode' : 'QR'} tidak terverifikasi. Kuota tidak terpotong.`,
    checks,
    quotaRemaining: newRemaining,
  }
  return NextResponse.json(response, { status: verified ? 200 : 422 })
}
