import { sql } from 'drizzle-orm'
import { integer, real, text, sqliteTable, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

// Drizzle schema for Turso/libsql (SQLite dialect)
// Note: IDs use string (cuid) same as Prisma.

export const adminUser = sqliteTable(
  'AdminUser',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('passwordHash').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('teacher'),
    createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    // keeps parity with Prisma unique(username)
    usernameUnique: uniqueIndex('AdminUser_username_unique').on(t.username),
  })
)

export const course = sqliteTable('Course', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  defaultQuota: integer('defaultQuota').notNull().default(15),
  totalSessions: integer('totalSessions').notNull().default(20),
  graceMinutesBefore: integer('graceMinutesBefore').notNull().default(10),
  graceMinutesAfter: integer('graceMinutesAfter').notNull().default(20),
  createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export const student = sqliteTable('Student', {
  id: text('id').primaryKey(),
  studentCode: text('studentCode').notNull().unique(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  courseCode: text('courseCode').notNull(),
  courseId: text('courseId'),
  pinHash: text('pinHash'),
  sessionQuota: integer('sessionQuota').notNull().default(15),
  quotaExtendedAt: text('quotaExtendedAt'),
  quotaNote: text('quotaNote'),
  createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export const session = sqliteTable('Session', {
  id: text('id').primaryKey(),
  courseId: text('courseId').notNull(),
  sessionNumber: integer('sessionNumber').notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(), // store as ISO date string (YYYY-MM-DD) or full ISO; app uses to compute dayKey
  startTime: text('startTime').notNull(),
  endTime: text('endTime').notNull(),
  mode: text('mode').notNull().default('offline'),
  platform: text('platform'),
  room: text('room'),
  teacher: text('teacher'),
  topicOfDay: text('topicOfDay'),
  maxAttendees: integer('maxAttendees').notNull().default(10),
  status: text('status').notNull().default('scheduled'),
  qrSecret: text('qrSecret').notNull(),
  notes: text('notes'),
  createdById: text('createdById'),
  createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export const attendance = sqliteTable(
  'Attendance',
  {
    id: text('id').primaryKey(),
    sessionId: text('sessionId').notNull(),
    studentId: text('studentId').notNull(),
    status: text('status').notNull().default('present'),
    checkInTime: text('checkInTime').notNull().default(sql`(CURRENT_TIMESTAMP)`),
    dayKey: text('dayKey').notNull(),
    qrVerified: integer('qrVerified', { mode: 'number' }).notNull().default(0),
    verified: integer('verified', { mode: 'number' }).notNull().default(0),
    notes: text('notes'),
    createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    uniqueSessionStudent: uniqueIndex('Attendance_session_student_unique').on(t.sessionId, t.studentId),
    idxStudentDayKey: index('Attendance_student_daykey_idx').on(t.studentId, t.dayKey),
  })
)

export const qrToken = sqliteTable('QrToken', {
  id: text('id').primaryKey(),
  sessionId: text('sessionId').notNull(),
  token: text('token').notNull().unique(),
  hmac: text('hmac').notNull(),
  issuedAt: text('issuedAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  expiresAt: text('expiresAt').notNull(),
  used: integer('used', { mode: 'number' }).notNull().default(0),
})

export const quotaExtension = sqliteTable('QuotaExtension', {
  id: text('id').primaryKey(),
  studentId: text('studentId').notNull(),
  adminId: text('adminId'),
  oldQuota: integer('oldQuota').notNull(),
  newQuota: integer('newQuota').notNull(),
  addedSessions: integer('addedSessions').notNull(),
  reason: text('reason'),
  createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export const quotaDailyUsage = sqliteTable(
  'QuotaDailyUsage',
  {
    id: text('id').primaryKey(),
    studentId: text('studentId').notNull(),
    dateKey: text('dateKey').notNull(),
    createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    uniqueStudentDay: uniqueIndex('QuotaDailyUsage_student_day_unique').on(t.studentId, t.dateKey),
  })
)

export const quotaExcuse = sqliteTable(
  'QuotaExcuse',
  {
    id: text('id').primaryKey(),
    studentId: text('studentId').notNull(),
    dateKey: text('dateKey').notNull(),
    reason: text('reason'),
    createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    uniqueStudentDay: uniqueIndex('QuotaExcuse_student_day_unique').on(t.studentId, t.dateKey),
  })
)

export const studentLeaveRequest = sqliteTable('StudentLeaveRequest', {
  id: text('id').primaryKey(),
  studentId: text('studentId').notNull(),
  reason: text('reason').notNull(),
  startDate: text('startDate').notNull(),
  endDate: text('endDate').notNull(),
  status: text('status').notNull().default('pending'),
  reviewedById: text('reviewedById'),
  reviewedAt: text('reviewedAt'),
  reviewNote: text('reviewNote'),
  createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

export const extensionRequest = sqliteTable('ExtensionRequest', {
  id: text('id').primaryKey(),
  studentId: text('studentId').notNull(),
  requestedSessions: integer('requestedSessions').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  reviewedById: text('reviewedById'),
  reviewedAt: text('reviewedAt'),
  reviewNote: text('reviewNote'),
  createdAt: text('createdAt').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

