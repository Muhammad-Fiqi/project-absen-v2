import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { tmpdir } from 'os'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import { course, session, student, quotaDailyUsage, quotaExcuse, studentLeaveRequest } from '@/db/schema'
import { newId } from '@/lib/id'
import {
  applyDailyQuotaDeductionWithDb,
  canApplyExcuse,
  createExcuse,
  cancelExcuseWithDb,
  validateLeaveInput,
} from './quota'

// Minimal DDL mirroring the app schema (tables used by quota logic).
const TEST_DDL = [
  `CREATE TABLE IF NOT EXISTS "Course" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultQuota" INTEGER NOT NULL DEFAULT 15,
    "totalSessions" INTEGER NOT NULL DEFAULT 20,
    "graceMinutesBefore" INTEGER NOT NULL DEFAULT 10,
    "graceMinutesAfter" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT PRIMARY KEY,
    "studentCode" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "courseCode" TEXT NOT NULL,
    "courseId" TEXT,
    "pinHash" TEXT,
    "sessionQuota" INTEGER NOT NULL DEFAULT 15,
    "quotaExtendedAt" TEXT,
    "quotaNote" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'offline',
    "platform" TEXT,
    "room" TEXT,
    "teacher" TEXT,
    "topicOfDay" TEXT,
    "maxAttendees" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "qrSecret" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE TABLE IF NOT EXISTS "QuotaDailyUsage" (
    "id" TEXT PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE("studentId", "dateKey")
  );`,
  `CREATE TABLE IF NOT EXISTS "QuotaExcuse" (
    "id" TEXT PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE("studentId", "dateKey")
  );`,
  `CREATE TABLE IF NOT EXISTS "StudentLeaveRequest" (
    "id" TEXT PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TEXT,
    "reviewNote" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
]

let client: Client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any
let studentSeq = 0
let courseSeq = 0

beforeAll(async () => {
  const dbPath = `${tmpdir()}/quota-test-${process.pid}-${Date.now()}.db`.replace(/\\/g, '/')
  client = createClient({ url: `file:${dbPath}` })
  for (const stmt of TEST_DDL) {
    await client.execute(stmt)
  }
  db = drizzle(client)
})

afterAll(async () => {
  await client?.close()
})

// ── Seed helpers ────────────────────────────────────────────────────────────

async function makeCourse() {
  const id = newId('crs')
  await db.insert(course).values({ id, code: `C${++courseSeq}`, name: 'Kursus Test', createdAt: new Date().toISOString() })
  return id
}

async function seedStudent(courseId: string, sessionQuota = 10, createdAt = '2026-08-01T00:00:00') {
  const id = newId('stu')
  await db.insert(student).values({
    id,
    studentCode: `S${String(++studentSeq).padStart(4, '0')}`,
    name: `Student ${studentSeq}`,
    courseCode: 'TEST-C',
    courseId,
    sessionQuota,
    createdAt,
  })
  return id
}

async function seedSession(courseId: string, date: string, status = 'scheduled') {
  await db.insert(session).values({
    id: newId('ses'),
    courseId,
    sessionNumber: 1,
    title: 'Sesi',
    date: `${date}T00:00:00`,
    startTime: `${date}T09:00:00`,
    endTime: `${date}T11:00:00`,
    status,
    qrSecret: 'test-secret',
    createdAt: new Date().toISOString(),
  })
}

async function seedExcuse(studentId: string, dateKey: string) {
  await db.insert(quotaExcuse).values({ id: newId('ex'), studentId, dateKey, reason: 'Izin test', createdAt: new Date().toISOString() })
}

async function seedLeave(studentId: string, startDate: string, endDate: string, status = 'approved') {
  await db.insert(studentLeaveRequest).values({
    id: newId('lv'),
    studentId,
    reason: 'Cuti kelas test dengan alasan yang cukup panjang',
    startDate,
    endDate,
    status,
    createdAt: new Date().toISOString(),
  })
}

async function usageKeys(studentId: string): Promise<string[]> {
  const rows = await db.select({ dateKey: quotaDailyUsage.dateKey }).from(quotaDailyUsage).where(eq(quotaDailyUsage.studentId, studentId))
  return rows.map((r: { dateKey: string }) => r.dateKey).sort()
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('kuota harian (session days only, backfill)', () => {
  it('1. student normal → kuota berkurang 1 setiap hari yang ada sesi', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) await seedSession(c, d)

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-03', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(3)
    expect(await usageKeys(s)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
  })

  it('1b. hari sebelum tanggal mulai kuota (startKey) tidak pernah dihitung', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-05', '2026-08-09']) await seedSession(c, d)

    // Mulai kuota = 2026-08-05 → sesi 08-01 (hari kemarin) diampuni selamanya.
    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-09', { startKey: '2026-08-05' })
    expect(res.deducted).toBe(2)
    expect(await usageKeys(s)).toEqual(['2026-08-05', '2026-08-09'])
  })

  it('2. tidak ada double deduction per tanggal (idempotent)', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02']) await seedSession(c, d)

    await applyDailyQuotaDeductionWithDb(db, s, '2026-08-02', { startKey: '2026-08-01' })
    const again = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-02', { startKey: '2026-08-01' })
    expect(again.deducted).toBe(0)
    expect((await usageKeys(s)).length).toBe(2)
  })

  it('3. student tidak absen → kuota tetap berkurang (pengurangan tidak tergantung absensi)', async () => {
    // No Attendance row exists anywhere in this flow — deduction is purely date/session driven.
    const c = await makeCourse()
    const s = await seedStudent(c, 5)
    for (const d of ['2026-08-01', '2026-08-02']) await seedSession(c, d)

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-02', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
  })

  it('4. hari tanpa sesi → tidak berkurang', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-03']) await seedSession(c, d)

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-05', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
    const keys = await usageKeys(s)
    expect(keys).toEqual(['2026-08-01', '2026-08-03'])
  })

  it('5. sesi yang dibatalkan (cancelled) tidak dihitung', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    await seedSession(c, '2026-08-01', 'scheduled')
    await seedSession(c, '2026-08-02', 'cancelled')
    await seedSession(c, '2026-08-03', 'scheduled')

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-03', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
    expect(await usageKeys(s)).toEqual(['2026-08-01', '2026-08-03'])
  })

  it('6. sesi sebelum student terdaftar tidak dihitung', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10, '2026-08-02T00:00:00')
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) await seedSession(c, d)

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-03', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
    expect(await usageKeys(s)).toEqual(['2026-08-02', '2026-08-03'])
  })

  it('7. kuota tidak pernah negatif (berhenti di 0)', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 2)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']) await seedSession(c, d)

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-04', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
    expect(res.quotaExhausted).toBe(true)

    // Add even more session days later — still no deduction below zero.
    await seedSession(c, '2026-08-08')
    const later = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-10', { startKey: '2026-08-01' })
    expect(later.deducted).toBe(0)
    expect((await usageKeys(s)).length).toBe(2)
  })
})

describe('izin harian (maks 5, anti duplikat)', () => {
  it('8. izin → kuota tidak berkurang pada hari tersebut', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) await seedSession(c, d)
    await seedExcuse(s, '2026-08-02')

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-03', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
    expect(res.skippedExcuse).toBe(1)
    expect(await usageKeys(s)).toEqual(['2026-08-01', '2026-08-03'])
  })

  it('9. izin lebih dari 5 kali → ditolak', async () => {
    const s = await seedStudent(await makeCourse(), 20)
    for (let i = 1; i <= 5; i++) {
      const r = await createExcuse(db, s, `2026-09-0${i}`, `Izin ke-${i}`)
      expect(r.ok).toBe(true)
    }
    const sixth = await createExcuse(db, s, '2026-09-10', 'Izin keenam')
    expect(sixth.ok).toBe(false)
    expect(sixth.error).toContain('Batas')
    const check = await canApplyExcuse(db, s, '2026-09-11')
    expect(check.ok).toBe(false)
    expect(check.remaining).toBe(0)
  })

  it('10. izin dua kali pada tanggal yang sama → ditolak', async () => {
    const s = await seedStudent(await makeCourse(), 20)
    const first = await createExcuse(db, s, '2026-09-01', 'Izin pertama')
    expect(first.ok).toBe(true)
    const dup = await createExcuse(db, s, '2026-09-01', 'Izin duplikat')
    expect(dup.ok).toBe(false)
    expect(dup.error).toContain('sudah menggunakan izin')
  })

  it('11. tanggal izin tidak valid → ditolak', async () => {
    const s = await seedStudent(await makeCourse(), 20)
    const r = await createExcuse(db, s, 'bukan-tanggal', 'Izin')
    expect(r.ok).toBe(false)
  })

  it('11b. batalkan izin → hari tersebut dihitung lagi terhadap kuota', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) await seedSession(c, d)

    // Hari 1 terisi; hari 2 di-izin-kan.
    await applyDailyQuotaDeductionWithDb(db, s, '2026-08-01', { startKey: '2026-08-01' })
    const created = await createExcuse(db, s, '2026-08-02', 'Izin test')
    expect(created.ok).toBe(true)
    await applyDailyQuotaDeductionWithDb(db, s, '2026-08-02', { startKey: '2026-08-01' })
    expect(await usageKeys(s)).toEqual(['2026-08-01'])

    // Batalkan izin → hari 2 kini harus dihitung lagi.
    // cancelExcuseWithDb menjalankan catch-up hingga hari ini (nyata),
    // karena itu hari 2 (dan hari sesi lain setelahnya) kan terisi.
    const cancel = await cancelExcuseWithDb(db, created.item!.id, { startKey: '2026-08-01' })
    expect(cancel.ok).toBe(true)
    expect(cancel.dateKey).toBe('2026-08-02')
    const keysAfter = await usageKeys(s)
    expect(keysAfter).toContain('2026-08-01')
    expect(keysAfter).toContain('2026-08-02')
  })

  it('11c. batalkan izin yang tidak ada → ditolak', async () => {
    const r = await cancelExcuseWithDb(db, 'ex-tidak-ada')
    expect(r.ok).toBe(false)
  })
})

describe('cuti kelas', () => {
  it('12. cuti diajukan ≥3 hari sebelum mulai → diterima', () => {
    const now = new Date('2026-08-10T00:00:00')
    expect(validateLeaveInput({ reason: 'Alasan cuti yang cukup panjang', startDate: '2026-08-13', endDate: '2026-08-15', now }).ok).toBe(true)
  })

  it('13. cuti <3 hari sebelum mulai → ditolak', () => {
    const now = new Date('2026-08-10T00:00:00')
    const r = validateLeaveInput({ reason: 'Alasan cuti yang cukup panjang', startDate: '2026-08-12', endDate: '2026-08-14', now })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('3 hari')
  })

  it('14. alasan cuti wajib dan minimal 10 karakter', () => {
    const now = new Date('2026-08-10T00:00:00')
    expect(validateLeaveInput({ reason: '', startDate: '2026-08-20', endDate: '2026-08-21', now }).ok).toBe(false)
    expect(validateLeaveInput({ reason: 'pendek', startDate: '2026-08-20', endDate: '2026-08-21', now }).ok).toBe(false)
    expect(validateLeaveInput({ reason: 'Alasan yang cukup panjang', startDate: '2026-08-20', endDate: '2026-08-21', now }).ok).toBe(true)
  })

  it('15. rentang tanggal tidak valid (mulai > selesai) → ditolak', () => {
    const now = new Date('2026-08-10T00:00:00')
    const r = validateLeaveInput({ reason: 'Alasan yang cukup panjang', startDate: '2026-08-20', endDate: '2026-08-15', now })
    expect(r.ok).toBe(false)
  })

  it('16. cuti disetujui → kuota tidak berkurang selama periode, dan kembali normal setelahnya', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']) await seedSession(c, d)
    await seedLeave(s, '2026-08-02', '2026-08-04', 'approved')

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-07', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(4) // 01, 05, 06, 07
    expect(res.skippedLeave).toBe(3) // 02, 03, 04
    expect(await usageKeys(s)).toEqual(['2026-08-01', '2026-08-05', '2026-08-06', '2026-08-07'])
  })

  it('17. cuti ditolak → aturan normal berlaku (tetap berkurang)', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) await seedSession(c, d)
    await seedLeave(s, '2026-08-02', '2026-08-03', 'rejected')

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-03', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(3)
    expect(res.skippedLeave).toBe(0)
  })

  it('18. cuti pending (belum direview) tidak mengecualikan', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02']) await seedSession(c, d)
    await seedLeave(s, '2026-08-02', '2026-08-02', 'pending')

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-02', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(2)
  })

  it('19. masih dalam periode cuti → hari itu tidak berkurang', async () => {
    const c = await makeCourse()
    const s = await seedStudent(c, 10)
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) await seedSession(c, d)
    await seedLeave(s, '2026-08-02', '2026-08-05', 'approved')

    const res = await applyDailyQuotaDeductionWithDb(db, s, '2026-08-03', { startKey: '2026-08-01' })
    expect(res.deducted).toBe(1) // hanya 08-01
    expect(res.skippedLeave).toBe(2) // 08-02, 08-03
  })
})
