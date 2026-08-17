import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, attendance, student, quotaDailyUsage } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'
import { applyDailyQuotaDeduction, hasApprovedLeaveForDate, hasValidExcuseForDate } from '@/lib/quota'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// POST /api/sessions/[id]/attendance-simple — simple student self-attendance (button click)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: sessionId } = await params
    
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

    const now = new Date()
    const sessionDate = new Date(sessionRow.date)
    const dayKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`

    // Process daily quota reduction (catch-up) before checking quota below.
    await applyDailyQuotaDeduction(studentSess.id, dayKey)

// === BASIC VALIDATIONS ===

    // 1. Check session still open — sejak sesi dibuat siswa boleh absen kapan saja
    //    sebelum status sesi 'completed'/'cancelled' (tidak dibatasi window waktu).
    if (sessionRow.status === 'completed' || sessionRow.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        status: 'absent',
        message: sessionRow.status === 'cancelled'
          ? 'Sesi ini dibatalkan. Tidak bisa absen.'
          : 'Sesi sudah selesai (completed). Tidak bisa absen lagi.',
      }, { status: 403 })
    }

    // 2. Check if student already attended today (one session per day)
    const todayAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, studentSess.id),
          eq(attendance.dayKey, dayKey),
          eq(attendance.verified, 1)
        )
      )
      .limit(1)

    if (todayAttendance.length > 0) {
      return NextResponse.json({
        success: false,
        status: 'absent',
        message: `Anda sudah absen hari ini. Hanya boleh mengikuti satu sesi per hari.`,
      }, { status: 409 })
    }

    // 3. Check quota — usage is counted from QuotaDailyUsage (daily model), NOT from Attendance.
    const [dailyUsageRow] = await db
      .select({ n: count() })
      .from(quotaDailyUsage)
      .where(eq(quotaDailyUsage.studentId, studentSess.id))
    const dailyUsageCount = Number(dailyUsageRow?.n ?? 0)
    const remaining = Math.max(0, fullStudent.sessionQuota - dailyUsageCount)
    const hasLeave = await hasApprovedLeaveForDate(studentSess.id, dayKey)
    const hasExcuse = await hasValidExcuseForDate(studentSess.id, dayKey)

    if (remaining <= 0 && !hasLeave && !hasExcuse) {
return NextResponse.json({
  success: false,
  status: 'absent',
  message: `Kuota sesi Anda habis (${fullStudent.sessionQuota}/${fullStudent.sessionQuota}). Silakan perpanjang/extend ke pengajar.`,
}, { status: 403 })
    }

    // 4. Check capacity
    const [capRow] = await db
      .select({ n: count() })
      .from(attendance)
      .where(and(eq(attendance.sessionId, sessionId), eq(attendance.verified, 1)))
    const currentAttendeeCount = Number(capRow?.n ?? 0)
    
    if (currentAttendeeCount >= sessionRow.maxAttendees) {
return NextResponse.json({
  success: false,
  status: 'absent',
  message: `Kapasitas sesi penuh (${currentAttendeeCount}/${sessionRow.maxAttendees})`,
}, { status: 403 })
    }

    // All checks passed - record attendance
    const [created] = await db
      .insert(attendance)
      .values({
        id: newId('a'),
        sessionId,
        studentId: studentSess.id,
        status: 'present',
        checkInTime: now.toISOString(),
        dayKey,
        qrVerified: 0, // Not using QR
        verified: 1,   // Verified via self-attendance
        notes: 'Absensi mandiri via tombol',
      })
      .returning()

    // Attendance does NOT consume quota in the daily model — remaining stays as-is.
    const newRemaining = remaining
    
    return NextResponse.json({
      success: true,
      status: 'present',
      verified: true,
      message: `Absensi berhasil! Sisa kuota: ${newRemaining} sesi.`,
      quotaRemaining: newRemaining,
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error in simple attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}