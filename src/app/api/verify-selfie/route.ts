import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
// Allow longer timeout for VLM call
export const maxDuration = 30

/**
 * POST /api/verify-selfie
 * Body: { image: base64, studentName?: string }
 * Uses VLM (z-ai-web-dev-sdk) to verify that the submitted image is a real,
 * live-looking selfie of a person (not a photo of a photo, a screenshot,
 * an ID card, or a non-human image). This is an innovative anti-fraud layer
 * that prevents students from submitting a static photo or screenshot to
 * fake attendance.
 *
 * Returns: { verified: boolean, reason: string, description: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { image, studentName } = await req.json()
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ verified: false, reason: 'Gambar tidak disertakan' }, { status: 400 })
    }
    // Ensure base64 data URL format
    const imageUrl = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`

    const zai = await ZAI.create()
    const prompt = `Anda adalah sistem verifikasi kehadiran otomatis untuk kursus PTE.
Analisis gambar ini dengan ketat untuk memastikan ini adalah foto SELFIE ASLI dari seorang manusia yang sedang melakukan absensi.

Periksa hal-hal berikut:
1. Apakah gambar menampilkan WAJAH manusia yang jelas?
2. Apakah ini terlihat seperti foto selfie langsung (diambil dengan kamera depan), BUKAN:
   - Foto dari layar ponsel/komputer (screenshot)
   - Foto dari dokumen/KTP/foto cetak
   - Gambar ilustrasi atau kartun
   - Tidak ada manusia sama sekali
3. Apakah hanya ada SATU wajah yang dominan?

Jawab HANYA dengan JSON valid dalam format ini (tanpa markdown, tanpa teks lain):
{"is_human_face": true/false, "looks_like_live_selfie": true/false, "is_screenshot_or_document": true/false, "confidence": "high"/"medium"/"low", "description": "deskripsi singkat dalam Bahasa Indonesia"}`

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = response.choices?.[0]?.message?.content || ''
    let parsed: { is_human_face?: boolean; looks_like_live_selfie?: boolean; is_screenshot_or_document?: boolean; confidence?: string; description?: string } = {}
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // Try to extract JSON
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          parsed = JSON.parse(m[0])
        } catch {
          /* ignore */
        }
      }
    }

    const verified =
      parsed.is_human_face === true &&
      parsed.looks_like_live_selfie === true &&
      parsed.is_screenshot_or_document !== true

    let reason = 'Verifikasi wajah berhasil'
    if (!verified) {
      if (parsed.is_screenshot_or_document) {
        reason = 'Terdeteksi screenshot/dokumen — gunakan kamera langsung'
      } else if (!parsed.is_human_face) {
        reason = 'Wajah manusia tidak terdeteksi dengan jelas'
      } else if (!parsed.looks_like_live_selfie) {
        reason = 'Foto tidak terlihat sebagai selfie langsung'
      } else {
        reason = 'Verifikasi wajah gagal'
      }
    }

    return NextResponse.json({
      verified,
      reason,
      confidence: parsed.confidence || 'unknown',
      description: parsed.description || raw.slice(0, 200),
      studentName,
    })
  } catch (e) {
    console.error('verify-selfie error', e)
    return NextResponse.json(
      { verified: false, reason: 'Layanan verifikasi wajah sedang tidak tersedia' },
      { status: 500 }
    )
  }
}
