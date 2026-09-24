import { NextRequest, NextResponse } from 'next/server'
import { count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, attendance, quotaDailyUsage } from '@/db/schema'
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
    const { name, email, phone, sessionQuota, pinHash, courseCode, courseId, reduceRemainingBy, increaseRemainingBy } = body

    const existing = await db.select().from(student).where(eq(student.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }
    const current = existing[0]

    const updates: Partial<typeof student.$inferInsert> = {}
    if (name !== undefined) updates.name = name.trim()
    if (email !== undefined) updates.email = email?.trim() || null
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (sessionQuota !== undefined) {
      const newQuota = Math.max(0, Math.min(100, Number(sessionQuota)))
      const [usageRow] = await db
        .select({ n: count() })
        .from(quotaDailyUsage)
        .where(eq(quotaDailyUsage.studentId, id))
      updates.sessionQuota = newQuota
      updates.sessionQuotaRemaining = Math.max(0, newQuota - Number(usageRow?.n ?? 0) - current.manualQuotaReduction)
    }
    if (reduceRemainingBy !== undefined) {
      const amount = Math.floor(Number(reduceRemainingBy))
      if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Pengurangan kuota tidak valid' }, { status: 400 })
      const [usageRow] = await db.select({ n: count() }).from(quotaDailyUsage).where(eq(quotaDailyUsage.studentId, id))
      const remaining = Math.max(0, current.sessionQuota - Number(usageRow?.n ?? 0) - current.manualQuotaReduction)
      if (amount > remaining) return NextResponse.json({ error: `Pengurangan melebihi sisa kuota (${remaining})` }, { status: 400 })
      updates.manualQuotaReduction = current.manualQuotaReduction + amount
      updates.sessionQuotaRemaining = remaining - amount
    }
    if (pinHash !== undefined && pinHash.trim().length > 0) updates.pinHash = pinHash.trim()
    if (courseCode !== undefined) updates.courseCode = courseCode.trim().toUpperCase()
    if (courseId !== undefined) updates.courseId = courseId || null
    if (increaseRemainingBy !== undefined) {
      const amount = Math.floor(Number(increaseRemainingBy))
      if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Penambahan sisa kuota tidak valid' }, { status: 400 })
      const [usageRow] = await db.select({ n: count() }).from(quotaDailyUsage).where(eq(quotaDailyUsage.studentId, id))
      const used = Number(usageRow?.n ?? 0)
      const currentRemaining = Math.max(0, current.sessionQuota - used - current.manualQuotaReduction)
      const newRemaining = currentRemaining + amount
      if (newRemaining > current.sessionQuota) return NextResponse.json({ error: `Sisa kuota tidak boleh melebihi total kuota (${current.sessionQuota})` }, { status: 400 })
      // Reduce manualQuotaReduction to increase remaining (can go negative to effectively add bonus)
      updates.manualQuotaReduction = current.manualQuotaReduction - amount
      updates.sessionQuotaRemaining = newRemaining
    }

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

