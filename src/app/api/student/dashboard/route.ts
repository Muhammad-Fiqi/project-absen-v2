import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth'
import type { StudentDashboard, DayGroup } from '@/lib/types'

export const runtime = 'nodejs'

function checkInWindow(
  start: Date,
  end: Date,
  graceBefore: number,
  graceAfter: number,
  now: Date
) {
  const opensAt = new Date(start.getTime() - graceBefore * 60 * 1000)
  const closesAt = new Date(end.getTime() + graceAfter * 60 * 1000)
  const open = now.getTime() >= opensAt.getTime() && now.getTime() <= closesAt.getTime()
  let message = ''
  if (open) message = 'Absensi dibuka'
  else if (now.getTime() < opensAt.getTime()) {
    const mins = Math.ceil((opensAt.getTime() - now.getTime()) / 60000)
    message = mins <= 60 ? `Dibuka dalam ${mins} menit` : `Dibuka ${graceBefore} menit sebelum mulai`
  } else message = 'Jendela absensi sudah tutup'
  return { open, message, opensAt: opensAt.toISOString(), closesAt: closesAt.toISOString() }
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// GET /api/student/dashboard
export async function GET() {
  const student = await getCurrentStudent()
  if (!student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const fullStudent = await db.student.findUnique({
    where: { id: student.id },
    include: { course: true },
  })
  if (!fullStudent || !fullStudent.course) {
    return NextResponse.json({ error: 'Siswa atau kursus tidak ditemukan' }, { status: 404 })
  }
  const course = fullStudent.course

  const sessions = await db.session.findMany({
    where: { courseId: course.id },
    orderBy: { startTime: 'asc' },
  })

  // All verified attendances for this student
  const attendances = await db.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { checkInTime: 'desc' },
  })
  const verifiedAttendances = attendances.filter((a) => a.verified)
  const sessionsUsed = verifiedAttendances.length
  const sessionsRemaining = Math.max(0, fullStudent.sessionQuota - sessionsUsed)
  const quotaExhausted = sessionsRemaining <= 0

  // Map: dayKey -> attendance (first verified on that day)
  const attendanceByDay = new Map<string, typeof attendances[number]>()
  for (const a of verifiedAttendances) {
    if (!attendanceByDay.has(a.dayKey)) {
      attendanceByDay.set(a.dayKey, a)
    }
  }

  const now = new Date()
  const todayKey = dayKey(now)

  // Group sessions by day
  const dayMap = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const k = dayKey(s.date)
    if (!dayMap.has(k)) dayMap.set(k, [])
    dayMap.get(k)!.push(s)
  }
  // Sort days chronologically
  const sortedDayKeys = Array.from(dayMap.keys()).sort()

  const dayGroups: DayGroup[] = sortedDayKeys.map((k) => {
    const daySessions = dayMap.get(k)!
    const first = daySessions[0]
    const dayDate = first.date
    const isToday = k === todayKey
    const isPast = dayDate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const att = attendanceByDay.get(k) || null
    const attendedSessionId = att?.sessionId ?? null
    return {
      dayKey: k,
      date: dayDate.toISOString(),
      topicOfDay: first.topicOfDay,
      isToday,
      isPast,
      attendedSessionId,
      sessions: daySessions.map((s) => {
        const window = checkInWindow(s.startTime, s.endTime, course.graceMinutesBefore, course.graceMinutesAfter, now)
        // Student can check in if: window open, session not cancelled/completed, hasn't attended any session today, quota not exhausted, no existing attendance for THIS session
        const canCheckIn =
          window.open &&
          s.status !== 'cancelled' &&
          s.status !== 'completed' &&
          !attendedSessionId &&
          !quotaExhausted &&
          !attendances.some((a) => a.sessionId === s.id)
        return {
          id: s.id,
          sessionNumber: s.sessionNumber,
          title: s.title,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          mode: s.mode as 'offline' | 'online',
          platform: s.platform,
          room: s.room,
          teacher: s.teacher,
          status: s.status as 'scheduled' | 'active' | 'completed' | 'cancelled',
          canCheckIn,
          checkInWindow: window,
        }
      }),
    }
  })

  const today = dayGroups.find((d) => d.isToday) || null
  const upcomingDays = dayGroups.filter((d) => !d.isPast && !d.isToday)
  const recentDays = dayGroups.filter((d) => d.isPast).slice(-7).reverse()

  const present = verifiedAttendances.filter((a) => a.status === 'present').length
  const late = verifiedAttendances.filter((a) => a.status === 'late').length

  const dashboard: StudentDashboard = {
    student: {
      id: fullStudent.id,
      studentCode: fullStudent.studentCode,
      name: fullStudent.name,
      email: fullStudent.email,
      phone: fullStudent.phone,
      courseCode: fullStudent.courseCode,
      courseId: fullStudent.courseId,
      sessionQuota: fullStudent.sessionQuota,
      sessionsUsed,
      sessionsRemaining,
      quotaExhausted,
      quotaExtendedAt: fullStudent.quotaExtendedAt?.toISOString() ?? null,
    },
    course: {
      code: course.code,
      name: course.name,
      totalSessions: course.totalSessions,
      defaultQuota: course.defaultQuota,
      requiredFactors: course.requiredFactors.split(',').map((f) => f.trim()).filter(Boolean),
    },
    quota: {
      total: fullStudent.sessionQuota,
      used: sessionsUsed,
      remaining: sessionsRemaining,
      exhausted: quotaExhausted,
      expiringSoon: !quotaExhausted && sessionsRemaining <= 2,
      extendedAt: fullStudent.quotaExtendedAt?.toISOString() ?? null,
    },
    stats: {
      present,
      late,
      totalCheckIns: sessionsUsed,
      uniqueDaysAttended: attendanceByDay.size,
    },
    today,
    upcomingDays,
    recentDays,
  }
  return NextResponse.json(dashboard)
}
