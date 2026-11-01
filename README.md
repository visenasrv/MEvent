# MEvent — Manajemen Event Sekolah

Aplikasi web untuk **pemilihan OSIS**, **perlombaan** (juri + voting siswa), **formulir pendaftaran**, **daftar hadir**, dan **dokumen cetak** (rekap, berita acara, lembar juri, piagam, SK) — dengan **Mode Demo** berisi data contoh.

Versi 1.1: link voting khusus (Siswa & PTK / Siswa & Juri), link formulir & layar hasil dengan kode QR, layar hasil "suara masuk → tampilkan hasil" dengan animasi dan suara, serta sistem calon OSIS pasangan atau tunggal (wakil = suara terbanyak ke-2).

- Frontend: HTML/CSS/JavaScript murni (SPA), di-hosting di GitHub Pages
- Backend: Google Apps Script sebagai REST API + Google Sheets & Drive

## Struktur

```
index.html
css/style.css
js/config.js     ← isi GAS_URL di sini
js/icons.js      ← subset ikon Lucide
js/core.js       ← api(), cache, router, komponen UI
js/kop.js        ← kop surat, dokumen cetak, piagam
js/public.js     ← halaman publik, voting, juri, formulir
js/admin.js      ← panel admin/panitia (dimuat setelah login)
js/admin2.js     ← formulir, pengaturan, editor piagam
js/layar.js      ← layar hasil proyektor/IFP (efek suara & animasi), dimuat saat dibuka
```

Lihat **PANDUAN-INSTALASI.md** untuk langkah pemasangan.
