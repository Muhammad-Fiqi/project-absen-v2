import { NextRequest, NextResponse } from 'next/server'
import { asc, count, desc, eq, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { classroomLeaderboard } from '@/db/schema'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'
import { ensureDummyTables } from '@/db/migrate'

export const runtime = 'nodejs'

type MissionProgress = {
  id: string
  name: string
  submitted: boolean
  points: number | null
  maxPoints: number | null
}

function parseProgress(value: string | null): MissionProgress[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const [currentStudent, currentTeacher] = await Promise.all([
    getCurrentStudent(),
    getCurrentTeacher(),
  ])

  if (!currentStudent && !currentTeacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureDummyTables()

  const { searchParams } = new URL(req.url)
  const requestedLimit = Number(searchParams.get('limit') ?? 10)
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 0

  const filters = eq(classroomLeaderboard.courseId, '872792240658')
  const [[{ totalEntries }], [{ latestSyncedAt }]] = await Promise.all([
    db.select({ totalEntries: count() }).from(classroomLeaderboard).where(filters),
    db.select({ latestSyncedAt: max(classroomLeaderboard.syncedAt) }).from(classroomLeaderboard).where(filters),
  ])

  const entryQuery = db
    .select()
    .from(classroomLeaderboard)
    .where(filters)
    .orderBy(desc(classroomLeaderboard.totalPoints), asc(classroomLeaderboard.name))
  const rows = limit > 0 ? await entryQuery.limit(limit) : await entryQuery

  const entries = rows
    .map((item) => ({
      id: item.classroomUserId,
      name: item.name,
      avatarUrl: item.avatarUrl,
      points: item.totalPoints,
      missionsCompleted: item.missionsCompleted,
      totalMissions: item.totalMissions,
      progress: parseProgress(item.progressJson),
      certificateStatus: item.totalPoints >= 1000 ? 'eligible' : 'locked',
      pointsRequired: 1000,
      syncedAt: item.syncedAt,
    }))
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return NextResponse.json({
    maxPoints: 1000,
    // Keep the old response key temporarily for clients that have not refreshed yet.
    getAllCourseWorkmaxPoints: 1000,
    currentStudentId: null,
    current: null,
    entries,
    totalEntries: Number(totalEntries),
    hasMore: entries.length < Number(totalEntries),
    latestSyncedAt: latestSyncedAt ?? null,
    syncedFrom: 'Google Classroom via Apps Script',
  })
}

