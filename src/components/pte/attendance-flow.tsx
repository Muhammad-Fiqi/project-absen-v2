'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  QrCode,
  KeyRound,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  Clock,
  Sparkles,
} from 'lucide-react'
import { QrScanner } from './qr-scanner'
import { SelfieCapture } from './selfie-capture'
import { apiPost } from '@/lib/api-client'
import { getDeviceFingerprint, getGeoLocation } from '@/lib/device'
import { toast } from 'sonner'
import type { AttendanceSubmitResponse } from '@/lib/types'

interface AttendanceFlowProps {
  open: boolean
  onClose: () => void
  session: {
    id: string
    sessionNumber: number
    title: string
    date: string
    startTime: string
    endTime: string
    room: string | null
    notes: string | null
  }
  requiredFactors: string[]
  studentId: string
  onSuccess: () => void
}

type FactorState = 'pending' | 'in-progress' | 'passed' | 'failed'

interface FactorInfo {
  key: string
  label: string
  icon: typeof QrCode
  desc: string
  state: FactorState
  detail?: string
}

export function AttendanceFlow({
  open,
  onClose,
  session,
  requiredFactors,
  studentId,
  onSuccess,
}: AttendanceFlowProps) {
  const [factors, setFactors] = useState<Record<string, FactorInfo>>({})
  const [qrData, setQrData] = useState<{ sessionId: string; token: string; ts?: number; window?: number } | null>(null)
  const [pin, setPin] = useState('')
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [deviceFp, setDeviceFp] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttendanceSubmitResponse | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    // Reset
    setQrData(null)
    setPin('')
    setGeo(null)
    setSelfie(null)
    setResult(null)
    setSubmitting(false)
    // Build factor states
    const base: Record<string, FactorInfo> = {
      qr: { key: 'qr', label: 'Scan QR Dinamis', icon: QrCode, desc: 'Pindai QR yang ditampilkan pengajar (berputar tiap 20 detik)', state: 'pending' },
      pin: { key: 'pin', label: 'PIN Sesi', icon: KeyRound, desc: 'Masukkan 6-digit PIN sesi dari pengajar', state: 'pending' },
      geo: { key: 'geo', label: 'Verifikasi Lokasi', icon: MapPin, desc: 'Pastikan Anda berada di lokasi kelas', state: 'pending' },
      selfie: { key: 'selfie', label: 'Verifikasi Wajah AI', icon: Camera, desc: 'Ambil selfie, AI memverifikasi keaslian', state: 'pending' },
    }
    const active: Record<string, FactorInfo> = {}
    for (const f of requiredFactors) {
      if (base[f]) active[f] = base[f]
    }
    setFactors(active)
    // Device fingerprint (always computed)
    getDeviceFingerprint().then(setDeviceFp).catch(() => setDeviceFp('unknown'))
  }, [open, requiredFactors])

  // Try to auto-fetch geo when geo factor is required
  useEffect(() => {
    if (!open || !factors.geo || geo) return
    let cancelled = false
    async function fetchGeo() {
      setGeoLoading(true)
      try {
        const g = await getGeoLocation(12000)
        if (cancelled) return
        setGeo(g)
        setFactors((prev) => ({ ...prev, geo: { ...prev.geo!, state: 'passed', detail: `Lokasi: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}` } }))
      } catch (e) {
        if (cancelled) return
        setFactors((prev) => ({ ...prev, geo: { ...prev.geo!, state: 'failed', detail: e instanceof Error ? e.message : 'Gagal' } }))
      } finally {
        if (!cancelled) setGeoLoading(false)
      }
    }
    fetchGeo()
    return () => {
      cancelled = true
    }
  }, [open, factors.geo, geo])

  function handleQrScan(decoded: string) {
    try {
      const parsed = JSON.parse(decoded)
      if (!parsed.sessionId || !parsed.token) throw new Error('invalid')
      setQrData(parsed)
      setFactors((prev) => ({ ...prev, qr: { ...prev.qr!, state: 'passed', detail: 'QR valid terpindai' } }))
      toast.success('QR berhasil dipindai')
    } catch {
      setFactors((prev) => ({ ...prev, qr: { ...prev.qr!, state: 'failed', detail: 'QR tidak valid' } }))
      toast.error('QR tidak valid')
    }
  }

  // PIN live check (just track entered)
  useEffect(() => {
    if (!factors.pin) return
    if (pin.length === 6) {
      setFactors((prev) => ({ ...prev, pin: { ...prev.pin!, state: 'passed', detail: 'PIN dimasukkan (diverifikasi saat submit)' } }))
    } else if (pin.length > 0) {
      setFactors((prev) => ({ ...prev, pin: { ...prev.pin!, state: 'in-progress', detail: `${pin.length}/6 digit` } }))
    } else {
      setFactors((prev) => ({ ...prev, pin: { ...prev.pin!, state: 'pending' } }))
    }
  }, [pin, factors.pin])

  // Selfie state
  useEffect(() => {
    if (!factors.selfie) return
    if (selfie) {
      setFactors((prev) => ({ ...prev, selfie: { ...prev.selfie!, state: 'passed', detail: 'Selfie siap diverifikasi AI' } }))
    } else {
      setFactors((prev) => ({ ...prev, selfie: { ...prev.selfie!, state: 'pending' } }))
    }
  }, [selfie, factors.selfie])

  const passedCount = Object.values(factors).filter((f) => f.state === 'passed').length
  const totalRequired = Object.keys(factors).length
  const allPassed = passedCount === totalRequired
  const progressPct = totalRequired > 0 ? (passedCount / totalRequired) * 100 : 0

  async function handleSubmit() {
    if (!allPassed) {
      toast.error('Selesaikan semua faktor verifikasi terlebih dahulu')
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const res = await apiPost<AttendanceSubmitResponse>(`/api/sessions/${session.id}/attendance`, {
        sessionId: session.id,
        studentId,
        method: totalRequired >= 2 ? 'multi' : 'qr',
        qr: qrData || undefined,
        pin: pin || undefined,
        geo: geo || undefined,
        deviceFingerprint: deviceFp || undefined,
        selfieImage: selfie || undefined,
      })
      setResult(res)
      if (res.success) {
        toast.success(res.message)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      const err = e as Error & { body?: AttendanceSubmitResponse }
      if (err.body) {
        setResult(err.body)
      }
      toast.error(err.message || 'Gagal submit absensi')
    } finally {
      setSubmitting(false)
    }
  }

  const sessionDate = new Date(session.startTime)
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Verifikasi Kehadiran</DialogTitle>
              <DialogDescription className="text-xs">
                Pertemuan {session.sessionNumber} · {fmtDate(session.date)} · {fmtTime(session.startTime)}–{fmtTime(session.endTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {result ? (
          <ResultView result={result} onClose={onClose} />
        ) : (
          <div className="space-y-5">
            {/* Progress */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Verifikasi Multi-Faktor
                </span>
                <Badge variant={allPassed ? 'default' : 'secondary'}>
                  {passedCount}/{totalRequired} lolos
                </Badge>
              </div>
              <Progress value={progressPct} className="h-2" />
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {totalRequired} lapis perlindungan aktif untuk mencegah absensi curang
              </p>
            </div>

            {/* Factor list */}
            <div className="space-y-3">
              {Object.values(factors).map((f) => (
                <FactorRow
                  key={f.key}
                  factor={f}
                  pin={pin}
                  setPin={setPin}
                  onQrScan={handleQrScan}
                  qrPassed={!!qrData}
                  selfie={selfie}
                  setSelfie={setSelfie}
                  geoLoading={geoLoading}
                  geo={geo}
                />
              ))}
            </div>

            {/* Device fingerprint note */}
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground">
              <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Sidik perangkat (device fingerprint) otomatis direkam untuk mencegah satu HP/laptop dipakai absen beberapa siswa.
                {deviceFp && <code className="ml-1 rounded bg-background px-1 py-0.5">{deviceFp.slice(0, 12)}…</code>}
              </span>
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!allPassed || submitting}
                className="w-full gap-2"
                size="lg"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi…</>
                ) : allPassed ? (
                  <><CheckCircle2 className="h-4 w-4" /> Konfirmasi Kehadiran</>
                ) : (
                  <><Clock className="h-4 w-4" /> Selesaikan verifikasi</>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Dengan konfirmasi, Anda menyatakan hadir secara jujur.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FactorRow({
  factor,
  pin,
  setPin,
  onQrScan,
  qrPassed,
  selfie,
  setSelfie,
  geoLoading,
  geo,
}: {
  factor: FactorInfo
  pin: string
  setPin: (v: string) => void
  onQrScan: (d: string) => void
  qrPassed: boolean
  selfie: string | null
  setSelfie: (v: string) => void
  geoLoading: boolean
  geo: { lat: number; lng: number } | null
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = factor.icon
  const stateConfig = {
    pending: { color: 'text-muted-foreground', bg: 'bg-muted', icon: null, ring: 'border-border' },
    'in-progress': { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/40', icon: <Loader2 className="h-4 w-4 animate-spin" />, ring: 'border-amber-400/60' },
    passed: { color: 'text-primary', bg: 'bg-primary/10', icon: <CheckCircle2 className="h-4 w-4" />, ring: 'border-primary/40' },
    failed: { color: 'text-destructive', bg: 'bg-destructive/10', icon: <XCircle className="h-4 w-4" />, ring: 'border-destructive/40' },
  }[factor.state]

  return (
    <div className={`rounded-xl border ${stateConfig.ring} ${stateConfig.bg} transition-colors`}>
      <button
        type="button"
        onClick={() => factor.state !== 'passed' && setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background ${stateConfig.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{factor.label}</span>
            {factor.state === 'passed' && <Badge variant="default" className="h-5 px-1.5 text-[10px]">Lolos</Badge>}
            {factor.state === 'failed' && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Gagal</Badge>}
          </div>
          {factor.detail && <p className="truncate text-xs text-muted-foreground">{factor.detail}</p>}
        </div>
        <div className={stateConfig.color}>{stateConfig.icon}</div>
      </button>
      {expanded && factor.state !== 'passed' && (
        <div className="border-t border-border/40 p-3">
          {factor.key === 'qr' && !qrPassed && <QrScanner onScan={onQrScan} />}
          {factor.key === 'pin' && (
            <div className="space-y-2">
              <Label htmlFor="pin-input" className="text-xs">Masukkan 6 digit PIN dari pengajar</Label>
              <Input
                id="pin-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-[0.5em]"
              />
            </div>
          )}
          {factor.key === 'geo' && (
            <div className="space-y-2 text-xs">
              {geoLoading ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengambil lokasi GPS…
                </p>
              ) : geo ? (
                <p className="flex items-center gap-2 text-primary">
                  <MapPin className="h-3.5 w-3.5" /> Lokasi terkunci ({geo.lat.toFixed(4)}, {geo.lng.toFixed(4)})
                </p>
              ) : (
                <p className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Lokasi gagal didapat. Aktifkan izin lokasi lalu refresh.
                </p>
              )}
            </div>
          )}
          {factor.key === 'selfie' && <SelfieCapture captured={selfie} onCapture={setSelfie} />}
        </div>
      )}
    </div>
  )
}

function ResultView({ result, onClose }: { result: AttendanceSubmitResponse; onClose: () => void }) {
  const success = result.success
  return (
    <div className="space-y-4 py-2 text-center">
      <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${success ? 'bg-primary/10 text-primary animate-pulse-ring' : 'bg-destructive/10 text-destructive'}`}>
        {success ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
      </div>
      <div>
        <h3 className={`text-xl font-bold ${success ? 'text-primary' : 'text-destructive'}`}>
          {success ? (result.status === 'late' ? 'Hadir (Terlambat)' : 'Hadir!') : 'Absensi Gagal'}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{result.message}</p>
      </div>
      {result.flagged && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-100 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Absensi Anda ditandai untuk peninjauan pengajar.
        </div>
      )}
      {/* Factor results */}
      <div className="space-y-1.5 rounded-xl border border-border/60 p-3 text-left">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Detail Verifikasi ({result.factorsPassed}/{result.factorsRequired} faktor)</p>
        {result.checks.quota && <CheckRow label="Kuota Sesi" passed={result.checks.quota.passed} reason={result.checks.quota.reason} />}
        {result.checks.daily && <CheckRow label="1 Sesi per Hari" passed={result.checks.daily.passed} reason={result.checks.daily.reason} />}
        {result.checks.qr && <CheckRow label="QR Dinamis" passed={result.checks.qr.passed} reason={result.checks.qr.reason} />}
        {result.checks.pin && <CheckRow label="PIN Sesi" passed={result.checks.pin.passed} reason={result.checks.pin.reason} />}
        {result.checks.geo && <CheckRow label="Geo-lokasi" passed={result.checks.geo.passed} reason={result.checks.geo.reason} />}
        {result.checks.selfie && <CheckRow label="Verifikasi Wajah AI" passed={result.checks.selfie.passed} reason={result.checks.selfie.reason} />}
        {result.checks.device && <CheckRow label="Sidik Perangkat" passed={result.checks.device.passed} reason={result.checks.device.reason} />}
        {result.checks.time && <CheckRow label="Jendela Waktu" passed={result.checks.time.passed} reason={result.checks.time.reason} />}
      </div>
      {typeof result.quotaRemaining === 'number' && (
        <p className="text-center text-xs text-muted-foreground">
          Sisa kuota sesi Anda: <strong className={result.quotaRemaining <= 2 ? 'text-amber-600' : 'text-primary'}>{result.quotaRemaining}</strong>
        </p>
      )}
      <Button onClick={onClose} className="w-full" size="lg">
        Tutup
      </Button>
    </div>
  )
}

function CheckRow({ label, passed, reason }: { label: string; passed: boolean; reason?: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {passed ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      )}
      <div className="flex-1">
        <span className={passed ? 'font-medium' : 'font-medium text-destructive'}>{label}</span>
        {reason && <span className="ml-1 text-muted-foreground">— {reason}</span>}
      </div>
    </div>
  )
}
