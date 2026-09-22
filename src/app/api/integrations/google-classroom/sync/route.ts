import { NextRequest, NextResponse } from 'next/server'
import { and, eq, notInArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { classroomLeaderboard } from '@/db/schema'
import { newId } from '@/lib/id'
import { ensureDummyTables } from '@/db/migrate'

type StudentPayload = {
  classroomUserId: string
  name: string
  email?: string
  avatarUrl?: string
  points?: number
  missionsCompleted?: number
  totalMissions?: number
  progress?: Array<{
    id: string
    name: string
    submitted: boolean
    points: number | null
    maxPoints: number | null
  }>
}

const CLASSROOM_COURSE_ID = '872792240658'

function hasSyncSecret(req: NextRequest): boolean {
  const expected = process.env.GOOGLE_CLASSROOM_SYNC_SECRET || process.env.APPS_SCRIPT_SYNC_SECRET
  if (!expected) return false
  const header = req.headers.get('authorization')
  const supplied = req.headers.get('x-appscript-secret')
  return header === `Bearer ${expected}` || supplied === expected
}

export async function POST(req: NextRequest) {
  if (!hasSyncSecret(req)) {
    return NextResponse.json({ error: 'Invalid or missing sync secret' }, { status: 401 })
  }

  try {
    await ensureDummyTables()
    const body = await req.json() as { courseId?: string; students?: StudentPayload[] }
    if (body.courseId !== CLASSROOM_COURSE_ID) {
      return NextResponse.json({ error: `courseId harus ${CLASSROOM_COURSE_ID}` }, { status: 400 })
    }
    if (!Array.isArray(body.students) || body.students.length === 0) {
      return NextResponse.json({ error: 'students harus berupa array yang tidak kosong' }, { status: 400 })
    }

    const classroomUserIds = body.students
      .map((payload) => String(payload.classroomUserId || '').trim())
      .filter(Boolean)

    let updated = 0
    const skipped: string[] = []
    const syncedAt = new Date().toISOString()

    for (const payload of body.students) {
      const classroomUserId = String(payload.classroomUserId || '').trim()
      const name = String(payload.name || '').trim()
      if (!classroomUserId || !name) {
        skipped.push(classroomUserId || 'missing-classroom-user')
        continue
      }

      const points = Math.max(0, Number(payload.points ?? 0) || 0)
      const missionsCompleted = Math.max(0, Number(payload.missionsCompleted ?? 0) || 0)
      const totalMissions = Math.max(0, Number(payload.totalMissions ?? 0) || 0)
      const progress = Array.isArray(payload.progress) ? payload.progress : []
      const email = String(payload.email || '').trim().toLowerCase() || null
      const avatarUrl = String(payload.avatarUrl || '').trim() || null
      const [existingEntry] = await db
        .select({ id: classroomLeaderboard.id })
        .from(classroomLeaderboard)
        .where(and(eq(classroomLeaderboard.courseId, CLASSROOM_COURSE_ID), eq(classroomLeaderboard.classroomUserId, classroomUserId)))
        .limit(1)

      if (existingEntry) {
        await db.update(classroomLeaderboard).set({ name, email, avatarUrl, totalPoints: points, missionsCompleted, totalMissions, progressJson: JSON.stringify(progress), syncedAt }).where(eq(classroomLeaderboard.id, existingEntry.id))
      } else {
        await db.insert(classroomLeaderboard).values({ id: newId('classroom'), courseId: CLASSROOM_COURSE_ID, classroomUserId, name, email, avatarUrl, totalPoints: points, missionsCompleted, totalMissions, progressJson: JSON.stringify(progress), syncedAt })
      }
      updated += 1
    }

    if (classroomUserIds.length > 0) {
      await db.delete(classroomLeaderboard).where(and(
        eq(classroomLeaderboard.courseId, CLASSROOM_COURSE_ID),
        notInArray(classroomLeaderboard.classroomUserId, classroomUserIds),
      ))
    }

    return NextResponse.json({ success: true, updated, skipped })
  } catch (error) {
    console.error('Google Classroom sync error', error)
    return NextResponse.json({ error: 'Gagal menyinkronkan skor' }, { status: 500 })
  }
}
