import { describe, expect, it } from 'bun:test'
import { normalizeDayKey, shouldSkipDailyQuotaReduction, isLeaveRequestTooSoon } from './quota'

describe('quota rules', () => {
  it('keeps a session date literal even when its time is before 07:00', () => {
    expect(normalizeDayKey('2026-09-14T05:00:00.000Z')).toBe('2026-09-14')
  })

  it('skips reduction when student has approved leave on that date', () => {
    const result = shouldSkipDailyQuotaReduction({
      hasApprovedLeave: true,
      hasValidExcuse: false,
      hasDailyDeduction: false,
      quotaLeft: 5,
    })
    expect(result).toBe(true)
  })

  it('skips reduction when student has a valid excuse for the same day', () => {
    const result = shouldSkipDailyQuotaReduction({
      hasApprovedLeave: false,
      hasValidExcuse: true,
      hasDailyDeduction: false,
      quotaLeft: 5,
    })
    expect(result).toBe(true)
  })

  it('rejects leave requests less than 3 days before the start date', () => {
    const now = new Date('2026-08-10T12:00:00Z')
    expect(isLeaveRequestTooSoon(new Date('2026-08-12T00:00:00Z'), now)).toBe(true)
    expect(isLeaveRequestTooSoon(new Date('2026-08-11T00:00:00Z'), now)).toBe(true)
    expect(isLeaveRequestTooSoon(new Date('2026-08-09T00:00:00Z'), now)).toBe(true)
  })
})
