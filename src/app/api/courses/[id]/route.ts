import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { course, session, student } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// PATCH /api/courses/[id] — Edit a course
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat mengedit kursus' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { code, name, description, defaultQuota, totalSessions, graceMinutesBefore, graceMinutesAfter } = body

    const existing = await db.select().from(course).where(eq(course.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
    }

    const updates: Partial<typeof course.$inferInsert> = {}
    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase()
      const duplicate = await db.select({ id: course.id }).from(course).where(eq(course.code, cleanCode)).limit(1)
      if (duplicate[0] && duplicate[0].id !== id) {
        return NextResponse.json({ error: `Kode kursus ${cleanCode} sudah digunakan` }, { status: 409 })
      }
      updates.code = cleanCode
    }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (defaultQuota !== undefined) updates.defaultQuota = Math.max(0, Math.min(100, Number(defaultQuota)))
    if (totalSessions !== undefined) updates.totalSessions = Math.max(0, Number(totalSessions))
    if (graceMinutesBefore !== undefined) updates.graceMinutesBefore = Math.max(0, Number(graceMinutesBefore))
    if (graceMinutesAfter !== undefined) updates.graceMinutesAfter = Math.max(0, Number(graceMinutesAfter))

    if (Object.keys(updates).length > 0) {
      await db.update(course).set(updates).where(eq(course.id, id))
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PATCH /api/courses/[id] error', e)
    return NextResponse.json({ error: 'Gagal memperbarui data kursus' }, { status: 500 })
  }
}

// DELETE /api/courses/[id] — Delete a course
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat menghapus kursus' }, { status: 403 })
  }

  try {
    const { id } = await params

    const existing = await db.select().from(course).where(eq(course.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 })
    }

    // Check if course has students or sessions
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(student)
      .where(eq(student.courseId, id))
    const [sessionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(session)
      .where(eq(session.courseId, id))

    if (Number(studentCount?.count ?? 0) > 0 || Number(sessionCount?.count ?? 0) > 0) {
      return NextResponse.json({
        error: `Tidak dapat menghapus kursus karena masih memiliki ${Number(studentCount?.count ?? 0)} siswa dan ${Number(sessionCount?.count ?? 0)} sesi`,
      }, { status: 400 })
    }

    await db.delete(course).where(eq(course.id, id))

    return NextResponse.json({ success: true, message: 'Kursus berhasil dihapus' })
  } catch (e) {
    console.error('DELETE /api/courses/[id] error', e)
    return NextResponse.json({ error: 'Gagal menghapus kursus' }, { status: 500 })
  }
}

