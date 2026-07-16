'use client'

import { ShieldCheck, Github, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>
              <strong className="font-medium text-foreground">PTE Attendance</strong> · Sistem Absensi Anti-Curang
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Dibuat dengan</span>
            <Heart className="h-3 w-3 fill-primary text-primary" />
            <span>untuk kursus PTE · © {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
