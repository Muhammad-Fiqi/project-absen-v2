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
import {
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
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

type Step = 'confirm' | 'submitting' | 'result'

export function AttendanceFlow({
  open,
  onClose,
  session,
  studentId,
  onSuccess,
}: AttendanceFlowProps) {
  const [step, setStep] = useState<Step>('confirm')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttendanceSubmitResponse | null>(null)

  useEffect(() => {
    if (!open) {
      setSubmitting(false)
      setResult(null)
      setStep('confirm')
    }
  }, [open])

  async function handleAttendance() {
    setSubmitting(true)
    setStep('submitting')
    setResult(null)
    try {
      const res = await apiPost<AttendanceSubmitResponse>(`/api/sessions/${session.id}/attendance-simple`, {})
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
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Absensi</DialogTitle>
              <DialogDescription className="text-xs">
                Pertemuan {session.sessionNumber} · {fmtDate(session.date)} · {fmtTime(session.startTime)}–{fmtTime(session.endTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'result' && result ? (
          <ResultView result={result} onClose={onClose} />
        ) : step === 'submitting' ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memverifikasi kehadiran Anda…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">
                Tekan tombol "Absen" sekali untuk mencatat kehadiran Anda ke sesi ini.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleAttendance}
                disabled={submitting}
                className="w-full gap-2"
                size="lg"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Absen</>
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

      {result.checks && (
        <div className="space-y-1.5 rounded-xl border border-border/60 p-3 text-left">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Detail Verifikasi</p>
          {result.checks.time && <CheckRow label="Jendela Waktu" passed={result.checks.time.passed} reason={result.checks.time.reason} />}
          {result.checks.quota && <CheckRow label="Kuota Sesi" passed={result.checks.quota.passed} reason={result.checks.quota.reason} />}
          {result.checks.daily && <CheckRow label="1 Sesi per Hari" passed={result.checks.daily.passed} reason={result.checks.daily.reason} />}
          {result.checks.capacity && <CheckRow label="Kapasitas Sesi" passed={result.checks.capacity.passed} reason={result.checks.capacity.reason} />}
        </div>
      )}

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

