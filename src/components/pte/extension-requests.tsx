'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Gift, CheckCircle2, XCircle, Clock, Users, PackageOpen,
  RefreshCw, Mail, Phone, Calendar, Sparkles, ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { apiGet, apiPatch } from '@/lib/api-client'
import { toast } from 'sonner'

interface ExtensionRequestRow {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  studentEmail: string | null
  studentPhone: string | null
  currentQuota: number
  requestedSessions: number
  reason: string
  status: 'pending' | 'approved' | 'denied'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
}

type FilterStatus = 'pending' | 'approved' | 'denied' | 'all'

export function ExtensionRequests() {
  const [requests, setRequests] = useState<ExtensionRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [reviewTarget, setReviewTarget] = useState<ExtensionRequestRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = filter === 'all' ? 'all' : filter
      const res = await apiGet<{ requests: ExtensionRequestRow[] }>(
        `/api/extension-requests?status=${statusParam}`,
      )
      setRequests(res.requests)
    } catch {
      toast.error('Gagal memuat permintaan')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      apiGet<{ requests: ExtensionRequestRow[] }>(
        `/api/extension-requests?status=${filter === 'all' ? 'all' : filter}`,
      )
        .then((res) => setRequests(res.requests))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(id)
  }, [filter])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Menunggu"
          value={pendingCount}
          icon={Clock}
          tone="amber"
        />
        <MiniStat
          label="Total Tampil"
          value={requests.length}
          icon={Gift}
          tone="default"
        />
      </div>

      {/* Filter + refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {([
            ['pending', 'Menunggu'],
            ['approved', 'Disetujui'],
            ['denied', 'Ditolak'],
            ['all', 'Semua'],
          ] as const).map(([k, l]) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? 'default' : 'outline'}
              onClick={() => setFilter(k)}
              className="h-8"
            >
              {l}
              {k === 'pending' && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* List */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-primary" />
            Daftar Permintaan Perpanjangan ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center">
              <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {filter === 'pending'
                  ? 'Tidak ada permintaan menunggu review 🎉'
                  : `Tidak ada permintaan dengan status "${filter}"`}
              </p>
            </div>
          ) : (
            <div className="max-h-[36rem] divide-y divide-border/40 overflow-y-auto scrollbar-thin">
              {requests.map((r) => {
                return (
                  <RequestRow key={r.id} req={r} onReview={() => setReviewTarget(r)} />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {reviewTarget && (
        <ReviewDialog
          req={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onDone={() => {
            setReviewTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function RequestRow({ req, onReview }: { req: ExtensionRequestRow; onReview: () => void }) {
  const statusMeta = {
    pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/40', icon: Clock },
    approved: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/40', icon: CheckCircle2 },
    denied: { label: 'Ditolak', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  }[req.status]

  return (
    <div className="p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">
              {req.studentCode.slice(-3)}
            </div>
            <span className="text-sm font-semibold">{req.studentName}</span>
            <span className="text-[11px] text-muted-foreground">{req.studentCode}</span>
            <Badge variant="outline" className={`gap-1 text-[10px] ${statusMeta.cls}`}>
              <statusMeta.icon className="h-3 w-3" /> {statusMeta.label}
            </Badge>
          </div>

          {/* Info row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <PackageOpen className="h-3 w-3" /> Kuota: {req.currentQuota} sesi
            </span>
            <span className="flex items-center gap-1 text-primary">
              <Gift className="h-3 w-3" /> Minta: +{req.requestedSessions} sesi
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(req.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {req.studentEmail && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {req.studentEmail}
              </span>
            )}
            {req.studentPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {req.studentPhone}
              </span>
            )}
          </div>

          {/* Reason */}
          <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2">
            <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> ALASAN SISWA
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">{req.reason}</p>
          </div>

          {/* Review note (if reviewed) */}
          {req.reviewedAt && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span>Direview oleh <strong>{req.reviewedBy || '—'}</strong> · {new Date(req.reviewedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {req.reviewNote && <span>· Catatan: <em>{req.reviewNote}</em></span>}
            </div>
          )}
        </div>

        {req.status === 'pending' && (
          <Button size="sm" onClick={onReview} className="shrink-0 gap-1.5">
            Tinjau <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewDialog({
  req,
  onClose,
  onDone,
}: {
  req: ExtensionRequestRow
  onClose: () => void
  onDone: () => void
}) {
  const [action, setAction] = useState<'approve' | 'deny' | null>(null)
  const [note, setNote] = useState('')
  const [useOverride, setUseOverride] = useState(false)
  const [grantedSessions, setGrantedSessions] = useState<number>(req.requestedSessions)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!action) {
      toast.error('Pilih approve atau deny')
      return
    }
    setLoading(true)
    try {
      const payload: { action: 'approve' | 'deny'; note?: string; grantedSessions?: number } = {
        action,
        note: note.trim() || undefined,
      }
      if (action === 'approve' && useOverride) {
        payload.grantedSessions = grantedSessions
      }
      await apiPatch(`/api/extension-requests/${req.id}/review`, payload)
      toast.success(
        action === 'approve'
          ? `Permintaan ${req.studentName} disetujui (+${useOverride ? grantedSessions : req.requestedSessions} sesi)`
          : `Permintaan ${req.studentName} ditolak`,
      )
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mereview permintaan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Tinjau Permintaan Perpanjangan
          </DialogTitle>
          <DialogDescription>
            {req.studentName} ({req.studentCode}) — kuota saat ini {req.currentQuota} sesi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Request summary */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sesi Diminta</div>
                <div className="text-base font-bold text-primary">+{req.requestedSessions}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Kuota Saat Ini</div>
                <div className="text-base font-bold">{req.currentQuota}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Alasan</div>
                <div className="mt-0.5 text-xs leading-relaxed">{req.reason}</div>
              </div>
            </div>
          </div>

          {/* Action selection */}
          <div className="space-y-2">
            <Label className="text-xs">Aksi</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={action === 'approve' ? 'default' : 'outline'}
                onClick={() => setAction('approve')}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Setujui
              </Button>
              <Button
                type="button"
                size="sm"
                variant={action === 'deny' ? 'destructive' : 'outline'}
                onClick={() => setAction('deny')}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" /> Tolak
              </Button>
            </div>
          </div>

          {/* Override granted sessions (approve only) */}
          {action === 'approve' && (
            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={useOverride}
                  onChange={(e) => setUseOverride(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Override jumlah sesi yang diberikan
              </label>
              {useOverride && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Berikan sesi sebanyak</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={grantedSessions}
                    onChange={(e) => setGrantedSessions(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Default: {req.requestedSessions} sesi (sesuai permintaan siswa)
                  </p>
                </div>
              )}
              <div className="text-xs">
                <span className="text-muted-foreground">Hasil kuota baru: </span>
                <strong className="text-emerald-700 dark:text-emerald-300">
                  {req.currentQuota + (useOverride ? grantedSessions : req.requestedSessions)} sesi
                </strong>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-xs">
              Catatan {action === 'deny' ? '(wajib, agar siswa tahu alasan)' : '(opsional)'}
            </Label>
            <Textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === 'deny' ? 'Mis. Mohon maaf, kuota sudah maksimal. Silakan hubungi admin.' : 'Mis. Disetujui sesuai permintaan.'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button
            type="button"
            disabled={loading || !action || (action === 'deny' && note.trim().length < 3)}
            onClick={handleSubmit}
            variant={action === 'deny' ? 'destructive' : 'default'}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action === 'deny' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            Konfirmasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Users
  tone: 'primary' | 'amber' | 'destructive' | 'default'
}) {
  const cls = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    destructive: 'bg-destructive/10 text-destructive',
    default: 'bg-muted text-muted-foreground',
  }[tone]
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 text-center transition-transform hover:-translate-y-0.5">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${cls}`} />
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
