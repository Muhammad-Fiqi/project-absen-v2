'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Search, Users, Zap, PackageOpen, Plus, History, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Gift, Phone, Mail, Edit3, Trash2, KeyRound,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { toast } from 'sonner'
import type { StudentManageRow } from '@/lib/types'

export function StudentsManage() {
  const [students, setStudents] = useState<StudentManageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'exhausted' | 'expiring' | 'healthy'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [extendTarget, setExtendTarget] = useState<StudentManageRow | null>(null)

  // Create/Edit dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentManageRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    studentCode: '', name: '', email: '', phone: '', sessionQuota: 15, pinHash: '',
  })

  async function load() {
    setLoading(true)
    try {
      const res = await apiGet<{ students: StudentManageRow[] }>('/api/students')
      setStudents(res.students)
    } catch {
      toast.error('Gagal memuat siswa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm({ studentCode: '', name: '', email: '', phone: '', sessionQuota: 15, pinHash: '' })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentCode || !form.name) {
      toast.error('Kode siswa dan nama wajib diisi')
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/students', form)
      toast.success('Siswa berhasil ditambahkan')
      setCreateOpen(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah siswa')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(s: StudentManageRow) {
    setEditingStudent(s)
    setForm({
      studentCode: s.studentCode,
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      sessionQuota: s.sessionQuota,
      pinHash: '',
    })
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingStudent) return
    setSaving(true)
    try {
      await apiPatch(`/api/students/${editingStudent.id}`, form)
      toast.success('Data siswa berhasil diperbarui')
      setEditOpen(false)
      setEditingStudent(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui siswa')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s: StudentManageRow) {
    if (!confirm(`Yakin ingin menghapus ${s.name} (${s.studentCode})?\nSemua data absensi juga akan dihapus.`)) return
    try {
      await apiDelete(`/api/students/${s.id}`)
      toast.success('Siswa berhasil dihapus')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus siswa')
    }
  }

  const filtered = students.filter((s) => {
    const q = query.toLowerCase()
    const matches = !q || s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
    if (!matches) return false
    if (filter === 'exhausted') return s.quotaExhausted
    if (filter === 'expiring') return !s.quotaExhausted && s.sessionsRemaining <= 2
    if (filter === 'healthy') return s.sessionsRemaining > 2
    return true
  })

  const exhaustedCount = students.filter((s) => s.quotaExhausted).length
  const expiringCount = students.filter((s) => !s.quotaExhausted && s.sessionsRemaining <= 2).length

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Total Siswa" value={students.length} icon={Users} tone="default" />
        <MiniStat label="Kuota Habis" value={exhaustedCount} icon={PackageOpen} tone="destructive" />
        <MiniStat label="Hampir Habis" value={expiringCount} icon={Zap} tone="amber" />
        <MiniStat label="Sehat" value={students.length - exhaustedCount - expiringCount} icon={CheckCircle2} tone="primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama / kode / email…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {([
            ['all', 'Semua'],
            ['exhausted', 'Habis'],
            ['expiring', 'Hampir Habis'],
            ['healthy', 'Sehat'],
          ] as const).map(([k, l]) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? 'default' : 'outline'}
              onClick={() => setFilter(k)}
              className="h-8"
            >
              {l}
            </Button>
          ))}
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true) }} className="h-8 gap-1">
            <Plus className="h-3.5 w-3.5" /> Tambah
          </Button>
        </div>
      </div>

      {/* List */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            Daftar Siswa & Kuota ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[32rem] divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {filtered.map((s) => {
              const pct = s.sessionQuota > 0 ? Math.round((s.sessionsUsed / s.sessionQuota) * 100) : 0
              const expanded = expandedId === s.id
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      s.quotaExhausted ? 'bg-destructive/15 text-destructive' :
                      s.sessionsRemaining <= 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                      'bg-accent text-accent-foreground'
                    }`}>
                      {s.studentCode.slice(-3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{s.name}</span>
                        <span className="text-[11px] text-muted-foreground">{s.studentCode}</span>
                        {s.quotaExhausted && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Habis</Badge>}
                        {!s.quotaExhausted && s.sessionsRemaining <= 2 && <Badge className="h-5 bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">Hampir Habis</Badge>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={pct} className={`h-1.5 flex-1 ${s.quotaExhausted ? '[&>div]:bg-destructive' : s.sessionsRemaining <= 2 ? '[&>div]:bg-amber-500' : ''}`} />
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {s.sessionsUsed}/{s.sessionQuota} sesi · {s.uniqueDaysAttended} hari
                        </span>
                      </div>
                    </div>
                    {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
                  {expanded && (
                    <div className="border-t border-border/40 bg-muted/20 p-3">
                      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        <Info label="Sisa Kuota" value={`${s.sessionsRemaining} sesi`} />
                        <Info label="Hadir" value={`${s.sessionsUsed} sesi`} />
                        <Info label="Hari Hadir" value={`${s.uniqueDaysAttended} hari`} />
                        <Info label="Hari Terakhir Absen" value={s.lastCheckIn ? new Date(s.lastCheckIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                        {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                        {s.lastCheckIn && <span>Terakhir absen: {new Date(s.lastCheckIn).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                        {s.quotaExtendedAt && <span>Diperpanjang: {new Date(s.quotaExtendedAt).toLocaleDateString('id-ID')}</span>}
                      </div>
                      {/* Extension history */}
                      {s.extensions.length > 0 && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-card p-2">
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <History className="h-3 w-3" /> Riwayat Perpanjangan ({s.extensions.length})
                          </p>
                          <div className="space-y-1">
                            {s.extensions.map((e) => (
                              <div key={e.id} className="flex items-center justify-between text-[11px]">
                                <span>
                                  <Gift className="mr-1 inline h-3 w-3 text-primary" />
                                  {e.oldQuota} → <strong>{e.newQuota}</strong> (+{e.addedSessions})
                                  {e.reason && <span className="text-muted-foreground"> — {e.reason}</span>}
                                </span>
                                <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{e.adminName ? ` · ${e.adminName}` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(s)}>
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)}>
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                        <Button size="sm" onClick={() => setExtendTarget(s)} className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Perpanjang Kuota
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada siswa ditemukan</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Student Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Tambah Siswa Baru
            </DialogTitle>
            <DialogDescription>Masukkan data siswa untuk mendaftarkan akun baru.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Siswa *</Label>
                <Input value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} placeholder="Mis: PTE010" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Lengkap *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis: Fulan" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email (opsional)</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">No. HP (opsional)</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kuota Sesi</Label>
                <Input type="number" min={1} max={100} value={form.sessionQuota} onChange={(e) => setForm({ ...form, sessionQuota: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PIN / Password</Label>
                <Input value={form.pinHash} onChange={(e) => setForm({ ...form, pinHash: e.target.value })} placeholder="Kosong = 4 digit terakhir kode" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tambah Siswa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" /> Edit Siswa
            </DialogTitle>
            <DialogDescription>Ubah data siswa atau reset PIN.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Siswa</Label>
                <Input value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Lengkap</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">No. HP</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kuota Sesi</Label>
              <Input type="number" min={1} max={100} value={form.sessionQuota} onChange={(e) => setForm({ ...form, sessionQuota: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PIN Baru (kosongkan jika tidak diubah)</Label>
              <Input value={form.pinHash} onChange={(e) => setForm({ ...form, pinHash: e.target.value })} placeholder="Biarkan kosong jika tidak ganti PIN" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {extendTarget && (
        <ExtendDialog
          student={extendTarget}
          onClose={() => setExtendTarget(null)}
          onDone={() => {
            setExtendTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: 'primary' | 'amber' | 'destructive' | 'default' }) {
  const cls = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    destructive: 'bg-destructive/10 text-destructive',
    default: 'bg-muted text-muted-foreground',
  }[tone]
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${cls}`} />
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function ExtendDialog({ student, onClose, onDone }: { student: StudentManageRow; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'add' | 'set'>('add')
  const [addSessions, setAddSessions] = useState(10)
  const [setQuota, setSetQuota] = useState(student.sessionQuota + 10)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = mode === 'add'
        ? { addedSessions: addSessions, reason }
        : { setQuota, reason }
      await apiPost(`/api/students/${student.id}/extend`, payload)
      toast.success(`Kuota ${student.name} berhasil diperpanjang`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperpanjang kuota')
    } finally {
      setLoading(false)
    }
  }

  const newQuota = mode === 'add' ? student.sessionQuota + addSessions : setQuota
  const added = newQuota - student.sessionQuota

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Perpanjang Kuota Sesi
          </DialogTitle>
          <DialogDescription>
            {student.name} ({student.studentCode}) — kuota saat ini {student.sessionQuota}, terpakai {student.sessionsUsed}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant={mode === 'add' ? 'default' : 'outline'} onClick={() => setMode('add')}>
              Tambah N sesi
            </Button>
            <Button type="button" size="sm" variant={mode === 'set' ? 'default' : 'outline'} onClick={() => setMode('set')}>
              Set total kuota
            </Button>
          </div>
          {mode === 'add' ? (
            <div className="space-y-2">
              <Label className="text-xs">Jumlah sesi yang ditambahkan</Label>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20].map((n) => (
                  <Button key={n} type="button" size="sm" variant={addSessions === n ? 'default' : 'outline'} onClick={() => setAddSessions(n)} className="h-8">
                    +{n}
                  </Button>
                ))}
              </div>
              <Input type="number" min={1} max={50} value={addSessions} onChange={(e) => setAddSessions(Number(e.target.value))} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Total kuota baru</Label>
              <Input type="number" min={student.sessionQuota + 1} max={100} value={setQuota} onChange={(e) => setSetQuota(Number(e.target.value))} />
              <p className="text-[11px] text-muted-foreground">Minimal: {student.sessionQuota + 1}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">Alasan / catatan (opsional)</Label>
            <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. Perpanjangan paket 10 sesi" />
          </div>
          {/* Summary */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kuota saat ini</span>
              <span className="font-medium">{student.sessionQuota} sesi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ditambahkan</span>
              <span className="font-medium text-primary">+{added} sesi</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-primary/20 pt-1">
              <span className="font-medium">Kuota baru</span>
              <span className="font-bold text-primary">{newQuota} sesi</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Sisa setelah perpanjang</span>
              <span className="font-medium">{newQuota - student.sessionsUsed} sesi</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading || added <= 0} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Konfirmasi Perpanjang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
