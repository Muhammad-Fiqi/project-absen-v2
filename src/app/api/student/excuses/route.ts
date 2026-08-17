import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { quotaExcuse, student } from '@/db/schema'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'
import { createExcuse, dayKey } from '@/lib/quota'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  const studentSess = await getCurrentStudent()
  if (!teacher && !studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff view: list every student excused on a given day (default: today).
  if (teacher) {
    const { searchParams } = new URL(req.url)
    const date = (searchParams.get('date') || dayKey(new Date())).trim()

    const rows = await db
      .select()
      .from(quotaExcuse)
      .where(eq(quotaExcuse.dateKey, date))
      .orderBy(quotaExcuse.createdAt)

    const studentIds = Array.from(new Set(rows.map((r) => r.studentId)))
    const students = studentIds.length ? await db.select().from(student) : []
    const studentMap = new Map(students.map((s) => [s.id, s]))

    return NextResponse.json({
      date,
      items: rows.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: studentMap.get(r.studentId)?.name ?? '',
        studentCode: studentMap.get(r.studentId)?.studentCode ?? '',
        dateKey: r.dateKey,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
    })
  }

  const rows = await db
    .select()
    .from(quotaExcuse)
    .where(eq(quotaExcuse.studentId, studentSess!.id))
    .orderBy(quotaExcuse.createdAt)

  const used = rows.length
  return NextResponse.json({
    used,
    remaining: Math.max(0, 5 - used),
    items: rows.map((row) => ({ id: row.id, dateKey: row.dateKey, reason: row.reason, createdAt: row.createdAt })),
  })
}

export async function POST(req: NextRequest) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { dateKey?: string; reason?: string }
  const dateKey = (body.dateKey || dayKey(new Date())).trim()
  const reason = (body.reason || 'Izin harian').trim()

  const result = await createExcuse(db, studentSess.id, dateKey, reason)
  if (!result.ok) {
    const isDuplicate = result.error?.includes('sudah menggunakan izin')
    return NextResponse.json({ error: result.error }, { status: isDuplicate ? 409 : 400 })
  }

  return NextResponse.json({
    success: true,
    used: result.used,
    remaining: result.remaining,
    item: result.item,
  }, { status: 201 })
}
