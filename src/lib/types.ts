// Types shared between frontend and backend

export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
export type SessionMode = 'offline' | 'online'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

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
  maxAttendees: number
  status: SessionStatus
  notes: string | null
  course: {
    code: string
    name: string
    totalSessions: number
    graceMinutesBefore: number
    graceMinutesAfter: number
  }
}

export interface AttendanceInfo {
  id: string
  sessionId: string
  studentId: string
  status: AttendanceStatus
  checkInTime: string
  qrVerified: boolean
  verified: boolean
  notes: string | null
  student?: StudentInfo
}

// A day group: sessions on a calendar day
export interface DayGroup {
  dayKey: string // YYYY-MM-DD
  date: string // ISO
  topicOfDay: string | null
  isToday: boolean
  isPast: boolean
  attendedSessionId: string | null
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
    maxAttendees: number
    attendeeCount: number
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
  }
  quota: {
    total: number
    used: number
    remaining: number
    exhausted: boolean
    expiringSoon: boolean
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
  recentDays: DayGroup[]
}

export interface AttendanceSubmitResponse {
  success: boolean
  status: AttendanceStatus
  verified: boolean
  message: string
  checks: {
    time?: { passed: boolean; reason?: string }
    quota?: { passed: boolean; reason?: string; remaining?: number }
    daily?: { passed: boolean; reason?: string; attendedSession?: string }
    capacity?: { passed: boolean; reason?: string }
  }
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