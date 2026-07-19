'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import {
  QrCode, RefreshCw, KeyRound, Clock, Loader2, Copy, Check, Maximize2,
  Users, TrendingUp, Video, Building2, Sparkles, Calendar, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { apiGet } from '@/lib/api-client'
import { toast } from 'sonner'

interface QrDisplayProps {
  sessionId: string
  sessionTitle: string
}

interface QrData {
  qr: { sessionId: string; token: string; ts: number; window: number; hmac: string }
  rotatingCode: string
  serverTime: string
  nextRotationAt: string
  rotationSeconds: number
  attendeeCount: number
  attendeeList: Array<{ name: string; studentCode: string; status: string; checkInTime: string }>
  totalStudents: number
  slotsRemaining: number
  isFull: boolean
  session: {
    id: string
    sessionNumber: number
    title: string
    room: string | null
    mode: string
    platform: string | null
    teacher: string | null
    topicOfDay: string | null
    maxAttendees: number
  }
  course: { code: string; name: string }
}

export function QrDisplay({ sessionId, sessionTitle }: QrDisplayProps) {
  const [data, setData] = useState<QrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(24 * 60 * 60)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState<Date>(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const rotationSeconds = data?.rotationSeconds ?? 24 * 60 * 60

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) {
      return `${days} hari${hours > 0 ? ` ${hours} jam` : ''}`
    }
    if (hours > 0) {
      return `${hours} jam ${minutes} menit`
    }
    if (minutes > 0) {
      return `${minutes} menit ${secs} detik`
    }
    return `${secs} detik`
  }

  const formatRotationLabel = (seconds: number) => {
    if (seconds % 86400 === 0) return `${seconds / 86400} hari`
    if (seconds % 3600 === 0) return `${seconds / 3600} jam`
    if (seconds % 60 === 0) return `${seconds / 60} menit`
    return `${seconds} detik`
  }

  const fetchQr = useCallback(async () => {
    try {
      const fresh = await apiGet<QrData>(`/api/sessions/${sessionId}/qr`)
      setData(fresh)
      const payload = JSON.stringify(fresh.qr)
      const url = await QRCode.toDataURL(payload, {
        width: 512,
        margin: 2,
        color: { dark: '#0a1f1a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(url)
      const msUntil = new Date(fresh.nextRotationAt).getTime() - Date.now()
      setCountdown(Math.max(1, Math.ceil(msUntil / 1000)))
    } catch (e) {
      toast.error('Gagal memuat QR')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchQr()
    // Auto-rotate: fetch new QR when countdown hits 0
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchQr()
          return rotationSeconds
        }
        return c - 1
      })
    }, 1000)

    // Live clock tick — every second
    tickRef.current = setInterval(() => setNow(new Date()), 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [fetchQr, rotationSeconds])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
          <div className="h-56 w-56 animate-pulse rounded-2xl bg-muted" />
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  const progressPct = ((rotationSeconds - countdown) / rotationSeconds) * 100
  const attendeePct = data.totalStudents > 0 ? Math.round((data.attendeeCount / data.totalStudents) * 100) : 0
  const capacityPct = data.session.maxAttendees > 0 ? Math.round((data.attendeeCount / data.session.maxAttendees) * 100) : 0
  const ModeIcon = data.session.mode === 'online' ? Video : Building2

  // Format live clock
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <div className="space-y-4">
        {/* Live Clock + Attendee Counter (full-width top row) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Live Clock */}
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent transition-transform hover:-translate-y-0.5">
            <CardContent className="relative p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Waktu Server (WIB)
                </span>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </Badge>
              </div>
              <div className="font-mono text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {timeStr}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{dateStr}</div>
            </CardContent>
          </Card>

          {/* Attendee Counter with capacity */}
          <Card className={`relative overflow-hidden transition-transform hover:-translate-y-0.5 ${
            data.isFull ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent'
          }`}>
            <CardContent className="relative p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Kapasitas Kelas
                </span>
                <Badge
                  variant={data.isFull ? 'destructive' : 'outline'}
                  className={`gap-1 text-[10px] ${!data.isFull ? 'text-emerald-700 dark:text-emerald-300' : ''}`}
                >
                  {data.isFull ? 'PENUH' : `${data.slotsRemaining} slot tersisa`}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold tabular-nums sm:text-5xl ${data.isFull ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {data.attendeeCount}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {data.session.maxAttendees} max
                </span>
              </div>
              <Progress value={capacityPct} className={`mt-2 h-2 ${data.isFull ? '[&>div]:bg-destructive' : capacityPct >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {data.isFull
                  ? 'Kelas sudah penuh — tidak bisa absen lagi'
                  : data.attendeeCount === 0
                  ? 'Belum ada yang absen'
                  : `${data.slotsRemaining} slot lagi tersedia`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* QR Display Card */}
        <Card className="overflow-hidden border-primary/30 shadow-md transition-shadow hover:shadow-lg">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <QrCode className="h-4 w-4 text-primary" />
                  QR Dinamis Sesi
                </h3>
                <p className="text-xs text-muted-foreground">{sessionTitle}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFullscreen(true)} className="gap-1">
                <Maximize2 className="h-3.5 w-3.5" /> Layar Penuh
              </Button>
            </div>

            {/* Session meta row */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge variant="outline" className="gap-1">
                <ModeIcon className="h-3 w-3" />
                {data.session.mode === 'online' ? `Online · ${data.session.platform || 'Online'}` : 'Offline'}
              </Badge>
              {data.session.teacher && (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" /> {data.session.teacher}
                </Badge>
              )}
              {data.session.room && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="h-3 w-3" /> {data.session.room}
                </Badge>
              )}
              {data.session.topicOfDay && (
                <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
                  <Sparkles className="h-3 w-3" /> {data.session.topicOfDay}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
              {/* QR with glow */}
              <div className="relative mx-auto">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/30 via-emerald-500/20 to-primary/30 opacity-60 blur-xl" />
                <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-3 shadow-md ring-1 ring-primary/10">
                  <img src={qrDataUrl} alt="QR Absensi" className="h-48 w-48 sm:h-56 sm:w-56" />
                  {/* countdown overlay ring */}
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill="none"
                      stroke="oklch(0.52 0.13 162 / 0.15)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill="none"
                      stroke="oklch(0.52 0.13 162)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - progressPct / 100)}`}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">
                    {formatDuration(countdown)}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col justify-center space-y-3">
                {/* 6-DIGIT CODE — prominent */}
                <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <KeyRound className="h-3.5 w-3.5" /> Kode Absensi
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(data.rotatingCode); setCopied(true); toast.success('Kode disalin'); setTimeout(() => setCopied(false), 1500) }} className="h-7 w-7 p-0">
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {data.rotatingCode.split('').map((ch, i) => (
                      <div key={i} className="flex h-12 w-9 items-center justify-center rounded-lg bg-background text-2xl font-bold tabular-nums text-primary shadow-sm sm:h-14 sm:w-11 sm:text-3xl">
                        {ch}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Baca kode ini ke siswa atau siswa bisa scan QR
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-border/60 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    Berputar setiap {formatRotationLabel(data.rotationSeconds)}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    QR & kode lama tidak bisa dipakai lagi — mencegah siswa foto & bagikan.
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={fetchQr} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Perbarui QR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendee list */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Siswa Sudah Absen ({data.attendeeCount})
              </h3>
              {data.attendeeCount > 0 && (
                <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  {data.attendeeCount}/{data.session.maxAttendees}
                </Badge>
              )}
            </div>
            {data.attendeeList.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Belum ada siswa yang absen di sesi ini
              </p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto scrollbar-thin">
                {data.attendeeList.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="min-w-0 flex-1 font-medium">{a.name}</span>
                    <span className="text-muted-foreground">{a.studentCode}</span>
                    <span className="text-muted-foreground">
                      {new Date(a.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {a.status === 'late' && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[9px] text-amber-600">terlambat</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-2xl border-primary/20">
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">{sessionTitle}</h2>
              <p className="text-sm text-muted-foreground">
                Pindai QR atau masukkan kode untuk absen · Kode:{' '}
                <code className="font-mono text-lg font-bold text-primary">{data.rotatingCode}</code>
              </p>
            </div>
            <div className="font-mono text-3xl font-bold tabular-nums text-primary">
              {timeStr} <span className="text-base font-normal text-muted-foreground">WIB</span>
            </div>
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/30 via-emerald-500/20 to-primary/30 opacity-70 blur-xl" />
              <div className="relative rounded-3xl border-4 border-primary/20 bg-white p-4 shadow-lg ring-1 ring-primary/10">
                <img src={qrDataUrl} alt="QR Absensi" className="h-80 w-80" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow-sm">
                  {countdown}s
                </div>
              </div>
            </div>
            {/* Attendee in fullscreen */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">
                {data.attendeeCount} dari {data.totalStudents} siswa sudah absen
              </span>
              <Badge variant="outline" className="gap-1 text-emerald-700 dark:text-emerald-300">
                {attendeePct}%
              </Badge>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> Berputar otomatis tiap {data.rotationSeconds} detik
            </Badge>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
