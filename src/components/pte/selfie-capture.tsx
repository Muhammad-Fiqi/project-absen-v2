'use client'

import { useRef, useState, useEffect } from 'react'
import { Camera, RefreshCw, Check, Loader2, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SelfieCaptureProps {
  onCapture: (base64: string) => void
  captured: string | null
}

export function SelfieCapture({ onCapture, captured }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  async function startCamera() {
    setStatus('starting')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('live')
    } catch (e) {
      setStatus('error')
      const msg = e instanceof Error ? e.message : 'Tidak bisa mengakses kamera'
      setErrorMsg(msg)
      toast.error('Kamera gagal diakses untuk selfie')
    }
  }

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = 480
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Center crop square + mirror (selfie)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height)
    ctx.restore()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    onCapture(dataUrl)
    stopCamera()
    setStatus('idle')
  }

  function retake() {
    onCapture('')
    startCamera()
  }

  if (captured) {
    return (
      <div className="space-y-3">
        <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-2xl border-2 border-primary/60 shadow-sm">
          <img src={captured} alt="Selfie" className="h-full w-full object-cover" />
          <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-4 w-4" />
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={retake} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Ambil Ulang
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-2xl border-2 border-border bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <UserCircle2 className="h-12 w-12" />
            <span className="text-xs">Kamera belum aktif</span>
          </div>
        )}
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {status === 'live' && (
          <>
            <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-primary/70" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
              Posisikan wajah di lingkaran
            </div>
          </>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
            <Camera className="h-6 w-6 opacity-50" />
            {errorMsg}
          </div>
        )}
      </div>
      <div className="flex justify-center">
        {status === 'live' ? (
          <Button type="button" size="sm" onClick={takePhoto} className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Ambil Foto
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={startCamera} className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Aktifkan Kamera
          </Button>
        )}
      </div>
    </div>
  )
}
