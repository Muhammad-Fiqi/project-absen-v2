/**
 * Lightweight migration helper for local/dev preview.
 *
 * Production should use drizzle-kit migrations, but for this task we
 * generate tables via SQL so preview works immediately.
 */

import { db } from '@/lib/db'

export async function ensureDummyTables() {
  // Prisma schema uses DateTime columns; in SQLite we store ISO strings.
  // Drizzle libsql database doesn't expose exec directly on all versions.
  // Use raw SQL via drizzle's session.$client?.query if available, otherwise fallback to casting.
  const raw = db as any
  const client = raw?.session?.$client ?? raw?.$client ?? raw
  if (!client || typeof client.query !== 'function') {
    throw new Error('Drizzle client.query() not available for ensureDummyTables')
  }
  await client.query(`

    CREATE TABLE IF NOT EXISTS "AdminUser" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'teacher',
      "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS "Course" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "defaultQuota" INTEGER NOT NULL DEFAULT 15,
      "totalSessions" INTEGER NOT NULL DEFAULT 20,
      "graceMinutesBefore" INTEGER NOT NULL DEFAULT 10,
      "graceMinutesAfter" INTEGER NOT NULL DEFAULT 20,
      "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS "Student" (
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
    );

    CREATE TABLE IF NOT EXISTS "Session" (
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
    );

    CREATE TABLE IF NOT EXISTS "Attendance" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'present',
      "checkInTime" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      "dayKey" TEXT NOT NULL,
      "qrVerified" INTEGER NOT NULL DEFAULT 0,
      "verified" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE("sessionId", "studentId")
    );

    CREATE TABLE IF NOT EXISTS "QrToken" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "hmac" TEXT NOT NULL,
      "issuedAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      "expiresAt" TEXT NOT NULL,
      "used" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS "QuotaExtension" (
      "id" TEXT PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "adminId" TEXT,
      "oldQuota" INTEGER NOT NULL,
      "newQuota" INTEGER NOT NULL,
      "addedSessions" INTEGER NOT NULL,
      "reason" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS "ExtensionRequest" (
      "id" TEXT PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "requestedSessions" INTEGER NOT NULL,
      "reason" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "reviewedById" TEXT,
      "reviewedAt" TEXT,
      "reviewNote" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `)
}

