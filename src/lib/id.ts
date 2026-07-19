// Lightweight unique-id generator for new rows.
// Drizzle SQLite doesn't auto-generate cuid ids like Prisma, so we make them here.
// Format: `<prefix>_<base36-timestamp><random-hex>` (URL-safe, monotonic-ish, sortable).

export function newId(prefix = 'u'): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(16).slice(2, 10)
  return `${prefix}_${ts}${rand}`
}
