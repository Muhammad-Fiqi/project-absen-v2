import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq, gte, lt, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course, attendance } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { generateQrSecret } from '@/lib/security'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// GET /api/sessions?courseId=...&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const dateStr = searchParams.get('date')

  const conditions = []
  if (courseId) conditions.push(eq(session.courseId, courseId))
  if (dateStr) {
    const d = new Date(dateStr)
    const next = new Date(d.getTime() + 86400000)
    // Session.date stored as ISO date string (YYYY-MM-DD or full ISO).
    // Compare lexicographically on YYYY-MM-DD prefix.
    const startKey = d.toISOString().slice(0, 10)
    const endKey = next.toISOString().slice(0, 10)
    conditions.push(gte(session.date, startKey))
    conditions.push(lt(session.date, endKey))
  }

  const sessions = await db
    .select({
      id: session.id,
      courseId: session.courseId,
      sessionNumber: session.sessionNumber,
      title: session.title,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      mode: session.mode,
      platform: session.platform,
      room: session.room,
      teacher: session.teacher,
      topicOfDay: session.topicOfDay,
      maxAttendees: session.maxAttendees,
      status: session.status,
      qrSecret: session.qrSecret,
      notes: session.notes,
      createdById: session.createdById,
      createdAt: session.createdAt,
    })
    .from(session)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(session.startTime)

  // Attach course + attendee count in JS
  const courseIds = Array.from(new Set(sessions.map((s) => s.courseId)))
  const courses = courseIds.length
    ? await db.select().from(course).where(courseIds.length === 1 ? eq(course.id, courseIds[0]) : undefined)
    : []
  const courseById = new Map(courses.map((c) => [c.id, c]))

  const sessionIds = sessions.map((s) => s.id)
  let attendeeCounts: { sessionId: string; n: number }[] = []
  if (sessionIds.length > 0) {
    const grouped = await db
      .select({ sessionId: attendance.sessionId, n: count() })
      .from(attendance)
      .where(eq(attendance.verified, 1))
      .groupBy(attendance.sessionId)
    attendeeCounts = grouped
  }
  const countBySession = new Map(attendeeCounts.map((r) => [r.sessionId, Number(r.n)]))

  const enriched = sessions.map((s) => ({
    ...s,
    course: courseById.get(s.courseId) ?? null,
    _count: { attendances: countBySession.get(s.id) ?? 0 },
  }))

  // Group by day for convenience
  const byDay = new Map<string, typeof enriched>()
  for (const s of enriched) {
    const k = typeof s.date === 'string' ? s.date.slice(0, 10) : new Date(s.date as any).toISOString().slice(0, 10)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(s)
  }

  return NextResponse.json({
    sessions: enriched,
    days: Array.from(byDay.entries()).map(([k, sess]) => ({
      dayKey: k,
      date: sess[0].date,
      topicOfDay: sess[0].topicOfDay,
      sessionCount: sess.length,
      sessions: sess,
    })),
  })
}

// POST /api/sessions — create a new session
export async function POST(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const {
      courseId, title, date, startTime, endTime,
      mode, platform, room, teacher: teacherName, topicOfDay, notes,
      maxAttendees,
    } = body
    if (!courseId || !date || !startTime || !endTime || !mode) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap (courseId, date, startTime, endTime, mode)' }, { status: 400 })
    }
    const courseRows = await db.select().from(course).where(eq(course.id, courseId)).limit(1)
    if (!courseRows[0]) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
    }
    const courseRow = courseRows[0]

    // sessionNumber: max + 1 for this course
    const maxRows = await db
      .select({ m: max(session.sessionNumber) })
      .from(session)
      .where(eq(session.courseId, courseId))
    const sessionNumber = (Number(maxRows[0]?.m ?? 0) || 0) + 1

    const start = new Date(startTime)
    const end = new Date(endTime)
    const dayDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const isOffline = mode === 'offline'

    const [created] = await db
      .insert(session)
      .values({
        id: newId('s'),
        courseId,
        sessionNumber,
        title: title || `SESI ${sessionNumber} · ${mode === 'online' ? 'Online' : 'Offline'}`,
        date: dayDate.toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        mode,
        platform: platform || (isOffline ? 'Office' : 'Google Meet'),
        room: room || null,
        teacher: teacherName || null,
        topicOfDay: topicOfDay || null,
        maxAttendees: maxAttendees ?? 10,
        // Sesi langsung 'active' begitu dibuat — siswa bisa absen kapan saja sebelum status 'completed'.
        status: 'active',
        qrSecret: generateQrSecret(),
        notes: notes ?? null,
        createdById: teacher.id,
      })
      .returning()

    return NextResponse.json({
      success: true,
      session: { ...created, course: courseRow },
    })
  } catch (e) {
    console.error('create session error', e)
    return NextResponse.json({ error: 'Gagal membuat sesi' }, { status: 500 })
  }
}
