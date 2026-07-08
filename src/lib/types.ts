// Types shared between frontend and backend

export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
export type SessionMode = 'offline' | 'online'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'
export type AttendanceMethod = 'qr' | 'button' | 'multi'

export interface StudentInfo {
  id: string
  studentCode: string
  name: string
  email: string | null
  phone: string | null
  courseCode: string
  courseId: string | null
  sessionQuota: number
  sessionsUsed: number
  sessionsRemaining: number
  quotaExhausted: boolean
  quotaExtendedAt: string | null
}

export interface TeacherInfo {
  id: string
  username: string
  name: string
  role: 'admin' | 'teacher'
}

export interface SessionInfo {
  id: string
  courseId: string
  sessionNumber: number
  title: string
  date: string
  startTime: string
  endTime: string
  mode: SessionMode
  platform: string | null
  room: string | null
  teacher: string | null
  topicOfDay: string | null
  locationLat: number | null
  locationLng: number | null
  geoRadiusM: number | null
  status: SessionStatus
  sessionPin: string | null
  notes: string | null
  course: {
    code: string
    name: string
    totalSessions: number
    requiredFactors: string
    graceMinutesBefore: number
    graceMinutesAfter: number
  }
}

export interface AttendanceInfo {
  id: string
  sessionId: string
  studentId: string
  status: AttendanceStatus
  method: AttendanceMethod
  checkInTime: string
  deviceFingerprint: string | null
  geoVerified: boolean
  geoDistanceM: number | null
  pinVerified: boolean
  qrVerified: boolean
  selfieVerified: boolean
  verified: boolean
  factorsPassed: number
  factorsRequired: number
  flagged: boolean
  student?: StudentInfo
}

// A day group: all sessions on a calendar day share topicOfDay
export interface DayGroup {
  dayKey: string // YYYY-MM-DD
  date: string // ISO
  topicOfDay: string | null
  isToday: boolean
  isPast: boolean
  attendedSessionId: string | null // if student already attended a session this day
  sessions: Array<{
    id: string
    sessionNumber: number
    title: string
    startTime: string
    endTime: string
    mode: SessionMode
    platform: string | null
    room: string | null
    teacher: string | null
    status: SessionStatus
    canCheckIn: boolean
    checkInWindow: {
      open: boolean
      message: string
      opensAt: string | null
      closesAt: string | null
    }
  }>
}

export interface StudentDashboard {
  student: StudentInfo
  course: {
    code: string
    name: string
    totalSessions: number
    defaultQuota: number
    requiredFactors: string[]
  }
  quota: {
    total: number
    used: number
    remaining: number
    exhausted: boolean
    expiringSoon: boolean // <= 2 remaining
    extendedAt: string | null
  }
  stats: {
    present: number
    late: number
    excused: number
    totalCheckIns: number
    uniqueDaysAttended: number
  }
  today: DayGroup | null
  upcomingDays: DayGroup[]
  recentDays: DayGroup[] // past days with attendance history
}

export interface QrPayload {
  sessionId: string
  token: string
  ts: number
  window: number
  hmac: string
}

export interface AttendanceSubmitRequest {
  sessionId: string
  studentId: string
  method: AttendanceMethod
  qr?: { sessionId: string; token: string; ts?: number; window?: number }
  pin?: string
  geo?: { lat: number; lng: number }
  deviceFingerprint?: string
  selfieImage?: string // base64
}

export interface AttendanceSubmitResponse {
  success: boolean
  status: AttendanceStatus
  verified: boolean
  factorsPassed: number
  factorsRequired: number
  message: string
  checks: {
    qr?: { passed: boolean; reason?: string }
    pin?: { passed: boolean; reason?: string }
    geo?: { passed: boolean; reason?: string; distanceM?: number }
    device?: { passed: boolean; reason?: string }
    selfie?: { passed: boolean; reason?: string }
    time?: { passed: boolean; reason?: string }
    quota?: { passed: boolean; reason?: string; remaining?: number }
    daily?: { passed: boolean; reason?: string; attendedSession?: string }
  }
  flagged?: boolean
  quotaRemaining?: number
}

// Teacher student-management view
export interface StudentManageRow {
  id: string
  studentCode: string
  name: string
  email: string | null
  phone: string | null
  sessionQuota: number
  sessionsUsed: number
  sessionsRemaining: number
  quotaExhausted: boolean
  quotaExtendedAt: string | null
  lastCheckIn: string | null
  uniqueDaysAttended: number
  flaggedCount: number
  extensions: Array<{
    id: string
    oldQuota: number
    newQuota: number
    addedSessions: number
    reason: string | null
    createdAt: string
    adminName?: string | null
  }>
}
