import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSessionCardTitle(mode: string) {
  return mode === 'online' ? 'Kelas Online' : 'Kelas Offline'
}
