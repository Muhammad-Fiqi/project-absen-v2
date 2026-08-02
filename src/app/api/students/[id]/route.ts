import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, attendance } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// PATCH /api/students/[id] — Edit student data or reset PIN
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat mengedit siswa' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { name, email, phone, sessionQuota, pinHash, courseCode, courseId } = body

    const existing = await db.select().from(student).where(eq(student.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    const updates: Partial<typeof student.$inferInsert> = {}
    if (name !== undefined) updates.name = name.trim()
    if (email !== undefined) updates.email = email?.trim() || null
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (sessionQuota !== undefined) updates.sessionQuota = Math.max(0, Math.min(100, Number(sessionQuota)))
    if (pinHash !== undefined && pinHash.trim().length > 0) updates.pinHash = pinHash.trim()
    if (courseCode !== undefined) updates.courseCode = courseCode.trim().toUpperCase()
    if (courseId !== undefined) updates.courseId = courseId || null

    if (Object.keys(updates).length > 0) {
      await db.update(student).set(updates).where(eq(student.id, id))
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PATCH /api/students/[id] error', e)
    return NextResponse.json({ error: 'Gagal memperbarui data siswa' }, { status: 500 })
  }
}

// DELETE /api/students/[id] — Delete a student
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat menghapus siswa' }, { status: 403 })
  }

  try {
    const { id } = await params

    const existing = await db.select().from(student).where(eq(student.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    // Delete related attendance records first
    await db.delete(attendance).where(eq(attendance.studentId, id))
    // Delete the student
    await db.delete(student).where(eq(student.id, id))

    return NextResponse.json({ success: true, message: 'Siswa berhasil dihapus' })
  } catch (e) {
    console.error('DELETE /api/students/[id] error', e)
    return NextResponse.json({ error: 'Gagal menghapus siswa' }, { status: 500 })
  }
}

