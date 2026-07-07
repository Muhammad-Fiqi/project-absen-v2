// Client-side device fingerprinting (anti-spoofing).
// Generates a stable-ish hash from browser characteristics so the same
// device cannot mark attendance for multiple students.

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr'
  const parts: string[] = []
  parts.push(navigator.userAgent)
  parts.push(navigator.language)
  parts.push(String(navigator.languages?.join(',') || ''))
  parts.push(String(screen.width) + 'x' + String(screen.height))
  parts.push(String(screen.colorDepth))
  parts.push(String(screen.availWidth) + 'x' + String(screen.availHeight))
  parts.push(String(new Date().getTimezoneOffset()))
  parts.push(String(navigator.hardwareConcurrency || 0))
  parts.push(String((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0))
  parts.push(String(navigator.maxTouchPoints || 0))
  parts.push(String(navigator.platform || ''))
  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(0, 0, 100, 30)
      ctx.fillStyle = '#069'
      ctx.fillText('PTE-attendance-fp', 2, 2)
      parts.push(canvas.toDataURL())
    }
  } catch {
    /* ignore */
  }
  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        parts.push(String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)))
        parts.push(String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)))
      }
    }
  } catch {
    /* ignore */
  }
  const raw = parts.join('|||')
  // Hash with SHA-256
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
  } catch {
    // Fallback simple hash
    let h = 0
    for (let i = 0; i < raw.length; i++) {
      h = (h << 5) - h + raw.charCodeAt(i)
      h |= 0
    }
    return 'fp' + Math.abs(h).toString(16).padStart(8, '0')
  }
}

// Get geolocation as a promise
export function getGeoLocation(timeoutMs = 10000): Promise<{ lat: number; lng: number; accuracy?: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation tidak didukung perangkat ini'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const messages: Record<number, string> = {
          1: 'Izin lokasi ditolak. Aktifkan izin lokasi untuk absensi geo.',
          2: 'Lokasi tidak tersedia',
          3: 'Permintaan lokasi timeout',
        }
        reject(new Error(messages[err.code] || err.message))
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    )
  })
}
