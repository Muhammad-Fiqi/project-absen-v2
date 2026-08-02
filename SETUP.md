# PTE Attendance — Panduan Setup Lengkap (Windows + Vercel + Turso)

Panduan ini mencakup **seluruh proses** dari nol sampai aplikasi berjalan online, dengan fokus **Windows saja** (tanpa WSL, tanpa Turso CLI).
Teknologi yang digunakan: **Bun** (runtime), **Next.js App Router** (framework), **Drizzle ORM** (database ORM), **Vercel** (hosting), **Turso** (database cloud SQLite).

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Instalasi Bun](#2-instalasi-bun)
3. [Setup Project Lokal](#3-setup-project-lokal)
4. [Registrasi & Setup Turso (Database Cloud)](#4-registrasi--setup-turso-database-cloud)
5. [Registrasi & Setup Vercel (Hosting)](#5-registrasi--setup-vercel-hosting)
6. [Deploy ke Vercel](#6-deploy-ke-vercel)
7. [Seeding & Impor Data Siswa](#7-seeding--impor-data-siswa)
8. [Command Referensi Cepat](#8-command-referensi-cepat)
9. [Troubleshooting](#9-troubleshooting)
10. [Bersihkan File Tidak Digunakan](#10-bersihkan-file-tidak-digunakan)

---

## 1. Prasyarat

Yang perlu dipersiapkan:

| Kebutuhan | Versi Minimum | Keterangan |
|-----------|--------------|------------|
| Git | 2.30+ | Version control |
| Bun | 1.2+ | JavaScript runtime (pengganti Node/npm/yarn) |
| Akun GitHub | — | Untuk push kode ke Vercel |
| Akun Turso | — | Database cloud SQLite (gratis) |
| Akun Vercel | — | Hosting (gratis untuk hobby) |

> **PENTING:** Panduan ini menggunakan **Bun** dan **Drizzle ORM**. Jangan campur dengan npm, yarn, pnpm, atau Prisma.

---

## 2. Instalasi Bun

### Windows (CMD / PowerShell)

```cmd
powershell -c "irm bun.sh/install.ps1 | iex"
```

Setelah terinstal, **tutup dan buka ulang** CMD/PowerShell, lalu cek:

```cmd
bun --version
```

### Windows (WSL Ubuntu)

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### macOS / Linux

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Git Check

```cmd
git --version
```

Jika belum ada, download dari https://git-scm.com/download/win

---

## 3. Setup Project Lokal (Windows saja)

### Clone Repository

**CMD (Windows):**
```cmd
cd C:\Projects
git clone https://github.com/USERNAME/pte-attendance.git
cd pte-attendance
```

### Install Dependencies

```cmd
bun install
```

### Setup Database Lokal (untuk development)

Buat folder database (jika belum ada):

```cmd
mkdir db
```

Buat file `.env` di root project:

```env
# Untuk development lokal (SQLite file)
DATABASE_TURSO_DATABASE_URL="file:db/custom.db"
# DATABASE_TURSO_AUTH_TOKEN="" (kosongkan untuk SQLite lokal)
AUTH_SECRET="secret-acak-anda"
```

### Push Schema Drizzle ke Database Lokal

```cmd
bunx drizzle-kit push
```

> **Catatan:** Schema database didefinisikan pada `src/db/schema.ts` dan dikonfigurasikan di `drizzle.config.ts`.

### Jalankan Development Server

```cmd
bun run dev
```

Buka browser ke `http://localhost:3000`

### Seed Data & Impor Siswa (Development)

Jalankan seeding endpoint awal:

```cmd
curl -X POST http://localhost:3000/api/setup
```

Dan jalankan impor data siswa dari file `Student.csv`:

```cmd
bun run import:students
```

Akun demo:
- Admin: `admin` / `admin123`
- Pengajar: `pengajar` / `pengajar123`
- Siswa: `PTE001` / `0001` s/d `PTE005` / `0005` (atau sesuai `Student.csv`)

---

## 4. Registrasi & Setup Turso (Database Cloud)

Turso menyediakan database SQLite di cloud secara gratis (hingga 500 database, 9GB total).

### 4.1. Buat Database via Dashboard

1. Buka: https://turso.tech/app
2. Sign up / Login
3. Klik **Create Database**
   - Nama: `absen-ruangpte` (bebas, tetapi konsisten)
   - Region: pilih yang terdekat (misal: Singapore `sin` / AWS Tokyo `nrt`)
4. Setelah database dibuat, buka halaman database tersebut → **Settings**
5. Cari bagian **Connection info**
6. Copy **URL** (`libsql://...`)
7. Klik **Create Auth Token** dan copy **token**

Simpan 2 nilai ini:
- `DATABASE_TURSO_DATABASE_URL` → contoh: `libsql://absen-ruangpte-USERNAME.turso.io`
- `DATABASE_TURSO_AUTH_TOKEN` → string JWT token panjang

### 4.2. Push Schema Drizzle ke Turso Cloud

Buka file `.env` sementara (atau tambahkan ke variabel environment):

```env
DATABASE_TURSO_DATABASE_URL="libsql://absen-ruangpte-USERNAME.turso.io"
DATABASE_TURSO_AUTH_TOKEN="token-anda-disini"
```

Lalu jalankan push schema:

```cmd
bunx drizzle-kit push
```

> Pastikan `DATABASE_TURSO_DATABASE_URL` diawali `libsql://` agar driver Turso / `@libsql/client` aktif.

---

## 5. Registrasi & Setup Vercel (Hosting)

### 5.1. Buat Akun Vercel

1. Buka https://vercel.com/signup
2. Login dengan akun GitHub

### 5.2. Install Vercel CLI (Windows)

```cmd
bun add -g vercel
```

### 5.3. Login ke Vercel CLI

```cmd
vercel login
```

Pilih GitHub sebagai provider. Browser akan terbuka untuk otorisasi.

### 5.4. Set Environment Variables di Vercel

**Via Dashboard Vercel (direkomendasikan):**
1. Buka https://vercel.com/dashboard
2. Pilih project → **Settings** → **Environment Variables**
3. Tambahkan 3 variabel berikut (pilih Production & Development):
   - `DATABASE_TURSO_DATABASE_URL` = `libsql://absen-ruangpte-USERNAME.turso.io`
   - `DATABASE_TURSO_AUTH_TOKEN` = `token-anda-disini`
   - `AUTH_SECRET` = `secret-acak-anda`

Untuk membuat secret acak `AUTH_SECRET`:
```cmd
powershell -c "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])"
```

### 5.5. Konfigurasi Build di Vercel (`vercel.json`)

Di root project pastikan terdapat file `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "outputDirectory": ".next/standalone"
}
```

> **Catatan:** Pada Vercel Dashboard -> Settings -> Build & Development Settings, isi:
> - **Build Command:** `bun run build`
> - **Install Command:** `bun install`
> - **Output Directory:** `.next/standalone`

---

## 6. Deploy ke Vercel

### 6.1. Deploy Pertama Kali

Commit semua perubahan ke Git:

```cmd
git add .
git commit -m "initial commit: PTE attendance QR-only with Drizzle"
git push origin main
```

Lalu deploy via CLI:

```cmd
vercel --prod
```

Vercel akan memberikan URL seperti `https://pte-attendance.vercel.app`.

### 6.2. Setup Data di Production

Setelah deploy berhasil, jalankan seeding dan impor data di database Turso:

```bash
curl -X POST https://pte-attendance.vercel.app/api/setup
bun run import:students
```

---

## 7. Seeding & Impor Data Siswa

### Command Seeding & Import

| Tujuan | Command / Action |
|--------|------------------|
| Seed akun Admin, Pengajar, & Course | `curl -X POST http://localhost:3000/api/setup` |
| Import Data Siswa dari `Student.csv` | `bun run import:students` |

### Struktur Data `Student.csv`
File `Student.csv` di root project memiliki format:
`id, studentCode, name, email, phone, courseCode, courseId, pinHash, sessionQuota, quotaExtendedAt, quotaNote, createdAt`

Jalankan `bun run import:students` untuk menyelaraskan seluruh data siswa dari CSV ke database Drizzle/Turso.

---

## 8. Command Referensi Cepat

### Command Harian (Development)

| Kegunaan | Command |
|----------|---------|
| Install dependencies | `bun install` |
| Jalankan dev server | `bun run dev` |
| Cek linting kode | `bun run lint` |
| Push schema Drizzle ke DB | `bunx drizzle-kit push` |
| Import data siswa dari CSV | `bun run import:students` |

### Command Deploy

| Kegunaan | Command |
|----------|---------|
| Login Vercel | `vercel login` |
| Deploy production | `vercel --prod` |
| Deploy preview | `vercel` |

---

## 9. Troubleshooting

### Drizzle: "drizzle-kit push" gagal
1. Pastikan `DATABASE_TURSO_DATABASE_URL` sudah benar di `.env` (misal `file:db/custom.db` untuk lokal atau `libsql://...` untuk Turso).
2. Jika menggunakan Turso cloud, pastikan `DATABASE_TURSO_AUTH_TOKEN` tidak kosong dan masih valid di Turso dashboard.

### Vercel deploy gagal: Build error
1. Pastikan di Vercel Dashboard:
   - **Build Command:** `bun run build`
   - **Install Command:** `bun install`
2. Periksa log build di Vercel via CLI:
   ```bash
   vercel logs --prod
   ```

### Cookie & Auth Session
Login menggunakan JWT session dengan `AUTH_SECRET`. Jika mengalami masalah session expired / invalid cookie:
1. Pastikan `AUTH_SECRET` terisi di env Vercel.
2. Hapus cookie `pte_auth` pada browser dan login kembali.

---

## 10. Bersihkan File Tidak Digunakan

Untuk merapikan repository lokal:

```cmd
rmdir /s /q .zscript agent-ctx examples download skills .next
del Dockerfile docker-compose.yml .dockerignore Caddyfile DEPLOY.md
del db\custom.db db\custom.db-journal
```

---

## Struktur File Akhir (Production-Ready)

```
pte-attendance/
├── src/
│   ├── db/
│   │   └── schema.ts          # Schema database Drizzle (SQLite / Turso)
│   ├── app/
│   │   ├── api/               # API routes (auth, sessions, bulk, students, setup, etc)
│   │   ├── layout.tsx
│   │   └── page.tsx           # Halaman utama Next.js App Router
│   ├── components/
│   │   ├── pte/               # Komponen utama PTE (bulk-session-dialog, attendance, QR, etc)
│   │   └── ui/                # Component library (shadcn/ui)
│   └── lib/
│       ├── api-client.ts      # Fetch wrapper
│       ├── auth.ts            # Cookie session auth
│       ├── db.ts              # Drizzle ORM client (Turso/SQLite)
│       ├── security.ts        # QR crypto
│       └── utils.ts           # Helper utilities
├── scripts/
│   └── import-students.js     # Script impor data siswa dari Student.csv
├── public/
├── .env                       # Env lokal (TIDAK di-commit)
├── .gitignore
├── drizzle.config.ts          # Drizzle ORM config
├── next.config.ts
├── package.json
├── Student.csv                # Data siswa awal
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                # Vercel deployment config
```

---

## Ringkasan Arsitektur

```
┌──────────┐     QR Scan      ┌──────────────┐     Drizzle Query    ┌─────────┐
│  Siswa   │ ──────────────→  │  Vercel API  │ ──────────────────→  │  Turso  │
│ (Browser)│                  │  (Next.js)   │                      │ (SQLite) │
└──────────┘                  └──────┬───────┘                      └─────────┘
                                     │
┌──────────┐     Tampilkan QR ────────┤
│ Pengajar  │ ──────────────────────→  │
│ (Browser)│                          │
└──────────┘                          │
                                      │
                              ┌───────┴───────┐
                              │  Rotating QR  │
                              │  (20 detik)   │
                              └───────────────┘
```