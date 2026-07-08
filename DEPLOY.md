# ============ PTE Attendance System - Deploy Online ============

## 3 Opsi Deployment (pilih yang paling cocok)

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPSI 1: Vercel + Turso  [GRATIS - Rekomendasi]
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Biaya:** $0/bulan (free tier)
**Cocok untuk:** Pemula, tidak mau urus server

### Langkah 1: Upload ke GitHub
```bash
# Buat repo di github.com, lalu:
cd /path/to/pte-attendance
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/pte-attendance.git
git push -u origin main
```

### Langkah 2: Buat Database di Turso
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Buat database
turso db create pte-attendance

# Ambil URL dan Auth Token
turso db show pte-attendance --url
turso db tokens create pte-attendance

# Push schema ke Turso
turso db shell pte-attendance < prisma/schema.sql
# ATAU gunakan Prisma:
DATABASE_URL="libsql://pte-attendance-USERNAME.turso.io" \
DATABASE_AUTH_TOKEN="your-token" \
npx prisma db push
```

### Langkah 3: Deploy ke Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
# Masukkan: libsql://pte-attendance-USERNAME.turso.io

vercel env add DATABASE_AUTH_TOKEN
# Masukkan: token dari Langkah 2

vercel env add AUTH_SECRET
# Masukkan: string acak (bisa generate dengan: openssl rand -base64 32)

# Deploy ulang
vercel --prod
```

### Langkah 4: Seed Data (hanya pertama kali)
```bash
# Remote seed via Vercel
vercel env add SEED_ON_START=true
# Set ke "true", lalu redeploy
vercel --prod

# Setelah data ter-seed, hapus variabel:
vercel env rm SEED_ON_START
vercel --prod
```

### Kelebihan:
- ✅ 100% gratis (Vercel free tier + Turso free tier)
- ✅ Auto-SSL, CDN global
- ✅ Auto-deploy dari Git push
- ✅ Bisa handle ratusan siswa

### Kekurangan:
- ⚠️ Turso free tier: 9GB storage, 500M row reads/bulan
- ⚠️ Selfie VLM verification tidak tersedia (butuh server sendiri)


---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPSI 2: Railway  [$5/bulan - Paling Mudah]
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Biaya:** ~$5/bulan
**Cocok untuk:** Yang mau paling gampang, tanpa coding

### Langkah 1: Upload ke GitHub
(Sama seperti Opsi 1, Langkah 1)

### Langkah 2: Deploy ke Railway
1. Buka https://railway.app
2. Sign in dengan GitHub
3. Klik **"New Project"** → **"Deploy from GitHub repo"**
4. Pilih repo `pte-attendance`
5. Railway otomatis mendeteksi Next.js

### Langkah 3: Set Environment Variables
Di Railway dashboard → Variables:
```
DATABASE_URL=file:/data/custom.db
AUTH_SECRET=your-random-secret-string
SEED_ON_START=true
```

### Langkah 4: Add Persistent Disk
Di Railway → service → Settings → Volumes:
- Mount path: `/data`
- Size: 1GB (cukup untuk ribuan siswa)

### Langkah 5: Redeploy
Setelah volume terpasang, Railway akan auto-redeploy.
Database akan persistent (tidak hilang saat restart).

### Kelebihan:
- ✅ Paling mudah (klik-klik saja)
- ✅ SQLite langsung jalan (persistent disk)
- ✅ No code changes needed
- ✅ Auto-deploy dari Git

### Kekurangan:
- ⚠️ $5/bulan
- ⚠️ Tidak ada built-in SSL (perlu Cloudflare di depannya)


---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPSI 3: VPS + Docker  [$3-5/bulan - Paling Fleksibel]
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Biaya:** $3-5/bulan (Hetzner / DigitalOcean / Vultr)
**Cocok untuk:** Yang mau full control, paling murah jangka panjang

### Langkah 1: Beli VPS
Rekomendasi murah:
| Provider | Harga | Spesifikasi |
|----------|-------|-------------|
| Hetzner Cloud | €3.29/bulan | 1 vCPU, 1GB RAM, 20GB SSD |
| DigitalOcean | $4/bulan | 1 vCPU, 512MB RAM, 10GB SSD |
| Vultr | $3.5/bulan | 1 vCPU, 512MB RAM, 10GB SSD |

### Langkah 2: Setup Server
```bash
# SSH ke VPS
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Caddy (reverse proxy + auto SSL)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy -y
```

### Langkah 3: Upload Project
```bash
# Di komputer lokal:
scp -r /path/to/pte-attendance root@YOUR_SERVER_IP:/root/

# Di VPS:
cd /root/pte-attendance
```

### Langkah 4: Build & Jalankan
```bash
cd /root/pte-attendance

# Set environment
echo "DATABASE_URL=file:/app/db/custom.db" > .env.production
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.production
echo "SEED_ON_START=true" >> .env.production

# Build Docker image
docker build -t pte-attendance .

# Jalankan container
docker run -d \
  --name pte-attendance \
  --restart unless-stopped \
  -p 3000:3000 \
  -v pte-data:/app/db \
  --env-file .env.production \
  pte-attendance

# Seed database (hanya pertama kali)
docker exec pte-attendance node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Import seed logic atau jalankan prisma db seed
"
```

### Langkah 5: Setup Caddy (Auto SSL)
```bash
# Edit Caddyfile
nano /etc/caddy/Caddyfile

# Isi dengan:
# absensi.yourdomain.com {
#     reverse_proxy localhost:3000
# }
# ATAU pakai IP langsung:
# :80 {
#     reverse_proxy localhost:3000
# }

# Restart Caddy
systemctl restart caddy
```

### Langkah 6: Setup Domain (opsional)
1. Beli domain murah (~$10/tahun di Namecheap/Cloudflare)
2. Point A record ke VPS IP
3. Update Caddyfile dengan domain
4. Caddy auto-generate SSL certificate (Let's Encrypt)

### Kelebihan:
- ✅ Paling murah jangka panjang
- ✅ Full control atas server
- ✅ SQLite persistent (tidak perlu database terpisah)
- ✅ Bisa tambah fitur lain (monitoring, backup, dll)
- ✅ Selfie VLM bisa diaktifkan

### Kekurangan:
- ⚠️ Perlu pengetahuan Linux dasar
- ⚠️ Harus manage server sendiri (update, backup)


---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## COMPARISON TABLE
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Aspek | Vercel+Turso | Railway | VPS+Docker |
|-------|-------------|---------|------------|
| **Biaya** | GRATIS | ~$5/bln | $3-5/bln |
| **Kesulitan** | ⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Auto SSL** | ✅ | ❌ (butuh Cloudflare) | ✅ (Caddy) |
| **Auto Deploy** | ✅ (Git push) | ✅ (Git push) | ❌ (manual) |
| **Persistent DB** | ✅ (Turso) | ✅ (Volume) | ✅ (Docker volume) |
| **Custom Domain** | ✅ | ✅ | ✅ |
| **Selfie VLM** | ❌ | ❌ | ✅ |
| **Scalability** | Tinggi | Sedang | Manual |
| **Maintenance** | Nihil | Rendah | Sedang |


---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## REKOMENDASI
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Mulai dari Vercel + Turso** (gratis, cukup untuk 50+ siswa)
2. Jika butuh self-hosted, pindah ke **Railway** ($5, paling gampang)
3. Jika butuh full control, gunakan **VPS Hetzner** (€3.29, paling murah)

Semua opsi sudah dikonfigurasi di codebase ini. Tinggal pilih dan deploy!