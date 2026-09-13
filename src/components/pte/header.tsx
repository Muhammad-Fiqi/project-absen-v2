'use client'

import Image from 'next/image'
import { ShieldCheck, LogOut, User, Loader2 } from 'lucide-react'
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
import { ThemeToggle } from './theme-toggle'

interface HeaderProps {
  role: 'student' | 'teacher' | 'admin' | null
  user: { name: string; code?: string } | null
  onLogout: () => void
}

export function Header({ role, user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-30 items-center justify-center overflow-hidden rounded-xl px-5 filter drop-shadow-[0_0_10px_#00fffc]">
            <Image src="/logo.png" alt="Ruang PTE" width={140} height={55} className="h-auto w-full object-contain" priority />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r max-md:hidden from-foreground to-foreground/80 bg-clip-text text-base font-bold tracking-tight text-transparent">
                Ruang PTE
              </span>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Website resmi Ruang PTE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
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
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin sm:hidden" />
              <span className="hidden sm:inline">Memuat sesi…</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
