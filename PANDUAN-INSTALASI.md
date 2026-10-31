# 📋 Panduan Instalasi — MEvent (Manajemen Event Sekolah)

MEvent terdiri dari dua bagian:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs`, `Admin.gs`, `Demo.gs` | Google Apps Script (akun Google sekolah) |
| **Frontend** | `index.html`, `css/`, `js/` (isi ZIP ini) | GitHub Pages |

Kerjakan berurutan: **Backend dulu → salin URL → Frontend**.

---

## Bagian A — Backend (Google Apps Script)

1. Buka **https://script.google.com** → **Proyek baru**. Beri nama proyek, misalnya `MEvent`.
2. Buat **3 berkas** lalu tempel isinya:
   - Berkas bawaan `Kode.gs` → hapus isinya, tempel seluruh **Kode.gs**.
   - Klik **＋ → Skrip** → beri nama `Admin` → tempel seluruh **Admin.gs**.
   - Klik **＋ → Skrip** → beri nama `Demo` → tempel seluruh **Demo.gs**.
   - Tekan **Ctrl+S** (simpan).
3. Jalankan **setup SEKALI saja**:
   - Di bilah atas, pilih fungsi **`setupAwal`** → klik **▶ Jalankan**.
   - Klik **Tinjau izin** → pilih akun → **Lanjutan** → **Buka MEvent (tidak aman)** → **Izinkan**.
     (Peringatan ini normal untuk skrip buatan sendiri.)
   - Buka **Log eksekusi**: harus muncul `✅ Setup selesai!`.
   - Di Google Drive kini ada folder **📁 MEvent** berisi spreadsheet **MEvent_DB** dan folder Logo, Foto, Berkas, dll.
   - ⚠️ Jangan jalankan `setupAwal` dua kali. Bila terlanjur, fungsi akan menolak sendiri.
4. **Deploy sebagai Web App**:
   - Klik **Terapkan → Deployment baru** → ikon roda gigi → **Aplikasi web**.
   - **Jalankan sebagai:** *Saya* · **Siapa yang memiliki akses:** *Siapa saja*.
   - Klik **Terapkan** → salin **URL aplikasi web** (berakhiran **`/exec`**).

> 💡 Zona waktu kode sudah diatur ke **WITA (Asia/Makassar)**.

---

## Bagian B — Frontend (GitHub Pages)

1. Ekstrak ZIP. **Folder hasil ekstraksi inilah folder proyek** — isinya langsung `index.html`, `css/`, `js/`.
2. Buka **`js/config.js`** dengan Notepad, ganti teks `PASTE_URL_WEB_APP_DI_SINI` dengan URL `/exec` dari langkah A4, lalu simpan:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
3. Buka PowerShell **di folder hasil ekstraksi itu** (di File Explorer: klik address bar → ketik `powershell` → Enter), lalu pastikan `dir` menampilkan `index.html` di baris paling atas. **Jangan** jalankan perintah git di folder induknya.
4. Buat repository baru di GitHub (**Public**, tanpa README), lalu jalankan satu per satu:
   ```bash
   git init
   git add .
   git commit -m "Upload pertama MEvent"
   git branch -M main
   git remote add origin https://github.com/USERNAME/mevent.git
   git push -u origin main
   ```
   Saat diminta *Password*, tempel **Personal Access Token** (bukan sandi akun GitHub). Layar memang tidak menampilkan karakter apa pun saat menempel — itu normal.
5. Di GitHub: **Settings → Pages** → *Deploy from a branch* → **main / (root)** → **Save**, lalu centang **Enforce HTTPS**.
6. Tunggu 1–2 menit. Situs tersedia di `https://USERNAME.github.io/mevent/`.

---

## Bagian C — Penggunaan Pertama

1. Buka situs → **Admin** → username **`admin`**, kata sandi **`admin123`**.
2. **Segera ganti** kata sandi: **Pengaturan › Akun**.
3. **Pengaturan › Umum**: isi identitas sekolah, kota tanda tangan, dan pilih **Kepala Sekolah** (setelah data PTK diisi).
4. **Pengaturan › Kop Surat**: unggah **logo sekolah** (kanan) dan **logo yayasan/dinas** (kiri), atur baris kop.
5. **Data Siswa → Unduh Template Excel → Impor Excel** (format: Nama | Jenis Kelamin | NISN | Tempat Lahir | Tanggal Lahir | Kelas).
6. **Data PTK → Impor Excel** (Nama | Tanggal Lahir | NIP/NIY/NUPTK | Jabatan), lalu **Kata Sandi Massal** → cetak kartunya.
7. Ingin mencoba dulu? **Pengaturan › Mode Demo → Mulai Demo**. Data contoh dibuat terpisah dan dihapus saat demo diakhiri.

### Alur hari-H pemilihan OSIS
Event OSIS → tab **Calon** (tambah calon + foto) → nyalakan **Voting** → siswa memilih di HP lewat **Voting OSIS** (NISN) → admin membuka **Layar Hasil** di proyektor → setelah selesai, matikan voting → tab **Hasil** → cetak **Rekap** & **Berita Acara**.

### Alur lomba
Event Lomba → **Cabang & Peserta** (mode Juri/Voting/Gabungan + bobot) → **Juri & Kriteria** → juri menilai lewat menu **PTK / Juri** → **Kunci Penilaian** → tab **Hasil** (tetapkan urutan bila seri) → **Cetak Piagam Juara**.

---

## Bagian D — Memperbarui Aplikasi

**Backend** (bila ada perubahan `.gs`):
**Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.**
⚠️ Jangan memilih *Deployment baru* — URL `/exec` akan berubah dan aplikasi berhenti bekerja.

**Frontend** (bila ada perubahan di `css/` atau `js/`):
1. Naikkan angka versi di `index.html` (mis. `?v=1.0.0` → `?v=1.0.1`) dan `APP_VER` di `js/core.js` agar HP pengguna langsung memuat versi baru.
2. Jalankan dari folder proyek:
   ```bash
   git add .
   git commit -m "Perbarui MEvent"
   git push
   ```

---

## Bagian E — Tips Kecepatan

- Aplikasi sudah memakai cache di perangkat (tampil seketika), cache server berversi, satu panggilan untuk satu layar, dan simpan *optimistic* untuk penilaian juri.
- Saat hari-H, Apps Script yang lama tidak dipakai bisa "dingin" (1–3 detik di panggilan pertama). Aplikasi otomatis mengirim *ping* pemanas saat dibuka. Bila ingin selalu hangat, buat pemicu: **Pemicu → Tambah pemicu → fungsi `warmup` → Berbasis waktu → Setiap 10 menit**.
- Untuk melihat kecepatan, buka Console browser (F12) lalu ketik `Perf.table()`.

---

## Bagian F — Jika Ada Kendala

| Gejala | Penyebab | Solusi |
|---|---|---|
| Layar "URL server belum diatur" | `js/config.js` belum diisi | Isi `GAS_URL`, lalu push ulang |
| "Server membalas HTTP … (bukan JSON)" | Akses web app bukan *Siapa saja*, atau URL salah | Edit deployment → akses *Siapa saja*; pastikan URL berakhiran `/exec` |
| "Aplikasi belum di-setup" | `setupAwal` belum dijalankan | Jalankan `setupAwal` sekali |
| Situs 404 di GitHub Pages | `index.html` tidak berada di root repository | Push dari folder yang berisi `index.html` langsung |
| Tampilan polos tanpa warna | Folder `css/` & `js/` tidak ikut | Push lewat terminal, jangan upload lewat web |
| Foto/logo tidak tampil | Akun Workspace melarang berbagi "siapa saja dengan link" | Minta admin Workspace mengizinkan berbagi tautan, atau unggah ulang |
| PTK "Kata sandi belum diatur" | PTK belum punya sandi | Data PTK → ikon kunci, atau Kata Sandi Massal |
| Perubahan belum muncul | Cache browser | Ctrl+Shift+R atau naikkan `?v=` di `index.html` |
