import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPin } from '@/lib/security'

// POST /api/setup — First-time production setup
// Creates initial admin, course, and sample students
// Should only be run once, then the route can be deleted.
export async function POST() {
  // Safety: only run if no admin exists yet
  const existingAdmin = await db.adminUser.findFirst()
  if (existingAdmin) {
    return NextResponse.json({
      message: 'Database sudah ter-setup. Gunakan panel admin untuk mengelola data.',
      alreadySetup: true,
    })
  }

  try {
    console.log('🔄 Running first-time setup...')

    // 1. Create Course
    const course = await db.course.create({
      data: {
        code: 'PTE-2024-A',
        name: 'PTE Academic Preparation',
        description: 'Kelas persiapan PTE Academic',
        defaultQuota: 15,
        totalSessions: 20,
        room: 'Ruang PTE',
        geoRadiusM: 150,
        graceMinutesBefore: 10,
        graceMinutesAfter: 20,
        requiredFactors: 'qr,pin',
      },
    })

    // 2. Create Admin Users
    await db.adminUser.createMany({
      data: [
        {
          username: 'admin',
          passwordHash: hashPin('admin123'),
          name: 'Administrator',
          role: 'admin',
        },
        {
          username: 'pengajar',
          passwordHash: hashPin('pengajar123'),
          name: 'Pengajar PTE',
          role: 'teacher',
        },
      ],
    })

    // 3. Create sample students (5 siswa demo)
    const students = [
      { code: 'PTE001', name: 'Andi Pratama', pin: '0001', quota: 15 },
      { code: 'PTE002', name: 'Budi Santoso', pin: '0002', quota: 12 },
      { code: 'PTE003', name: 'Cinta Dewi', pin: '0003', quota: 20 },
      { code: 'PTE004', name: 'Dimas Aji', pin: '0004', quota: 10 },
      { code: 'PTE005', name: 'Eka Putri', pin: '0005', quota: 10 },
    ]

    await db.student.createMany({
      data: students.map((s) => ({
        studentCode: s.code,
        name: s.name,
        pinHash: hashPin(s.pin),
        courseCode: course.code,
        courseId: course.id,
        sessionQuota: s.quota,
      })),
    })

    console.log('✅ First-time setup complete!')
    return NextResponse.json({
      message: 'Setup berhasil! Database terisi data awal.',
      created: {
        course: course.code,
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
    return NextResponse.json(
      { error: 'Setup gagal', detail: String(error) },
      { status: 500 }
    )
  }
}

// GET /api/setup — Check if database needs setup
export async function GET() {
  const adminCount = await db.adminUser.count()
  const studentCount = await db.student.count()
  const courseCount = await db.course.count()
  const sessionCount = await db.session.count()

  return NextResponse.json({
    needsSetup: adminCount === 0,
    stats: { admins: adminCount, students: studentCount, courses: courseCount, sessions: sessionCount },
  })
}