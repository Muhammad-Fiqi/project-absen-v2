export function toWibSessionDateTime(dateKey: string, time: string): string {
  const timeMatch = time.match(/^(\d{2}:\d{2})(?::(\d{2}))?/)
  const cleanTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2] || '00'}` : time
  return `${dateKey}T${cleanTime}+07:00`
}

export function normalizeSessionDateTime(dateKey: string, value: string): string {
  const time = value.match(/(?:T|^)(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/)?.[1]
  if (!time) return value
  return toWibSessionDateTime(dateKey, time)
}

export function sessionTimeLabel(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/)
  if (match) return match[1]
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
}