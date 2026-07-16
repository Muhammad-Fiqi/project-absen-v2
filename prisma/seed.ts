// Seed data for PTE Attendance System
// New model: multiple sessions per day (offline + online), same topic per day,
// personal student quota (10–20).

import { db } from '@/lib/db'
import { generateQrSecret, generateSessionPin, hashPin } from '@/lib/security'

async function main() {
  console.log('🌱 Seeding PTE Attendance database (multi-session-per-day model)...')

  await db.qrToken.deleteMany()
  await db.attendance.deleteMany()
  await db.deviceLog.deleteMany()
  await db.quotaExtension.deleteMany()
  await db.session.deleteMany()
  await db.student.deleteMany()
  await db.course.deleteMany()
  await db.adminUser.deleteMany()

  // --- Admin / Teacher ---
  const teacherDimas = await db.adminUser.create({
    data: {
      username: 'dimas',
      passwordHash: hashPin('dimas123'),
      name: 'Mr Dimas',
      role: 'teacher',
    },
  })
  const teacherFaisal = await db.adminUser.create({
    data: {
      username: 'faisal',
      passwordHash: hashPin('faisal123'),
      name: 'Mr Faisal',
      role: 'teacher',
    },
  })
  const admin = await db.adminUser.create({
    data: {
      username: 'admin',
      passwordHash: hashPin('admin123'),
      name: 'Admin Kursus',
      role: 'admin',
    },
  })
  // Convenience teacher login (matches landing page hint)
  const teacher = await db.adminUser.create({
    data: {
      username: 'pengajar',
      passwordHash: hashPin('pengajar123'),
      name: 'Bu Rina (Pengajar PTE)',
      role: 'teacher',
    },
  })

  // --- Course ---
  const course = await db.course.create({
    data: {
      code: 'PTE-2024-A',
      name: 'PTE Academic — Kelas Speaking (Batch A)',
      description:
        'Kelas Speaking PTE Academic. Setiap hari ada beberapa sesi offline & online dengan materi yang sama. Siswa bebas pilih sesi mana saja dalam sehari. Kuota personal 10–20 sesi.',
      defaultQuota: 15,
      totalSessions: 20,
      room: 'Office PTE Center',
      locationLat: -6.2088,
      locationLng: 106.8456,
      geoRadiusM: 150,
      graceMinutesBefore: 10,
      graceMinutesAfter: 20,
      requiredFactors: 'qr,pin,geo',
    },
  })

  // --- Students (varied quotas: some near exhaustion to demo "extend") ---
  // Note: max past-day attendances ≈ 7 (7 past days × 1 per day). So quotas
  // are set relative to that to create healthy / near-out / exhausted states.
  const studentDefs = [
    ['PTE001', 'Andi Pratama', 18, 6],   // healthy: 6/18
    ['PTE002', 'Siti Nurhaliza', 15, 4], // healthy: 4/15
    ['PTE003', 'Budi Santoso', 12, 7],   // moderate: 7/12
    ['PTE004', 'Dewi Lestari', 20, 7],   // healthy: 7/20
    ['PTE005', 'Rizky Ramadhan', 10, 7], // EXPIRING: 7/10
    ['PTE006', 'Putri Maharani', 8, 7],  // EXPIRING: 7/8
    ['PTE007', 'Fajar Nugroho', 15, 2],  // healthy: 2/15
    ['PTE008', 'Indah Permata', 14, 7],  // moderate: 7/14
    ['PTE009', 'Bayu Setiawan', 7, 7],   // EXHAUSTED: 7/7 — needs extend
    ['PTE010', 'Citra Ayu', 20, 5],      // healthy: 5/20
  ]
  const students = []
  for (const [code, name, quota, used] of studentDefs) {
    // PIN = numeric portion of student code, zero-padded to 4 digits
    const pin = code.replace(/\D/g, '').padStart(4, '0')
    const s = await db.student.create({
      data: {
        studentCode: code,
        name,
        email: `${code.toLowerCase()}@student.id`,
        phone: `0812${Math.floor(10000000 + Math.random() * 89999999)}`,
        courseCode: course.code,
        courseId: course.id,
        pinHash: hashPin(pin),
        sessionQuota: quota as number,
      },
    })
    students.push({ ...s, _targetUsed: used as number })
  }

  // --- Sessions: build a schedule for ~21 days (past + today + future) ---
  // Each day has the SAME topic but multiple sessions:
  //   Offline: 4 slots (10:00, 11:30, 13:00, 14:30) — teachers rotate Dimas/Faisal
  //   Online:  5 slots (05:00, 07:00, 11:00, 14:00, 20:00) — Google Meet/Discord
  //   (number can grow/shrink — that's the point)
  //
  const topics = [
    'Speaking: Read Aloud',
    'Speaking: Repeat Sentence',
    'Speaking: Describe Image',
    'Speaking: Retell Lecture',
    'Speaking: Answer Short Questions',
    'Writing: Summarize Written Text',
    'Writing: Essay Structure',
    'Reading: Fill in the Blanks',
    'Reading: Re-order Paragraphs',
    'Listening: Summarize Spoken Text',
    'Listening: Fill in the Blanks',
    'Mock Test 1 — Full Simulation',
    'Pronunciation Workshop',
    'Fluency & Intonation',
    'Speaking Intensive',
    'Writing Intensive',
    'Reading Speed Strategy',
    'Listening Note-taking',
    'Mock Test 2 — Full Simulation',
    'Final Review & Strategy',
    'Graduation Mock Test',
  ]

  const now = new Date()
  // Generate days: 7 past, today, 13 future = 21 days
  const days: Date[] = []
  for (let i = 7; i >= 1; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  for (let i = 1; i <= 13; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }

  // Offline time slots (WIB)
  const offlineSlots = [
    { h: 10, m: 0, dur: 90, teacher: 'Mr Dimas', room: 'Office PTE Center' },
    { h: 11, m: 30, dur: 90, teacher: 'Mr Dimas', room: 'Office PTE Center' },
    { h: 13, m: 0, dur: 90, teacher: 'Mr Faisal', room: 'Office PTE Center' },
    { h: 14, m: 30, dur: 90, teacher: 'Mr Faisal', room: 'Office PTE Center' },
  ]
  // Online time slots
  const onlineSlots = [
    { h: 5, m: 0, dur: 60, teacher: 'Mr Dimas', platform: 'Google Meet', room: 'https://meet.google.com/pte-dimas' },
    { h: 7, m: 0, dur: 60, teacher: 'Mr Faisal', platform: 'Discord', room: 'https://discord.gg/pte-faisal' },
    { h: 11, m: 0, dur: 60, teacher: 'Mr Faisal', platform: 'Discord', room: 'https://discord.gg/pte-faisal' },
    { h: 14, m: 0, dur: 60, teacher: 'Mr Dimas', platform: 'Google Meet', room: 'https://meet.google.com/pte-dimas' },
    { h: 20, m: 0, dur: 60, teacher: 'Mr Dimas', platform: 'Google Meet', room: 'https://meet.google.com/pte-dimas' },
  ]

  let sessionCounter = 0
  const allSessions = []
  for (let di = 0; di < days.length; di++) {
    const day = days[di]
    const topic = topics[di % topics.length]
    const isPast = day.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const isToday = day.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const dayStatus = isPast ? 'completed' : isToday ? 'active' : 'scheduled'

    let slotNum = 0
    // Offline sessions (skip weekends for offline? no — keep all for simplicity)
    for (const slot of offlineSlots) {
      slotNum++
      sessionCounter++
      const start = new Date(day)
      start.setHours(slot.h, slot.m, 0, 0)
      const end = new Date(start.getTime() + slot.dur * 60 * 1000)
      const sess = await db.session.create({
        data: {
          courseId: course.id,
          sessionNumber: sessionCounter,
          title: `SESI ${slotNum} · Offline`,
          date: day,
          startTime: start,
          endTime: end,
          mode: 'offline',
          platform: 'Office',
          room: slot.room,
          teacher: slot.teacher,
          topicOfDay: topic,
          locationLat: course.locationLat,
          locationLng: course.locationLng,
          geoRadiusM: course.geoRadiusM,
          status: dayStatus,
          sessionPin: generateSessionPin(),
          qrSecret: generateQrSecret(),
          createdById: teacher.id,
        },
      })
      allSessions.push(sess)
    }
    // Online sessions
    for (const slot of onlineSlots) {
      slotNum++
      sessionCounter++
      const start = new Date(day)
      start.setHours(slot.h, slot.m, 0, 0)
      const end = new Date(start.getTime() + slot.dur * 60 * 1000)
      const sess = await db.session.create({
        data: {
          courseId: course.id,
          sessionNumber: sessionCounter,
          title: `SESI ${slotNum} · Online`,
          date: day,
          startTime: start,
          endTime: end,
          mode: 'online',
          platform: slot.platform,
          room: slot.room,
          teacher: slot.teacher,
          topicOfDay: topic,
          // Online sessions: no geo-fence (students can be anywhere)
          locationLat: null,
          locationLng: null,
          geoRadiusM: null,
          status: dayStatus,
          sessionPin: generateSessionPin(),
          qrSecret: generateQrSecret(),
          createdById: teacher.id,
        },
      })
      allSessions.push(sess)
    }
  }

  console.log(`   Created ${allSessions.length} sessions across ${days.length} days`)

  // --- Create past attendance to match each student's `_targetUsed` ---
  // Each student attends ONE session per past day (their chosen slot).
  // Distribute across past days + a couple today sessions.
  const pastDays = days.filter((d) => d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
  // Also include today's already-started sessions for some students
  const todaySessions = allSessions.filter((s) => s.date.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() && s.endTime.getTime() < now.getTime())

  function dayKey(d: Date) {
    return d.toISOString().slice(0, 10)
  }

  for (const student of students) {
    let used = 0
    const target = (student as typeof students[number] & { _targetUsed: number })._targetUsed
    // Pick past days (and maybe today's started sessions) up to target
    const pickableDays = [...pastDays]
    // Shuffle deterministically per student for variety
    const seed = student.studentCode.charCodeAt(3) || 1
    pickableDays.sort((a, b) => {
      const ha = (a.getTime() / 86400000 + seed) % 7
      const hb = (b.getTime() / 86400000 + seed) % 7
      return ha - hb
    })
    for (const day of pickableDays) {
      if (used >= target) break
      // Find a session on this day the student "attended" — pick based on student index preference
      const daySessions = allSessions.filter((s) => s.date.getTime() === day.getTime())
      if (daySessions.length === 0) continue
      // Student preference: alternate offline/online based on student index
      const pref = student.studentCode.charCodeAt(3) % 2 === 0 ? 'offline' : 'online'
      const chosen = daySessions.find((s) => s.mode === pref) || daySessions[0]
      const isLate = (used + seed) % 5 === 0
      const checkIn = new Date(chosen.startTime.getTime() + (isLate ? 8 + (used % 5) : Math.random() * 8) * 60 * 1000)
      await db.attendance.create({
        data: {
          sessionId: chosen.id,
          studentId: student.id,
          status: isLate ? 'late' : 'present',
          method: 'multi',
          checkInTime: checkIn,
          dayKey: dayKey(chosen.date),
          deviceFingerprint: `fp-${student.studentCode}-${used}`,
          ipAddress: `192.168.1.${100 + (used % 50)}`,
          geoLat: chosen.mode === 'offline' ? course.locationLat! + (Math.random() - 0.5) * 0.001 : null,
          geoLng: chosen.mode === 'offline' ? course.locationLng! + (Math.random() - 0.5) * 0.001 : null,
          geoVerified: chosen.mode === 'offline',
          geoDistanceM: chosen.mode === 'offline' ? Math.floor(Math.random() * 80) : null,
          pinVerified: true,
          qrVerified: true,
          selfieVerified: Math.random() > 0.4,
          verified: true,
          factorsPassed: chosen.mode === 'offline' ? 3 : 2,
          factorsRequired: chosen.mode === 'offline' ? 3 : 2,
        },
      })
      used++
    }
    console.log(`   ${student.studentCode} ${student.name}: ${used}/${target} attendances seeded`)
  }

  // --- A couple of quota extensions for audit history ---
  await db.quotaExtension.create({
    data: {
      studentId: students[3].id, // Dewi
      adminId: admin.id,
      oldQuota: 12,
      newQuota: 20,
      addedSessions: 8,
      reason: 'Perpanjangan paket dari 12 ke 20 sesi',
    },
  })
  await db.quotaExtension.create({
    data: {
      studentId: students[0].id, // Andi
      adminId: admin.id,
      oldQuota: 15,
      newQuota: 18,
      addedSessions: 3,
      reason: 'Bonus 3 sesi karena rajin',
    },
  })

  console.log(`✅ Seeded: ${students.length} students, ${allSessions.length} sessions, ${days.length} days`)
  console.log(`   Teachers: pengajar/pengajar123, dimas/dimas123, faisal/faisal123, admin/admin123`)
  console.log(`   Student codes: PTE001..PTE010 (PIN = last 4 digits)`)
  console.log(`   PTE009 (Bayu) quota EXHAUSTED — demo extend flow`)
  console.log(`   PTE006 (Putri) quota almost exhausted (9/10)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
