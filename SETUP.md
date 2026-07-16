# PTE Attendance — Panduan Setup Lengkap (Vercel + Turso)

Panduan ini mencakup **seluruh proses** dari nol sampai aplikasi berjalan online.
Teknologi yang digunakan: **Bun** (runtime), **Vercel** (hosting), **Turso** (database cloud).

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Instalasi Bun](#2-instalasi-bun)
3. [Setup Project Lokal](#3-setup-project-lokal)
4. [Registrasi & Setup Turso (Database Cloud)](#4-registrasi--setup-turso-database-cloud)
5. [Registrasi & Setup Vercel (Hosting)](#5-registrasi--setup-vercel-hosting)
6. [Deploy ke Vercel](#6-deploy-ke-vercel)
7. [Seeding Data Awal](#7-seeding-data-awal)
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

> **PENTING:** Panduan ini hanya menggunakan **Bun**. Jangan campur dengan npm, yarn, atau pnpm.

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
```

Setelah terinstal, muat ulang shell:

```bash
source ~/.bashrc
bun --version
```

### macOS / Linux

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Git (sudah ada di sebagian besar sistem)

**Windows CMD:**
```cmd
git --version
```

Jika belum ada, download dari https://git-scm.com/download/win

**WSL Ubuntu:**
```bash
sudo apt update && sudo apt install -y git
git --version
```

---

## 3. Setup Project Lokal

### Clone Repository

**CMD (Windows):**
```cmd
cd C:\Projects
git clone https://github.com/USERNAME/pte-attendance.git
cd pte-attendance
```

**WSL Ubuntu:**
```bash
cd ~/projects
git clone https://github.com/USERNAME/pte-attendance.git
cd pte-attendance
```

### Install Dependencies

```bash
bun install
```

### Setup Database Lokal (untuk development)

Buat folder database (jika belum ada):

```bash
mkdir -p db
```

Buat file `.env` di root project:

```bash
# Untuk development lokal (SQLite file)
DATABASE_URL=file:db/custom.db
```

### Generate Prisma Client & Push Schema

```bash
bunx prisma generate
bunx prisma db push
```

### Jalankan Development Server

```bash
bun run dev
```

Buka browser ke `http://localhost:3000`

### Seed Data Awal (Development)

Buka terminal baru, jalankan:

**CMD (Windows):**
```cmd
curl -X POST http://localhost:3000/api/setup
```

**WSL Ubuntu / macOS / Linux:**
```bash
curl -X POST http://localhost:3000/api/setup
```

Akun demo:
- Admin: `admin` / `admin123`
- Pengajar: `pengajar` / `pengajar123`
- Siswa: `PTE001` / `0001` s/d `PTE005` / `0005`

---

## 4. Registrasi & Setup Turso (Database Cloud)

Turso menyediakan database SQLite di cloud secara gratis (hingga 500 database, 9GB total).

### 4.1. Install Turso CLI

**Windows (CMD / PowerShell):**
```cmd
bun add -g @libsql/client
```

> Turso CLI tidak tersedia langsung di Windows CMD. Gunakan WSL atau manage database via dashboard Turso di https://turso.tech/app.

**WSL Ubuntu:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Cek instalasi:

**WSL Ubuntu:**
```bash
turso --version
```

### 4.2. Login ke Turso

**WSL Ubuntu:**
```bash
turso auth login
```

Browser akan terbuka untuk autentikasi. Jika di server tanpa browser:

```bash
turso auth api-tokens create pte-attendance --expiry 90d
```

Simpan token yang muncul.

### 4.3. Buat Database

**WSL Ubuntu:**
```bash
turso db create pte-attendance
```

Atau buat via dashboard: https://turso.tech/app/databases/new

### 4.4. Ambil Koneksi String

**WSL Ubuntu:**
```bash
turso db show pte-attendance --url
turso db tokens create pte-attendance
```

Atau via dashboard: klik database → Settings → Connection info

Simpan kedua nilai ini:
- `DATABASE_URL` → berbentuk `libsql://pte-attendance-USERNAME.turso.io`
- `DATABASE_AUTH_TOKEN` → token string panjang

### 4.5. Push Schema ke Turso

**WSL Ubuntu:**

Buat file `.env.production` sementara:

```bash
DATABASE_URL="libsql://pte-attendance-USERNAME.turso.io"
DATABASE_AUTH_TOKEN="token-anda-disini"
```

Lalu push schema:

```bash
bunx prisma db push
```

### 4.6. (Alternatif) Tanpa CLI — Gunakan Dashboard Turso

Jika kamu di Windows CMD tanpa WSL:

1. Buka https://turso.tech/app
2. Sign up / Login
3. Klik **"Create Database"** → nama: `pte-attendance` → region pilih yang terdekat
4. Setelah dibuat, klik database → **Settings**
5. Copy **URL** dan klik **"Create Auth Token"**
6. Gunakan URL dan token tersebut di langkah Vercel (bagian 5)

---

## 5. Registrasi & Setup Vercel (Hosting)

### 5.1. Buat Akun Vercel

1. Buka https://vercel.com/signup
2. Login dengan akun GitHub

### 5.2. Install Vercel CLI

**Windows CMD:**
```cmd
bun add -g vercel
```

**WSL Ubuntu:**
```bash
bun add -g vercel
```

### 5.3. Login ke Vercel CLI

**CMD / WSL:**
```bash
vercel login
```

Pilih GitHub sebagai provider. Browser akan terbuka untuk otorisasi.

### 5.4. Set Environment Variables di Vercel

**Via CLI (CMD / WSL):**
```bash
vercel env add DATABASE_URL production
# Paste: libsql://pte-attendance-USERNAME.turso.io

vercel env add DATABASE_AUTH_TOKEN production
# Paste: token-anda-disini

vercel env add AUTH_SECRET production
# Paste: buat secret acak, contoh:
```

Untuk membuat secret acak:

**CMD (Windows):**
```cmd
powershell -c "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])"
```

**WSL Ubuntu:**
```bash
openssl rand -base64 32
```

**Via Dashboard Vercel (alternatif):**
1. Buka https://vercel.com/dashboard
2. Pilih project → Settings → Environment Variables
3. Tambahkan:
   - `DATABASE_URL` = `libsql://pte-attendance-USERNAME.turso.io`
   - `DATABASE_AUTH_TOKEN` = `token-anda-disini`
   - `AUTH_SECRET` = `secret-acak-anda`

### 5.5. Konfigurasi Build di Vercel

Vercel otomatis mendeteksi Next.js. Tapi pastikan:

**Via CLI — buat file `vercel.json` di root project:**

```json
{
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "outputDirectory": ".next/standalone"
}
```

> **Catatan:** Vercel secara default menggunakan `npm`. Karena kita pakai Bun, perlu override di Settings → Build & Development Settings:
> - **Build Command:** `bun run build`
> - **Install Command:** `bun install`
> - **Output Directory:** `.next/standalone`

---

## 6. Deploy ke Vercel

### 6.1. Deploy Pertama Kali

**CMD / WSL:**

Pastikan sudah commit semua perubahan ke Git:

```bash
git add .
git commit -m "initial commit: PTE attendance QR-only"
git push origin main
```

Lalu deploy:

```bash
vercel --prod
```

Vercel akan memproses dan memberikan URL seperti `https://pte-attendance.vercel.app`.

### 6.2. Setup Database di Vercel (Pertama Kali)

Setelah deploy berhasil, seed database production:

```bash
curl -X POST https://pte-attendance.vercel.app/api/setup
```

### 6.3. Deploy Selanjutnya

Setiap ada perubahan kode:

```bash
git add .
git commit -m "deskripsi perubahan"
git push origin main
vercel --prod
```

Atau hubungkan GitHub repo ke Vercel dashboard agar auto-deploy saat push ke `main`.

---

## 7. Seeding Data Awal

### Development (lokal)

```bash
curl -X POST http://localhost:3000/api/setup
```

### Production (Vercel)

```bash
curl -X POST https://nama-app-anda.vercel.app/api/setup
```

### Apa yang Dibuat oleh Seed?

| Data | Jumlah | Detail |
|------|--------|--------|
| Course | 1 | PTE-2024-A "PTE Academic Preparation" |
| Admin | 2 | admin (role: admin), pengajar (role: teacher) |
| Siswa | 5 | PTE001–PTE005 |

Seed hanya berjalan sekali. Jika database sudah ada data, endpoint akan menolak.

---

## 8. Command Referensi Cepat

### Command Harian (Development)

| Kegunaan | Command |
|----------|---------|
| Install dependencies | `bun install` |
| Jalankan dev server | `bun run dev` |
| Cek kode quality | `bun run lint` |
| Push schema ke DB | `bunx prisma db push` |
| Generate Prisma client | `bunx prisma generate` |
| Reset database | `bunx prisma db push --force-reset` |

### Command Deploy

| Kegunaan | Command |
|----------|---------|
| Login Vercel | `vercel login` |
| Deploy production | `vercel --prod` |
| Deploy preview | `vercel` |
| Tambah env var | `vercel env add NAMA production` |
| Lihat env vars | `vercel env ls` |

### Command Turso (WSL Ubuntu saja)

| Kegunaan | Command |
|----------|---------|
| Login | `turso auth login` |
| Buat database | `turso db create pte-attendance` |
| Lihat URL | `turso db show pte-attendance --url` |
| Buat token | `turso db tokens create pte-attendance` |
| Lihat database list | `turso db list` |

---

## 9. Troubleshooting

### "prisma db push" gagal: table already exists

```bash
bunx prisma db push --force-reset
```

### Vercel deploy gagal: build error

Pastikan di Vercel dashboard:
- **Build Command:** `bun run build`
- **Install Command:** `bun install`

Jika masih gagal, cek `vercel logs`:

```bash
vercel logs --prod
```

### "Module not found: @prisma/adapter-libsql"

```bash
bun install
bunx prisma generate
```

### Database Turso connection error

1. Pastikan `DATABASE_URL` dimulai dengan `libsql://` (bukan `file:`)
2. Pastikan `DATABASE_AUTH_TOKEN` tidak kosong
3. Cek token masih valid di Turso dashboard

### Cookie tidak persist (login gagal)

Bug ini sudah diperbaiki. Pastikan menggunakan kode terbaru dari repo.

### QR Scanner tidak berfungsi di desktop

QR scanner membutuhkan kamera. Di desktop tanpa webcam, gunakan browser mobile atau webcam external.

---

## 10. Bersihkan File Tidak Digunakan

Setelah project siap untuk production, hapus folder/file berikut yang **tidak diperlukan** untuk deployment:

### Folder yang Bisa Dihapus

```bash
# Folder konfigurasi sandbox (tidak relevan untuk production)
rm -rf .zscript
rm -rf agent-ctx
rm -rf examples
rm -rf download
rm -rf skills

# Folder cache/build lokal
rm -rf .next
rm -rf node_modules/.cache
```

### File yang Bisa Dihapus

```bash
# Docker configs (tidak dipakai untuk Vercel deployment)
rm -f Dockerfile
rm -f docker-compose.yml
rm -f .dockerignore
rm -f Caddyfile

# Dokumen lama yang sudah digantikan oleh file ini
rm -f DEPLOY.md

# Environment file lokal (JANGAN hapus jika masih development)
# rm -f .env

# Database lokal (tidak dipakai di production yang pakai Turso)
rm -f db/custom.db
rm -f db/custom.db-journal
```

### Command Bersih Total (Copy-Paste)

**WSL Ubuntu / macOS / Linux:**
```bash
rm -rf .zscript agent-ctx examples download skills .next node_modules/.cache
rm -f Dockerfile docker-compose.yml .dockerignore Caddyfile DEPLOY.md
rm -f db/custom.db db/custom.db-journal
```

**CMD (Windows):**
```cmd
rmdir /s /q .zscript agent-ctx examples download skills .next
del Dockerfile docker-compose.yml .dockerignore Caddyfile DEPLOY.md
del db\custom.db db\custom.db-journal
```

### .gitignore yang Direkomendasikan

Pastikan file berikut ada di `.gitignore` (sudah ada di project ini):

```
node_modules/
.next/
db/*.db
db/*.db-journal
.env
.env.local
.env.production
*.log
```

---

## Struktur File Akhir (Production-Ready)

```
pte-attendance/
├── prisma/
│   └── schema.prisma          # Schema database
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Login/Logout
│   │   │   ├── sessions/      # CRUD sesi + QR
│   │   │   ├── student/       # Dashboard siswa
│   │   │   ├── students/      # Kelola siswa
│   │   │   ├── reports/       # Laporan
│   │   │   ├── extension-requests/ # Perpanjangan kuota
│   │   │   ├── setup/         # Seeding awal
│   │   │   └── me/            # Session check
│   │   ├── layout.tsx
│   │   └── page.tsx           # Halaman utama
│   ├── components/
│   │   ├── pte/               # Komponen bisnis
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/
│   └── lib/
│       ├── api-client.ts      # Fetch wrapper
│       ├── auth.ts            # Cookie session auth
│       ├── db.ts              # Prisma client (SQLite/Turso)
│       ├── security.ts        # QR crypto
│       ├── types.ts           # TypeScript types
│       └── utils.ts           # Helper functions
├── public/
├── .env                       # Env lokal (TIDAK di-commit)
├── .gitignore
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                # Vercel config
```

---

## Ringkasan Arsitektur

```
┌──────────┐     QR Scan      ┌──────────────┐     QR Verify     ┌─────────┐
│  Siswa   │ ──────────────→  │  Vercel API  │ ──────────────→  │  Turso  │
│ (Browser)│                  │  (Next.js)   │                  │ (SQLite) │
└──────────┘                  └──────┬───────┘                  └─────────┘
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

- **Siswa** scan QR → API verifikasi token → cek kuota + kapasitas + jendela waktu → simpan kehadiran
- **Pengajar** buka sesi → tampilkan QR yang berputar → pantau kehadiran real-time
- **Kapasitas** tiap sesi default 10 orang (bisa di-custom saat buat sesi)