'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { QrCode, RefreshCw, KeyRound, Clock, Loader2, Copy, Check, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  sessionPin: string
  serverTime: string
  nextRotationAt: string
  rotationSeconds: number
  session: { id: string; sessionNumber: number; title: string; room: string | null }
  course: { code: string; name: string }
}

export function QrDisplay({ sessionId, sessionTitle }: QrDisplayProps) {
  const [data, setData] = useState<QrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(20)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
          return 20
        }
        return c - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchQr])

  function copyPin() {
    if (!data?.sessionPin) return
    navigator.clipboard.writeText(data.sessionPin)
    setCopied(true)
    toast.success('PIN disalin')
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const progressPct = ((20 - countdown) / 20) * 100

  return (
    <>
      <Card className="overflow-hidden border-primary/30">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
            {/* QR */}
            <div className="relative mx-auto">
              <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-3 shadow-sm">
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
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {countdown}s
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center space-y-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" /> PIN Sesi
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-2xl font-bold tracking-[0.3em]">{data.sessionPin}</code>
                  <Button variant="ghost" size="sm" onClick={copyPin} className="h-7 w-7 p-0">
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Berikan PIN ini ke siswa</p>
              </div>

              <div className="rounded-xl border border-dashed border-border/60 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Berputar setiap {data.rotationSeconds} detik
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  QR lama tidak bisa dipakai lagi — mencegah siswa foto & bagikan QR.
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={fetchQr} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Perbarui QR
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-2xl border-primary/20">
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">{sessionTitle}</h2>
              <p className="text-sm text-muted-foreground">Pindai QR ini untuk absen · PIN: <code className="font-mono font-bold text-primary">{data.sessionPin}</code></p>
            </div>
            <div className="relative rounded-3xl border-4 border-primary/20 bg-white p-4">
              <img src={qrDataUrl} alt="QR Absensi" className="h-80 w-80" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                {countdown}s
              </div>
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
