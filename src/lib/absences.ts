export interface AbsenceStudent {
  id: string
  name: string
  studentCode: string
  createdAt: string
  courseId: string | null
  courseCode: string
}

export interface AbsenceSession {
  courseId: string
  courseCode: string
  date: string
  status: string
}

export interface StudentAttendanceDay {
  studentId: string
  dayKey: string
  status: string
  verified: boolean | number
}

export interface LeaveRange {
  studentId: string
  startDate: string
  endDate: string
}

export function getStudentMissedDates(input: {
  students: AbsenceStudent[]
  sessions: AbsenceSession[]
  attendances: StudentAttendanceDay[]
  excuses: Array<{ studentId: string; dateKey: string }>
  approvedLeaves: LeaveRange[]
  todayKey: string
}) {
  const attendanceByStudent = new Map<string, Set<string>>()
  for (const record of input.attendances) {
    if (!record.verified && record.status !== 'excused') continue
    const days = attendanceByStudent.get(record.studentId) ?? new Set<string>()
    days.add(record.dayKey.slice(0, 10))
    attendanceByStudent.set(record.studentId, days)
  }

  const excuseByStudent = new Map<string, Set<string>>()
  for (const excuse of input.excuses) {
    const days = excuseByStudent.get(excuse.studentId) ?? new Set<string>()
    days.add(excuse.dateKey)
    excuseByStudent.set(excuse.studentId, days)
  }

  return input.students.map((student) => {
    const enrollmentDate = student.createdAt.slice(0, 10)
    const classDays = new Set(
      input.sessions
        .filter((session) =>
          session.status !== 'cancelled' &&
          session.date.slice(0, 10) >= enrollmentDate &&
          session.date.slice(0, 10) < input.todayKey &&
          ((student.courseId && session.courseId === student.courseId) || session.courseCode === student.courseCode)
        )
        .map((session) => session.date.slice(0, 10))
    )

    const attendedDays = attendanceByStudent.get(student.id) ?? new Set<string>()
    const excusedDays = excuseByStudent.get(student.id) ?? new Set<string>()
    const missedDates = Array.from(classDays)
      .filter((dateKey) =>
        !attendedDays.has(dateKey) &&
        !excusedDays.has(dateKey) &&
        !input.approvedLeaves.some((leave) =>
          leave.studentId === student.id && leave.startDate <= dateKey && leave.endDate >= dateKey
        )
      )
      .sort()

    return {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      missedDates,
    }
  })
}