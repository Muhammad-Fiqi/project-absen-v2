import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, attendance } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// PATCH /api/sessions/[id] — Edit a session
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const {
      title, startTime, endTime, mode, platform, room,
      teacher: teacherName, topicOfDay, maxAttendees, notes, status,
    } = body

    const existing = await db.select().from(session).where(eq(session.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
    }

    const updates: Partial<typeof session.$inferInsert> = {}
    if (title !== undefined) updates.title = title.trim()
    if (startTime !== undefined) updates.startTime = startTime
    if (endTime !== undefined) updates.endTime = endTime
    if (mode !== undefined) updates.mode = mode
    if (platform !== undefined) updates.platform = platform || null
    if (room !== undefined) updates.room = room || null
    if (teacherName !== undefined) updates.teacher = teacherName || null
    if (topicOfDay !== undefined) updates.topicOfDay = topicOfDay || null
    if (maxAttendees !== undefined) updates.maxAttendees = Math.max(1, Math.min(100, Number(maxAttendees)))
    if (notes !== undefined) updates.notes = notes || null
    if (status !== undefined && ['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      updates.status = status
    }

    if (Object.keys(updates).length > 0) {
      await db.update(session).set(updates).where(eq(session.id, id))
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PATCH /api/sessions/[id] error', e)
    return NextResponse.json({ error: 'Gagal memperbarui sesi' }, { status: 500 })
  }
}

// DELETE /api/sessions/[id] — Delete a session
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await db.select().from(session).where(eq(session.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
    }

    // Delete related attendance records first
    await db.delete(attendance).where(eq(attendance.sessionId, id))
    // Delete the session
    await db.delete(session).where(eq(session.id, id))

    return NextResponse.json({ success: true, message: 'Sesi berhasil dihapus' })
  } catch (e) {
    console.error('DELETE /api/sessions/[id] error', e)
    return NextResponse.json({ error: 'Gagal menghapus sesi' }, { status: 500 })
  }
}

