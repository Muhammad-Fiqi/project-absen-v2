'use client'

import { GraduationCap, ShieldCheck, LogOut, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  role: 'student' | 'teacher' | 'admin' | null
  user: { name: string; code?: string } | null
  onLogout: () => void
}

export function Header({ role, user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">PTE Attendance</span>
              <Badge variant="secondary" className="hidden h-5 px-1.5 text-[10px] font-medium sm:inline-flex">
                <ShieldCheck className="mr-1 h-3 w-3" /> Anti-Curang
              </Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Sistem Absensi PTE Academic
            </p>
          </div>
        </div>

        {role && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 sm:px-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {role === 'student' ? user.code : role === 'admin' ? 'Administrator' : 'Pengajar'}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {role === 'student' ? `Siswa · ${user.code}` : role === 'admin' ? 'Administrator' : 'Pengajar'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin sm:hidden" />
            <span className="hidden sm:inline">Memuat sesi…</span>
          </div>
        )}
      </div>
    </header>
  )
}
