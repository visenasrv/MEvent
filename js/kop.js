/* ============================================================
   MEvent — kop.js
   Satu sumber aturan kop surat (pratinjau = cetak), mesin cetak
   dokumen A4, dan perender piagam (dipakai editor & cetak).
   ============================================================ */
'use strict';

const KOP_BAKU = [
  { id: 'pemkab', tampil: true, ukuran: 10, tebal: true, kapital: true },
  { id: 'yayasan', tampil: true, ukuran: 10, tebal: true, kapital: true },
  { id: 'sekolah', tampil: true, ukuran: 15, tebal: true, kapital: true },
  { id: 'npsn', tampil: true, ukuran: 7.5, tebal: true, kapital: false },
  { id: 'alamat', tampil: true, ukuran: 7.5, tebal: false, kapital: false },
  { id: 'kontak', tampil: true, ukuran: 7.5, tebal: false, kapital: false },
  { id: 'tambahan1', tampil: true, ukuran: 7.5, tebal: false, kapital: false, isi: '' },
  { id: 'tambahan2', tampil: true, ukuran: 7.5, tebal: false, kapital: false, isi: '' }
];
const KOP_NAMA = { pemkab: 'Nama Pemkab', yayasan: 'Nama Dinas / Yayasan', sekolah: 'Nama Sekolah', npsn: 'NPSN', alamat: 'Alamat Sekolah', kontak: 'Telepon & E-mail', tambahan1: 'Baris Tambahan 1', tambahan2: 'Baris Tambahan 2' };

/** Gabungkan simpanan dengan susunan baku: id asing/ganda diabaikan, baris baru ditambah di belakang, JSON rusak → baku. */
function bacaSusunanKop(json) {
  let arr = null;
  try { arr = typeof json === 'string' ? (json ? JSON.parse(json) : null) : json; } catch (e) { arr = null; }
  if (!Array.isArray(arr)) return KOP_BAKU.map(x => Object.assign({}, x));
  const ids = KOP_BAKU.map(x => x.id), seen = {}, out = [];
  arr.forEach(x => {
    if (!x || ids.indexOf(x.id) < 0 || seen[x.id]) return;
    seen[x.id] = 1;
    const b = KOP_BAKU.find(k => k.id === x.id), u = Number(x.ukuran);
    const o = { id: x.id, tampil: x.tampil !== false, ukuran: (u >= 5 && u <= 24 && Math.round(u * 2) === u * 2) ? u : b.ukuran, tebal: !!x.tebal, kapital: !!x.kapital };
    if (x.id.indexOf('tambahan') === 0) o.isi = String(x.isi || '');
    out.push(o);
  });
  KOP_BAKU.forEach(b => { if (!seen[b.id]) out.push(Object.assign({}, b)); });
  return out;
}
function teksBarisKop(row, s) {
  switch (row.id) {
    case 'pemkab': return s.NamaPemkab || '';
    case 'yayasan': return s.NamaYayasan || '';
    case 'sekolah': return s.NamaSekolah || '';
    case 'npsn': return s.NPSN ? 'NPSN: ' + s.NPSN : '';
    case 'alamat': return s.AlamatSekolah || '';
    case 'kontak': return [s.TeleponSekolah ? 'Telp. ' + s.TeleponSekolah : '', s.EmailSekolah || ''].filter(Boolean).join(' • ');
    default: return row.isi || '';
  }
}
function gayaBarisKop(row) {
  return 'font-size:' + row.ukuran + 'pt;font-weight:' + (row.tebal ? 700 : 400) + ';' + (row.kapital ? 'text-transform:uppercase;letter-spacing:.4px;' : '') +
    (row.ukuran <= 8 ? 'color:#444;' : 'color:#000;') + (row.id === 'sekolah' ? 'margin:2px 0;' : '') + 'line-height:1.25;';
}
/** HTML kop. `s` = pengaturan (boleh berisi isian yang belum disimpan). */
function susunKop(s, susunan) {
  const rows = bacaSusunanKop(susunan || s.KopSusunan).filter(r => r.tampil && teksBarisKop(r, s).trim());
  const lines = rows.map(r => '<div style="' + gayaBarisKop(r) + '">' + esc(teksBarisKop(r, s)) + '</div>').join('');
  return '<table class="kop"><tr><td class="lg">' + logoHtml(s.LogoInstansiUrl, 'logo instansi') + '</td><td style="text-align:center">' +
    (lines || '<div style="color:#94A3B8;font-size:10pt">Belum ada baris yang tampil</div>') + '</td><td class="lg">' + logoHtml(s.LogoUrl, 'logo sekolah') + '</td></tr></table><hr class="kop-rule">';
}

/* ---------------- Pengaturan cetak per dokumen ---------------- */
const CETAK_DEFAULT = {
  SK: { kop: true, ttd: true, kunci: true }, BeritaAcara: { kop: true, ttd: true, kunci: true },
  DaftarHadir: { kop: true, ttd: true }, Rekap: { kop: true, ttd: true }, LembarJuri: { kop: true, ttd: false },
  Formulir: { kop: true, ttd: false }, Piagam: { kop: false, ttd: true }
};
const JENIS_LABEL = { SK: 'SK Panitia', BeritaAcara: 'Berita Acara Pemilihan', DaftarHadir: 'Daftar Hadir', Rekap: 'Rekap Hasil Suara', LembarJuri: 'Lembar Penilaian Juri', Formulir: 'Formulir Kosong', Piagam: 'Piagam Juara' };
function cetakCfg(det, jenis) {
  const d = CETAK_DEFAULT[jenis] || { kop: true, ttd: true };
  const s = (det && det.cetak || []).find(c => c.JenisDokumen === jenis);
  const cfg = { kop: d.kop, ttd: d.ttd, kunci: !!d.kunci, pt2: '', jabatan2: '', opsi: {} };
  if (s) { cfg.kop = s.PakaiKop === 'Ya'; cfg.ttd = s.TtdKepsek === 'Ya'; cfg.pt2 = s.PenandaTangan2_PTK_ID || ''; cfg.jabatan2 = s.JabatanTampil2 || ''; cfg.opsi = s.Opsi || {}; }
  if (d.kunci) { cfg.kop = true; cfg.ttd = true; }
  return cfg;
}
function settingsNow() { return Object.assign({}, (AppState.boot && AppState.boot.settings) || (AppState.pub && AppState.pub.sekolah) || {}); }
function ptkById(id) { return ((AppState.boot && AppState.boot.ptk) || []).find(p => p.PTK_ID === id) || null; }
function nomorPtk(p) { return p && p.NIP_NIY_NUPTK ? (p.JenisNomor || 'NIP') + '. ' + p.NIP_NIY_NUPTK : ''; }
function kepsek() { const s = settingsNow(); return ptkById(s.KepalaSekolah_PTK_ID); }

/** Blok tanda tangan sesuai sakelar: kepala sekolah (ya/tidak) + penanda tangan ke-2 (opsional). */
function ttdHtml(cfg, opt = {}) {
  const s = settingsNow(), tempat = s.TempatTtd || '', tanggal = tgl(opt.tanggal || todayStr());
  const blok = [];
  const p2 = cfg.pt2 ? ptkById(cfg.pt2) : null;
  if (p2) blok.push({ jab: cfg.jabatan2 || p2.Jabatan || 'Ketua Panitia', p: p2 });
  if (cfg.ttd) { const k = kepsek(); blok.push({ jab: 'Kepala ' + (s.NamaSekolah || 'Sekolah'), p: k, kepsek: true }); }
  if (!blok.length) return '';
  const one = (b, dateLine, prefix) => '<div class="ttd">' + (dateLine ? '<div>' + esc(tempat ? tempat + ', ' : '') + esc(tanggal) + '</div>' : '<div>&nbsp;</div>') +
    (prefix ? '<div>' + esc(prefix) + '</div>' : '') + '<div>' + esc(b.jab) + ',</div><div class="sp"></div>' +
    '<div class="nm">' + esc(b.p ? b.p.Nama : '..............................') + '</div><div>' + esc(nomorPtk(b.p)) + '</div></div>';
  if (blok.length === 1) return '<div class="ttd-wrap single">' + one(blok[0], true) + '</div>';
  // dua penanda tangan: kepala sekolah di kiri ("Mengetahui"), penanda tangan ke-2 di kanan bertanggal
  return '<div class="ttd-wrap">' + one(blok[1], false, 'Mengetahui,') + one(blok[0], true) + '</div>';
}
function docPage(inner, o = {}) {
  const s = settingsNow();
  return '<div class="doc ' + (o.landscape ? 'doc-a4l' : 'doc-a4') + ' print-page">' + (o.kop ? susunKop(s) : '') + inner +
    (AppState.mode === 'demo' ? '<div class="wm"><span>DEMO — BUKAN DOKUMEN RESMI</span></div>' : '') + '</div>';
}
function judulDoc(t, sub) { return '<h2 class="doc-title">' + esc(t) + '</h2>' + (sub ? '<div class="doc-subtitle">' + sub + '</div>' : '<div style="height:10px"></div>'); }

/* ---------------- Dokumen ---------------- */
function docDaftarHadir(det, cfg, o) {
  const ev = det.event;
  let rows = det.kehadiran || [];
  const cabN = o.cabangId && det.cabang ? (det.cabang.find(c => c.CabangID === o.cabangId) || {}).NamaCabang : '';
  if (o.cabangId) rows = rows.filter(r => r.cabangId === o.cabangId || (r.voting || []).indexOf(cabN) > -1 || (r.peserta || []).indexOf(cabN) > -1);
  if (o.kelas) rows = rows.filter(r => r.kelas === o.kelas);
  const dates = o.tanggal && o.tanggal.length ? o.tanggal.slice().sort() : uniq(rows.map(r => r.tanggal)).sort();
  rows = rows.filter(r => dates.indexOf(r.tanggal) > -1);
  const cab = o.cabangId && det.cabang ? det.cabang.find(c => c.CabangID === o.cabangId) : null;
  const sub = esc(ev.Judul) + (cab ? ' — ' + esc(cab.NamaCabang) : '') + (o.kelas ? ' — Kelas ' + esc(o.kelas) : '') + '<br>' +
    (dates.length === 1 ? esc(hariTgl(dates[0])) : esc(tglPendek(dates[0] || '')) + ' s.d. ' + esc(tglPendek(dates[dates.length - 1] || '')));
  let table;
  const SUMBER = { VotingOSIS: 'Voting OSIS', VotingLomba: 'Voting Lomba', PesertaLomba: 'Peserta', Manual: 'Manual' };
  const lomba = ev.JenisEvent === 'Lomba';
  const ket = (r) => lomba ? [(r.voting || []).length ? 'Voting: ' + r.voting.join(', ') : '', (r.peserta || []).length ? 'Peserta: ' + r.peserta.join(', ') : '', r.sumber.indexOf('Manual') > -1 ? 'Manual' : ''].filter(Boolean).join('; ') : r.sumber.map(x => SUMBER[x] || x).join(', ');
  if (dates.length <= 1) {
    table = '<table class="dt"><thead><tr><th style="width:34px">No</th><th>Nama</th><th style="width:60px">Kelas</th><th style="width:40px">L/P</th><th style="width:60px">Jam</th><th style="width:' + (lomba ? 190 : 110) + 'px">Keterangan</th><th style="width:90px">Paraf</th></tr></thead><tbody>' +
      (rows.map((r, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(r.nama) + '</td><td class="c">' + esc(r.kelas) + '</td><td class="c">' + esc(r.jk) + '</td><td class="c">' + esc(r.jam) + '</td><td' + (lomba ? ' style="font-size:9pt"' : '') + '>' + esc(ket(r)) + '</td><td>' + (i % 2 ? '<span style="padding-left:40px">' + (i + 1) + '.</span>' : (i + 1) + '.') + '</td></tr>').join('') || '<tr><td colspan="7" class="c">Belum ada data kehadiran.</td></tr>') + '</tbody></table>';
  } else {
    const per = {};
    rows.forEach(r => { const k = r.siswaId; const p = (per[k] = per[k] || { nama: r.nama, kelas: r.kelas, jk: r.jk, d: {}, v: [] }); p.d[r.tanggal] = 1; (r.voting || []).forEach(x => { if (p.v.indexOf(x) < 0) p.v.push(x); }); });
    const list = Object.values(per).sort((a, b) => kelasSort(a.kelas, b.kelas) || a.nama.localeCompare(b.nama));
    table = '<table class="dt"><thead><tr><th style="width:30px">No</th><th>Nama</th><th style="width:52px">Kelas</th>' + dates.map(d => '<th style="width:46px">' + esc(tglPendek(d).replace(/ \d{4}$/, '')) + '</th>').join('') + '<th style="width:50px">Jml</th>' + (lomba ? '<th style="width:150px">Lomba di-voting</th>' : '') + '</tr></thead><tbody>' +
      list.map((r, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(r.nama) + '</td><td class="c">' + esc(r.kelas) + '</td>' + dates.map(d => '<td class="c">' + (r.d[d] ? '✓' : '') + '</td>').join('') + '<td class="c">' + Object.keys(r.d).length + '</td>' + (lomba ? '<td style="font-size:9pt">' + esc(r.v.join(', ') || '-') + '</td>' : '') + '</tr>').join('') +
      '</tbody><tfoot><tr><th colspan="3" style="text-align:right">Jumlah hadir</th>' + dates.map(d => '<th>' + list.filter(r => r.d[d]).length + '</th>').join('') + '<th></th>' + (lomba ? '<th></th>' : '') + '</tr></tfoot></table>';
  }
  return docPage(judulDoc('Daftar Hadir', sub) + table + ttdHtml(cfg, { tanggal: dates[dates.length - 1] }), { kop: cfg.kop });
}

function docRekap(det, cfg, o) {
  const ev = det.event;
  if (ev.JenisEvent === 'OSIS') {
    const h = det.hasil, tg = h.sistem === 'Tunggal';
    const t = '<table class="dt"><thead><tr><th style="width:60px">Peringkat</th><th style="width:60px">No. Urut</th><th>Nama Calon</th><th style="width:80px">Suara</th><th style="width:80px">Persentase</th>' + (tg ? '<th style="width:100px">Keterangan</th>' : '') + '</tr></thead><tbody>' +
      h.kandidat.map(k => '<tr><td class="c">' + k.peringkat + '</td><td class="c">' + noUrut(k.NoUrut) + '</td><td>' + esc(k.Nama1) + (k.Nama2 ? ' &amp; ' + esc(k.Nama2) : '') + '</td><td class="c">' + k.suara + '</td><td class="c">' + fmtNum(k.persen, 1) + '%</td>' + (tg ? '<td class="c">' + esc(k.jabatan || (k.seri ? 'Seri' : '')) + '</td>' : '') + '</tr>').join('') +
      '</tbody><tfoot><tr><th colspan="3" style="text-align:right">Total suara sah</th><th>' + h.totalSuara + '</th><th>100%</th>' + (tg ? '<th></th>' : '') + '</tr></tfoot></table>' +
      (tg ? '<p style="margin-top:8px;font-size:10.5pt"><i>Sistem calon tunggal: suara terbanyak menjadi Ketua, suara terbanyak kedua menjadi Wakil Ketua.</i></p>' : '');
    const part = '<table class="info" style="margin-top:14px"><tr><td>Pemilih siswa</td><td>: ' + h.pemilihSiswa + ' dari ' + h.totalSiswa + ' (' + fmtNum(pct(h.pemilihSiswa, h.totalSiswa), 1) + '%)</td></tr>' +
      '<tr><td>Pemilih PTK</td><td>: ' + h.pemilihPtk + ' dari ' + h.totalPtk + ' (' + fmtNum(pct(h.pemilihPtk, h.totalPtk), 1) + '%)</td></tr></table>' +
      (h.penetapan ? '<p style="margin-top:8px"><i>Catatan: hasil seri ditetapkan oleh ' + esc(h.penetapan.DitetapkanOleh) + ' — ' + esc(h.penetapan.Alasan) + '</i></p>' : '');
    return docPage(judulDoc('Rekap Hasil Suara', esc(ev.Judul)) + t + part + ttdHtml(cfg), { kop: cfg.kop });
  }
  const cabs = (det.cabang || []).filter(c => !o.cabangId || c.CabangID === o.cabangId);
  return cabs.map(c => {
    const h = c.hasil;
    if (h.ModePenilaian === 'Babak') return rekapBabak(det, cfg, c);
    if (h.ModePenilaian === 'Peringkat') return rekapPeringkat(det, cfg, c);
    const showJ = h.ModePenilaian !== 'Voting', showV = h.ModePenilaian !== 'Juri';
    const t = '<table class="dt"><thead><tr><th style="width:56px">Peringkat</th><th>Nama Peserta</th><th style="width:56px">Kelas</th>' + (showJ ? '<th style="width:70px">Skor Juri</th>' : '') + (showV ? '<th style="width:60px">Suara</th>' : '') + '<th style="width:70px">Skor Akhir</th><th style="width:80px">Keterangan</th></tr></thead><tbody>' +
      h.peserta.map(p => '<tr><td class="c">' + p.peringkat + '</td><td>' + esc(p.NamaTampil) + '</td><td class="c">' + esc(p.Kelas) + '</td>' + (showJ ? '<td class="c">' + fmtNum(p.skorJuri, 2) + '</td>' : '') + (showV ? '<td class="c">' + p.suara + '</td>' : '') + '<td class="c"><b>' + fmtNum(p.skorAkhir, 2) + '</b></td><td class="c">' + (p.juara ? 'Juara ' + p.juara : '') + (p.seri ? ' (seri)' : '') + '</td></tr>').join('') + '</tbody></table>';
    const info = '<p style="margin-top:8px;font-size:10.5pt">Mode penilaian: ' + esc(h.ModePenilaian === 'Gabungan' ? 'Gabungan (Juri ' + h.BobotJuri + '% + Voting ' + h.BobotVoting + '%)' : h.ModePenilaian === 'Juri' ? 'Juri saja' : 'Voting saja') + (showV ? ' · Total suara: ' + h.totalSuara : '') + '</p>' +
      (h.penetapan ? '<p style="font-size:10.5pt"><i>Penetapan urutan oleh ' + esc(h.penetapan.DitetapkanOleh) + ': ' + esc(h.penetapan.Alasan) + '</i></p>' : '');
    return docPage(judulDoc('Rekap Hasil Lomba', esc(ev.Judul) + ' — ' + esc(c.NamaCabang) + '<br>' + esc(hariTgl(c.TanggalPelaksanaan))) + t + info + ttdHtml(cfg, { tanggal: c.TanggalPelaksanaan }), { kop: cfg.kop });
  }).join('');
}

function rekapPeringkat(det, cfg, c) {
  const h = c.hasil;
  const t = '<table class="dt"><thead><tr><th style="width:56px">Peringkat</th><th>Nama Peserta</th><th style="width:60px">Kelas</th><th style="width:150px">Keterangan</th></tr></thead><tbody>' +
    h.peserta.map(p => '<tr><td class="c">' + (p.posisi ? p.peringkat : '–') + '</td><td>' + esc(p.NamaTampil) + '</td><td class="c">' + esc(p.Kelas) + '</td><td class="c">' + (p.juara ? '<b>Juara ' + p.juara + '</b>' : p.harapan ? 'Juara Harapan ' + p.harapan : 'Peserta') + '</td></tr>').join('') + '</tbody></table>';
  const info = '<p style="margin-top:8px;font-size:10.5pt">Mode penilaian: Sistem Rank 1 (gugur bila salah menjawab). Peserta yang bertahan paling akhir ditetapkan sebagai Juara 1, kemudian Juara 2 dan seterusnya oleh dewan juri.</p>';
  return docPage(judulDoc('Rekap Hasil Lomba', esc(det.event.Judul) + ' — ' + esc(c.NamaCabang) + '<br>' + esc(hariTgl(c.TanggalPelaksanaan))) + t + info + ttdHtml(cfg, { tanggal: c.TanggalPelaksanaan }), { kop: cfg.kop });
}
function rekapBabak(det, cfg, c) {
  const h = c.hasil, L = h.babak || [], fin = h.juaraDari === 'final';
  const t = '<table class="dt"><thead><tr><th style="width:50px">Peringkat</th><th>Nama Peserta</th><th style="width:48px">Kelas</th>' + L.map(b => '<th style="width:58px">' + esc(b.nama) + (b.maks ? '<br><span style="font-weight:400;font-size:8.5pt">(maks ' + b.maks + ')</span>' : '') + '</th>').join('') + '<th style="width:56px">Total</th><th style="width:96px">Keterangan</th></tr></thead><tbody>' +
    h.peserta.map(p => '<tr><td class="c">' + p.peringkat + '</td><td>' + esc(p.NamaTampil) + '</td><td class="c">' + esc(p.Kelas) + '</td>' +
      L.map(b => { const ada = Object.prototype.hasOwnProperty.call(p.skorBabak || {}, b.id), v = ada ? p.skorBabak[b.id] : null; return '<td class="c">' + (!ada ? '–' : v === null ? '' : (b.final && fin ? '<b>' + v + '</b>' : v) + ((p.lolos || {})[b.id] === 'Ya' && !b.final ? ' ✓' : '')) + '</td>'; }).join('') +
      '<td class="c"><b>' + p.total + '</b></td><td class="c">' + esc(p.juara ? 'Juara ' + p.juara : p.status || '') + (p.seri ? ' (seri)' : '') + '</td></tr>').join('') + '</tbody></table>';
  const info = '<p style="margin-top:8px;font-size:10.5pt">Mode penilaian: Sistem babak / eliminasi (' + L.map(b => esc(b.nama)).join(' → ') + '). Skor = jumlah jawaban benar; ✓ = lolos ke babak berikutnya. Juara ditentukan dari ' + (fin ? 'skor babak final (total akumulasi sebagai penentu bila sama)' : 'total akumulasi jawaban benar semua babak') + '.</p>' +
    (h.penetapan ? '<p style="font-size:10.5pt"><i>Penetapan urutan oleh ' + esc(h.penetapan.DitetapkanOleh) + ': ' + esc(h.penetapan.Alasan) + '</i></p>' : '');
  return docPage(judulDoc('Rekap Hasil Lomba', esc(det.event.Judul) + ' — ' + esc(c.NamaCabang) + '<br>' + esc(hariTgl(c.TanggalPelaksanaan))) + t + info + ttdHtml(cfg, { tanggal: c.TanggalPelaksanaan }), { kop: cfg.kop });
}

function docBeritaAcara(det, cfg) {
  const ev = det.event, h = det.hasil, s = settingsNow();
  const d = parseTgl(ev.TanggalMulai) || new Date();
  const top = h.kandidat[0], tg = h.sistem === 'Tunggal';
  const kt = h.kandidat.find(k => k.jabatan === 'Ketua'), wk = h.kandidat.find(k => k.jabatan === 'Wakil Ketua');
  const nm = (k) => esc(k.Nama1) + ' (Nomor Urut ' + noUrut(k.NoUrut) + ')';
  const terpilih = tg
    ? (kt ? 'Ketua terpilih adalah ' + nm(kt) : 'Ketua <i>belum dapat ditetapkan (hasil seri)</i>') + ' dan ' + (wk ? 'Wakil Ketua terpilih adalah ' + nm(wk) : 'Wakil Ketua <i>belum dapat ditetapkan (hasil seri)</i>')
    : 'calon terpilih adalah ' + (top && top.suara > 0 && !h.seri ? (esc(top.Nama1) + (top.Nama2 ? ' dan ' + esc(top.Nama2) : '') + ' (Nomor Urut ' + noUrut(top.NoUrut) + ')') : '<i>belum dapat ditetapkan (hasil seri)</i>');
  const body = judulDoc('Berita Acara', esc(ev.Judul)) +
    '<p style="text-align:justify;text-indent:1.2cm">Pada hari ini <b>' + HARI[d.getDay()] + '</b>, tanggal <b>' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() + '</b>, bertempat di <b>' + esc(ev.Tempat || s.NamaSekolah || '-') + '</b>, telah dilaksanakan ' + esc(ev.Judul) + ' di ' + esc(s.NamaSekolah || 'sekolah') + ' dengan hasil sebagai berikut:</p>' +
    '<table class="info" style="margin:12px 0 4px 1.2cm"><tr><td>1.</td><td>Jumlah pemilih terdaftar</td><td>: ' + (h.totalSiswa + h.totalPtk) + ' orang (' + h.totalSiswa + ' siswa, ' + h.totalPtk + ' PTK)</td></tr>' +
    '<tr><td>2.</td><td>Jumlah yang menggunakan hak pilih</td><td>: ' + (h.pemilihSiswa + h.pemilihPtk) + ' orang (' + h.pemilihSiswa + ' siswa, ' + h.pemilihPtk + ' PTK)</td></tr>' +
    '<tr><td>3.</td><td>Jumlah suara sah</td><td>: ' + h.totalSuara + ' suara</td></tr></table>' +
    '<p style="margin-top:10px">Perolehan suara masing-masing calon:</p>' +
    '<table class="dt"><thead><tr><th style="width:60px">No. Urut</th><th>Nama Calon</th><th style="width:80px">Suara</th><th style="width:80px">%</th></tr></thead><tbody>' +
    h.kandidat.slice().sort((a, b) => a.NoUrut - b.NoUrut).map(k => '<tr><td class="c">' + noUrut(k.NoUrut) + '</td><td>' + esc(k.Nama1) + (k.Nama2 ? ' &amp; ' + esc(k.Nama2) : '') + '</td><td class="c">' + k.suara + '</td><td class="c">' + fmtNum(k.persen, 1) + '%</td></tr>').join('') + '</tbody></table>' +
    (tg ? '<p style="margin-top:10px;text-align:justify;text-indent:1.2cm">Pemilihan menggunakan sistem calon tunggal: calon dengan suara terbanyak ditetapkan sebagai Ketua dan calon dengan suara terbanyak kedua ditetapkan sebagai Wakil Ketua.</p>' : '') +
    '<p style="margin-top:12px;text-align:justify;text-indent:1.2cm">Berdasarkan perolehan suara tersebut, ' + terpilih + '.' +
    (h.penetapan ? ' Karena terdapat perolehan suara yang sama, ' + (tg ? 'urutan' : 'pemenang') + ' ditetapkan oleh ' + esc(h.penetapan.DitetapkanOleh) + ' dengan pertimbangan: ' + esc(h.penetapan.Alasan) + '.' : '') + '</p>' +
    '<p style="margin-top:8px;text-indent:1.2cm">Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.</p>' + ttdHtml(cfg, { tanggal: ev.TanggalMulai });
  return docPage(body, { kop: true });
}

function docLembarJuri(det, cfg, o) {
  const c = det.cabang.find(x => x.CabangID === o.cabangId);
  if (!c) return '';
  const juri = o.juriId === '_kosong' ? [{ Nama: '', Jabatan: '' }] : c.juri.filter(j => !o.juriId || j.JuriID === o.juriId);
  const list = juri.length ? juri : [{ Nama: '', Jabatan: '' }];
  const bk = c.ModePenilaian === 'Babak' && (c.hasil.babak || []).length;
  return list.map(j => {
    if (bk) return lembarBabak(det, cfg, c, j, o);
    if (c.ModePenilaian === 'Peringkat') return lembarPeringkat(det, cfg, c, j);
    const t = '<table class="dt"><thead><tr><th style="width:36px">No</th><th>Nama Peserta</th><th style="width:50px">Kelas</th>' +
      c.kriteria.map(k => '<th style="width:' + Math.max(56, Math.floor(300 / Math.max(1, c.kriteria.length))) + 'px">' + esc(k.NamaKriteria) + '<br><span style="font-weight:400;font-size:8.5pt">(' + k.NilaiMin + '–' + k.NilaiMaks + ', ' + k.Bobot + '%)</span></th>').join('') +
      '<th style="width:60px">Total</th></tr></thead><tbody>' +
      c.peserta.map(p => '<tr style="height:30px"><td class="c">' + noUrut(p.NoUrut) + '</td><td>' + esc(p.NamaTampil) + '</td><td class="c">' + esc(p.Kelas) + '</td>' + c.kriteria.map(() => '<td></td>').join('') + '<td></td></tr>').join('') +
      '</tbody></table>';
    const head = '<table class="info"><tr><td style="width:120px">Cabang lomba</td><td>: <b>' + esc(c.NamaCabang) + '</b></td></tr><tr><td>Hari/tanggal</td><td>: ' + esc(hariTgl(c.TanggalPelaksanaan)) + '</td></tr><tr><td>Nama juri</td><td>: ' + (j.Nama ? esc(j.Nama) : '..........................................') + '</td></tr></table>';
    const ttdJuri = '<div class="ttd-wrap single"><div class="ttd"><div>Juri,</div><div class="sp"></div><div class="nm">' + (j.Nama ? esc(j.Nama) : '..............................') + '</div><div>' + esc(j.NIP_NIY_NUPTK ? (j.JenisNomor || 'NIP') + '. ' + j.NIP_NIY_NUPTK : '') + '</div></div></div>';
    const extra = cfg.ttd || cfg.pt2 ? ttdHtml(cfg, { tanggal: c.TanggalPelaksanaan }) : '';
    return docPage(judulDoc('Lembar Penilaian Juri', esc(det.event.Judul)) + head + t +
      '<p style="font-size:9.5pt;margin-top:6px">Total = Σ (nilai ÷ nilai maksimal × bobot). Isi nilai sesuai rentang masing-masing kriteria.</p>' + ttdJuri + extra, { kop: cfg.kop });
  }).join('');
}

/** Lembar juri sistem Rank 1: catatan soal saat peserta gugur + kotak penetapan juara. */
function lembarPeringkat(det, cfg, c, j) {
  const N = +c.JumlahJuara || 3, H = +c.JumlahHarapan || 0;
  const t = '<table class="dt"><thead><tr><th style="width:32px">No</th><th>Nama Peserta</th><th style="width:48px">Kelas</th><th style="width:90px">Gugur pada soal ke-</th><th style="width:70px">Urutan gugur</th></tr></thead><tbody>' +
    c.peserta.map(p => '<tr style="height:28px"><td class="c">' + noUrut(p.NoUrut) + '</td><td>' + esc(p.NamaTampil) + '</td><td class="c">' + esc(p.Kelas) + '</td><td></td><td></td></tr>').join('') + '</tbody></table>';
  const slot = '<table class="dt" style="margin-top:12px"><thead><tr><th style="width:150px">Posisi</th><th>Nama Peserta</th><th style="width:60px">No</th></tr></thead><tbody>' +
    Array.from({ length: N + H }, (_, i) => '<tr style="height:30px"><td><b>' + (i < N ? 'Juara ' + (i + 1) : 'Juara Harapan ' + (i - N + 1)) + '</b></td><td></td><td></td></tr>').join('') + '</tbody></table>';
  const head = '<table class="info"><tr><td style="width:120px">Cabang lomba</td><td>: <b>' + esc(c.NamaCabang) + '</b> (Sistem Rank 1)</td></tr><tr><td>Hari/tanggal</td><td>: ' + esc(hariTgl(c.TanggalPelaksanaan)) + '</td></tr><tr><td>Nama juri</td><td>: ' + (j.Nama ? esc(j.Nama) : '..........................................') + '</td></tr></table>';
  const ttdJuri = '<div class="ttd-wrap single"><div class="ttd"><div>Juri,</div><div class="sp"></div><div class="nm">' + (j.Nama ? esc(j.Nama) : '..............................') + '</div><div>' + esc(j.NIP_NIY_NUPTK ? (j.JenisNomor || 'NIP') + '. ' + j.NIP_NIY_NUPTK : '') + '</div></div></div>';
  const extra = cfg.ttd || cfg.pt2 ? ttdHtml(cfg, { tanggal: c.TanggalPelaksanaan }) : '';
  return docPage(judulDoc('Lembar Penetapan Juara', esc(det.event.Judul)) + head + t + slot +
    '<p style="font-size:9.5pt;margin-top:6px">Catat nomor soal saat peserta salah menjawab (gugur). Peserta yang bertahan paling akhir adalah Juara 1, gugur terakhir sebelum itu Juara 2, dan seterusnya.</p>' + ttdJuri + extra, { kop: cfg.kop });
}
/** Lembar juri sistem babak: kolom centang per soal (bila ≤ 20 soal) + jumlah benar + lolos. */
function lembarBabak(det, cfg, c, j, o) {
  const L = c.hasil.babak, B = L.find(b => b.id === o.babakId) || L.find(b => b.id === c.hasil.babakAktif) || L[0];
  const ids = c.hasil.peserta.filter(p => Object.prototype.hasOwnProperty.call(p.skorBabak || {}, B.id)).map(p => p.PesertaID);
  let pes = c.peserta.filter(p => ids.indexOf(p.PesertaID) > -1);
  const kosong = !pes.length;
  if (kosong) pes = Array.from({ length: Math.max(5, L[L.indexOf(B) - 1] ? L[L.indexOf(B) - 1].lolos : 0) }, () => ({ NoUrut: '', NamaTampil: '', Kelas: '' }));
  const grid = B.maks >= 1 && B.maks <= 20 ? B.maks : 0;
  const t = '<table class="dt"><thead><tr><th style="width:32px">No</th><th>Nama Peserta</th><th style="width:44px">Kelas</th>' +
    Array.from({ length: grid }, (_, i) => '<th style="width:18px;padding:2px;font-size:8pt">' + (i + 1) + '</th>').join('') +
    '<th style="width:58px">Jumlah Benar</th>' + (B.final ? '' : '<th style="width:44px">Lolos</th>') + '</tr></thead><tbody>' +
    pes.map(p => '<tr style="height:30px"><td class="c">' + (p.NoUrut ? noUrut(p.NoUrut) : '') + '</td><td>' + esc(p.NamaTampil) + '</td><td class="c">' + esc(p.Kelas) + '</td>' + Array.from({ length: grid }, () => '<td></td>').join('') + '<td></td>' + (B.final ? '' : '<td></td>') + '</tr>').join('') + '</tbody></table>';
  const head = '<table class="info"><tr><td style="width:120px">Cabang lomba</td><td>: <b>' + esc(c.NamaCabang) + '</b> — ' + esc(B.nama) + (B.final && !/final/i.test(B.nama) ? ' (Final)' : '') + '</td></tr><tr><td>Hari/tanggal</td><td>: ' + esc(hariTgl(c.TanggalPelaksanaan)) + '</td></tr><tr><td>Nama juri</td><td>: ' + (j.Nama ? esc(j.Nama) : '..........................................') + '</td></tr></table>';
  const ttdJuri = '<div class="ttd-wrap single"><div class="ttd"><div>Juri,</div><div class="sp"></div><div class="nm">' + (j.Nama ? esc(j.Nama) : '..............................') + '</div><div>' + esc(j.NIP_NIY_NUPTK ? (j.JenisNomor || 'NIP') + '. ' + j.NIP_NIY_NUPTK : '') + '</div></div></div>';
  const extra = cfg.ttd || cfg.pt2 ? ttdHtml(cfg, { tanggal: c.TanggalPelaksanaan }) : '';
  return docPage(judulDoc('Lembar Skor ' + esc(B.nama), esc(det.event.Judul)) + head + t +
    '<p style="font-size:9.5pt;margin-top:6px">' + (grid ? 'Beri tanda ✓ pada nomor soal/kata yang dijawab benar, lalu tulis jumlahnya. ' : 'Tulis jumlah jawaban benar tiap peserta. ') + (B.maks ? 'Jumlah soal ' + B.maks + '. ' : '') + (B.final ? 'Babak final menentukan juara.' : 'Kolom Lolos diisi panitia untuk peserta yang maju ke babak berikutnya.') + (kosong ? ' (Daftar peserta babak ini belum ditetapkan.)' : '') + '</p>' + ttdJuri + extra, { kop: cfg.kop });
}

function docFormulirKosong(det, cfg, o) {
  const f = det.formulir.find(x => x.FormID === o.formId);
  if (!f) return '';
  const q = f.pertanyaan.map((p, i) => {
    let isi = '';
    if (p.Tipe === 'singkat' || p.Tipe === 'angka') isi = p.Tipe === 'angka' && p.AturanAngka && p.AturanAngka.operator === '=' ? '<div style="display:flex;gap:3px">' + Array.from({ length: p.AturanAngka.jumlahDigit }, () => '<span style="width:22px;height:26px;border:1px solid #000;display:inline-block"></span>').join('') + '</div>' : '<div class="form-line"></div>';
    else if (p.Tipe === 'panjang') isi = '<div class="form-line"></div><div class="form-line"></div><div class="form-line"></div>';
    else if (p.Tipe === 'pilihan_ganda' || p.Tipe === 'checkbox') isi = '<div style="display:flex;flex-wrap:wrap;gap:6px 22px">' + p.Opsi.map(op => '<span><span class="box-opt' + (p.Tipe === 'pilihan_ganda' ? ' r' : '') + '"></span>' + esc(op) + '</span>').join('') + '</div>';
    else if (p.Tipe === 'unggah_berkas') isi = '<div style="border:1px dashed #555;height:70px;display:flex;align-items:center;justify-content:center;color:#555;font-size:10pt">Lampirkan ' + esc(p.Label.toLowerCase()) + ' (' + esc(((p.AturanBerkas && p.AturanBerkas.jenis) || []).join(', ').toUpperCase()) + ')</div>';
    return '<div style="margin:0 0 12px;page-break-inside:avoid"><div><b>' + (i + 1) + '. ' + esc(p.Label) + '</b>' + (p.Wajib ? ' <span style="color:#B91C1C">*</span>' : '') + (p.Petunjuk ? ' <span style="font-size:10pt;color:#444">(' + esc(p.Petunjuk) + ')</span>' : '') + '</div><div style="margin-top:6px">' + isi + '</div></div>';
  }).join('');
  return docPage(judulDoc(f.Judul, esc(det.event.Judul)) + (f.Deskripsi ? '<p style="margin-bottom:12px">' + esc(f.Deskripsi) + '</p>' : '') + q +
    '<p style="font-size:9.5pt;margin-top:4px">Tanda <span style="color:#B91C1C">*</span> wajib diisi.</p>' + ttdHtml(cfg) +
    '<div style="margin-top:26px;font-size:10pt">Pendaftar: ...................................................&nbsp;&nbsp; Tanda tangan: ..............................</div>', { kop: cfg.kop });
}

function docSK(det, cfg) {
  const ev = det.event, sk = det.sk || {}, s = settingsNow();
  const k = ptkById(sk.PenandaTangan_PTK_ID) || kepsek();
  const lines = (t) => esc(t || '').split('\n').map(x => '<div style="margin-bottom:3px">' + x + '</div>').join('');
  const p1 = judulDoc('Keputusan Kepala ' + (s.NamaSekolah || 'Sekolah'), 'Nomor: ' + esc(sk.NomorSK || '........................') + '<br><b>TENTANG<br>PEMBENTUKAN PANITIA ' + esc(String(ev.Judul).toUpperCase()) + '</b>') +
    '<table class="info" style="width:100%"><tr><td style="width:110px;vertical-align:top"><b>Menimbang</b></td><td style="width:12px;vertical-align:top">:</td><td>' + lines(sk.Menimbang || 'a. bahwa untuk kelancaran pelaksanaan ' + ev.Judul + ' perlu dibentuk panitia;') + '</td></tr>' +
    '<tr><td style="vertical-align:top;padding-top:8px"><b>Mengingat</b></td><td style="vertical-align:top;padding-top:8px">:</td><td style="padding-top:8px">' + lines(sk.Mengingat || '1. Program kerja sekolah tahun pelajaran ' + (s.TahunAjaran || tahunAjaran()) + '.') + '</td></tr></table>' +
    '<div style="text-align:center;font-weight:700;margin:14px 0 8px">MEMUTUSKAN</div>' +
    '<table class="info" style="width:100%"><tr><td style="width:110px;vertical-align:top"><b>Menetapkan</b></td><td style="width:12px;vertical-align:top">:</td><td>' + lines(sk.Memutuskan || 'Susunan panitia sebagaimana tercantum dalam lampiran keputusan ini.') + '</td></tr></table>' +
    '<div class="ttd-wrap single"><div class="ttd"><div>Ditetapkan di ' + esc(s.TempatTtd || '-') + '</div><div>pada tanggal ' + esc(tgl(sk.TanggalSK || todayStr())) + '</div><div>Kepala ' + esc(s.NamaSekolah || 'Sekolah') + ',</div><div class="sp"></div><div class="nm">' + esc(k ? k.Nama : '..............................') + '</div><div>' + esc(nomorPtk(k)) + '</div></div></div>';
  const lamp = '<div style="font-size:10.5pt">Lampiran Keputusan Kepala ' + esc(s.NamaSekolah || 'Sekolah') + '<br>Nomor: ' + esc(sk.NomorSK || '-') + '<br>Tanggal: ' + esc(tgl(sk.TanggalSK || todayStr())) + '</div>' +
    judulDoc('Susunan Panitia', esc(ev.Judul)) +
    '<table class="dt"><thead><tr><th style="width:36px">No</th><th>Nama</th><th style="width:190px">NIP/NIY/NUPTK</th><th style="width:150px">Jabatan dalam Panitia</th></tr></thead><tbody>' +
    (det.panitia.map((p, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(p.Nama) + '</td><td>' + esc(p.NIP_NIY_NUPTK ? (p.JenisNomor || '') + ' ' + p.NIP_NIY_NUPTK : '-') + '</td><td>' + esc(p.JabatanPanitia) + '</td></tr>').join('') || '<tr><td colspan="4" class="c">Belum ada panitia.</td></tr>') + '</tbody></table>' +
    '<div class="ttd-wrap single"><div class="ttd"><div>Kepala ' + esc(s.NamaSekolah || 'Sekolah') + ',</div><div class="sp"></div><div class="nm">' + esc(k ? k.Nama : '..............................') + '</div><div>' + esc(nomorPtk(k)) + '</div></div></div>';
  return docPage(p1, { kop: true }) + docPage(lamp, { kop: true });
}

/* ---------------- Piagam ---------------- */
const TPL_BAWAAN = [
  { TemplateID: 'tpl-klasik', NamaTemplate: 'Klasik Bingkai Emas', gaya: 'klasik' },
  { TemplateID: 'tpl-modern', NamaTemplate: 'Modern Minimalis', gaya: 'modern' },
  { TemplateID: 'tpl-ceria', NamaTemplate: 'Ceria Berwarna', gaya: 'ceria' },
  { TemplateID: 'tpl-formal', NamaTemplate: 'Formal Resmi', gaya: 'formal' }
];
const PIAGAM_FONTS = ['Plus Jakarta Sans', 'Cinzel', 'Great Vibes', 'Playfair Display', 'Montserrat', 'Dancing Script', 'Merriweather', 'Pinyon Script', 'Times New Roman', 'Arial'];
const EL_LABEL = { kop: 'Kop surat', logoInstansi: 'Logo yayasan/dinas', logoSekolah: 'Logo sekolah', judul: 'Judul piagam', nomor: 'Nomor', diberikan: 'Diberikan kepada', nama: 'Nama siswa', kelas: 'Kelas', juara: 'Juara ke-', cabang: 'Cabang lomba', event: 'Nama event', tanggal: 'Tanggal & tempat', ttd1: 'Tanda tangan 1 (kiri)', ttd2: 'Tanda tangan 2 (kanan)', teks: 'Teks bebas' };
function layoutBaku(gaya) {
  const gold = gaya === 'klasik' ? '#B7791F' : gaya === 'ceria' ? '#DB2777' : gaya === 'formal' ? '#1E3A5F' : 'var(--primary)';
  const T = (o) => Object.assign({ x: 50, y: 50, align: 'center', font: 'Plus Jakarta Sans', size: 14, bold: false, italic: false, color: '#1E293B', show: true }, o);
  return {
    kop: T({ y: 4, show: true }),
    logoInstansi: T({ x: 13, y: 7, w: 24 }), logoSekolah: T({ x: 87, y: 7, w: 24 }),
    judul: T({ y: 22, text: 'PIAGAM PENGHARGAAN', font: gaya === 'modern' ? 'Montserrat' : 'Cinzel', size: 34, bold: true, color: gold }),
    nomor: T({ y: 31, text: 'Nomor: {no}/PGM/{tahun}', size: 11, color: '#475569' }),
    diberikan: T({ y: 37, text: 'Diberikan kepada:', size: 14, italic: true }),
    nama: T({ y: 42, text: '{nama}', font: gaya === 'modern' ? 'Playfair Display' : 'Great Vibes', size: 44, color: '#1E3A5F', bold: gaya === 'modern' }),
    kelas: T({ y: 54, text: 'Kelas {kelas}', size: 14 }),
    juara: T({ y: 60, text: 'Sebagai JUARA {juara}', size: 20, bold: true, color: gold }),
    cabang: T({ y: 67, text: '{cabang}', size: 16, bold: true }),
    event: T({ y: 72.5, text: 'dalam rangka {event}', size: 13 }),
    tanggal: T({ x: 73, y: 75.5, text: '{tempat}, {tanggal}', size: 11.5 }),
    ttd1: T({ x: 27, y: 79, size: 11.5 }), ttd2: T({ x: 73, y: 79, size: 11.5 }),
    teks: T({ y: 48, text: '', size: 12, show: false })
  };
}
function gabungLayout(base, saved) {
  const out = {};
  Object.keys(base).forEach(k => { out[k] = Object.assign({}, base[k], (saved && saved[k]) || {}); });
  return out;
}
function tplById(id) {
  const boot = AppState.boot || {}, saved = (boot.templates || []).find(t => t.TemplateID === id);
  const baw = TPL_BAWAAN.find(t => t.TemplateID === id);
  if (baw) return { TemplateID: id, NamaTemplate: baw.NamaTemplate, gaya: baw.gaya, Sumber: 'Bawaan', LatarFileId: '', TataLetak: gabungLayout(layoutBaku(baw.gaya), saved && saved.TataLetak) };
  if (saved) return { TemplateID: id, NamaTemplate: saved.NamaTemplate, gaya: 'unggahan', Sumber: 'Unggahan', LatarFileId: saved.LatarFileId, TataLetak: gabungLayout(layoutBaku('formal'), saved.TataLetak) };
  return tplById('tpl-klasik');
}
function latarPiagam(tpl) {
  const p = 'position:absolute;';
  switch (tpl.gaya) {
    case 'klasik': return '<div style="' + p + 'inset:0;background:#FFFDF7"></div><div style="' + p + 'inset:6mm;border:2.4mm solid #C9972E;border-radius:2mm"></div><div style="' + p + 'inset:10.5mm;border:.6mm solid #1E3A5F"></div>' +
      ['top:5mm;left:5mm', 'top:5mm;right:5mm', 'bottom:5mm;left:5mm', 'bottom:5mm;right:5mm'].map(pos => '<div style="' + p + pos + ';width:11mm;height:11mm;background:#1E3A5F;transform:rotate(45deg);border:1mm solid #E9C46A"></div>').join('') +
      '<div style="' + p + 'left:50%;top:15.5mm;width:60mm;height:.5mm;margin-left:-30mm;background:#C9972E"></div><div style="' + p + 'left:50%;bottom:15.5mm;width:60mm;height:.5mm;margin-left:-30mm;background:#C9972E"></div>';
    case 'modern': return '<div style="' + p + 'inset:0;background:#fff"></div><div style="' + p + 'left:0;top:0;bottom:0;width:16mm;background:var(--primary)"></div><div style="' + p + 'left:16mm;top:0;bottom:0;width:3mm;background:var(--primary-tint-2)"></div>' +
      '<div style="' + p + 'right:-30mm;top:-30mm;width:90mm;height:90mm;border-radius:50%;background:var(--primary-tint)"></div><div style="' + p + 'right:12mm;bottom:12mm;width:40mm;height:1mm;background:var(--primary)"></div>';
    case 'ceria': return '<div style="' + p + 'inset:0;background:linear-gradient(135deg,#F472B6,#F59E0B 30%,#22C55E 55%,#3B82F6 80%,#8B5CF6)"></div><div style="' + p + 'inset:7mm;background:#fff;border-radius:6mm"></div>' +
      Array.from({ length: 22 }, (_, i) => { const c = ['#F472B6', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'][i % 5]; const x = (i * 37) % 100, y = i % 2 ? 9 + (i * 3) % 6 : 86 + (i * 5) % 5; return '<div style="' + p + 'left:' + x + '%;top:' + y + '%;width:' + (2 + i % 3) + 'mm;height:' + (2 + i % 3) + 'mm;border-radius:50%;background:' + c + ';opacity:.55"></div>'; }).join('');
    case 'formal': return '<div style="' + p + 'inset:0;background:#fff"></div><div style="' + p + 'inset:8mm;border:3.5mm solid #1E3A5F"></div><div style="' + p + 'inset:13.5mm;border:.4mm solid #1E3A5F"></div>';
    default: return '<div style="' + p + 'inset:0;background:#fff"></div>' + (tpl.LatarFileId ? '<img src="' + imgUrl(tpl.LatarFileId, 2000) + '" style="' + p + 'inset:0;width:100%;height:100%;object-fit:cover" alt="">' : '');
  }
}
function isiTeks(t, d) { return String(t || '').replace(/\{(\w+)\}/g, (m, k) => d[k] !== undefined ? d[k] : m); }
/** Satu halaman piagam 297×210 mm. opt.edit → elemen bisa dipilih (editor). */
function renderPiagam(tpl, d, opt = {}) {
  const L = tpl.TataLetak, s = settingsNow(), cfg = opt.cfg || { kop: false, ttd: true };
  const els = [];
  const box = (k, inner, extra) => {
    const e = L[k]; if (!e) return;
    if (!e.show && !opt.edit) return;
    const tx = e.align === 'left' ? '0' : e.align === 'right' ? '-100%' : '-50%';
    els.push('<div class="' + (opt.edit ? 'pe-el' + (e.show ? '' : ' hide') + (opt.sel === k ? ' sel' : '') : '') + '" data-el="' + k + '" style="position:absolute;left:' + e.x + '%;top:' + e.y + '%;transform:translateX(' + tx + ');text-align:' + e.align + ';' + (extra || '') + '">' + inner + '</div>');
  };
  const txt = (k) => { const e = L[k]; return 'font-family:\'' + e.font + '\',serif;font-size:' + e.size + 'pt;font-weight:' + (e.bold ? 700 : 400) + ';font-style:' + (e.italic ? 'italic' : 'normal') + ';color:' + e.color + ';white-space:nowrap;line-height:1.15'; };
  if (cfg.kop) box('kop', '<div style="width:250mm" class="doc">' + susunKop(s) + '</div>');
  if (!cfg.kop) {
    box('logoInstansi', '<div style="width:' + L.logoInstansi.w + 'mm;height:' + L.logoInstansi.w + 'mm">' + (logoHtml(s.LogoInstansiUrl) || (opt.edit ? '<div style="width:100%;height:100%;border:1px dashed #94A3B8;border-radius:50%"></div>' : '')).replace('<img', '<img style="width:100%;height:100%;object-fit:contain"').replace('<svg', '<svg style="width:100%;height:100%"') + '</div>');
    box('logoSekolah', '<div style="width:' + L.logoSekolah.w + 'mm;height:' + L.logoSekolah.w + 'mm">' + (logoHtml(s.LogoUrl) || (opt.edit ? '<div style="width:100%;height:100%;border:1px dashed #94A3B8;border-radius:50%"></div>' : '')).replace('<img', '<img style="width:100%;height:100%;object-fit:contain"').replace('<svg', '<svg style="width:100%;height:100%"') + '</div>');
  }
  ['judul', 'nomor', 'diberikan', 'nama', 'kelas', 'juara', 'cabang', 'event', 'tanggal', 'teks'].forEach(k => {
    if (!L[k]) return;
    const t = isiTeks(L[k].text, d);
    if (!t && !opt.edit) return;
    box(k, '<div style="' + txt(k) + '">' + esc(t || (opt.edit ? '[' + EL_LABEL[k] + ']' : '')) + '</div>');
  });
  // tanda tangan
  const blok = [];
  const p2 = cfg.pt2 ? ptkById(cfg.pt2) : null;
  if (p2) blok.push({ jab: cfg.jabatan2 || p2.Jabatan || 'Ketua Panitia', p: p2 });
  if (cfg.ttd) blok.push({ jab: 'Kepala ' + (s.NamaSekolah || 'Sekolah'), p: kepsek() });
  const ttd = (k, b) => box(k, '<div style="' + txt(k).replace('white-space:nowrap', 'white-space:normal') + ';min-width:62mm">' + esc(b.jab) + ',<div style="height:15mm"></div><div style="font-weight:700;text-decoration:underline">' + esc(b.p ? b.p.Nama : '..............................') + '</div><div>' + esc(nomorPtk(b.p)) + '</div></div>');
  if (blok.length === 2) { ttd('ttd1', blok[0]); ttd('ttd2', blok[1]); }
  else if (blok.length === 1) ttd('ttd2', blok[0]);
  else if (opt.edit) { ttd('ttd1', { jab: '(tanpa tanda tangan)', p: null }); }
  return '<div class="piagam-page print-page" style="width:297mm;height:210mm;position:relative;overflow:hidden;background:#fff;font-family:\'Plus Jakarta Sans\',sans-serif">' + latarPiagam(tpl) + els.join('') +
    (AppState.mode === 'demo' ? '<div class="doc" style="position:absolute;inset:0;background:none"><div class="wm"><span>DEMO — BUKAN DOKUMEN RESMI</span></div></div>' : '') + '</div>';
}
function fontsLayout(L) { return uniq(Object.values(L).map(e => e.font).filter(Boolean)); }
function dataPiagam(det, c, p, i) {
  const s = settingsNow(), d = parseTgl(c.TanggalPelaksanaan || det.event.TanggalSelesai) || new Date();
  return { nama: p.NamaTampil, kelas: p.Kelas, juara: p.juara || (p.harapan ? 'HARAPAN ' + p.harapan : ''), cabang: (/^lomba/i.test(c.NamaCabang) ? '' : 'Lomba ') + c.NamaCabang, event: det.event.Judul,
    tanggal: tgl(c.TanggalPelaksanaan || det.event.TanggalSelesai), tempat: s.TempatTtd || '', no: String(i + 1).padStart(3, '0'), tahun: d.getFullYear(), sekolah: s.NamaSekolah || '' };
}

/* ---------------- Cetak ---------------- */
async function printHtml(html, landscape) {
  const root = document.getElementById('print-root');
  root.innerHTML = '<style>@page{size:A4 ' + (landscape ? 'landscape' : 'portrait') + ';margin:0}</style>' + html;
  const fams = uniq((html.match(/font-family:'([^']+)'/g) || []).map(x => x.replace(/font-family:'|'/g, '')));
  await loadFonts(fams);
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.race([Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))), sleep(3500)]);
  window.print();
}

/**
 * Jendela cetak dengan sakelar Kop & TTD Kepala Sekolah + penanda tangan ke-2 + pratinjau.
 * o: { det, jenis, title, build(cfg) → html, landscape, extra: html opsional, onExtra(m, rerender) }
 */
function openCetak(o) {
  const det = o.det, base = cetakCfg(det, o.jenis), cfg = Object.assign({}, base);
  const ptk = (AppState.boot && AppState.boot.ptk || []).filter(p => p.Aktif !== 'Tidak');
  const lock = base.kunci;
  const m = modal({
    title: 'Cetak ' + (o.title || JENIS_LABEL[o.jenis]), size: 'xl', sub: esc(det.event.Judul),
    body: '<div class="row row-wrap gap-16" style="align-items:flex-start">' +
      '<div style="flex:0 0 280px;max-width:100%" class="stack">' +
      (o.extra || '') +
      '<label class="switch"><input type="checkbox" id="ck-kop"' + (cfg.kop ? ' checked' : '') + (lock ? ' disabled' : '') + '><span class="track"></span><span><b>Gunakan Kop Surat</b>' + (lock ? '<br><span class="hint">Wajib untuk dokumen ini</span>' : '') + '</span></label>' +
      '<label class="switch"><input type="checkbox" id="ck-ttd"' + (cfg.ttd ? ' checked' : '') + (lock ? ' disabled' : '') + '><span class="track"></span><span><b>Tanda Tangan Kepala Sekolah</b>' + (lock ? '<br><span class="hint">Wajib untuk dokumen ini</span>' : '') + '</span></label>' +
      (o.jenis !== 'SK' ? '<div class="field"><label>Penanda tangan ke-2 (opsional)</label><select class="select" id="sel-pt2"><option value="">— Tidak ada —</option>' + ptk.map(p => '<option value="' + esc(p.PTK_ID) + '"' + (cfg.pt2 === p.PTK_ID ? ' selected' : '') + '>' + esc(p.Nama) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Jabatan yang ditampilkan</label><input class="input" id="in-jab2" placeholder="mis. Ketua Panitia" value="' + esc(cfg.jabatan2) + '"></div>' : '') +
      (!kepsek() ? '<div class="alert alert-amber small">' + ic('triangle-alert', 'ic-sm') + '<span>Kepala sekolah belum dipilih di Pengaturan › Umum.</span></div>' : '') +
      '<label class="check"><input type="checkbox" id="ck-simpan"> Simpan sebagai pengaturan event ini</label>' +
      '</div>' +
      '<div style="flex:1 1 0;min-width:300px"><div class="label mb-8">Pratinjau</div><div class="doc-preview-host" id="prev-host"><div class="doc-preview-scale" id="prev"></div></div></div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="btn-print">' + ic('printer', 'ic-sm') + ' Cetak / Simpan PDF</button>'
  });
  const rerender = () => {
    cfg.kop = m.q('#ck-kop').checked; cfg.ttd = m.q('#ck-ttd').checked;
    if (m.q('#sel-pt2')) { cfg.pt2 = m.q('#sel-pt2').value; cfg.jabatan2 = m.q('#in-jab2').value; }
    const html = o.build(cfg);
    const prev = m.q('#prev'), host = m.q('#prev-host');
    prev.innerHTML = html || '<div class="empty">Tidak ada dokumen untuk dicetak.</div>';
    const w = o.landscape ? 1123 : 794, avail = host.clientWidth - 32;
    const sc = Math.min(1, avail / w);
    prev.style.transform = 'scale(' + sc + ')';
    prev.style.width = w + 'px';
    prev.style.marginBottom = (-(prev.scrollHeight * (1 - sc))) + 'px';
    loadFonts(uniq((html.match(/font-family:'([^']+)'/g) || []).map(x => x.replace(/font-family:'|'/g, ''))));
  };
  m.el.addEventListener('change', rerender);
  m.el.addEventListener('input', debounce(rerender, 250));
  if (o.onExtra) o.onExtra(m, rerender, cfg);
  setTimeout(rerender, 20);
  m.q('#btn-print').onclick = async () => {
    rerender();
    if (m.q('#ck-simpan').checked) {
      api('simpanCetak', { eventId: det.event.EventID, jenis: o.jenis, PakaiKop: cfg.kop, TtdKepsek: cfg.ttd, PenandaTangan2_PTK_ID: cfg.pt2, JabatanTampil2: cfg.jabatan2, Opsi: Object.assign({}, cfg.opsi, o.opsi ? o.opsi(m) : {}) })
        .then(res => { if (res.success) { toast('Pengaturan cetak disimpan'); if (window.invalidateEvent) invalidateEvent(det.event.EventID); } });
    }
    const html = o.build(cfg);
    if (!html) return toast('Tidak ada dokumen', '', 'warning');
    printHtml(html, o.landscape);
  };
  return m;
}
