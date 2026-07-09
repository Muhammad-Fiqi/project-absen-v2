'use client'

import { useState } from 'react'
import { ShieldCheck, ArrowLeft, Loader2, KeyRound, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface TeacherLoginProps {
  onBack: () => void
  onSuccess: (data?: { id: string; username: string; name: string; role: string }) => void
}

export function TeacherLogin({ onBack, onSuccess }: TeacherLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      const res = await apiPost<{
        success: boolean
        teacher: { id: string; username: string; name: string; role: string }
      }>('/api/auth/teacher', { username, password })
      toast.success('Berhasil masuk!')
      onSuccess(res.teacher)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal masuk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full border-border/60 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <button
            onClick={onBack}
            className="absolute left-4 top-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Login Pengajar</CardTitle>
          <CardDescription>
            Masuk untuk mengelola sesi, QR, dan laporan kehadiran
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="pengajar"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Demo: pengajar / pengajar123 · admin / admin123
              </p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}