import { db } from './src/lib/db'
import { hashPin } from './src/lib/security'

async function main() {
    console.log('🔄 Running first-time setup directly...')

    const existingAdmin = await db.adminUser.findFirst()
    if (existingAdmin) {
      console.log('Database sudah ter-setup.')
      return
    }

    // 1. Create Course
    const course = await db.course.create({
      data: {
        code: 'PTE-2024-A',
        name: 'PTE Academic Preparation',
        description: 'Kelas persiapan PTE Academic',
        defaultQuota: 15,
        totalSessions: 20,
        graceMinutesBefore: 10,
        graceMinutesAfter: 20,
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
}

main().catch(console.error)
