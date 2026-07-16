'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Loader2, ScanLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface QrScannerProps {
  onScan: (decoded: string) => void
  onClose?: () => void
  active?: boolean
}

export function QrScanner({ onScan, onClose, active = true }: QrScannerProps) {
  const containerId = 'pte-qr-reader'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [status, setStatus] = useState<'starting' | 'running' | 'error' | 'stopped'>('starting')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        const state = await s.getState()
        if (state !== 2) { // 2 = NOT_STARTED
          await s.stop()
        }
      } catch {
        /* ignore stop errors */
      }
      try {
        await s.clear()
      } catch {
        /* ignore clear errors */
      }
    }
  }, [])

  useEffect(() => {
    if (!active) return
    let mounted = true
    async function start() {
      try {
        const el = document.getElementById(containerId)
        if (!el) return
        // Make sure container is empty before starting
        el.innerHTML = ''
        const scanner = new Html5Qrcode(containerId, { verbose: false })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decodedText) => {
            if (!mounted) return
            stopScanner().then(() => {
              setStatus('stopped')
              onScan(decodedText)
            }).catch(() => {
              setStatus('stopped')
              onScan(decodedText)
            })
          },
          () => {
            // per-frame failure — ignore
          }
        )
        if (mounted) setStatus('running')
      } catch (e) {
        if (!mounted) return
        setStatus('error')
        const msg = e instanceof Error ? e.message : 'Tidak bisa mengakses kamera'
        setErrorMsg(msg)
        toast.error('Kamera tidak tersedia. Gunakan Input Kode jika kamera bermasalah.')
      }
    }
    start()
    return () => {
      mounted = false
      stopScanner()
    }
  }, [active, onScan, stopScanner])

  async function handleStop() {
    await stopScanner()
    setStatus('stopped')
    onClose?.()
  }

  if (!active) return null

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border-2 border-primary/40 bg-black">
        <div id={containerId} className="h-full w-full" />
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Memulai kamera…</span>
          </div>
        )}
        {status === 'running' && (
          <>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              <div className="absolute left-1/2 top-1/2 h-0.5 w-60 -translate-x-1/2 -translate-y-1/2 animate-pulse bg-primary" />
            </div>
            <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              <ScanLine className="mr-1 inline h-3 w-3" /> Arahkan ke QR di layar
            </div>
          </>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-4 text-center text-white">
            <Camera className="h-8 w-8 opacity-50" />
            <span className="text-sm">{errorMsg || 'Kamera gagal dimulai'}</span>
          </div>
        )}
      </div>
      {status === 'error' && (
        <p className="text-center text-xs text-muted-foreground">
          Izinkan akses kamera di browser, atau gunakan mode PIN saja.
        </p>
      )}
      <div className="flex justify-center">
        <Button type="button" variant="ghost" size="sm" onClick={handleStop} className="gap-1.5">
          <X className="h-3.5 w-3.5" /> Tutup Kamera
        </Button>
      </div>
    </div>
  )
}
