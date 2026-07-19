import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { course, session, student, attendance } from '@/db/schema'
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

  // Find course (first one if no courseId)
  const courseRows = courseId
    ? await db.select().from(course).where(eq(course.id, courseId)).limit(1)
    : await db.select().from(course).limit(1)
  const courseRow = courseRows[0]
  if (!courseRow) {
    return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
  }

  const sessions = await db
    .select()
    .from(session)
    .where(eq(session.courseId, courseRow.id))
    .orderBy(session.startTime)

  const students = await db.select().from(student).where(eq(student.courseId, courseRow.id))

  const sessionIds = sessions.map((s) => s.id)
  let attendances: typeof attendance.$inferSelect[] = []
  if (sessionIds.length > 0) {
    // Fetch all attendance for these sessions (no in-array filter; small dataset → filter in JS)
    const allAttendances = await db.select().from(attendance)
    attendances = allAttendances.filter((a) => sessionIds.includes(a.sessionId))
  }
  const verifiedAttendances = attendances.filter((a) => a.verified)

  // Per-student summary (with quota)
  const perStudent = students.map((st) => {
    const atts = verifiedAttendances.filter((a) => a.studentId === st.id)
    const present = atts.filter((a) => a.status === 'present').length
    const late = atts.filter((a) => a.status === 'late').length
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
      uniqueDaysAttended: uniqueDays,
      quotaUsagePct: st.sessionQuota > 0 ? Math.round((used / st.sessionQuota) * 100) : 0,
      quotaExtendedAt: st.quotaExtendedAt,
    }
  })

  // Per-day summary (group sessions by day)
  const dayMap = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const k = typeof s.date === 'string' ? s.date.slice(0, 10) : new Date(s.date as any).toISOString().slice(0, 10)
    if (!dayMap.has(k)) dayMap.set(k, [])
    dayMap.get(k)!.push(s)
  }
  const perDay = Array.from(dayMap.entries()).map(([k, sess]) => {
    const dayAtts = verifiedAttendances.filter((a) => sess.some((s) => s.id === a.sessionId))
    return {
      dayKey: k,
      date: sess[0].date,
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
  const totalQuota = students.reduce((sum, s) => sum + s.sessionQuota, 0)
  const totalUsed = verifiedAttendances.length
  const quotaUsagePct = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0
  const studentsExhausted = students.filter((s) => {
    const used = verifiedAttendances.filter((a) => a.studentId === s.id).length
    return used >= s.sessionQuota
  }).length
  const studentsExpiring = students.filter((s) => {
    const used = verifiedAttendances.filter((a) => a.studentId === s.id).length
    const remaining = s.sessionQuota - used
    return remaining > 0 && remaining <= 2
  }).length

  return NextResponse.json({
    course: {
      id: courseRow.id,
      code: courseRow.code,
      name: courseRow.name,
      totalSessions: courseRow.totalSessions,
      totalStudents: students.length,
      defaultQuota: courseRow.defaultQuota,
    },
    overall: {
      totalPresent,
      totalLate,
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
