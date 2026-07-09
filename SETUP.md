# 📖 SETUP.md — Panduan Setup Lengkap PTE Attendance System

> Dokumen ini berisi **semua yang dibutuhkan** untuk menyiapkan, menjalankan, dan mendeploy
> aplikasi PTE Attendance dari nol hingga production.

---

## 📋 Daftar Isi

1. [Requirement Sistem](#1-requirement-sistem)
2. [Instalasi Tools](#2-instalasi-tools)
3. [Setup Development (Lokal)](#3-setup-development-lokal)
4. [Database](#4-database)
5. [Seed Data](#5-seed-data)
6. [Environment Variables](#6-environment-variables)
7. [Menjalankan Aplikasi](#7-menjalankan-aplikasi)
8. [Akun Default](#8-akun-default)
9. [Deployment — Vercel + Turso (GRATIS)](#9-deployment--vercel--turso-gratis)
10. [Deployment — Railway ($5/bulan)](#10-deployment--railway-5bulan)
11. [Deployment — VPS + Docker ($3-5/bulan)](#11-deployment--vps--docker-3-5bulan)
12. [Domain & SSL](#12-domain--ssl)
13. [Manajemen Production](#13-manajemen-production)
14. [Backup & Restore Database](#14-backup--restore-database)
15. [Troubleshooting](#15-troubleshooting)
16. [Arsitektur & API Endpoints](#16-arsitektur--api-endpoints)

---

## 1. Requirement Sistem

### Spesifikasi Minimum
| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | Windows 10+, macOS 12+, Ubuntu 20.04 | Ubuntu 22.04 LTS |
| RAM | 512 MB | 1 GB+ |
| Disk | 1 GB | 5 GB+ |
| CPU | 1 core | 2 core |

### Software yang Harus Terinstall

| Software | Versi | Kebutuhan | Untuk |
|----------|-------|-----------|-------|
| **Git** | 2.30+ | Wajib | Version control |
| **Bun** | 1.0+ | Wajib (dev) | Package manager, runtime |
| **Node.js** | 20+ | Wajib (production) | Runtime Next.js |
| **Docker** | 24+ | Opsional (VPS) | Container deployment |
| **Docker Compose** | 2.20+ | Opsional (VPS) | Multi-container |

---

## 2. Instalasi Tools

### 2.1 Git

```bash
# === Ubuntu / Debian ===
sudo apt update && sudo apt install -y git
git --version

# === macOS ===
brew install git

# === Windows ===
# Download dari https://git-scm.com/download/win
```

### 2.2 Bun (Package Manager & Runtime)

```bash
# === Linux & macOS (rekomendasi) ===
curl -fsSL https://bun.sh/install | bash

# === Windows (via PowerShell) ===
powershell -c "irm bun.sh/install.ps1 | iex"

# === Verifikasi ===
bun --version

# === Konfigurasi (opsional) ===
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### 2.3 Node.js 20 (untuk production build)

```bash
# Bun sudah include Node.js runtime. Jika butuh Node.js standalone:

# === Via NodeSource (Ubuntu/Debian) ===
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# === Via nvm (rekomendasi, multi-version) ===
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version  # v20.x.x
```

### 2.4 Docker & Docker Compose

```bash
# === Linux (Ubuntu/Debian) — Install resmi ===
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout dan login ulang agar group berlaku

# === Verifikasi ===
docker --version
docker compose version

# === macOS ===
brew install --cask docker
# Buka aplikasi Docker Desktop

# === Windows ===
# Download Docker Desktop dari https://www.docker.com/products/docker-desktop/
```

### 2.5 Vercel CLI

```bash
# Install global
npm install -g vercel

# Login (akan buka browser)
vercel login

# Verifikasi
vercel whoami
```

### 2.6 Turso CLI (database cloud)

```bash
# Install
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Verifikasi
turso auth whoami
turso db list
```

### 2.7 Caddy (reverse proxy + auto SSL)

```bash
# === Linux (Ubuntu/Debian) ===
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Verifikasi
caddy version
```

---

## 3. Setup Development (Lokal)

### 3.1 Clone / Download Project

```bash
# Jika dari GitHub:
git clone https://github.com/USERNAME/pte-attendance.git
cd pte-attendance

# Jika dari folder/zip:
# Ekstrak dan masuk ke folder project
cd pte-attendance
```

### 3.2 Install Dependencies

```bash
bun install
```

### 3.3 Setup Database

```bash
# Buat folder database (jika belum ada)
mkdir -p db

# Generate Prisma Client
bun run db:generate

# Push schema ke database (buat tabel otomatis)
bun run db:push
```

### 3.4 Seed Data (Opsional — data demo)

```bash
# Jalankan seed script (membuat 10 siswa demo, 4 admin, 189 sesi, 21 hari)
npx tsx prisma/seed.ts

# ATAU gunakan setup API (minimal — 2 admin + 5 siswa, tanpa sesi)
# Setelah server jalan, buka: GET http://localhost:3000/api/setup
# Lalu POST ke: http://localhost:3000/api/setup
```

### 3.5 Jalankan Development Server

```bash
bun run dev
# Buka http://localhost:3000
```

---

## 4. Database

### 4.1 Arsitektur Database

Aplikasi menggunakan **Prisma ORM** dengan dukungan 2 mode database:

| Mode | Database | Cocok Untuk | Biaya |
|------|----------|-------------|-------|
| **Local SQLite** | File `db/custom.db` | Development, VPS | Gratis |
| **Turso Cloud** | libSQL (SQLite-compatible) | Vercel, serverless | Free tier cukup |

Switching antara keduanya cukup ubah `DATABASE_URL` di `.env`:

```bash
# Local SQLite (default):
DATABASE_URL=file:db/custom.db

# Turso Cloud:
DATABASE_URL=libsql://pte-attendance-USERNAME.turso.io
DATABASE_AUTH_TOKEN=your-auth-token
```

### 4.2 Commands Database

```bash
# === Prisma CLI ===

# Generate Prisma Client (setelah ubah schema)
bun run db:generate

# Push schema ke database (buat/ubah tabel tanpa migration file)
bun run db:push

# Buat migration (untuk production, punya history)
bun run db:migrate

# Reset database (HAPUS SEMUA DATA, lalu push schema ulang)
bun run db:migrate reset

# Buka database shell (SQLite)
sqlite3 db/custom.db

# === Query langsung via Prisma Studio (GUI) ===
npx prisma studio
# Buka http://localhost:5555
```

### 4.3 Setup Turso Cloud (opsional)

```bash
# 1. Buat database
turso db create pte-attendance

# 2. Lihat connection URL
turso db show pte-attendance --url
# Output: libsql://pte-attendance-USERNAME.turso.io

# 3. Buat auth token
turso db tokens create pte-attendance
# Output: token panjang — SIMPAN, hanya ditampilkan sekali!

# 4. Push schema ke Turso
DATABASE_URL="libsql://pte-attendance-USERNAME.turso.io" \
DATABASE_AUTH_TOKEN="your-token-here" \
npx prisma db push

# 5. Verifikasi
turso db shell pte-attendance ".tables"
```

### 4.4 Schema Overview

```
┌─────────────┐     ┌──────────┐     ┌─────────────┐
│  AdminUser  │─────┤  Course  │◄────┤   Student   │
│  (teacher/  │     │          │     │  (quota     │
│   admin)    │     └────┬─────┘     │  personal)  │
└──────┬──────┘          │           └──────┬──────┘
       │                 │                  │
       │          ┌──────┴──────┐    ┌──────┴──────┐
       │          │   Session   │    │  Attendance  │
       │          │ (multi/day │    │  (1/day     │
       │          │  off+online)│    │  per student)│
       │          └──────┬──────┘    └─────────────┘
       │                 │
       │          ┌──────┴──────┐
       │          │  QrToken   │
       │          │ (rotating) │
       │          └─────────────┘
       │
┌──────┴──────────┐    ┌───────────────┐    ┌──────────────┐
│ QuotaExtension  │    │ExtensionRequest│   │  DeviceLog   │
│ (audit log)     │    │ (student→teacher)│ │ (anti-fraud) │
└─────────────────┘    └───────────────┘    └──────────────┘
```

---

## 5. Seed Data

### 5.1 Full Seed (Development)

```bash
npx tsx prisma/seed.ts
```

Membuat:
- **4 akun admin/teacher** (admin, pengajar, dimas, faisal)
- **1 course** (PTE Academic Speaking Batch A)
- **10 siswa** dengan kuota bervariasi (7–20 sesi)
- **189 sesi** selama 21 hari (9 sesi/hari: 4 offline + 5 online)
- **~50 record kehadiran** (distribusi acak di hari-hari sebelumnya)
- **2 audit log** perpanjangan kuota
- **PTE009 (Bayu)** kuota EXHAUSTED — untuk demo flow perpanjangan
- **PTE006 (Putri)** kuota hampir habis — untuk demo warning

### 5.2 Minimal Setup (Production)

Setelah deploy, buka browser:

```bash
# Cek status database
curl https://domain-anda.com/api/setup

# Jika needsSetup: true, jalankan setup:
curl -X POST https://domain-anda.com/api/setup
```

Akan membuat:
- **2 admin** (admin/admin123, pengajar/pengajar123)
- **1 course** (PTE Academic Preparation)
- **5 siswa demo** (PTE001–PTE005, PIN = 0001–0005)

### 5.3 Custom Seed

Edit `prisma/seed.ts` sesuai kebutuhan, lalu jalankan:

```bash
npx tsx prisma/seed.ts
```

Yang biasanya perlu diubah:
- Daftar teacher (username, password, nama)
- Koordinat lokasi kursus (`locationLat`, `locationLng`)
- Nama/kuota siswa
- Jam sesi offline/online
- Platform online (Google Meet/Discord/Zoom link)

---

## 6. Environment Variables

### 6.1 Daftar Variabel

| Variabel | Wajib? | Default | Keterangan |
|----------|--------|---------|------------|
| `DATABASE_URL` | ✅ | `file:db/custom.db` | Koneksi database |
| `DATABASE_AUTH_TOKEN` | Hanya Turso | — | Token Turso Cloud |
| `AUTH_SECRET` | ⚠️ Production | `pte-attendance-...` | Secret untuk session cookie. **WAJIB diubah di production!** |
| `ZAI_API_KEY` | Opsional | — | API key untuk selfie VLM verification (z-ai-web-dev-sdk) |

### 6.2 File .env (Development)

```bash
# Copy dari contoh
cp .env.example .env

# ATAU buat manual:
cat > .env << 'EOF'
# Database
DATABASE_URL=file:db/custom.db

# Auth secret (development bisa default, production HARUS diganti)
AUTH_SECRET=pte-attendance-auth-key-2024

# Opsional: Selfie AI verification
# ZAI_API_KEY=your-api-key
EOF
```

### 6.3 Generate AUTH_SECRET yang Aman

```bash
# Linux / macOS
openssl rand -base64 32
# Output contoh: a3Bf9xK2mN7pQ4rS8vW1yZ6cE0gH5jL=
```

---

## 7. Menjalankan Aplikasi

### 7.1 Development

```bash
# Jalankan dev server (hot-reload)
bun run dev
# → http://localhost:3000

# Cek kode quality
bun run lint
```

### 7.2 Production (lokal)

```bash
# Build
bun run build

# Jalankan production server
bun run start
# → http://localhost:3000

# ATAU gunakan Node.js langsung:
NODE_ENV=production node .next/standalone/server.js
```

### 7.3 NPM Scripts Reference

| Command | Fungsi |
|---------|--------|
| `bun run dev` | Development server (port 3000, hot-reload) |
| `bun run build` | Build untuk production |
| `bun run start` | Jalankan production build |
| `bun run lint` | Cek kode quality (ESLint) |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:push` | Push schema ke database |
| `bun run db:migrate` | Buat migration |
| `bun run db:reset` | Reset database (HAPUS DATA) |

---

## 8. Akun Default

### 8.1 Setelah Full Seed (`npx tsx prisma/seed.ts`)

#### Teacher / Admin

| Username | Password | Nama | Role |
|----------|----------|------|------|
| `admin` | `admin123` | Admin Kursus | Admin |
| `pengajar` | `pengajar123` | Bu Rina (Pengajar PTE) | Teacher |
| `dimas` | `dimas123` | Mr Dimas | Teacher |
| `faisal` | `faisal123` | Mr Faisal | Teacher |

#### Siswa

| Kode | PIN | Nama | Kuota | Status |
|------|-----|------|-------|--------|
| `PTE001` | `0001` | Andi Pratama | 18 sesi | Sehat (6/18) |
| `PTE002` | `0002` | Siti Nurhaliza | 15 sesi | Sehat (4/15) |
| `PTE003` | `0003` | Budi Santoso | 12 sesi | Sedang (7/12) |
| `PTE004` | `0004` | Dewi Lestari | 20 sesi | Sehat (7/20) |
| `PTE005` | `0005` | Rizky Ramadhan | 10 sesi | ⚠️ Hampir habis (7/10) |
| `PTE006` | `0006` | Putri Maharani | 8 sesi | ⚠️ Hampir habis (7/8) |
| `PTE007` | `0007` | Fajar Nugroho | 15 sesi | Sehat (2/15) |
| `PTE008` | `0008` | Indah Permata | 14 sesi | Sedang (7/14) |
| `PTE009` | `0009` | Bayu Setiawan | 7 sesi | 🔴 HABIS (7/7) |
| `PTE010` | `0010` | Citra Ayu | 20 sesi | Sehat (5/20) |

### 8.2 Setelah Minimal Setup (`POST /api/setup`)

| Username | Password | Nama | Role |
|----------|----------|------|------|
| `admin` | `admin123` | Administrator | Admin |
| `pengajar` | `pengajar123` | Pengajar PTE | Teacher |

| Kode | PIN | Nama | Kuota |
|------|-----|------|-------|
| `PTE001` | `0001` | Andi Pratama | 15 |
| `PTE002` | `0002` | Budi Santoso | 12 |
| `PTE003` | `0003` | Cinta Dewi | 20 |
| `PTE004` | `0004` | Dimas Aji | 10 |
| `PTE005` | `0005` | Eka Putri | 10 |

---

## 9. Deployment — Vercel + Turso (GRATIS)

**Biaya: $0/bulan** | Cocok untuk: pemula, tidak mau urus server

### 9.1 Persiapan Akun

1. **Vercel** — daftar di https://vercel.com (pakai GitHub login)
2. **Turso** — daftar di https://turso.tech
3. **GitHub** — buat repo untuk project ini

### 9.2 Setup Database Turso

```bash
# Login Turso
turso auth login

# Buat database
turso db create pte-attendance

# Simpan URL dan token
turso db show pte-attendance --url
# → libsql://pte-attendance-USERNAME.turso.io

turso db tokens create pte-attendance
# → Simpan token ini!

# Push schema
DATABASE_URL="libsql://pte-attendance-USERNAME.turso.io" \
DATABASE_AUTH_TOKEN="token-anda" \
npx prisma db push

# Verifikasi
turso db shell pte-attendance "SELECT name FROM sqlite_master WHERE type='table';"
```

### 9.3 Upload ke GitHub

```bash
cd pte-attendance

# Inisialisasi git (jika belum)
git init
git add .
git commit -m "Initial commit: PTE Attendance System"

# Buat repo di GitHub, lalu:
git remote add origin https://github.com/USERNAME/pte-attendance.git
git branch -M main
git push -u origin main
```

### 9.4 Deploy ke Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (pertama kali — akan tanya konfigurasi)
cd pte-attendance
vercel

# Set environment variables
vercel env add DATABASE_URL production
# Masukkan: libsql://pte-attendance-USERNAME.turso.io

vercel env add DATABASE_AUTH_TOKEN production
# Masukkan: token dari Langkah 9.2

vercel env add AUTH_SECRET production
# Masukkan: output dari `openssl rand -base64 32`

# Deploy ke production
vercel --prod
```

### 9.5 Setup Data Awal

```bash
# Cek apakah butuh setup
curl https://nama-project-anda.vercel.app/api/setup

# Jika needsSetup: true, jalankan:
curl -X POST https://nama-project-anda.vercel.app/api/setup
```

### 9.6 Custom Domain (Opsional)

```bash
# Di Vercel Dashboard → Settings → Domains
# ATAU via CLI:
vercel domains add absensi.kursus-anda.com

# Di DNS provider, tambahkan CNAME record:
# absensi     CNAME     cname.vercel-dns.com
```

---

## 10. Deployment — Railway ($5/bulan)

**Biaya: ~$5/bulan** | Cocok untuk: paling mudah, tinggal klik

### 10.1 Persiapan

1. Daftar di https://railway.app (pakai GitHub login)
2. Upload project ke GitHub (sama seperti Langkah 9.3)

### 10.2 Deploy

```
1. Buka https://railway.app/dashboard
2. Klik "New Project"
3. Pilih "Deploy from GitHub repo"
4. Pilih repo pte-attendance
5. Railway otomatis mendeteksi Next.js dan mulai build
```

### 10.3 Set Environment Variables

```
Di Railway Dashboard → service pte-attendance → Variables:

DATABASE_URL = file:/data/custom.db
AUTH_SECRET = [output dari openssl rand -base64 32]
```

### 10.4 Tambah Persistent Volume

```
1. Di service pte-attendance → Settings → Volumes
2. Klik "New Volume"
3. Mount Path: /data
4. Size: 1 GB (cukup untuk ribuan siswa)
5. Klik "Save" → Railway akan auto-redeploy
```

### 10.5 Setup Data Awal

```bash
# Setelah deploy selesai, dapatkan URL dari Railway dashboard
# Contoh: https://pte-attendance-production.up.railway.app

curl -X POST https://pte-attendance-production.up.railway.app/api/setup
```

### 10.6 Kustom Domain (Opsional)

```
1. Di Railway → service → Settings → Networking → Generate Domain
2. ATAU pasang Cloudflare di depannya (gratis):
   - Daftar cloudflare.com
   - Tambah domain
   - Point ke Railway URL via CNAME
   - Auto SSL dari Cloudflare
```

---

## 11. Deployment — VPS + Docker ($3-5/bulan)

**Biaya: €3.29–5/bulan** | Cocok untuk: full control, paling murah jangka panjang

### 11.1 Beli VPS

| Provider | Harga | Spesifikasi | Link |
|----------|-------|-------------|------|
| **Hetzner Cloud** | €3.29/bln | 1 vCPU, 1GB RAM, 20GB SSD | https://hetzner.com/cloud |
| DigitalOcean | $4/bln | 1 vCPU, 512MB RAM, 10GB SSD | https://digitalocean.com |
| Vultr | $3.5/bln | 1 vCPU, 512MB RAM, 10GB SSD | https://vultr.com |
| Hostinger | $4.5/bln | 1 vCPU, 1GB RAM, 20GB SSD | https://hostinger.com/vps-hosting |

### 11.2 Setup Server (SSH)

```bash
# SSH ke VPS
ssh root@IP_SERVER_ANDA

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Caddy (reverse proxy + auto SSL)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy -y

# Install Git
apt install -y git

# Verifikasi
docker --version
docker compose version
caddy version
```

### 11.3 Upload Project

```bash
# === Opsi A: Via Git ===
cd /opt
git clone https://github.com/USERNAME/pte-attendance.git
cd pte-attendance

# === Opsi B: Via SCP (dari komputer lokal) ===
# Di komputer lokal:
scp -r ./pte-attendance root@IP_SERVER:/opt/
```

### 11.4 Configure & Deploy

```bash
cd /opt/pte-attendance

# Buat environment file
cat > .env.production << 'EOF'
DATABASE_URL=file:/app/db/custom.db
AUTH_SECRET=GANTI_INI_DENGAN_RANDOM_STRING
EOF

# Generate random secret
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env.production

# Build dan jalankan dengan Docker Compose
docker compose up -d --build

# Cek status
docker compose ps
docker compose logs -f app
```

### 11.5 Setup Data Awal

```bash
# Tunggu container berjalan (~30 detik), lalu:
curl -X POST http://localhost:3000/api/setup

# Verifikasi
curl http://localhost:3000/api/setup
# → {"needsSetup":false,"stats":{"admins":2,"students":5,...}}
```

### 11.6 Setup Caddy (Reverse Proxy + Auto SSL)

```bash
# Edit Caddyfile
nano /etc/caddy/Caddyfile
```

**Tanpa domain (IP langsung):**
```
:80 {
    reverse_proxy localhost:3000
}
```

**Dengan domain (auto SSL):**
```
absensi.kursus-anda.com {
    reverse_proxy localhost:3000
}
```

```bash
# Restart Caddy
systemctl restart caddy
systemctl enable caddy  # auto-start saat boot

# Verifikasi
curl http://localhost          # → harus redirect ke Next.js
curl https://absensi.kursus-anda.com  # → jika pakai domain
```

### 11.7 Firewall

```bash
# Hanya buka port yang diperlukan
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (Caddy)
ufw allow 443/tcp    # HTTPS (Caddy)
ufw enable

# Port 3000 TIDAK perlu dibuka ke publik (Caddy yang handle)
```

---

## 12. Domain & SSL

### 12.1 Beli Domain Murah

| Provider | Harga | Note |
|----------|-------|------|
| Cloudflare Registrar | ~$10/tahun | Paling murah untuk .com |
| Namecheap | ~$10/tahun | Promo sering |
| .id domain | ~$15/tahun | Via rumahweb.com, niagahoster |

### 12.2 Setup DNS

```
Di dashboard DNS provider, tambahkan:

Type    Name        Value                         TTL
────    ────        ─────                         ────
A       @           IP_SERVER_ANDA                300
A       www         IP_SERVER_ANDA                300
CNAME   absensi     cname.vercel-dns.com          300  (untuk Vercel)
```

### 12.3 SSL

| Platform | Auto SSL | Cara |
|----------|----------|------|
| **Vercel** | ✅ | Otomatis, tanpa konfigurasi |
| **Railway** | ❌ | Perlu Cloudflare di depannya |
| **VPS + Caddy** | ✅ | Otomatis via Let's Encrypt |

---

## 13. Manajemen Production

### 13.1 Update Aplikasi

#### Vercel (auto-deploy)
```bash
# Cukup push ke GitHub
git add .
git commit -m "update: deskripsi perubahan"
git push
# Vercel otomatis rebuild & deploy
```

#### Railway (auto-deploy)
```bash
# Sama seperti Vercel — push ke GitHub, Railway auto-deploy
git push
```

#### VPS (manual)
```bash
# Di server:
cd /opt/pte-attendance
git pull
docker compose up -d --build

# Atau dari komputer lokal:
ssh root@IP_SERVER "cd /opt/pte-attendance && git pull && docker compose up -d --build"
```

### 13.2 Monitoring

```bash
# === Docker (VPS) ===

# Cek container status
docker compose ps

# Lihat logs real-time
docker compose logs -f app

# Lihat 100 baris terakhir
docker compose logs --tail=100 app

# Cek resource usage
docker stats

# === Vercel CLI ===
vercel logs https://nama-project.vercel.app --follow

# === Railway ===
# Di dashboard: service → Logs
```

### 13.3 Restart Service

```bash
# === Docker (VPS) ===
docker compose restart app

# === Systemd (jika pakai native Node.js) ===
systemctl restart pte-attendance

# === Caddy restart ===
systemctl restart caddy
```

---

## 14. Backup & Restore Database

### 14.1 SQLite (VPS / Railway)

```bash
# === Backup ===
# Docker volume:
docker cp pte-attendance:/app/db/custom.db ./backup-$(date +%Y%m%d).db

# Lokal:
cp db/custom.db ./backup-$(date +%Y%m%d).db

# === Restore ===
docker cp ./backup-20260709.db pte-attendance:/app/db/custom.db
docker compose restart app
```

### 14.2 Turso Cloud

```bash
# === Export (backup) ===
turso db shell pte-attendance ".dump" > backup-$(date +%Y%m%d).sql

# === Import (restore) ===
turso db shell pte-attendance < backup-20260709.sql

# === List databases ===
turso db list

# === Create replica (backup otomatis) ===
turso db replica create pte-attendance pte-attendance-backup
```

### 14.3 Auto-Backup (VPS Cron)

```bash
# Buat script backup
cat > /opt/pte-attendance/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/backups/pte-attendance"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker cp pte-attendance:/app/db/custom.db $BACKUP_DIR/custom_$DATE.db
# Simpan 7 hari terakhir
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
echo "[$DATE] Backup completed"
SCRIPT

chmod +x /opt/pte-attendance/backup.sh

# Tambah ke cron (backup setiap jam 2 pagi)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/pte-attendance/backup.sh >> /var/log/pte-backup.log 2>&1") | crontab -
```

---

## 15. Troubleshooting

### 15.1 Database Error: "Unable to open the database file"

```bash
# Pastikan folder db ada
mkdir -p db

# Pastikan DATABASE_URL benar
# Local:    DATABASE_URL=file:db/custom.db
# Turso:    DATABASE_URL=libsql://...

# Cek file permission (VPS/Docker)
ls -la db/custom.db
# Harus readable oleh user yang menjalankan Node.js
```

### 15.2 Login Tidak Berpindah ke Dashboard

```
Sudah diperbaiki di versi terbaru.
Pastikan menggunakan code terbaru dari GitHub.
Cookie sekarang di-set langsung di NextResponse object.
```

### 15.3 Port 3000 Sudah Dipakai

```bash
# Cek proses yang menggunakan port 3000
lsof -i :3000
# ATAU
ss -tlnp | grep 3000

# Kill proses
kill -9 $(lsof -t -i:3000)

# ATAU gunakan port lain
PORT=3001 bun run dev
```

### 15.4 Build Gagal (Memory)

```bash
# VPS dengan RAM kecil (512MB), tambah swap:
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Lalu coba build lagi
docker compose up -d --build
```

### 15.5 Prisma Client Stale

```bash
# Jika ada error "PrismaClientInitializationError" setelah deploy:
npx prisma generate
# Lalu restart server
```

### 15.6 CORS / Cookie Error

```
Pastikan:
1. App diakses via domain yang sama (bukan IP campuran)
2. Cookie SameSite = 'lax' (sudah default)
3. Jika pakai proxy, pastikan header Host dan X-Forwarded-Proto ter-forward
```

---

## 16. Arsitektur & API Endpoints

### 16.1 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui, Framer Motion |
| Charts | Recharts |
| QR Code | html5-qrcode (scan) + qrcode (generate) |
| Database | Prisma ORM + SQLite / Turso (libSQL) |
| Auth | HTTP-only cookie (base64 JSON, scrypt hash) |
| Anti-fraud | HMAC QR, device fingerprint, geo-fence, PIN |
| Icons | Lucide React |

### 16.2 API Endpoints

| Method | Endpoint | Auth | Fungsi |
|--------|----------|------|--------|
| `GET` | `/api/me` | — | Cek sesi saat ini |
| `POST` | `/api/auth/student` | — | Login siswa (code + PIN) |
| `POST` | `/api/auth/teacher` | — | Login pengajar (username + password) |
| `POST` | `/api/auth/logout` | — | Logout |
| `GET` | `/api/student/dashboard` | Student | Data dashboard siswa |
| `GET` | `/api/student/calendar` | Student | Data kalender 3 bulan |
| `GET` | `/api/sessions` | — | List sesi (filter tanggal/mode) |
| `POST` | `/api/sessions` | Teacher | Buat sesi baru |
| `POST` | `/api/sessions/bulk` | Teacher | Buat banyak sesi sekaligus |
| `GET` | `/api/sessions/[id]/qr` | Teacher | Data QR dinamis |
| `POST` | `/api/sessions/[id]/attendance` | Student | Proses absensi |
| `GET` | `/api/sessions/[id]/attendees` | Teacher | Daftar hadir per sesi |
| `PATCH` | `/api/sessions/[id]/status` | Teacher | Ubah status sesi |
| `POST` | `/api/sessions/[id]/excused` | Teacher | Tandai izin |
| `GET` | `/api/students` | Teacher/Admin | List semua siswa + kuota |
| `POST` | `/api/students/[id]/extend` | Teacher/Admin | Extend kuota siswa |
| `GET` | `/api/extension-requests` | Teacher/Admin | List permintaan perpanjangan |
| `POST` | `/api/extension-requests/[id]/review` | Teacher/Admin | Approve/deny permintaan |
| `POST` | `/api/verify-selfie` | Student | Verifikasi selfie AI |
| `GET` | `/api/reports/course` | Teacher/Admin | Statistik laporan |
| `GET` | `/api/setup` | — | Cek status setup |
| `POST` | `/api/setup` | — | Setup data awal (hanya sekali) |

### 16.3 Anti-Fraud Layers

| # | Layer | Deskripsi |
|---|-------|-----------|
| 1 | **QR Dinamis** | QR code berubah tiap 20 detik, di-signed HMAC |
| 2 | **PIN Sesi** | 6-digit PIN unik per sesi, diberikan pengajar |
| 3 | **Geo-fencing** | Offline: harus dalam 150m dari lokasi kursus |
| 4 | **Device Fingerprint** | Deteksi multiple akun di 1 perangkat |
| 5 | **Selfie AI** | Opsional: verifikasi wajah via VLM |
| 6 | **Time Window** | Hanya bisa absen 10 menit sebelum – 20 menit sesudah mulai |

---

## 📌 Quick Reference Card

```bash
# === DEVELOPMENT ===
bun install                    # Install dependencies
bun run db:push               # Buat tabel database
npx tsx prisma/seed.ts        # Isi data demo
bun run dev                   # Jalankan development server

# === DEPLOY (VPS) ===
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env.production
docker compose up -d --build  # Build & deploy
curl -X POST http://localhost:3000/api/setup  # Setup data awal

# === DEPLOY (VERCEL) ===
vercel                        # Deploy
vercel env add DATABASE_URL   # Set env vars
vercel --prod                 # Production deploy

# === BACKUP ===
docker cp pte-attendance:/app/db/custom.db ./backup.db
```