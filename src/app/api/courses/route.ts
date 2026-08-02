import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { course, session, student } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// GET /api/courses — List all courses
export async function GET() {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const courses = await db.select().from(course).orderBy(course.code)

    // Get stats per course
    const coursesWithStats = await Promise.all(courses.map(async (c) => {
      const [studentCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(student)
        .where(eq(student.courseId, c.id))
      const [sessionCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(session)
        .where(eq(session.courseId, c.id))
      return {
        ...c,
        studentCount: Number(studentCountRow?.count ?? 0),
        sessionCount: Number(sessionCountRow?.count ?? 0),
      }
    }))

    return NextResponse.json({ courses: coursesWithStats })
  } catch (e) {
    console.error('GET /api/courses error', e)
    return NextResponse.json({ error: 'Gagal memuat kursus' }, { status: 500 })
  }
}

// POST /api/courses — Create a new course
export async function POST(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat menambah kursus' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { code, name, description, defaultQuota, totalSessions, graceMinutesBefore, graceMinutesAfter } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Kode dan nama kursus wajib diisi' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    // Check duplicate
    const existing = await db.select({ id: course.id }).from(course).where(eq(course.code, cleanCode)).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ error: `Kode kursus ${cleanCode} sudah terdaftar` }, { status: 409 })
    }

    const newCourseId = newId('crs')
    await db.insert(course).values({
      id: newCourseId,
      code: cleanCode,
      name: name.trim(),
      description: description?.trim() || null,
      defaultQuota: defaultQuota ?? 15,
      totalSessions: totalSessions ?? 20,
      graceMinutesBefore: graceMinutesBefore ?? 10,
      graceMinutesAfter: graceMinutesAfter ?? 20,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      course: { id: newCourseId, code: cleanCode, name: name.trim() },
    })
  } catch (e) {
    console.error('POST /api/courses error', e)
    return NextResponse.json({ error: 'Gagal menambah kursus' }, { status: 500 })
  }
}

