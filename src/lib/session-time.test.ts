import { describe, expect, it } from 'bun:test'
import { normalizeSessionDateTime, sessionTimeLabel, toWibSessionDateTime } from './session-time'

describe('session time handling', () => {
  it('stores local input as WIB without changing the selected date', () => {
    const stored = toWibSessionDateTime('2026-09-14', '06:30')
    expect(stored).toBe('2026-09-14T06:30:00+07:00')
    expect(sessionTimeLabel(stored)).toBe('06:30')
    expect(normalizeSessionDateTime('2026-09-14', '2026-09-14T06:30:00.000Z')).toBe('2026-09-14T06:30:00+07:00')
  })

  it('keeps legacy local clock values that were incorrectly marked UTC', () => {
    expect(sessionTimeLabel('2026-09-14T06:30:00.000Z')).toBe('06:30')
  })
})