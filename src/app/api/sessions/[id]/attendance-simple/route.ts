import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, attendance, student } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'
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
    const sessionStartTime = new Date(sessionRow.startTime)
    const sessionEndTime = new Date(sessionRow.endTime)
    const dayKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`

// === BASIC VALIDATIONS ===

    // 1. Check time window — if session is ACTIVE, allow anytime; otherwise enforce grace window
    if (sessionRow.status !== 'active') {
      const opensAt = new Date(sessionStartTime.getTime() - courseRow.graceMinutesBefore * 60 * 1000)
      const closesAt = new Date(sessionEndTime.getTime() + courseRow.graceMinutesAfter * 60 * 1000)
      const isWithinTimeWindow = now.getTime() >= opensAt.getTime() && now.getTime() <= closesAt.getTime()
      
      if (!isWithinTimeWindow) {
        return NextResponse.json({
          success: false,
          status: 'absent',
          message: `Waktu absensi belum dibuka atau sudah ditutup. Silakan datang sesuai jadwal.`,
        }, { status: 403 })
      }
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

    // 3. Check quota
    const [usedCountRow] = await db
      .select({ n: count() })
      .from(attendance)
      .where(and(eq(attendance.studentId, studentSess.id), eq(attendance.verified, 1)))
    const verifiedCount = Number(usedCountRow?.n ?? 0)
    const remaining = Math.max(0, fullStudent.sessionQuota - verifiedCount)
    
    if (remaining <= 0) {
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

    const newRemaining = remaining - 1
    
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