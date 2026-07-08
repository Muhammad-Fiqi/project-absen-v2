// Crypto & security utilities for anti-fraud attendance

import crypto from 'crypto'

// Secret key for HMAC signing (in production, use env var)
const SECRET_KEY = process.env.ATTENDANCE_SECRET || 'pte-attendance-secret-key-2024-secure'

/**
 * Generate a 6-digit session PIN
 */
export function generateSessionPin(): string {
  const buf = crypto.randomBytes(3)
  const num = buf.readUIntBE(0, 3) % 1000000
  return num.toString().padStart(6, '0')
}

/**
 * Generate a random QR token (alphanumeric, URL-safe)
 */
export function generateQrToken(): string {
  return crypto.randomBytes(12).toString('base64url')
}

/**
 * Generate a long-lived QR secret for a session
 */
export function generateQrSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * HMAC-sign a payload to prevent QR forgery.
 * Students cannot forge valid tokens without the secret.
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
  // Window index: changes every ROTATION_SECONDS
  const window = Math.floor(ts / 1000 / QR_ROTATION_SECONDS)
  const payload = `${sessionId}.${window}`
  // HMAC uses the session-specific secret so tokens from one session
  // cannot be reused for another session.
  const hmac = crypto.createHmac('sha256', qrSecret).update(payload).digest('hex')
  // token = first 16 chars of hmac, easy to scan
  const token = hmac.slice(0, 16)
  return { sessionId, token, ts, window, hmac: token }
}

/**
 * Verify a scanned QR payload against the session's secret.
 * Validates: sessionId, window (must be current or just-expired), hmac.
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
  // Allow current window and previous window (in case of scan delay)
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

/**
 * Haversine distance between two lat/lng points in meters
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}
