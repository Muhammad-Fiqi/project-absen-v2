# Rencana: Migrasi Total Prisma → Drizzle (sampai siap deploy)

## Konteks
Migrasi setengah jadi. `src/db/schema.ts`, `src/lib/db.ts`, `src/app/api/setup/route.ts` sudah pakai Drizzle, tapi **16 file API routes lain masih pakai syntax Prisma** (`db.student.findMany`, `db.$transaction`, `db.course.findUnique`) padahal `db` sudah jadi instance Drizzle → aplikasi broken. SETUP.md juga masih merujuk Prisma. Target: Drizzle murni, ringan, deploy ke Vercel+Turso sukses.

---

## Bagian 1 — Perbaiki Core Files (foundation)

**1.1. `src/lib/auth.ts`** — perbaiki bug `getCurrentStudent()`
- Ganti `.where((student as any).id != null)` (salah & return semua rows) menjadi `.where(eq(student.id, sess.id))` dengan import `eq`.
- Sesuaikan select agar efisien.

**1.2. `src/lib/types.ts`** — tidak ada perubahan (sudah type-safe string ISO).

**1.3. `src/db/migrate.ts`** — sudah OK (CREATE TABLE IF NOT EXISTS idempotent → aman untuk Turso). Hanya rapikan import `db` dari `@/lib/db`.

**1.4. Tambah helper baru `src/lib/id.ts`** — `cuid`-like generator (digunakan banyak route saat create):
```ts
export function newId(prefix = 'u'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(16).slice(2,10)}`
}
```

---

## Bagian 2 — Migrasi 16 API Routes ke Drizzle

Konvensi konversi yang akan diterapkan konsisten:
| Prisma | Drizzle |
|---|---|
| `db.x.findUnique({where:{id}})` | `db.select().from(x).where(eq(x.id,id)).limit(1)` → ambil `[0] ?? null` |
| `db.x.findFirst({where:{a,b}})` | `db.select().from(x).where(and(eq(x.a,a),eq(x.b,b))).limit(1)` |
| `db.x.findMany({where,orderBy,include:{rel}})` | query utama + query relasi manual + join di JS |
| `db.x.create({data})` | `db.insert(x).values({...}).returning()` |
| `db.x.update({where,data})` | `db.update(x).set({...}).where(...).returning()` |
| `db.x.count({where})` | `db.select({count:count()}).from(x).where(...)` |
| `db.x.aggregate({_max:{f}})` | `db.select({m:max(x.f)}).from(x).where(...)` |
| `db.x.groupBy({by,_count})` | `db.select({by,count()}).from(x).where(...).groupBy(...)` |
| `db.$transaction([...])` | `db.transaction(async (tx) => { ... })` |

**Konversi Date** (karena di SQLite Drizzle semua disimpan `text` ISO):
- Insert: `new Date()` → `new Date().toISOString()`; objek Date lain → `.toISOString()`.
- Read: `row.startTime` → `new Date(row.startTime)` sebelum panggil `.getTime()` / `.toISOString()`.
- Boolean `qrVerified`/`verified`/`used` → integer 0/1; konversi `!!row.verified` saat baca.

Route yang akan dikonversi (16 file):
1. `api/auth/student/route.ts`
2. `api/auth/teacher/route.ts`
3. `api/extension-requests/route.ts`
4. `api/extension-requests/[id]/review/route.ts` (pakai `db.transaction`)
5. `api/reports/course/route.ts` (multi-query + join manual di JS)
6. `api/sessions/route.ts` (aggregate `max(sessionNumber)` + group-by day di JS)
7. `api/sessions/bulk/route.ts` (aggregate + loop insert)
8. `api/sessions/[id]/attendance/route.ts` (count, findUnique compound → query dengan `and()`)
9. `api/sessions/[id]/attendees/route.ts`
10. `api/sessions/[id]/capacity/route.ts`
11. `api/sessions/[id]/excused/route.ts`
12. `api/sessions/[id]/qr/route.ts`
13. `api/sessions/[id]/status/route.ts`
14. `api/student/calendar/route.ts`
15. `api/student/dashboard/route.ts` (groupBy attendeeCount)
16. `api/students/route.ts` (join course + quotaExtensions + attendance di JS)
17. `api/students/[id]/extend/route.ts` (pakai `db.transaction`)

Untuk relasi (mis. `student.course`, `attendance.student`), lakukan query kedua setelah query utama, lalu gabung di memori JS — menjaga parity output JSON dengan versi Prisma agar **frontend tidak perlu diubah**.

---

## Bagian 3 — Cleanup Prisma (Bersih Total)

**Hapus file/folder:**
- `prisma/` (schema.prisma, db/, seed.ts)
- `src/generated/client/` (seluruh generated Prisma client)
- `prisma.config.ts`
- `seed-direct.ts`

**Edit `package.json`:**
- Hapus deps: `prisma`, `@prisma/client`, `@prisma/adapter-libsql`, `sqlite3` (tidak dipakai, libsql yang dipakai).
- Hapus scripts: `db:push`, `db:generate`, `db:migrate`, `db:reset`.
- Tambah scripts baru:
  - `"db:generate": "drizzle-kit generate"` (opsional, untuk yang ingin migration files)
  - `"db:migrate": "drizzle-kit migrate"` (opsional)

**Edit `next.config.ts`:**
- Hapus `'@prisma/adapter-libsql'` dari `serverExternalPackages`. Biarkan `'@libsql/client'`.

**`.gitignore`:** tambahkan entry `db/*.db` tetap; pastikan `src/generated/` tidak pernah re-appear.

Setelah ini jalankan `bun install` agar `bun.lock` & `node_modules` sinkron dengan package.json baru.

---

## Bagian 4 — Tulis Ulang SETUP.md (relevan untuk Drizzle)

Rewrite konten supaya konsisten:
- Bagian 3 "Generate Prisma Client & Push Schema" → hilangkan. Ganti dengan: tabel otomatis dibuat saat pertama kali `/api/setup` dipanggil (CREATE TABLE IF NOT EXISTS). Tidak perlu langkah generate.
- Bagian 4.2 "Push Schema Prisma ke Turso" → hapus; untuk Turso cukup set `DATABASE_URL` libsql:// + `DATABASE_AUTH_TOKEN`, lalu POST /api/setup.
- Bagian 8 Command Reference → hapus semua `prisma ...`, ganti dengan `drizzle-kit generate/migrate` (opsional).
- Troubleshooting → hapus referensi `@prisma/adapter-libsql`, tambahkan tips Drizzle.
- Struktur File → hapus folder `prisma/`, hapus `src/generated/`, tambah `src/db/schema.ts` & `src/db/migrate.ts`. Keterangan `lib/db.ts` → "Drizzle client".

---

## Bagian 5 — Verifikasi & Build

1. `bun install` (sinkronisasi dependencies baru).
2. `bun run lint` (cek error sintaks/types).
3. `bun run build` (verifikasi compile & standalone output jalan).
4. Jalankan dev server sekali, hit `GET /api/setup` lalu `POST /api/setup` untuk verifikasi tabel terbentuk & seed berhasil.
5. Cek ulang apakah ada import Prisma tersisa: `grep -r "prisma\|@prisma" src --include="*.ts" --include="*.tsx"` harus kosong.

---

## Yang TIDAK Diubah
- Semua file di `src/components/`, `src/hooks/`, `src/lib/api-client.ts`, `src/lib/security.ts`, `src/lib/types.ts` (frontend tidak terdampak — JSON shape dijaga sama).
- `src/app/page.tsx`, `src/app/layout.tsx`.
- `Dockerfile`, `docker-compose.yml`, `Caddyfile` (di luar scope migrasi; sudah disingkirkan dari SETUP sebelumnya).
- Tidak mengubah DB Turso existing (CREATE TABLE IF NOT EXISTS idempotent & non-destructive).

---

## Urutan Eksekusi
1. Buat helper `src/lib/id.ts` + perbaiki `src/lib/auth.ts`.
2. Migrasi route satu-per-satu (cek parity field).
3. Hapus file/folder Prisma + edit package.json + next.config.ts.
4. `bun install`.
5. Rewrite SETUP.md.
6. Build & test.

Setelah selesai, project siap di-push ke GitHub dan auto-deploy ke Vercel (env vars Turso sudah Anda set sebelumnya). Setup awal cukup dengan `curl -X POST https://<app>.vercel.app/api/setup`.