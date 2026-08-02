'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCheck, Plus, Trash2, Edit3, Shield, GraduationCap, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { toast } from 'sonner'

export interface StaffItem {
  id: string
  username: string
  name: string
  role: 'teacher' | 'admin'
  createdAt?: string
}

export function StaffManage() {
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'teacher' as 'teacher' | 'admin',
  })

  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ staff: StaffItem[] }>('/api/staff')
      setStaff(res.staff)
    } catch {
      toast.error('Gagal memuat data staf pengajar & admin')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.username || !form.password) {
      toast.error('Lengkapi semua data form')
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/staff', form)
      toast.success(`Akun ${form.role === 'admin' ? 'Admin' : 'Pengajar'} berhasil dibuat`)
      setCreateOpen(false)
      setForm({ name: '', username: '', password: '', role: 'teacher' })
      loadStaff()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat akun')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingStaff) return
    setSaving(true)
    try {
      await apiPatch(`/api/staff/${editingStaff.id}`, form)
      toast.success('Data akun berhasil diperbarui')
      setEditOpen(false)
      setEditingStaff(null)
      loadStaff()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui akun')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: StaffItem) {
    if (!confirm(`Yakin ingin menghapus akun ${item.name} (${item.username})?`)) return
    try {
      await apiDelete(`/api/staff/${item.id}`)
      toast.success('Akun berhasil dihapus')
      loadStaff()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus akun')
    }
  }

  function openEdit(item: StaffItem) {
    setEditingStaff(item)
    setForm({
      name: item.name,
      username: item.username,
      password: '',
      role: item.role,
    })
    setEditOpen(true)
  }

  const teachers = staff.filter((s) => s.role === 'teacher')
  const admins = staff.filter((s) => s.role === 'admin')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Kelola Pengajar & Admin</h2>
          <p className="text-sm text-muted-foreground">
            Kelola pembuatan akun, kredensial login, dan hak akses staf pengajar & admin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadStaff} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setForm({ name: '', username: '', password: '', role: 'teacher' }); setCreateOpen(true) }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Tambah Staf Baru
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Admin List */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Daftar Admin ({admins.length})
              </CardTitle>
              <CardDescription>Akses penuh administrasi & manajemen data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {admins.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Belum ada akun admin</div>
              ) : (
                admins.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{a.name}</span>
                        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
                          Admin
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">@{a.username}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Teacher List */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <GraduationCap className="h-4 w-4 text-primary" />
                Daftar Pengajar ({teachers.length})
              </CardTitle>
              <CardDescription>Akses mengelola absensi & sesi kelas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {teachers.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Belum ada akun pengajar</div>
              ) : (
                teachers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{t.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Pengajar
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">@{t.username}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Tambah Staf Pengajar / Admin
            </DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru untuk staf pengajar atau administrator sistem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Peran / Role</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.role === 'teacher' ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, role: 'teacher' })}
                  className="gap-1.5"
                >
                  <GraduationCap className="h-4 w-4" /> Pengajar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.role === 'admin' ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, role: 'admin' })}
                  className="gap-1.5"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Misal: Mr. Dimas S.Pd"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Username (untuk Login)</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Misal: dimas_pte"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kata Sandi / Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Masukkan kata sandi"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Buat Akun
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
              <Edit3 className="h-4 w-4 text-primary" /> Edit Akun Staf
            </DialogTitle>
            <DialogDescription>
              Ubah rincian informasi atau reset password akun {editingStaff?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Peran / Role</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.role === 'teacher' ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, role: 'teacher' })}
                  className="gap-1.5"
                >
                  <GraduationCap className="h-4 w-4" /> Pengajar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.role === 'admin' ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, role: 'admin' })}
                  className="gap-1.5"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kata Sandi Baru (Kosongkan jika tidak diubah)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Kata sandi baru..."
              />
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
