'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Plus, Edit3, Trash2, Loader2, RefreshCw, GraduationCap, CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { toast } from 'sonner'

export interface CourseItem {
  id: string
  code: string
  name: string
  description: string | null
  defaultQuota: number
  totalSessions: number
  graceMinutesBefore: number
  graceMinutesAfter: number
  createdAt: string
  studentCount?: number
  sessionCount?: number
}

export function CoursesManage() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    defaultQuota: 15,
    totalSessions: 20,
    graceMinutesBefore: 10,
    graceMinutesAfter: 20,
  })

  const loadCourses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ courses: CourseItem[] }>('/api/courses')
      setCourses(res.courses)
    } catch {
      toast.error('Gagal memuat data kursus')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  function resetForm() {
    setForm({
      code: '',
      name: '',
      description: '',
      defaultQuota: 15,
      totalSessions: 20,
      graceMinutesBefore: 10,
      graceMinutesAfter: 20,
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.name) {
      toast.error('Kode dan nama kursus wajib diisi')
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/courses', form)
      toast.success('Kursus berhasil dibuat')
      setCreateOpen(false)
      resetForm()
      loadCourses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat kursus')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCourse) return
    setSaving(true)
    try {
      await apiPatch(`/api/courses/${editingCourse.id}`, form)
      toast.success('Data kursus berhasil diperbarui')
      setEditOpen(false)
      setEditingCourse(null)
      loadCourses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui kursus')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: CourseItem) {
    if (!confirm(`Yakin ingin menghapus kursus ${item.code} - ${item.name}?\n\nHanya bisa jika tidak ada siswa/sesi terkait.`)) return
    try {
      await apiDelete(`/api/courses/${item.id}`)
      toast.success('Kursus berhasil dihapus')
      loadCourses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus kursus')
    }
  }

  function openEdit(item: CourseItem) {
    setEditingCourse(item)
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || '',
      defaultQuota: item.defaultQuota,
      totalSessions: item.totalSessions,
      graceMinutesBefore: item.graceMinutesBefore,
      graceMinutesAfter: item.graceMinutesAfter,
    })
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Kelola Kursus / Kelas</h2>
          <p className="text-sm text-muted-foreground">
            Tambah, edit, atau hapus data kursus. Hanya bisa hapus jika tidak memiliki siswa & sesi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadCourses} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true) }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Tambah Kursus
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Belum ada kursus. Klik tombol "Tambah Kursus" untuk membuat kursus baru.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <Card key={c.id} className="border-border/60 transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className="text-[10px]">{c.code}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {c.description || 'Tidak ada deskripsi'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/30 p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3" /> Siswa
                    </div>
                    <div className="text-lg font-bold">{c.studentCount ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" /> Sesi
                    </div>
                    <div className="text-lg font-bold">{c.sessionCount ?? 0}</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <span>Kuota default: {c.defaultQuota}</span>
                  <span>Total sesi: {c.totalSessions}</span>
                  <span>Grace before: {c.graceMinutesBefore} mnt</span>
                  <span>Grace after: {c.graceMinutesAfter} mnt</span>
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-border/40 pt-3">
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(c)}>
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Tambah Kursus Baru
            </DialogTitle>
            <DialogDescription>
              Buat kursus/kelas baru untuk menampung sesi dan siswa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Kursus</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Mis: PTE-2026-B" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Kursus</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis: PTE Preparation" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi (opsional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kuota Default</Label>
                <Input type="number" min={1} max={100} value={form.defaultQuota} onChange={(e) => setForm({ ...form, defaultQuota: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Sesi</Label>
                <Input type="number" min={1} max={100} value={form.totalSessions} onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grace Before (menit)</Label>
                <Input type="number" min={0} max={60} value={form.graceMinutesBefore} onChange={(e) => setForm({ ...form, graceMinutesBefore: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grace After (menit)</Label>
                <Input type="number" min={0} max={60} value={form.graceMinutesAfter} onChange={(e) => setForm({ ...form, graceMinutesAfter: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Buat Kursus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" /> Edit Kursus
            </DialogTitle>
            <DialogDescription>
              Ubah data kursus {editingCourse?.code}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Kursus</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Kursus</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kuota Default</Label>
                <Input type="number" min={1} max={100} value={form.defaultQuota} onChange={(e) => setForm({ ...form, defaultQuota: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Sesi</Label>
                <Input type="number" min={1} max={100} value={form.totalSessions} onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grace Before (menit)</Label>
                <Input type="number" min={0} max={60} value={form.graceMinutesBefore} onChange={(e) => setForm({ ...form, graceMinutesBefore: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grace After (menit)</Label>
                <Input type="number" min={0} max={60} value={form.graceMinutesAfter} onChange={(e) => setForm({ ...form, graceMinutesAfter: Number(e.target.value) })} />
              </div>
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
    </div>
  )
}

