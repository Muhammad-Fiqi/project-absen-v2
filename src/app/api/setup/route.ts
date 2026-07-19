import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { hashPin } from '@/lib/security'
import { ensureDummyTables } from '@/db/migrate'
import { adminUser, course, student, session } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'

function cuidLike(): string {
  // Simple unique id for demo/preview.
  // For production, use proper cuid/uuid generation.
  return `u_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

// POST /api/setup — First-time production setup
// Creates initial admin, course, and sample students
export async function POST() {
  await ensureDummyTables()

  // Safety: only run if no admin exists yet
  const existingAdmin = await db
    .select({ id: adminUser.id })
    .from(adminUser)
    .limit(1)

  if (existingAdmin.length > 0) {
    return NextResponse.json({
      message: 'Database sudah ter-setup. Gunakan panel admin untuk mengelola data.',
      alreadySetup: true,
    })
  }

  try {
    console.log('🔄 Running first-time setup (Drizzle)...')

    // 1) Create Course
    const courseId = cuidLike()
    const [courseRow] = await db
      .insert(course)
      .values({
        id: courseId,
        code: 'PTE-2026-A',
        name: 'PTE Academic Preparation',
        description: 'Kelas persiapan PTE Academic',
        defaultQuota: 15,
        totalSessions: 20,
        graceMinutesBefore: 10,
        graceMinutesAfter: 20,
        createdAt: new Date().toISOString(),
      })
      .returning({ id: course.id, code: course.code })

    // 2) Admin users
    const admin1Id = cuidLike()
    const admin2Id = cuidLike()

    await db.insert(adminUser).values([
      {
        id: admin1Id,
        username: 'admin',
        passwordHash: hashPin('admin123'),
        name: 'Administrator',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      {
        id: admin2Id,
        username: 'pengajar',
        passwordHash: hashPin('pengajar123'),
        name: 'Pengajar PTE',
        role: 'teacher',
        createdAt: new Date().toISOString(),
      },
    ])

    // 3) Sample students
    const students = [
      { code: 'PTE001', name: 'Andi Pratama', pin: '0001', quota: 15 },
      { code: 'PTE002', name: 'Budi Santoso', pin: '0002', quota: 12 },
      { code: 'PTE003', name: 'Cinta Dewi', pin: '0003', quota: 20 },
      { code: 'PTE004', name: 'Dimas Aji', pin: '0004', quota: 10 },
      { code: 'PTE005', name: 'Eka Putri', pin: '0005', quota: 10 },
    ]

    await db.insert(student).values(
      students.map((s) => ({
        id: cuidLike(),
        studentCode: s.code,
        name: s.name,
        pinHash: hashPin(s.pin),
        courseCode: courseRow.code,
        courseId: courseId,
        sessionQuota: s.quota,
        email: null,
        phone: null,
        quotaExtendedAt: null,
        quotaNote: null,
        createdAt: new Date().toISOString(),
      }))
    )

    console.log('✅ First-time setup complete (Drizzle)!')
    return NextResponse.json({
      message: 'Setup berhasil! Database terisi data awal.',
      created: {
        course: courseRow.code,
        admins: 2,
        students: students.length,
      },
      loginInfo: {
        admin: 'admin / admin123',
        pengajar: 'pengajar / pengajar123',
        students: students.map((s) => `${s.code} / ${s.pin}`),
      },
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup gagal', detail: String(error) }, { status: 500 })
  }
}

// GET /api/setup — Check if database needs setup
export async function GET() {
  await ensureDummyTables()

  const [adminCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminUser)

  const [studentCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(student)

  const [courseCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(course)

  const [sessionCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(session)

  const adminCount = Number(adminCountRow?.count ?? 0)
  const studentCount = Number(studentCountRow?.count ?? 0)
  const courseCount = Number(courseCountRow?.count ?? 0)
  const sessionCount = Number(sessionCountRow?.count ?? 0)

  return NextResponse.json({
    needsSetup: adminCount === 0,
    stats: { admins: adminCount, students: studentCount, courses: courseCount, sessions: sessionCount },
  })
}

