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

export interface CourseItem {
  id: string
  code: string
  name: string
}

export function StudentsManage() {
  const [students, setStudents] = useState<StudentManageRow[]>([])
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'exhausted' | 'expiring' | 'healthy'>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [extendTarget, setExtendTarget] = useState<StudentManageRow | null>(null)

  // Create/Edit dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentManageRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    studentCode: '', name: '', email: '', phone: '', sessionQuota: 15, pinHash: '', reduceRemainingBy: 0, increaseRemainingBy: 0, courseId: '',
  })

  async function loadCourses() {
    try {
      const res = await apiGet<{ courses: CourseItem[] }>('/api/courses')
      setCourses(res.courses)
    } catch {
      // silent
    }
  }

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

  useEffect(() => {
    load()
    loadCourses()
  }, [])

  function resetForm() {
    setForm({ studentCode: '', name: '', email: '', phone: '', sessionQuota: 15, pinHash: '', reduceRemainingBy: 0, increaseRemainingBy: 0, courseId: '' })
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
      reduceRemainingBy: 0,
      increaseRemainingBy: 0,
      courseId: s.courseId || '',
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
    if (courseFilter !== 'all' && s.courseId !== courseFilter) return false
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MiniStat label="Total Siswa" value={students.length} icon={Users} tone="default" />
        <MiniStat label="Kuota Sehat" value={students.length - exhaustedCount - expiringCount} icon={CheckCircle2} tone="primary" />
        <MiniStat label="Hampir Habis" value={expiringCount} icon={Zap} tone="amber" />
        <MiniStat label="Kuota Habis" value={exhaustedCount} icon={PackageOpen} tone="destructive" />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, kode siswa, atau email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>

          {/* Course Filter & Add Button */}
          <div className="flex items-center gap-2">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-9 w-full sm:w-48 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Semua Kursus</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={() => { resetForm(); setCreateOpen(true) }}
              className="h-9 shrink-0 gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Siswa</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </div>

        {/* Filter Pills with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {([
            ['all', 'Semua', students.length],
            ['healthy', 'Sehat', students.length - exhaustedCount - expiringCount],
            ['expiring', 'Hampir Habis', expiringCount],
            ['exhausted', 'Habis', exhaustedCount],
          ] as const).map(([k, l, count]) => {
            const active = filter === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{l}</span>
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Daftar Siswa & Kuota ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-128 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {filtered.map((s) => {
              const pct = s.sessionQuota > 0 ? Math.round((s.sessionsUsed / s.sessionQuota) * 100) : 0
              const expanded = expandedId === s.id
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    className="flex w-full items-start gap-3 p-3 sm:p-3.5 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold font-mono ${
                      s.quotaExhausted
                        ? 'bg-destructive/15 text-destructive border border-destructive/20'
                        : s.sessionsRemaining <= 2
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {s.studentCode.slice(-3)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground leading-snug">{s.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">({s.studentCode})</span>
                        {s.isOnLeave && (
                          <Badge variant="outline" className="h-4.5 border-sky-300 bg-sky-50 px-1.5 text-[10px] text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                            Sedang cuti
                          </Badge>
                        )}
                        {s.quotaExhausted && (
                          <Badge variant="destructive" className="h-4.5 px-1.5 text-[10px]">
                            Habis
                          </Badge>
                        )}
                        {!s.quotaExhausted && s.sessionsRemaining <= 2 && (
                          <Badge className="h-4.5 bg-amber-500/90 hover:bg-amber-500 px-1.5 text-[10px] text-white">
                            Sisa {s.sessionsRemaining}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <Progress
                          value={pct}
                          className={`h-1.5 flex-1 ${
                            s.quotaExhausted
                              ? '[&>div]:bg-destructive'
                              : s.sessionsRemaining <= 2
                                ? '[&>div]:bg-amber-500'
                                : '[&>div]:bg-primary'
                          }`}
                        />
                        <div className="flex items-center justify-between sm:justify-start gap-2 text-[11px] text-muted-foreground shrink-0 font-medium">
                          <span>
                            <strong className="text-foreground">{s.sessionsRemaining}</strong> sisa dari {s.sessionQuota} sesi
                          </span>
                          <span className="text-border">·</span>
                          <span>{s.uniqueDaysAttended} hari</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-border/40 bg-muted/20 p-3 sm:p-4">
                      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        <Info label="Sisa Kuota" value={`${s.sessionsRemaining} sesi`} />
                        <Info label="Hadir" value={`${s.sessionsUsed} sesi`} />
                        <Info label="Hari Hadir" value={`${s.uniqueDaysAttended} hari`} />
                        <Info label="Hari Terakhir Absen" value={s.lastCheckIn ? new Date(s.lastCheckIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{s.email}</span>
                          </a>
                        )}
                        {s.phone && (
                          <a
                            href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak ${s.name} (${s.studentCode}), salam dari Ruang PTE Pare Kediri.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{s.phone}</span>
                          </a>
                        )}
                        {s.lastCheckIn && (
                          <span className="text-muted-foreground">
                            Terakhir absen: {new Date(s.lastCheckIn).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                        {s.quotaExtendedAt && (
                          <span className="text-muted-foreground">
                            Diperpanjang: {new Date(s.quotaExtendedAt).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                      {/* Extension history */}
                      {s.extensions.length > 0 && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-card p-2.5">
                          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                            <History className="h-3.5 w-3.5" /> Riwayat Perpanjangan ({s.extensions.length})
                          </p>
                          <div className="space-y-1">
                            {s.extensions.map((e) => (
                              <div key={e.id} className="flex items-center justify-between text-xs">
                                <span>
                                  <Gift className="mr-1 inline h-3.5 w-3.5 text-primary" />
                                  {e.oldQuota} → <strong>{e.newQuota}</strong> (+{e.addedSessions})
                                  {e.reason && <span className="text-muted-foreground"> — {e.reason}</span>}
                                </span>
                                <span className="text-muted-foreground text-[11px]">{new Date(e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{e.adminName ? ` · ${e.adminName}` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 flex-1 sm:flex-initial" onClick={() => openEdit(s)}>
                          <Edit3 className="h-3.5 w-3.5" /> Edit Data
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 flex-1 sm:flex-initial text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(s)}>
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                        <Button size="sm" onClick={() => setExtendTarget(s)} className="h-8 gap-1.5 w-full sm:w-auto sm:ml-auto shadow-xs">
                          <Gift className="h-3.5 w-3.5" /> Perpanjang Kuota
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
            <div className="space-y-1.5">
              <Label className="text-xs">Kode Kursus *</Label>
              <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                <option value="">Pilih kode kursus</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              <Label className="text-xs">Kode Kursus</Label>
              <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Pilih kode kursus</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kuota Sesi</Label>
              <Input type="number" min={1} max={100} value={form.sessionQuota} onChange={(e) => setForm({ ...form, sessionQuota: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <Label className="text-xs font-semibold text-amber-800 dark:text-amber-200">Kurangi Sisa Kuota</Label>
                <Input type="number" min={0} max={editingStudent?.sessionsRemaining ?? 0} value={form.reduceRemainingBy} onChange={(e) => setForm({ ...form, reduceRemainingBy: Number(e.target.value) })} className="bg-background" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Sisa: {editingStudent?.sessionsRemaining ?? 0}. Menambah pemakaian.
                </p>
              </div>
              <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Tambah Sisa Kuota</Label>
                <Input type="number" min={0} max={50} value={form.increaseRemainingBy} onChange={(e) => setForm({ ...form, increaseRemainingBy: Number(e.target.value) })} className="bg-background" />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Sisa baru: {((editingStudent?.sessionsRemaining ?? 0) + (form.increaseRemainingBy || 0))} sesi.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status Password</Label>
              <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${editingStudent?.hasPassword ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300'}`}>
                {editingStudent?.hasPassword ? <><KeyRound className="h-4 w-4" /> PIN sudah diatur</> : <><AlertTriangle className="h-4 w-4" /> Belum ada PIN</>}
              </div>
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
  const toneStyles = {
    primary: { iconBg: 'bg-primary/10 text-primary', num: 'text-primary' },
    amber: { iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', num: 'text-amber-600 dark:text-amber-400' },
    destructive: { iconBg: 'bg-destructive/10 text-destructive', num: 'text-destructive' },
    default: { iconBg: 'bg-muted text-foreground', num: 'text-foreground' },
  }[tone]

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-3 text-center transition-colors shadow-xs">
      <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles.iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className={`text-2xl font-bold tracking-tight ${toneStyles.num}`}>{value}</div>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-foreground truncate">{value}</div>
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
