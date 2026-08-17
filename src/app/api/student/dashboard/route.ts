import { NextResponse } from 'next/server'
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, session, course, attendance, quotaDailyUsage, quotaExcuse, studentLeaveRequest } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'
import { applyDailyQuotaDeduction, yesterdayKey } from '@/lib/quota'
import type { StudentDashboard, DayGroup } from '@/lib/types'

export const runtime = 'nodejs'

function checkInWindow(
  start: string,   // ISO string
  end: string,     // ISO string
  graceBefore: number,
  graceAfter: number,
  now: Date
) {
  const s = new Date(start)
  const e = new Date(end)
  const opensAt = new Date(s.getTime() - graceBefore * 60 * 1000)
  const closesAt = new Date(e.getTime() + graceAfter * 60 * 1000)
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
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fullStudentRows = await db
    .select()
    .from(student)
    .where(eq(student.id, studentSess.id))
    .limit(1)
  const fullStudent = fullStudentRows[0]
  if (!fullStudent || !fullStudent.courseId) {
    return NextResponse.json({ error: 'Siswa atau kursus tidak ditemukan' }, { status: 404 })
  }

  const courseRows = await db.select().from(course).where(eq(course.id, fullStudent.courseId)).limit(1)
  const courseRow = courseRows[0]
  if (!courseRow) {
    return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
  }

  const todayKey = dayKey(new Date())
  // Quota is only charged for days that have fully passed (yesterday and
  // earlier) — today is never charged on the same day it occurs.
  await applyDailyQuotaDeduction(studentSess.id, yesterdayKey())

  const sessions = await db
    .select()
    .from(session)
    .where(eq(session.courseId, courseRow.id))
    .orderBy(session.startTime)

  const [dailyUsageRow] = await db
    .select({ n: count() })
    .from(quotaDailyUsage)
    .where(eq(quotaDailyUsage.studentId, studentSess.id))
  const sessionsUsed = Number(dailyUsageRow?.n ?? 0)
  const sessionsRemaining = Math.max(0, fullStudent.sessionQuota - sessionsUsed)
  const quotaExhausted = sessionsRemaining <= 0

  const [excuseUsageRow] = await db
    .select({ n: count() })
    .from(quotaExcuse)
    .where(eq(quotaExcuse.studentId, studentSess.id))
  const excuseUsage = Number(excuseUsageRow?.n ?? 0)
  const excuseRemaining = Math.max(0, 5 - excuseUsage)
  const [todayExcuse] = await db
    .select()
    .from(quotaExcuse)
    .where(and(eq(quotaExcuse.studentId, studentSess.id), eq(quotaExcuse.dateKey, todayKey)))
  const [activeLeave] = await db
    .select()
    .from(studentLeaveRequest)
    .where(
      and(
        eq(studentLeaveRequest.studentId, studentSess.id),
        eq(studentLeaveRequest.status, 'approved')
      )
    )
  const hasApprovedLeaveToday = !!activeLeave && activeLeave.startDate <= todayKey && activeLeave.endDate >= todayKey

  // All attendances for this student
  const attendances = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, studentSess.id))
  const verifiedAttendances = attendances.filter((a) => a.verified)

  // Map: dayKey -> attendance (first verified on that day)
  const attendanceByDay = new Map<string, (typeof attendances)[number]>()
  for (const a of verifiedAttendances) {
    if (!attendanceByDay.has(a.dayKey)) {
      attendanceByDay.set(a.dayKey, a)
    }
  }

  // Count attendees per session (verified only)
  const sessionIds = sessions.map((s) => s.id)
  const attendeeCounts = new Map<string, number>()
  if (sessionIds.length > 0) {
    const allAtt = await db.select().from(attendance)
    const verifiedForSessions = allAtt.filter(
      (a) => a.verified && sessionIds.includes(a.sessionId)
    )
    // Group by sessionId
    const grouped = new Map<string, number>()
    for (const a of verifiedForSessions) {
      grouped.set(a.sessionId, (grouped.get(a.sessionId) ?? 0) + 1)
    }
    for (const [sid, cnt] of grouped) {
      attendeeCounts.set(sid, cnt)
    }
  }

  const now = new Date()

  // Group sessions by day
  const dayMap = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const k = typeof s.date === 'string' ? s.date.slice(0, 10) : dayKey(new Date(s.date as any))
    if (!dayMap.has(k)) dayMap.set(k, [])
    dayMap.get(k)!.push(s)
  }
  const sortedDayKeys = Array.from(dayMap.keys()).sort()

  const dayGroups: DayGroup[] = sortedDayKeys.map((k) => {
    const daySessions = dayMap.get(k)!
    const first = daySessions[0]
    const dayDate = new Date(first.date)
    const isToday = k === todayKey
    const isPast = dayDate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const att = attendanceByDay.get(k) || null
    const attendedSessionId = att?.sessionId ?? null

    return {
      dayKey: k,
      date: first.date,
      topicOfDay: first.topicOfDay,
      isToday,
      isPast,
      attendedSessionId,
      sessions: daySessions.map((s, index) => {
        const window = checkInWindow(s.startTime, s.endTime, courseRow.graceMinutesBefore, courseRow.graceMinutesAfter, now)
        const effectivelyOpen = s.status !== 'completed' && s.status !== 'cancelled'
        const canCheckIn =
          effectivelyOpen &&
          s.status !== 'cancelled' &&
          s.status !== 'completed' &&
          !attendedSessionId &&
          !quotaExhausted &&
          !attendances.some((a) => a.sessionId === s.id)

        return {
          id: s.id,
          sessionNumber: index + 1,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          mode: s.mode as 'offline' | 'online',
          platform: s.platform,
          room: s.room,
          teacher: s.teacher,
          maxAttendees: s.maxAttendees,
          attendeeCount: attendeeCounts.get(s.id) ?? 0,
          status: s.status as 'scheduled' | 'active' | 'completed' | 'cancelled',
          canCheckIn,
          checkInWindow: {
            ...window,
            open: effectivelyOpen,
            message: s.status === 'completed'
              ? 'Sesi telah selesai'
              : s.status === 'cancelled'
                ? 'Sesi dibatalkan'
                : window.open
                  ? window.message
                  : 'Absensi terbuka dari sekarang',
          },
        }
      }),
    }
  })

  const today = dayGroups.find((d) => d.isToday) || null
  const upcomingDays = dayGroups.filter((d) => !d.isPast && !d.isToday)
  const recentDays = dayGroups.filter((d) => d.isPast).slice(-7).reverse()

  const present = verifiedAttendances.filter((a) => a.status === 'present').length
  const late = verifiedAttendances.filter((a) => a.status === 'late').length
  const excused = attendances.filter((a) => a.status === 'excused').length

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
      quotaExtendedAt: fullStudent.quotaExtendedAt,
    },
    course: {
      code: courseRow.code,
      name: courseRow.name,
      totalSessions: courseRow.totalSessions,
      defaultQuota: courseRow.defaultQuota,
    },
    quota: {
      total: fullStudent.sessionQuota,
      used: sessionsUsed,
      remaining: sessionsRemaining,
      exhausted: quotaExhausted,
      expiringSoon: !quotaExhausted && sessionsRemaining <= 2,
      extendedAt: fullStudent.quotaExtendedAt,
    },
    quotaExcuseUsed: excuseUsage,
    quotaExcuseRemaining: excuseRemaining,
    stats: {
      present,
      late,
      excused,
      totalCheckIns: sessionsUsed,
      uniqueDaysAttended: attendanceByDay.size,
    },
    today,
    upcomingDays,
    recentDays,
  }
  return NextResponse.json(dashboard)
}
