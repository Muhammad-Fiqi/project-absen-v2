import { describe, expect, it } from 'bun:test'
import { getStudentMissedDates } from './absences'

describe('student missed class dates', () => {
  it('lists unique past class dates and excludes attendance, izin, approved leave, cancelled, today, and future', () => {
    const result = getStudentMissedDates({
      students: [{ id: 'stu-1', name: 'Fauzia Husni', studentCode: 'PTE001', createdAt: '2026-09-18T09:00:00.000Z', courseId: 'course-1', courseCode: 'PTE-A' }],
      sessions: [
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-20T00:00:00.000Z', status: 'completed' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-20T08:00:00.000Z', status: 'completed' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-21', status: 'completed' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-22', status: 'active' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-23', status: 'scheduled' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-19', status: 'cancelled' },
      ],
      attendances: [{ studentId: 'stu-1', dayKey: '2026-09-21', status: 'present', verified: true }],
      excuses: [],
      approvedLeaves: [],
      todayKey: '2026-09-22',
    })

    expect(result[0].missedDates).toEqual(['2026-09-20'])
  })

  it('does not count days covered by izin or approved leave as missed', () => {
    const result = getStudentMissedDates({
      students: [{ id: 'stu-1', name: 'Fauzia Husni', studentCode: 'PTE001', createdAt: '2026-09-18T09:00:00.000Z', courseId: 'course-1', courseCode: 'PTE-A' }],
      sessions: [
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-18', status: 'completed' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-09-19', status: 'completed' },
      ],
      attendances: [],
      excuses: [{ studentId: 'stu-1', dateKey: '2026-09-18' }],
      approvedLeaves: [{ studentId: 'stu-1', startDate: '2026-09-19', endDate: '2026-09-20' }],
      todayKey: '2026-09-22',
    })

    expect(result[0].missedDates).toEqual([])
  })

  it('starts counting missed dates from each student account creation date', () => {
    const result = getStudentMissedDates({
      students: [{ id: 'stu-2', name: 'Siswa Baru', studentCode: 'PTE002', createdAt: '2026-08-07T09:00:00.000Z', courseId: 'course-1', courseCode: 'PTE-A' }],
      sessions: [
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-08-03', status: 'completed' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-08-07', status: 'completed' },
        { courseId: 'course-1', courseCode: 'PTE-A', date: '2026-08-14', status: 'completed' },
      ],
      attendances: [],
      excuses: [],
      approvedLeaves: [],
      todayKey: '2026-08-20',
    })

    expect(result[0].missedDates).toEqual(['2026-08-07', '2026-08-14'])
  })
})