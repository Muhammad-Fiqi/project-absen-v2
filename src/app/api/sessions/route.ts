import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import { generateQrSecret } from '@/lib/security'

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
  let where: Record<string, unknown> = {}
  if (courseId) where.courseId = courseId
  if (dateStr) {
    const d = new Date(dateStr)
    const next = new Date(d.getTime() + 86400000)
    where.date = { gte: d, lt: next }
  }
  const sessions = await db.session.findMany({
    where,
    include: { course: true, _count: { select: { attendances: true } } },
    orderBy: { startTime: 'asc' },
  })
  // Group by day for convenience
  const byDay = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const k = s.date.toISOString().slice(0, 10)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(s)
  }
  return NextResponse.json({
    sessions,
    days: Array.from(byDay.entries()).map(([k, sess]) => ({
      dayKey: k,
      date: sess[0].date.toISOString(),
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
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
    }
    // sessionNumber: next available (max + 1) — not unique, just display order
    const maxNum = await db.session.aggregate({ where: { courseId }, _max: { sessionNumber: true } })
    const sessionNumber = (maxNum._max.sessionNumber ?? 0) + 1
    const start = new Date(startTime)
    const end = new Date(endTime)
    const dayDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const isOffline = mode === 'offline'
    const session = await db.session.create({
      data: {
        courseId,
        sessionNumber,
        title: title || `SESI ${sessionNumber} · ${mode === 'online' ? 'Online' : 'Offline'}`,
        date: dayDate,
        startTime: start,
        endTime: end,
        mode,
        platform: platform || (isOffline ? 'Office' : 'Google Meet'),
        room: room || null,
        teacher: teacherName || null,
        topicOfDay: topicOfDay || null,
        maxAttendees: maxAttendees ?? 10,
        status: 'scheduled',
        qrSecret: generateQrSecret(),
        notes,
        createdById: teacher.id,
      },
      include: { course: true },
    })
    return NextResponse.json({ success: true, session })
  } catch (e) {
    console.error('create session error', e)
    return NextResponse.json({ error: 'Gagal membuat sesi' }, { status: 500 })
  }
}