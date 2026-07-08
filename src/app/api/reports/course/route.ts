import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/reports/course?courseId=...
export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const course = await db.course.findFirst({
    where: courseId ? { id: courseId } : undefined,
    include: { sessions: { orderBy: { startTime: 'asc' } }, students: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
  }
  const sessionIds = course.sessions.map((s) => s.id)
  const attendances = await db.attendance.findMany({
    where: { sessionId: { in: sessionIds } },
  })
  const verifiedAttendances = attendances.filter((a) => a.verified)

  // Per-student summary (with quota)
  const perStudent = course.students.map((st) => {
    const atts = verifiedAttendances.filter((a) => a.studentId === st.id)
    const present = atts.filter((a) => a.status === 'present').length
    const late = atts.filter((a) => a.status === 'late').length
    const flagged = atts.filter((a) => a.flagged).length
    const used = atts.length
    const remaining = Math.max(0, st.sessionQuota - used)
    const uniqueDays = new Set(atts.map((a) => a.dayKey)).size
    return {
      studentId: st.id,
      studentCode: st.studentCode,
      name: st.name,
      email: st.email,
      phone: st.phone,
      sessionQuota: st.sessionQuota,
      sessionsUsed: used,
      sessionsRemaining: remaining,
      quotaExhausted: remaining <= 0,
      present,
      late,
      flagged,
      uniqueDaysAttended: uniqueDays,
      quotaUsagePct: st.sessionQuota > 0 ? Math.round((used / st.sessionQuota) * 100) : 0,
      quotaExtendedAt: st.quotaExtendedAt?.toISOString() ?? null,
    }
  })

  // Per-day summary (group sessions by day)
  const dayMap = new Map<string, typeof course.sessions>()
  for (const s of course.sessions) {
    const k = s.date.toISOString().slice(0, 10)
    if (!dayMap.has(k)) dayMap.set(k, [])
    dayMap.get(k)!.push(s)
  }
  const perDay = Array.from(dayMap.entries()).map(([k, sess]) => {
    const dayAtts = verifiedAttendances.filter((a) => sess.some((s) => s.id === a.sessionId))
    return {
      dayKey: k,
      date: sess[0].date.toISOString(),
      topicOfDay: sess[0].topicOfDay,
      sessionCount: sess.length,
      offlineCount: sess.filter((s) => s.mode === 'offline').length,
      onlineCount: sess.filter((s) => s.mode === 'online').length,
      totalCheckIns: dayAtts.length,
      present: dayAtts.filter((a) => a.status === 'present').length,
      late: dayAtts.filter((a) => a.status === 'late').length,
    }
  })

  // Overall
  const totalPresent = verifiedAttendances.filter((a) => a.status === 'present').length
  const totalLate = verifiedAttendances.filter((a) => a.status === 'late').length
  const totalFlagged = verifiedAttendances.filter((a) => a.flagged).length
  const totalQuota = course.students.reduce((sum, s) => sum + s.sessionQuota, 0)
  const totalUsed = verifiedAttendances.length
  const quotaUsagePct = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0
  const studentsExhausted = course.students.filter((s) => {
    const used = verifiedAttendances.filter((a) => a.studentId === s.id).length
    return used >= s.sessionQuota
  }).length
  const studentsExpiring = course.students.filter((s) => {
    const used = verifiedAttendances.filter((a) => a.studentId === s.id).length
    const remaining = s.sessionQuota - used
    return remaining > 0 && remaining <= 2
  }).length

  return NextResponse.json({
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      totalSessions: course.totalSessions,
      totalStudents: course.students.length,
      defaultQuota: course.defaultQuota,
    },
    overall: {
      totalPresent,
      totalLate,
      totalFlagged,
      totalCheckIns: totalUsed,
      totalQuota,
      quotaUsagePct,
      studentsExhausted,
      studentsExpiring,
      uniqueDaysWithSessions: dayMap.size,
    },
    perStudent,
    perDay,
  })
}
