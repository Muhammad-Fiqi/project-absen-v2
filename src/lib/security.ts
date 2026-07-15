// Crypto & security utilities for QR-based attendance

import crypto from 'crypto'

const SECRET_KEY = process.env.ATTENDANCE_SECRET || 'pte-attendance-secret-key-2024-secure'

/**
 * Generate a long-lived QR secret for a session
 */
export function generateQrSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * HMAC-sign a payload to prevent QR forgery.
 */
export function signPayload(payload: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex')
}

/**
 * Verify an HMAC signature
 */
export function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Build a signed QR payload for a session.
 * Format: {sessionId, token, ts, hmac}
 * The token rotates every ROTATION_SECONDS seconds.
 */
export const QR_ROTATION_SECONDS = 20

export function buildQrPayload(sessionId: string, qrSecret: string, now: Date = new Date()): {
  sessionId: string
  token: string
  ts: number
  window: number
  hmac: string
} {
  const ts = now.getTime()
  const window = Math.floor(ts / 1000 / QR_ROTATION_SECONDS)
  const payload = `${sessionId}.${window}`
  const hmac = crypto.createHmac('sha256', qrSecret).update(payload).digest('hex')
  const token = hmac.slice(0, 16)
  return { sessionId, token, ts, window, hmac: token }
}

/**
 * Verify a scanned QR payload against the session's secret.
 */
export function verifyQrPayload(
  payload: { sessionId: string; token: string; ts?: number; window?: number },
  qrSecret: string,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  if (!payload?.sessionId || !payload?.token) {
    return { valid: false, reason: 'Payload tidak lengkap' }
  }
  const ts = now.getTime()
  const currentWindow = Math.floor(ts / 1000 / QR_ROTATION_SECONDS)
  const validWindows = [currentWindow, currentWindow - 1]
  let matched = false
  for (const w of validWindows) {
    const p = `${payload.sessionId}.${w}`
    const hmac = crypto.createHmac('sha256', qrSecret).update(p).digest('hex')
    const token = hmac.slice(0, 16)
    if (token === payload.token) {
      matched = true
      break
    }
  }
  if (!matched) {
    return { valid: false, reason: 'Token QR sudah kedaluwarsa atau tidak valid' }
  }
  return { valid: true }
}

/**
 * Hash a PIN/password securely
 */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a PIN against its hash
 */
export function verifyPin(pin: string, stored: string): boolean {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const verify = crypto.scryptSync(pin, salt, 64).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'))
  } catch {
    return false
  }
}