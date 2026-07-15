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
import { Badge } from '@/components/ui/badge'
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { QrScanner } from './qr-scanner'
import { apiPost } from '@/lib/api-client'
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
  studentId: string
  onSuccess: () => void
}

type Step = 'scan' | 'submitting' | 'result'

export function AttendanceFlow({
  open,
  onClose,
  session,
  studentId,
  onSuccess,
}: AttendanceFlowProps) {
  const [step, setStep] = useState<Step>('scan')
  const [qrData, setQrData] = useState<{ sessionId: string; token: string; ts?: number; window?: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttendanceSubmitResponse | null>(null)

  useEffect(() => {
    if (!open) {
      setStep('scan')
      setQrData(null)
      setSubmitting(false)
      setResult(null)
    }
  }, [open])

  function handleQrScan(decoded: string) {
    try {
      const parsed = JSON.parse(decoded)
      if (!parsed.sessionId || !parsed.token) throw new Error('invalid')
      setQrData(parsed)
      toast.success('QR berhasil dipindai')
    } catch {
      toast.error('QR tidak valid')
    }
  }

  async function handleSubmit() {
    if (!qrData) {
      toast.error('QR belum dipindai')
      return
    }
    setSubmitting(true)
    setStep('submitting')
    setResult(null)
    try {
      const res = await apiPost<AttendanceSubmitResponse>(`/api/sessions/${session.id}/attendance`, {
        sessionId: session.id,
        studentId,
        qr: {
          sessionId: qrData.sessionId,
          token: qrData.token,
          ts: qrData.ts,
          window: qrData.window,
        },
      })
      setResult(res)
      setStep('result')
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
        setStep('result')
      }
      toast.error(err.message || 'Gagal submit absensi')
    } finally {
      setSubmitting(false)
    }
  }

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Absensi QR</DialogTitle>
              <DialogDescription className="text-xs">
                Pertemuan {session.sessionNumber} · {fmtDate(session.date)} · {fmtTime(session.startTime)}–{fmtTime(session.endTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'result' && result ? (
          <ResultView result={result} onClose={onClose} />
        ) : (
          <div className="space-y-5">
            {/* QR Scanner */}
            {step === 'scan' && (
              <>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      <QrCode className="h-4 w-4 text-primary" />
                      Scan QR Dinamis
                    </span>
                    <Badge variant={qrData ? 'default' : 'secondary'}>
                      {qrData ? '✓ Terpindai' : 'Menunggu'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Arahkan kamera ke QR yang ditampilkan pengajar di layar kelas.
                  </p>
                </div>

                {!qrData ? (
                  <QrScanner onScan={handleQrScan} />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary">QR valid terpindai</p>
                      <p className="text-xs text-muted-foreground">Klik tombol di bawah untuk mengkonfirmasi kehadiran.</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQrData(null)}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      Scan ulang
                    </Button>
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!qrData || submitting}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4" /> Konfirmasi Kehadiran</>
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Dengan konfirmasi, Anda menyatakan hadir secara jujur.
                  </p>
                </div>
              </>
            )}

            {step === 'submitting' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Memverifikasi kehadiran Anda…</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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

      {/* Check details */}
      <div className="space-y-1.5 rounded-xl border border-border/60 p-3 text-left">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Detail Verifikasi</p>
        {result.checks.qr && <CheckRow label="QR Dinamis" passed={result.checks.qr.passed} reason={result.checks.qr.reason} />}
        {result.checks.time && <CheckRow label="Jendela Waktu" passed={result.checks.time.passed} reason={result.checks.time.reason} />}
        {result.checks.quota && <CheckRow label="Kuota Sesi" passed={result.checks.quota.passed} reason={result.checks.quota.reason} />}
        {result.checks.daily && <CheckRow label="1 Sesi per Hari" passed={result.checks.daily.passed} reason={result.checks.daily.reason} />}
        {result.checks.capacity && <CheckRow label="Kapasitas Sesi" passed={result.checks.capacity.passed} reason={result.checks.capacity.reason} />}
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