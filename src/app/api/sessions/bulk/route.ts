import { NextRequest, NextResponse } from 'next/server'
import { eq, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, course } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { generateQrSecret } from '@/lib/security'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

interface BulkSessionItem {
  startTime: string   // "HH:mm"
  endTime: string     // "HH:mm"
  mode: 'offline' | 'online'
  platform?: string
  room?: string
  teacher?: string
  notes?: string
  maxAttendees?: number
}

// POST /api/sessions/bulk — create multiple sessions in one call
export async function POST(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { courseId, date, topicOfDay, sessions, maxAttendees: globalMaxAttendees } = body as {
      courseId: string
      date: string          // "YYYY-MM-DD"
      topicOfDay?: string
      sessions: BulkSessionItem[]
      maxAttendees?: number
    }

    if (!courseId || !date || !sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json(
        { error: 'Field wajib tidak lengkap (courseId, date, sessions[])' },
        { status: 400 }
      )
    }

    if (sessions.length > 30) {
      return NextResponse.json(
        { error: 'Maksimal 30 sesi dalam satu batch' },
        { status: 400 }
      )
    }

    // Validate course exists
    const courseRows = await db.select().from(course).where(eq(course.id, courseId)).limit(1)
    const courseRow = courseRows[0]
    if (!courseRow) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
    }

    // Validate date format
    const dateObj = new Date(date + 'T00:00:00')
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid (YYYY-MM-DD)' }, { status: 400 })
    }

    // Get the next sessionNumber
    const maxRows = await db
      .select({ m: max(session.sessionNumber) })
      .from(session)
      .where(eq(session.courseId, courseId))
    let nextNum = (Number(maxRows[0]?.m ?? 0) || 0) + 1

    const createdSessions: any[] = []

    for (const s of sessions) {
      if (!s.startTime || !s.endTime || !s.mode) {
        return NextResponse.json(
          { error: `Setiap sesi wajib punya startTime, endTime, dan mode` },
          { status: 400 }
        )
      }

      let startDateTime: Date
      let endDateTime: Date

      if (s.startTime.includes('T')) {
        startDateTime = new Date(s.startTime)
      } else {
        startDateTime = new Date(`${date}T${s.startTime}:00`)
      }

      if (s.endTime.includes('T')) {
        endDateTime = new Date(s.endTime)
      } else {
        endDateTime = new Date(`${date}T${s.endTime}:00`)
      }

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return NextResponse.json(
          { error: `Format jam tidak valid (${s.startTime}-${s.endTime})` },
          { status: 400 }
        )
      }

      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: `Jam selesai harus lebih besar dari jam mulai (${s.startTime}-${s.endTime})` },
          { status: 400 }
        )
      }

      const isOffline = s.mode === 'offline'
      const modeLabel = isOffline ? 'Offline' : 'Online'
      const platform = s.platform || (isOffline ? 'Office' : 'Google Meet')

      const [created] = await db
        .insert(session)
        .values({
          id: newId('s'),
          courseId,
          sessionNumber: nextNum,
          title: `SESI ${nextNum} · ${modeLabel}`,
          date: startDateTime.toISOString(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          mode: s.mode,
          platform,
          room: s.room || null,
          teacher: s.teacher || null,
          topicOfDay: topicOfDay || null,
          maxAttendees: s.maxAttendees ?? globalMaxAttendees ?? 10,
          status: 'scheduled',
          qrSecret: generateQrSecret(),
          notes: s.notes || null,
          createdById: teacher.id,
        })
        .returning()

      createdSessions.push({ ...created, course: courseRow })
      nextNum++
    }

    return NextResponse.json({
      success: true,
      created: createdSessions.length,
      sessions: createdSessions,
    })
  } catch (e) {
    console.error('bulk create sessions error', e)
    return NextResponse.json({ error: 'Gagal membuat sesi' }, { status: 500 })
  }
}
