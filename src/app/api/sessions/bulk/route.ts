import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import { generateQrSecret, generateSessionPin } from '@/lib/security'

export const runtime = 'nodejs'

interface BulkSessionItem {
  startTime: string   // "HH:mm"
  endTime: string     // "HH:mm"
  mode: 'offline' | 'online'
  platform?: string
  room?: string
  teacher?: string
  notes?: string
}

// POST /api/sessions/bulk — create multiple sessions in one call
export async function POST(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { courseId, date, topicOfDay, sessions } = body as {
      courseId: string
      date: string          // "YYYY-MM-DD"
      topicOfDay?: string
      sessions: BulkSessionItem[]
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
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
    }

    // Validate date format
    const dateObj = new Date(date + 'T00:00:00')
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid (YYYY-MM-DD)' }, { status: 400 })
    }

    // Get the next sessionNumber
    const maxNum = await db.session.aggregate({
      where: { courseId },
      _max: { sessionNumber: true },
    })
    let nextNum = (maxNum._max.sessionNumber ?? 0) + 1

    // Create all sessions in a transaction
    const createdSessions = []
    const dayDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())

    for (const s of sessions) {
      if (!s.startTime || !s.endTime || !s.mode) {
        return NextResponse.json(
          { error: `Setiap sesi wajib punya startTime, endTime, dan mode` },
          { status: 400 }
        )
      }

      const [startH, startM] = s.startTime.split(':').map(Number)
      const [endH, endM] = s.endTime.split(':').map(Number)
      const startDateTime = new Date(dayDate)
      startDateTime.setHours(startH, startM, 0, 0)
      const endDateTime = new Date(dayDate)
      endDateTime.setHours(endH, endM, 0, 0)

      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: `Jam selesai harus lebih besar dari jam mulai (${s.startTime}-${s.endTime})` },
          { status: 400 }
        )
      }

      const isOffline = s.mode === 'offline'
      const modeLabel = isOffline ? 'Offline' : 'Online'
      const platform = s.platform || (isOffline ? 'Office' : 'Google Meet')
      const room = s.room || (isOffline ? course.room : null)

      const session = await db.session.create({
        data: {
          courseId,
          sessionNumber: nextNum,
          title: `SESI ${nextNum} · ${modeLabel}`,
          date: dayDate,
          startTime: startDateTime,
          endTime: endDateTime,
          mode: s.mode,
          platform,
          room,
          teacher: s.teacher || null,
          topicOfDay: topicOfDay || null,
          locationLat: isOffline ? course.locationLat : null,
          locationLng: isOffline ? course.locationLng : null,
          geoRadiusM: isOffline ? course.geoRadiusM : null,
          status: 'scheduled',
          sessionPin: generateSessionPin(),
          qrSecret: generateQrSecret(),
          notes: s.notes || null,
          createdById: teacher.id,
        },
        include: { course: true },
      })

      createdSessions.push(session)
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