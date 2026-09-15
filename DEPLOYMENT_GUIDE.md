# 🚀 Deployment Checklist - LAUNDRY.DASH v2.0

Aplikasi siap untuk deployment ke production (Netlify). Semua fitur kritis dan nilai tambah bisnis telah diimplementasikan.

## ✅ Fitur Lengkap yang Sudah Diimplementasikan

### Keamanan & Stabilitas
- [x] Autentikasi berbasis session dengan bcryptjs
- [x] Sanitasi input untuk mencegah XSS attack
- [x] Error handling & logging robust dengan level-based logging
- [x] Proteksi API berdasarkan role authentication
- [x] Unit tests (54 tests passing) untuk critical business logic

### Operasional
- [x] Pagination (20 items/halaman) dengan navigation UI
- [x] Pencarian real-time (nama, WhatsApp, layanan)
- [x] Filter berdasarkan status pesanan
- [x] Export data ke CSV untuk backup
- [x] Diskon fleksibel (0-100%) per pesanan
- [x] Catatan/catatan tambahan per pesanan
- [x] Cetak invoice/PDF profesional
- [x] Manajemen status lanjutan (Batal/Rusak dengan kompensasi)

### Business Intelligence
- [x] Dashboard analytics lengkap (pendapatan, trend, layanan populer)
- [x] Notifikasi WhatsApp otomatis (webhook-ready)
- [x] Customer history tracking
- [x] Logger module untuk monitoring & debugging

---

## 📋 Langkah Deployment Step-by-Step

### Step 1: Generate Password Hash Admin

Sebelum deploy, buat password hash untuk akun admin:

```bash
# Jalankan script generator
npm run generate-password -- "PasswordKuatAnda123!"

# Output akan seperti: $2b$10$xyz...
# Copy hash ini untuk step berikutnya
```

**Rekomendasi Password:**
- Minimal 12 karakter
- Kombinasi huruf besar, kecil, angka, simbol
- Jangan gunakan password default

### Step 2: Setup Environment Variables

Pilih salah satu cara:

#### Cara A: Via Netlify Dashboard (Recommended)
1. Buka Netlify Dashboard → Site Settings → Environment Variables
2. Tambahkan variables berikut:

| Variable | Value | Required |
|----------|-------|----------|
| `ADMIN_USERNAME` | `admin` (atau custom) | ✅ Ya |
| `ADMIN_PASSWORD_HASH` | `$2b$10$...` (dari Step 1) | ✅ Ya |
| `SESSION_SECRET` | Random string 32+ karakter | ✅ Ya |
| `SESSION_MAX_AGE` | `86400000` (24 jam) | Opsional |
| `LOG_LEVEL` | `production` | ✅ Ya |
| `WHATSAPP_API_KEY` | API key (jika pakai auto-notif) | Opsional |
| `WHATSAPP_PHONE_ID` | Phone ID WhatsApp Business | Opsional |

#### Cara B: Via File `.env.production` (Local Testing)
```bash
# .env.production
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$xyz...
SESSION_SECRET=my-super-secret-key-min-32-chars
SESSION_MAX_AGE=86400000
LOG_LEVEL=production
```

⚠️ **Jangan commit `.env.production` ke Git!** Sudah ada di `.gitignore`.

### Step 3: Deploy ke Netlify

#### Option A: Via Netlify CLI (Fastest)
```bash
# 1. Install CLI (jika belum)
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Link/Create site
netlify link          # Jika sudah ada site
# ATAU
netlify init          # Jika buat site baru

# 4. Deploy production
netlify deploy --prod
```

#### Option B: Via Git Integration (CI/CD)
1. **Push ke Repository:**
   ```bash
   git add .
   git commit -m "Production ready v2.0"
   git push origin main
   ```

2. **Connect di Netlify:**
   - Buka [Netlify Dashboard](https://app.netlify.com)
   - "Add new site" → "Import an existing project"
   - Pilih GitHub/GitLab repository
   - Branch: `main`
   - Build command: `npm run build`
   - Publish directory: `.next` (otomatis detect)

3. **Configure Environment Variables** di Netlify Dashboard

4. **Trigger Deploy:** Klik "Deploy site" atau push commit baru

#### Option C: Manual Deploy
```bash
# Build locally
npm run build

# Deploy folder .next
netlify deploy --prod --dir=.next
```

### Step 4: Verifikasi Post-Deployment

Setelah deploy berhasil, lakukan testing menyeluruh:

#### ✅ Critical Path Testing
- [ ] **Login**: Akses `/`, login dengan credentials admin
- [ ] **Create Order**: Tambah pesanan baru dengan diskon & catatan
- [ ] **Status Flow**: Update status: Antri → Diproses → Selesai → Diambil
- [ ] **Cancellation**: Batalkan pesanan dengan alasan & kompensasi
- [ ] **Search**: Cari pesanan berdasarkan nama/nomor WhatsApp
- [ ] **Filter**: Filter berdasarkan status (semua status termasuk Batal)
- [ ] **Pagination**: Scroll/buat >20 pesanan, test navigasi halaman
- [ ] **Export CSV**: Download file CSV, buka di Excel/Google Sheets
- [ ] **Print PDF**: Cetak invoice, verify layout dan data
- [ ] **Analytics**: Cek dashboard, verify grafik dan statistik

#### ✅ Security Testing
- [ ] Akses API tanpa login harus return 401 Unauthorized
- [ ] Input script `<script>alert('xss')</script>` di notes harus ter-sanitasi
- [ ] Session timeout setelah 24 jam (atau sesuai SESSION_MAX_AGE)
- [ ] Failed login tidak bocorkan info apakah username ada/tidak

#### ✅ Performance Testing
- [ ] Load time < 3 detik pada koneksi 4G
- [ ] Search response < 500ms untuk 1000+ records
- [ ] Export CSV < 5 detik untuk 500+ orders
- [ ] No console errors di browser

### Step 5: Setup Monitoring & Alerts

#### Netlify Built-in Monitoring
- Enable **Deploy Notifications** di Site Settings → Build & Deploy
- Setup **Function Logging** untuk debug API errors
- Monitor **Bandwidth** dan **Function Invocations**

#### Optional: External Monitoring
```bash
# Install Sentry untuk error tracking
npm install @sentry/nextjs

# Atau Simple Analytics untuk privacy-friendly analytics
npm install simple-analytics-react
```

#### Backup Routine
- **Harian**: Auto-export CSV via cron job (opsional, butuh external service)
- **Mingguan**: Manual download CSV dari dashboard
- **Bulanan**: Archive CSV ke Google Drive/S3

---

## 🔧 Troubleshooting Guide

### ❌ Login Gagal / 401 Unauthorized
**Penyebab:**
- `ADMIN_PASSWORD_HASH` tidak sesuai
- Hash tidak di-generate dengan benar
- Environment variable tidak terbaca

**Solusi:**
```bash
# Re-generate hash
npm run generate-password -- "NewPassword123!"

# Verify di Netlify Dashboard → Environment Variables
# Pastikan tidak ada typo atau spasi

# Redeploy setelah update env vars
netlify deploy --prod
```

### ❌ Export CSV Kosong / Error 500
**Penyebab:**
- Belum login sebagai admin
- Netlify Blobs permission issue
- Tidak ada data pesanan

**Solusi:**
1. Verify sudah login (cek cookie `sessionId`)
2. Cek Netlify Function Logs untuk error detail
3. Buat beberapa pesanan test terlebih dahulu

### ❌ Print PDF Tidak Berfungsi
**Penyebab:**
- Popup blocker aktif
- Browser tidak support window.print()
- Data pesanan incomplete

**Solusi:**
1. Disable popup blocker untuk domain aplikasi
2. Gunakan Chrome/Firefox terbaru
3. Pastikan semua field pesanan terisi sebelum cetak

### ❌ WhatsApp Link Error
**Penyebab:**
- Format nomor salah (harus 62xxx)
- Nomor tidak terdaftar di WhatsApp
- WhatsApp Business API key invalid

**Solusi:**
```javascript
// Format nomor yang benar:
// 0812-3456-7890 → 628123456789
// +62 812-3456-7890 → 628123456789
```

### ❌ Build Failed di Netlify
**Penyebab:**
- TypeScript errors
- Missing dependencies
- Node version mismatch

**Solusi:**
```bash
# Test build locally
npm run build

# Check Node version (should be 18+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build

# Check netlify.toml Node version
cat netlify.toml
```

---

## 📊 Post-Deployment Optimization

### 1. Performance Tuning
```toml
# netlify.toml - Add caching headers
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"
    
[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
```

### 2. SEO Enhancement (Optional)
Jika ingin halaman publik untuk customer tracking:
- Tambahkan meta tags di `src/app/layout.tsx`
- Buat halaman `/track-order/[id]` untuk customer
- Generate sitemap.xml

### 3. Custom Domain & SSL
1. Netlify Dashboard → Domain Management → Add custom domain
2. Follow DNS configuration instructions
3. SSL certificate otomatis provisioned oleh Netlify

### 4. Team Access (Multi-User)
Untuk tambah user selain admin:
- Implementasi multi-user auth (butuh database)
- Atau gunakan shared credentials dengan rotasi berkala

---

## 🎉 Go Live Checklist

Sebelum announce ke pelanggan:

- [ ] Semua environment variables ter-set dengan benar
- [ ] Login/logout berfungsi sempurna
- [ ] Minimal 5 pesanan test dibuat dan diproses
- [ ] Export CSV berhasil dan data akurat
- [ ] Print PDF tested dan layout rapi
- [ ] Search & filter responsive dan cepat
- [ ] Analytics dashboard menampilkan data real
- [ ] Backup CSV pertama sudah didownload
- [ ] Domain custom terkoneksi (jika ada)
- [ ] SSL certificate aktif (HTTPS)
- [ ] Monitoring/alerts ter-setup
- [ ] Documentation diakses tim operasional

### 📢 Announcement Template

Setelah go live, informasikan ke tim:

```
🎉 LAUNDRY.DASH v2.0 LIVE!

Aplikasi manajemen laundry sudah siap digunakan.

🔐 Login:
URL: https://your-domain.com
Username: admin
Password: [shared securely]

✨ Fitur Baru:
- Cetak invoice PDF
- Export data ke CSV
- Search & filter advanced
- Diskon & catatan pesanan
- Analytics dashboard lengkap
- Notifikasi WhatsApp otomatis
- Unit tests untuk stabilitas
- Error handling robust

📞 Support: 
Hubungi [nama] jika ada kendala.

Happy laundering! 🧺
```

---

## 📞 Support & Resources

### Documentation
- Next.js Docs: https://nextjs.org/docs
- Netlify Docs: https://docs.netlify.com
- Tailwind CSS: https://tailwindcss.com/docs

### Community
- GitHub Issues: [link repo]
- Netlify Forum: https://answers.netlify.com
- Discord: Next.js Community

### Emergency Contact
Jika terjadi critical issue post-deployment:
1. Rollback ke deploy sebelumnya via Netlify Dashboard
2. Check Function Logs untuk error detail
3. Restore data dari backup CSV terakhir
4. Hubungi developer untuk hotfix

---

## 🧪 Running Tests Before Deploy

```bash
# Run semua tests
npm test

# Run dengan coverage report
npm run test:coverage

# Watch mode untuk development
npm run test:watch
```

**Expected Output:**
```
PASS  src/__tests__/validation.test.ts
PASS  src/__tests__/security.test.ts  
PASS  src/__tests__/sanitization.test.ts

Test Suites: 3 passed, 3 total
Tests:       54 passed, 54 total
Snapshots:   0 total
Time:        2.5s
```

---

**Version:** 2.0.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready  

**Happy Deploying! 🚀🧺**
