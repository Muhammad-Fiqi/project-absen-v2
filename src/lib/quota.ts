import { and, count, eq, gte, isNotNull, lt, not } from 'drizzle-orm'
import { db as sharedDb } from '@/lib/db'
import { quotaDailyUsage, quotaExcuse, session, student, studentLeaveRequest } from '@/db/schema'
import { newId } from '@/lib/id'

// Loosely typed DB handle so tests can pass their own drizzle/libsql instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QuotaDb = any

export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// The daily quota starts "besok" (the day after rollout, 2026-08-11 → 2026-08-12):
// session days BEFORE this key are forgiven forever and are never charged, so
// students who skipped / didn't attend / didn't izin on past days keep their quota.
export const QUOTA_DAILY_START_KEY = '2026-08-12'

// A day's quota is only charged starting the day AFTER that day, so the
// deduction target is always "yesterday" — today is never charged on the same day.
export function yesterdayKey(d: Date = new Date()): string {
  const x = new Date(d)
  x.setDate(x.getDate() - 1)
  return dayKey(x)
}

export function normalizeDayKey(value: Date | string): string {
  if (typeof value === 'string') {
    const candidate = new Date(value)
    if (!Number.isNaN(candidate.getTime())) {
      return dayKey(candidate)
    }
    return value
  }
  return dayKey(value)
}

export function isLeaveRequestTooSoon(startDate: Date | string, now: Date): boolean {
  const start = new Date(startDate)
  const reference = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const diffDays = Math.round((startDay.getTime() - reference.getTime()) / 86400000)
  return diffDays < 3
}

export function shouldSkipDailyQuotaReduction(input: {
  hasApprovedLeave: boolean
  hasValidExcuse: boolean
  hasDailyDeduction: boolean
  quotaLeft: number
}): boolean {
  if (input.hasApprovedLeave) return true
  if (input.hasValidExcuse) return true
  if (input.hasDailyDeduction) return true
  return input.quotaLeft <= 0
}

// ── Per-day exemption checks ────────────────────────────────────────────────

export async function hasApprovedLeaveForDateWithDb(db: QuotaDb, studentId: string, dateKey: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(studentLeaveRequest)
    .where(and(eq(studentLeaveRequest.studentId, studentId), eq(studentLeaveRequest.status, 'approved')))

  return rows.some((item: { startDate: string; endDate: string }) => item.startDate <= dateKey && item.endDate >= dateKey)
}

export async function hasValidExcuseForDateWithDb(db: QuotaDb, studentId: string, dateKey: string): Promise<boolean> {
  const rows = await db
    .select({ id: quotaExcuse.id })
    .from(quotaExcuse)
    .where(and(eq(quotaExcuse.studentId, studentId), eq(quotaExcuse.dateKey, dateKey)))
    .limit(1)

  return rows.length > 0
}

// Backward-compatible wrappers (no db param) for existing call sites.
export async function hasApprovedLeaveForDate(studentId: string, dateKey: string): Promise<boolean> {
  return hasApprovedLeaveForDateWithDb(sharedDb, studentId, dateKey)
}

export async function hasValidExcuseForDate(studentId: string, dateKey: string): Promise<boolean> {
  return hasValidExcuseForDateWithDb(sharedDb, studentId, dateKey)
}

// ── Excuse ("Izin") helpers — shared by the API route and tests ─────────────

const MAX_EXCUSES = 5

export async function canApplyExcuse(
  db: QuotaDb,
  studentId: string,
  dateKey: string
): Promise<{ ok: boolean; error?: string; used: number; remaining: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, error: 'Tanggal izin tidak valid', used: 0, remaining: MAX_EXCUSES }
  }

  const existingRows = await db
    .select({ id: quotaExcuse.id })
    .from(quotaExcuse)
    .where(and(eq(quotaExcuse.studentId, studentId), eq(quotaExcuse.dateKey, dateKey)))
    .limit(1)
  if (existingRows[0]) {
    return { ok: false, error: 'Anda sudah menggunakan izin untuk tanggal ini', used: 0, remaining: 0 }
  }

  const [usageRow] = await db
    .select({ n: count() })
    .from(quotaExcuse)
    .where(eq(quotaExcuse.studentId, studentId))
  const used = Number(usageRow?.n ?? 0)
  const remaining = Math.max(0, MAX_EXCUSES - used)
  if (used >= MAX_EXCUSES) {
    return { ok: false, error: `Batas penggunaan izin sudah tercapai (maksimal ${MAX_EXCUSES} kali)`, used, remaining }
  }

  return { ok: true, used, remaining }
}

export async function createExcuse(
  db: QuotaDb,
  studentId: string,
  dateKey: string,
  reason: string
): Promise<{ ok: boolean; error?: string; remaining?: number; used?: number; item?: { id: string; dateKey: string; reason: string; createdAt: string } }> {
  const check = await canApplyExcuse(db, studentId, dateKey)
  if (!check.ok) {
    return { ok: false, error: check.error }
  }

  const [created] = await db
    .insert(quotaExcuse)
    .values({
      id: newId('ex'),
      studentId,
      dateKey,
      reason: reason || 'Izin harian',
      createdAt: new Date().toISOString(),
    })
    .returning()

  return {
    ok: true,
    used: check.used + 1,
    remaining: Math.max(0, check.remaining - 1),
    item: { id: created.id, dateKey: created.dateKey, reason: created.reason, createdAt: created.createdAt },
  }
}

export async function cancelExcuseWithDb(
  db: QuotaDb,
  excuseId: string,
  opts?: { startKey?: string }
): Promise<{ ok: boolean; error?: string; studentId?: string; dateKey?: string }> {
  const rows = await db
    .select()
    .from(quotaExcuse)
    .where(eq(quotaExcuse.id, excuseId))
    .limit(1)
  const exc = rows[0]
  if (!exc) return { ok: false, error: 'Data izin tidak ditemukan' }

  await db.delete(quotaExcuse).where(eq(quotaExcuse.id, excuseId))

  // The freed day is no longer exempt, so re-run the deduction to pick it up
  // when the day passes (idempotent — days already charged stay charged).
  // Best-effort: if it fails, the next cron/catch-up will still process it.
  try {
    await applyDailyQuotaDeductionWithDb(db, exc.studentId, yesterdayKey(), opts)
  } catch {
    // ignore — cancellation itself already succeeded
  }

  return { ok: true, studentId: exc.studentId, dateKey: exc.dateKey }
}

export async function cancelExcuse(excuseId: string): Promise<{ ok: boolean; error?: string; studentId?: string; dateKey?: string }> {
  return cancelExcuseWithDb(sharedDb, excuseId)
}

// ── Leave ("Cuti") validation — shared by the API route and tests ───────────

export function validateLeaveInput(input: {
  reason?: string
  startDate?: string
  endDate?: string
  now?: Date
}): { ok: boolean; error?: string; reason?: string; startDate?: string; endDate?: string } {
  const reason = (input.reason || '').trim()
  const startDate = normalizeDayKey(input.startDate || '')
  const endDate = normalizeDayKey(input.endDate || '')

  if (!reason || reason.length < 10) {
    return { ok: false, error: 'Alasan cuti wajib diisi dengan penjelasan yang cukup' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { ok: false, error: 'Tanggal mulai dan selesai cuti harus valid' }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return { ok: false, error: 'Rentang tanggal cuti tidak valid' }
  }

  const now = input.now || new Date()
  if (isLeaveRequestTooSoon(start, now)) {
    return { ok: false, error: 'Pengajuan cuti harus paling lambat 3 hari sebelum tanggal mulai cuti' }
  }

  return { ok: true, reason, startDate, endDate }
}

// ── Daily quota deduction (backfill over session days) ──────────────────────

export async function applyDailyQuotaDeductionWithDb(
  db: QuotaDb,
  studentId: string,
  targetDateKey: string,
  opts?: { startKey?: string }
): Promise<{ deducted: number; quotaExhausted: boolean; skippedLeave: number; skippedExcuse: number; reason?: string }> {
  const studentRows = await db
    .select()
    .from(student)
    .where(eq(student.id, studentId))
    .limit(1)
  const studentRow = studentRows[0]
  if (!studentRow) return { deducted: 0, quotaExhausted: true, skippedLeave: 0, skippedExcuse: 0, reason: 'student-not-found' }
  if (studentRow.sessionQuota <= 0) return { deducted: 0, quotaExhausted: true, skippedLeave: 0, skippedExcuse: 0, reason: 'quota-zero' }
  if (!studentRow.courseId) return { deducted: 0, quotaExhausted: false, skippedLeave: 0, skippedExcuse: 0, reason: 'no-course' }

  // Only days that actually have a (non-cancelled) session for this course count.
  const sessionRows = await db
    .select({ date: session.date })
    .from(session)
    .where(and(eq(session.courseId, studentRow.courseId), not(eq(session.status, 'cancelled'))))
  const sessionDaySet = new Set<string>()
  for (const s of sessionRows) {
    const k = normalizeDayKey(s.date)
    if (k) sessionDaySet.add(k)
  }
  if (sessionDaySet.size === 0) return { deducted: 0, quotaExhausted: false, skippedLeave: 0, skippedExcuse: 0 }

  const enrolledFrom = dayKey(new Date(studentRow.createdAt))

  // Grace period: never charge days before the quota start key (forgiven past).
  const startKey = (opts?.startKey || QUOTA_DAILY_START_KEY) > enrolledFrom
    ? (opts?.startKey || QUOTA_DAILY_START_KEY)
    : enrolledFrom

  // Existing usage rows (once) → avoid O(n²) counting inside the loop.
  // Only usage from the start key onward counts against the quota.
  const usageRows = await db
    .select({ dateKey: quotaDailyUsage.dateKey })
    .from(quotaDailyUsage)
    .where(and(eq(quotaDailyUsage.studentId, studentId), gte(quotaDailyUsage.dateKey, startKey)))
  const usageSet: Set<string> = new Set(usageRows.map((r: { dateKey: string }) => r.dateKey))
  let usedCount = usageRows.length

  // Approved leave ranges (once) → per-day range check in the loop.
  const leaveRows = await db
    .select({ startDate: studentLeaveRequest.startDate, endDate: studentLeaveRequest.endDate })
    .from(studentLeaveRequest)
    .where(and(eq(studentLeaveRequest.studentId, studentId), eq(studentLeaveRequest.status, 'approved')))
  const leaveRanges: Array<{ startDate: string; endDate: string }> = leaveRows.map((r: { startDate: string; endDate: string }) => ({ startDate: r.startDate, endDate: r.endDate }))

  // Excused days (once).
  const excuseRows = await db
    .select({ dateKey: quotaExcuse.dateKey })
    .from(quotaExcuse)
    .where(eq(quotaExcuse.studentId, studentId))
  const excuseSet: Set<string> = new Set(excuseRows.map((r: { dateKey: string }) => r.dateKey))

  // Candidate days: session days strictly after the last deduction, up to target,
  // and not before the student enrolled / the grace-period start key.
  const candidateKeys = Array.from(sessionDaySet)
    .filter((k) => k > (lastKey(usageSet) ?? '') && k <= targetDateKey && k >= startKey)
    .sort()

  let inserted = 0
  let skippedLeave = 0
  let skippedExcuse = 0

  for (const k of candidateKeys) {
    if (usedCount + inserted >= studentRow.sessionQuota) {
      return { deducted: inserted, quotaExhausted: true, skippedLeave, skippedExcuse }
    }
    if (leaveRanges.some((r) => r.startDate <= k && r.endDate >= k)) {
      skippedLeave++
      continue
    }
    if (excuseSet.has(k)) {
      skippedExcuse++
      continue
    }
    if (usageSet.has(k)) continue

    await db.insert(quotaDailyUsage).values({ id: newId('qdu'), studentId, dateKey: k })
    usageSet.add(k)
    inserted++
  }

  return { deducted: inserted, quotaExhausted: usedCount + inserted >= studentRow.sessionQuota, skippedLeave, skippedExcuse }
}

function lastKey(set: Set<string>): string | null {
  let max: string | null = null
  for (const k of set) {
    if (max === null || k > max) max = k
  }
  return max
}

export async function applyDailyQuotaDeduction(
  studentId: string,
  targetDateKey: string
): Promise<{ deducted: number; quotaExhausted: boolean; skippedLeave: number; skippedExcuse: number; reason?: string }> {
  return applyDailyQuotaDeductionWithDb(sharedDb, studentId, targetDateKey)
}

// ── Daily catch-up across all students (cron / instrumentation) ─────────────

export async function processDailyQuotaCatchUp(): Promise<{ processed: number; deducted: number; exhausted: number }> {
  const students = await sharedDb
    .select({ id: student.id })
    .from(student)
    .where(isNotNull(student.courseId))

  // Charge only days that have fully passed (yesterday and earlier) — today is
  // never charged on the same day it occurs ("mulai esok hari").
  const yesterday = yesterdayKey()
  let deducted = 0
  let exhausted = 0

  for (const s of students) {
    const res = await applyDailyQuotaDeduction(s.id, yesterday)
    deducted += res.deducted
    if (res.quotaExhausted) exhausted++
  }

  return { processed: students.length, deducted, exhausted }
}

// ── One-time grace cleanup (idempotent, runs on boot) ───────────────────────

// Deletes legacy quota usage recorded before the grace-period start key, so
// students who skipped / didn't attend / didn't izin on past days get their
// quota restored. Idempotent — safe to re-run on every server start / cron.
export async function forgiveLegacyQuotaUsage(): Promise<{ removed: number }> {
  const removed = await sharedDb
    .delete(quotaDailyUsage)
    .where(lt(quotaDailyUsage.dateKey, QUOTA_DAILY_START_KEY))
    .returning({ id: quotaDailyUsage.id })
  return { removed: removed.length }
}
