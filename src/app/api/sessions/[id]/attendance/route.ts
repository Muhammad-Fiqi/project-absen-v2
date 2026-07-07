import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth'
import { verifyQrPayload, haversineMeters } from '@/lib/security'
import type { AttendanceSubmitRequest, AttendanceSubmitResponse } from '@/lib/types'

export const runtime = 'nodejs'

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// POST /api/sessions/[id]/attendance — submit attendance with multi-factor verification
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
      { success: false, message: 'Anda sudah melakukan absensi untuk sesi ini', status: existing.status } as AttendanceSubmitResponse,
      { status: 409 }
    )
  }

  const now = new Date()
  const checks: AttendanceSubmitResponse['checks'] = {}
  let factorsPassed = 0
  const requiredFactors = session.course.requiredFactors.split(',').map((f) => f.trim()).filter(Boolean)
  let factorsRequired = requiredFactors.length

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
    // Block immediately — no point checking other factors
    const response: AttendanceSubmitResponse = {
      success: false,
      status: 'absent',
      verified: false,
      factorsPassed: 0,
      factorsRequired,
      message: `Kuota sesi habis (${verifiedCount}/${fullStudent.sessionQuota}). Hubungi pengajar untuk perpanjang kuota.`,
      checks,
      flagged: false,
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
      factorsPassed: 0,
      factorsRequired,
      message: 'Anda sudah absen hari ini. Materi sama di semua sesi — cukup ikut 1 sesi per hari.',
      checks,
      flagged: false,
      quotaRemaining: remaining,
    }
    return NextResponse.json(response, { status: 409 })
  } else {
    checks.daily = { passed: true }
  }

  // === TIME WINDOW CHECK ===
  // If teacher has manually set status to 'active', override the time window —
  // the teacher is present and has opened attendance. This allows demo/testing
  // and real-world flexibility (teacher opens attendance when ready).
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

  // === QR CHECK ===
  if (requiredFactors.includes('qr')) {
    if (body.qr && session.qrSecret) {
      const v = verifyQrPayload(body.qr, session.qrSecret, now)
      checks.qr = { passed: v.valid, reason: v.reason }
      if (v.valid) factorsPassed++
    } else {
      checks.qr = { passed: false, reason: 'QR tidak disertakan' }
    }
  }

  // === PIN CHECK ===
  if (requiredFactors.includes('pin')) {
    if (body.pin && session.sessionPin) {
      const ok = body.pin === session.sessionPin
      checks.pin = { passed: ok, reason: ok ? undefined : 'PIN sesi salah' }
      if (ok) factorsPassed++
    } else {
      checks.pin = { passed: false, reason: 'PIN tidak disertakan' }
    }
  }

  // === GEO CHECK (offline sessions only) ===
  let geoDistanceM: number | undefined
  if (requiredFactors.includes('geo') && session.mode === 'offline') {
    if (body.geo && session.locationLat != null && session.locationLng != null) {
      geoDistanceM = haversineMeters(body.geo.lat, body.geo.lng, session.locationLat, session.locationLng)
      const radius = session.geoRadiusM ?? session.course.geoRadiusM ?? 150
      const ok = geoDistanceM <= radius
      checks.geo = { passed: ok, reason: ok ? undefined : `Anda berada ${geoDistanceM}m dari lokasi kelas (radius ${radius}m)`, distanceM: geoDistanceM }
      if (ok) factorsPassed++
    } else {
      checks.geo = { passed: false, reason: 'Lokasi GPS tidak disertakan — aktifkan izin lokasi' }
    }
  } else if (requiredFactors.includes('geo') && session.mode === 'online') {
    // Online sessions skip geo (student can be anywhere)
    checks.geo = { passed: true, reason: 'Sesi online — geo-lokasi tidak wajib' }
    factorsPassed++
  }

  // === SELFIE CHECK (via VLM) ===
  if (requiredFactors.includes('selfie')) {
    if (body.selfieImage) {
      try {
        const baseUrl = new URL(req.url).origin
        const vlmRes = await fetch(`${baseUrl}/api/verify-selfie`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: body.selfieImage, studentName: student.name }),
        })
        const vlmData = await vlmRes.json()
        const ok = vlmData?.verified === true
        checks.selfie = { passed: ok, reason: ok ? undefined : vlmData?.reason || 'Verifikasi wajah gagal' }
        if (ok) factorsPassed++
      } catch {
        checks.selfie = { passed: false, reason: 'Layanan verifikasi wajah tidak tersedia' }
      }
    } else {
      checks.selfie = { passed: false, reason: 'Foto selfie tidak disertakan' }
    }
  }

  // === DEVICE FINGERPRINT CHECK (anti-spoofing) ===
  let deviceFlagged = false
  if (body.deviceFingerprint) {
    const sameDeviceOtherStudent = await db.attendance.findFirst({
      where: {
        sessionId,
        deviceFingerprint: body.deviceFingerprint,
        studentId: { not: student.id },
      },
    })
    if (sameDeviceOtherStudent) {
      deviceFlagged = true
      checks.device = { passed: false, reason: 'Perangkat ini sudah digunakan siswa lain untuk sesi ini' }
    } else {
      checks.device = { passed: true }
    }
    const ip = getClientIp(req)
    if (ip !== 'unknown') {
      const sameIpOtherStudent = await db.attendance.findFirst({
        where: {
          sessionId,
          ipAddress: ip,
          studentId: { not: student.id },
          checkInTime: { gte: new Date(now.getTime() - 5 * 60 * 1000) },
        },
      })
      if (sameIpOtherStudent) {
        deviceFlagged = true
        checks.device = { passed: false, reason: 'IP ini baru saja digunakan siswa lain — absensi ditandai' }
      }
    }
  } else {
    checks.device = { passed: false, reason: 'Sidik perangkat tidak tersedia' }
  }

  // === DETERMINE VERIFICATION ===
  const allRequiredPassed = factorsPassed >= factorsRequired
  const timeOk = timeOpen
  const deviceOk = !deviceFlagged
  const verified = allRequiredPassed && timeOk && deviceOk
  const flagged = deviceFlagged || (!verified && factorsPassed > 0)
  const status = !timeOk ? 'absent' : isLate ? 'late' : 'present'

  const attendance = await db.attendance.create({
    data: {
      sessionId,
      studentId: student.id,
      status: verified ? status : 'absent',
      method: body.method || (factorsPassed >= 2 ? 'multi' : 'qr'),
      checkInTime: now,
      dayKey: dk,
      deviceFingerprint: body.deviceFingerprint || null,
      ipAddress: getClientIp(req),
      geoLat: body.geo?.lat ?? null,
      geoLng: body.geo?.lng ?? null,
      geoVerified: checks.geo?.passed ?? false,
      geoDistanceM: geoDistanceM ?? null,
      pinVerified: checks.pin?.passed ?? false,
      qrVerified: checks.qr?.passed ?? false,
      selfieVerified: checks.selfie?.passed ?? false,
      verified,
      factorsPassed,
      factorsRequired,
      flagged,
      notes: !verified ? `Percobaan: ${factorsPassed}/${factorsRequired} faktor lolos` : null,
    },
  })

  if (body.deviceFingerprint) {
    await db.deviceLog.upsert({
      where: { deviceFingerprint_studentId: { deviceFingerprint: body.deviceFingerprint, studentId: student.id } },
      create: {
        deviceFingerprint: body.deviceFingerprint,
        studentId: student.id,
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || null,
      },
      update: {
        lastSeen: now,
        usageCount: { increment: 1 },
        ipAddress: getClientIp(req),
      },
    })
  }

  const newRemaining = verified ? remaining - 1 : remaining
  const response: AttendanceSubmitResponse = {
    success: verified,
    status: verified ? status : 'absent',
    verified,
    factorsPassed,
    factorsRequired,
    message: verified
      ? status === 'late'
        ? `Absensi tercatat (TERLAMBAT). Sisa kuota: ${newRemaining} sesi.`
        : `Absensi berhasil! Sisa kuota: ${newRemaining} sesi.`
      : `Absensi GAGAL — ${factorsPassed}/${factorsRequired} faktor terverifikasi. Kuota tidak terpotong.`,
    checks,
    flagged,
    quotaRemaining: newRemaining,
  }
  return NextResponse.json(response, { status: verified ? 200 : 422 })
}
