/* ============================================================
   MEvent — admin2.js
   Formulir (daftar, pembuat, jawaban), Pengaturan (umum, kop,
   tampilan, Mode Demo, akun), Editor Piagam, Layar Proyektor.
   ============================================================ */
'use strict';

/* ============================================================
   FORMULIR — daftar semua
   ============================================================ */
registerPage('formulir-admin', {
  layout: 'shell', auth: 'staff', nav: 'formulir-admin', title: 'Formulir',
  init(el) {
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'baru') pilihEventForm();
      if (b.dataset.act === 'salin') { if (await copyText(b.dataset.v)) toast('Link disalin', b.dataset.v); }
    });
  },
  show(el) {
    const forms = B().forms || [], base = location.href.split('#')[0];
    el.innerHTML = pageHead('Formulir', 'Formulir pendaftaran untuk lomba, pemilihan, dan event lain', '<button class="btn btn-primary" data-act="baru">' + ic('plus', 'ic-sm') + ' Buat Formulir</button>') +
      (forms.length ? '<div class="card" style="overflow:hidden"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Formulir</th><th>Event</th><th>Akses</th><th>Batas</th><th class="num">Jawaban</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
        forms.map(f => '<tr><td><div class="row"><span class="icon-tile" style="width:38px;height:38px">' + ic('file-text', 'ic-sm') + '</span><b>' + esc(f.Judul) + '</b></div></td><td class="small">' + esc(f.EventJudul) + '</td><td>' + (f.Akses === 'LoginSiswa' ? '<span class="badge">Siswa (NISN)</span>' : '<span class="badge badge-gray">Link publik</span>') + '</td><td class="small">' + esc(f.BatasWaktu ? tglPendek(f.BatasWaktu) : '-') + '</td><td class="num"><b>' + f.jumlahJawaban + '</b></td>' +
          '<td><span class="badge ' + (f.Status === 'Buka' ? 'badge-green' : 'badge-gray') + '">' + (f.Status === 'Buka' ? 'Dibuka' : 'Ditutup') + '</span></td><td style="text-align:right;white-space:nowrap"><a class="btn btn-soft btn-sm" href="#/jawaban/' + esc(f.FormID) + '">' + ic('inbox', 'ic-sm') + ' Jawaban</a> <a class="btn btn-sm btn-icon" href="#/form/' + esc(f.FormID) + '" title="Ubah">' + ic('pencil', 'ic-sm') + '</a> <button class="btn btn-sm btn-icon" data-act="salin" data-v="' + esc(base + '#/f/' + f.TokenLink) + '" title="Salin link">' + ic('link', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div></div>'
        : '<div class="card">' + emptyState('file-plus', 'Belum ada formulir', 'Formulir dibuat di dalam event (lomba, OSIS, atau lainnya).', '<button class="btn btn-primary" data-act="baru">' + ic('plus', 'ic-sm') + ' Buat Formulir</button>') + '</div>');
  }
});
function pilihEventForm() {
  const evs = B().events || [];
  if (!evs.length) return toast('Buat event dulu', 'Formulir selalu terhubung ke sebuah event.', 'info');
  const m = modal({ title: 'Formulir untuk event…', body: evs.map(e => '<div class="card menu-card card-tap" data-id="' + esc(e.EventID) + '" tabindex="0" role="button"><span class="icon-tile">' + ic(jenisIcon(e.JenisEvent)) + '</span><div class="grow"><div class="t">' + esc(e.Judul) + '</div><div class="s">' + esc(e.JenisEvent) + ' · ' + esc(rentangTgl(e.TanggalMulai, e.TanggalSelesai)) + '</div></div><span class="chev">' + ic('chevron-right') + '</span></div>').join('') });
  m.el.addEventListener('click', (e) => { const c = e.target.closest('[data-id]'); if (c) { m.close(); go('form/baru/' + c.dataset.id); } });
}

/* ============================================================
   PEMBUAT FORMULIR
   ============================================================ */
const QTYPES = [
  ['singkat', 'minus', '', 'Jawaban Singkat', 'Teks sebaris'], ['panjang', 'align-left', '', 'Jawaban Panjang', 'Paragraf / narasi'],
  ['angka', 'hash', 'green', 'Angka', 'NISN, nomor telp'], ['checkbox', 'square-check', 'amber', 'Checkbox', 'Multi-centang & syarat'],
  ['pilihan_ganda', 'circle-dot', '', 'Pilihan Ganda', 'Pilih salah satu'], ['unggah_berkas', 'file-up', 'red', 'Unggah Berkas', 'Foto, PDF naskah']
];
const QLABEL = Object.fromEntries(QTYPES.map(q => [q[0], q[3]]));
registerPage('form', {
  layout: 'bare', auth: 'staff', title: 'Pembuat Formulir',
  init(el) {
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && FB[b.dataset.act]) FB[b.dataset.act](el, b, e); });
    el.addEventListener('input', (e) => { const t = e.target; if (!el._fb) return; fbInput(el, t); });
    el.addEventListener('change', (e) => { const t = e.target; if (!el._fb) return; fbInput(el, t, true); });
    el.addEventListener('focusin', (e) => { const q = e.target.closest('[data-qi]'); if (q && el._fb && el._fb.sel !== +q.dataset.qi) { el._fb.sel = +q.dataset.qi; $$('.qcard', el).forEach(c => c.classList.toggle('sel', +c.dataset.qi === el._fb.sel)); } });
  },
  async show(el, id, eventId) {
    el._fb = null;
    el.innerHTML = '<div class="fb-top"><a class="btn btn-ghost" href="#/formulir-admin">' + ic('arrow-left', 'ic-sm') + ' Kembali</a><b>Memuat…</b></div><div style="padding:24px">' + skeletonCards(4, 110) + '</div>';
    let det, f;
    if (id === 'baru') {
      await loadEvent(eventId, (d) => { det = d; });
      det = det || AppState.ev[eventId];
      if (!det) { el.innerHTML = errorBox('Event tidak ditemukan.'); return; }
      f = { FormID: '', EventID: eventId, Judul: 'Formulir Pendaftaran ' + det.event.Judul.replace(/^DEMO — /, ''), Deskripsi: 'Isi data diri dengan lengkap dan benar.', Akses: 'LinkPublik', Status: 'Buka', BatasWaktu: '', CabangID: el._preCab || '', pertanyaan: [
        { Tipe: 'singkat', Label: 'Nama Lengkap', Wajib: true, Petunjuk: 'Sesuai rapor atau kartu pelajar' },
        { Tipe: 'angka', Label: 'NISN', Wajib: true, AturanAngka: { operator: '=', jumlahDigit: 10 } },
        { Tipe: 'pilihan_ganda', Label: 'Kelas', Wajib: true, Opsi: (B().kelas || ['7A', '7B', '8A']).slice(0, 12) }] };
    } else {
      const meta = (B().forms || []).find(x => x.FormID === id);
      if (!meta) { await ensureStaffBoot(true); }
      const m2 = (B().forms || []).find(x => x.FormID === id);
      if (!m2) { el.innerHTML = errorBox('Formulir tidak ditemukan.'); return; }
      await loadEvent(m2.EventID, (d) => { det = d; });
      det = det || AppState.ev[m2.EventID];
      f = det && det.formulir.find(x => x.FormID === id);
      if (!f) { el.innerHTML = errorBox('Formulir tidak ditemukan.'); return; }
      f = JSON.parse(JSON.stringify(f));
    }
    el._fb = { det, f, qs: f.pertanyaan.map(q => Object.assign({ Opsi: [], Petunjuk: '' }, q)), sel: 0, saved: id !== 'baru', savedAt: '', dirty: false };
    fbPaint(el);
  }
});
function fbPaint(el) {
  const S = el._fb, f = S.f, det = S.det, base = location.href.split('#')[0];
  const cabs = det.event.JenisEvent === 'Lomba' ? det.cabang : [];
  const jml = f.jumlahJawaban || 0;
  el.innerHTML = '<div class="fb-top"><a class="btn btn-ghost" href="#/' + (S.saved ? 'jawaban/' + f.FormID : 'ev/' + det.event.EventID + '/formulir') + '">' + ic('arrow-left', 'ic-sm') + ' <span class="hide-sm">Kembali</span></a>' +
    '<div class="grow ellipsis" style="font-weight:700;font-size:16px">' + esc(f.Judul || 'Formulir tanpa judul') + '</div><span class="badge ' + (S.saved ? 'badge-green' : 'badge-gray') + '" id="fb-saved">' + (S.saved ? '<span class="dot"></span>' + (S.savedAt ? 'Tersimpan otomatis · ' + S.savedAt : 'Tersimpan') : 'Belum disimpan') + '</span>' +
    '<button class="btn btn-ghost" data-act="toggle-left" title="Jenis isian">' + ic('plus', 'ic-sm') + '</button><button class="btn btn-ghost" data-act="preview">' + ic('eye', 'ic-sm') + ' Pratinjau</button><button class="btn" data-act="cetak">' + ic('printer', 'ic-sm') + ' Cetak Formulir Kosong</button><button class="btn btn-ghost btn-icon" data-act="toggle-right" title="Pengaturan">' + ic('sliders-horizontal', 'ic-sm') + '</button><button class="btn btn-primary" data-act="simpan">' + ic('save', 'ic-sm') + ' Simpan</button></div>' +
    '<div class="fb" id="fb"><div class="fb-left"><div class="row" style="font-weight:700;letter-spacing:.04em">' + ic('circle-plus', 'ic-sm') + ' TAMBAH ISIAN</div><div class="small muted mb-16">Klik untuk menambah di bawah isian terpilih</div>' +
    QTYPES.map(q => '<button class="qtype" data-act="add" data-t="' + q[0] + '"><span class="icon-tile ' + q[2] + '">' + ic(q[1], 'ic-sm') + '</span><span><b>' + q[3] + '</b><span>' + q[4] + '</span></span></button>').join('') +
    '<div class="subcard small mt-16">💡 <b>Tips:</b> Seret pegangan ⋮⋮ untuk mengubah urutan isian.</div></div>' +
    '<div class="fb-canvas"><div class="fb-canvas-inner"><div class="card card-pad" style="border-top:6px solid var(--primary)"><div class="row between"><input class="qlabel-input" style="font-size:24px;font-weight:800" data-f="Judul" value="' + esc(f.Judul) + '" placeholder="Judul formulir"><span class="badge ' + (f.Status === 'Buka' ? 'badge-green' : 'badge-gray') + '">' + (f.Status === 'Buka' ? '<span class="dot"></span>Aktif' : 'Ditutup') + '</span></div>' +
    '<textarea class="textarea mt-8" data-f="Deskripsi" rows="2" placeholder="Deskripsi formulir" style="border-color:transparent;background:var(--bg)">' + esc(f.Deskripsi) + '</textarea>' +
    '<div class="row row-wrap mt-12">' + (f.CabangID ? '<span class="badge">' + ic('trophy', 'ic-sm') + ' Terkoneksi ke Cabang: ' + esc((cabs.find(c => c.CabangID === f.CabangID) || {}).NamaCabang || '-') + '</span>' : '') + (f.BatasWaktu ? '<span class="badge badge-amber">' + ic('clock', 'ic-sm') + ' Batas: ' + esc(tglPendek(f.BatasWaktu)) + '</span>' : '') + '<span class="badge badge-gray">' + ic('calendar', 'ic-sm') + ' ' + esc(det.event.Judul) + '</span></div></div>' +
    '<div id="qlist" class="stack gap-12">' + S.qs.map((q, i) => fbCard(q, i, S.sel === i)).join('') + '</div>' +
    (S.qs.length ? '' : '<div class="card">' + emptyState('list-plus', 'Mulai dengan menambah isian', 'Pilih jenis isian dari panel kiri.') + '</div>') +
    '<div class="row row-wrap" style="justify-content:center">' + QTYPES.map(q => '<button class="btn btn-sm" data-act="add" data-t="' + q[0] + '">' + ic(q[1], 'ic-sm') + ' ' + q[3] + '</button>').join('') + '</div></div></div>' +
    '<div class="fb-right"><div class="row between"><div class="row" style="font-weight:700;font-size:17px">' + ic('sliders-horizontal') + ' Pengaturan Formulir</div></div>' +
    '<div class="label mt-16 mb-8">Akses Formulir</div>' +
    [['LoginSiswa', 'Khusus Siswa Login', 'Wajib verifikasi NISN siswa terdaftar'], ['LinkPublik', 'Siapa Saja yang Punya Link', 'Formulir publik via tautan langsung']].map(a => '<label class="radio-card' + (f.Akses === a[0] ? ' on' : '') + '"><input type="radio" name="akses" value="' + a[0] + '"' + (f.Akses === a[0] ? ' checked' : '') + '><span><b>' + a[1] + '</b><br><span class="small muted">' + a[2] + '</span></span></label>').join('') +
    (S.saved ? '<div class="label mt-16 mb-8">Tautan Formulir</div><div class="row"><input class="input input-sm grow" readonly value="' + esc(base + '#/f/' + f.TokenLink) + '"><button class="btn btn-primary btn-sm" data-act="salin">' + ic('copy', 'ic-sm') + ' Salin</button></div>' : '<div class="hint mt-16">Tautan tersedia setelah formulir disimpan.</div>') +
    '<div class="subcard mt-16 row between"><div><b>Status Pendaftaran</b><div class="small" style="color:' + (f.Status === 'Buka' ? 'var(--green-text)' : 'var(--muted)') + '">' + (f.Status === 'Buka' ? '● Dibuka (Menerima Respon)' : 'Ditutup') + '</div></div><label class="switch"><input type="checkbox" data-f="Status"' + (f.Status === 'Buka' ? ' checked' : '') + '><span class="track"></span></label></div>' +
    '<div class="field mt-16"><label>Batas Waktu Pengisian</label><input class="input" type="date" data-f="BatasWaktu" value="' + esc(String(f.BatasWaktu || '').slice(0, 10)) + '"><div class="hint">Formulir otomatis ditutup setelah tanggal ini.</div></div>' +
    (cabs.length ? '<div class="field mt-16"><label>Terhubung ke Cabang Lomba</label><select class="select" data-f="CabangID"><option value="">— Tidak —</option>' + cabs.map(c => '<option value="' + esc(c.CabangID) + '"' + (f.CabangID === c.CabangID ? ' selected' : '') + '>' + esc(c.NamaCabang) + '</option>').join('') + '</select></div>' : '') +
    (S.saved ? '<div class="card card-pad mt-16"><div class="small muted" style="font-weight:700;letter-spacing:.05em">RESPON MASUK</div><div class="row" style="align-items:baseline"><span style="font-size:34px;font-weight:800">' + jml + '</span><span class="muted">pendaftar</span></div><a class="link-btn mt-8" href="#/jawaban/' + esc(f.FormID) + '">Lihat Jawaban Peserta ' + ic('arrow-right', 'ic-sm') + '</a></div>' +
      '<button class="btn btn-ghost btn-block mt-16" data-act="hapus" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + ' Hapus formulir</button>' : '') + '</div></div>';
  const ql = $('#qlist', el);
  if (ql) dragSort(ql, '.qcard', (ids) => { S.qs = ids.map(i => S.qs[+i]); S.sel = 0; fbDirty(el); fbPaint(el); }, 'qi');
}
function fbCard(q, i, sel) {
  let body = '';
  if (q.Tipe === 'singkat') body = '<div class="input" style="display:flex;align-items:center;color:var(--muted-2);background:var(--bg)">Teks jawaban singkat…</div>';
  if (q.Tipe === 'panjang') body = '<div class="textarea" style="color:var(--muted-2);background:var(--bg);min-height:64px">Teks jawaban panjang…</div>';
  if (q.Tipe === 'angka') { const a = q.AturanAngka || { operator: '=', jumlahDigit: '' }; body = '<div class="rule-box"><div class="row between"><b class="row small">' + ic('ruler', 'ic-sm') + ' Validasi Input Angka</b><span class="badge ' + (a.jumlahDigit ? 'badge-green' : 'badge-gray') + '">' + (a.jumlahDigit ? 'Aktif' : 'Tidak ada aturan') + '</span></div>' +
    '<div class="grid-2 mt-8"><select class="select input-sm" data-qf="op" data-qi="' + i + '"><option value="=">Panjang Tepat (=)</option><option value="<"' + (a.operator === '<' ? ' selected' : '') + '>Kurang dari (<)</option><option value=">"' + (a.operator === '>' ? ' selected' : '') + '>Lebih dari (>)</option></select><div class="row"><span class="small muted" style="white-space:nowrap">Jumlah digit:</span><input class="input input-sm" type="number" min="1" max="30" data-qf="dg" data-qi="' + i + '" value="' + esc(a.jumlahDigit || '') + '" placeholder="mis. 10"></div></div>' +
    (a.jumlahDigit ? '<div class="small mt-8" style="color:var(--green-text)">' + ic('circle-check', 'ic-sm') + ' ' + (a.operator === '=' ? 'Harus tepat ' : a.operator === '<' ? 'Kurang dari ' : 'Lebih dari ') + a.jumlahDigit + ' digit angka (tanpa spasi/tanda hubung).</div>' : '') + '</div>'; }
  if (q.Tipe === 'pilihan_ganda' || q.Tipe === 'checkbox') body = (q.Opsi || []).map((o, j) => '<div class="opt-row"><span class="mk ' + (q.Tipe === 'checkbox' ? 'c' : 'r') + '"></span><input data-qf="opt" data-qi="' + i + '" data-oi="' + j + '" value="' + esc(o) + '" placeholder="Opsi ' + (j + 1) + '"><button class="btn btn-ghost btn-icon btn-sm" data-act="opt-del" data-qi="' + i + '" data-oi="' + j + '">' + ic('x', 'ic-sm') + '</button></div>').join('') +
    '<button class="link-btn mt-8" data-act="opt-add" data-qi="' + i + '">' + ic('plus', 'ic-sm') + ' Tambah Opsi</button>';
  if (q.Tipe === 'unggah_berkas') { const a = q.AturanBerkas || { jenis: ['jpg', 'png', 'pdf'], maksMB: 2 }; body = '<div class="rule-box"><b class="small">Jenis berkas yang diizinkan</b><div class="row row-wrap mt-8">' + ['jpg', 'png', 'pdf', 'docx'].map(x => '<span class="ftype-chip' + (a.jenis.indexOf(x) > -1 ? ' on' : '') + '" data-act="ftype" data-qi="' + i + '" data-v="' + x + '">' + x.toUpperCase() + '</span>').join('') + '</div>' +
    '<div class="row mt-12"><span class="small muted">Ukuran maksimal</span><input class="input input-sm" style="width:90px" type="number" step="0.5" min="0.5" max="2" data-qf="mb" data-qi="' + i + '" value="' + a.maksMB + '"><span class="small muted">MB (maks. 2 MB)</span></div></div>'; }
  return '<div class="qcard' + (sel ? ' sel' : '') + '" data-qi="' + i + '"><div class="qcard-head"><span class="drag-h" data-drag title="Geser">' + ic('grip-vertical', 'ic-sm') + '</span><span class="qnum">' + (i + 1) + '</span><input class="qlabel-input" data-qf="label" data-qi="' + i + '" value="' + esc(q.Label) + '" placeholder="Judul isian">' + (q.Wajib ? '<span class="req">*</span>' : '') +
    '<span class="badge badge-gray hide-sm">' + esc(QLABEL[q.Tipe]) + '</span><label class="check small" title="Wajib diisi"><input type="checkbox" data-qf="wajib" data-qi="' + i + '"' + (q.Wajib ? ' checked' : '') + '> Wajib</label>' +
    '<button class="btn btn-ghost btn-icon btn-sm" data-act="dup" data-qi="' + i + '" title="Duplikat">' + ic('copy', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="del" data-qi="' + i + '" title="Hapus">' + ic('trash-2', 'ic-sm') + '</button></div>' +
    '<input class="input input-sm mt-8" data-qf="hint" data-qi="' + i + '" value="' + esc(q.Petunjuk || '') + '" placeholder="Petunjuk (opsional)" style="border-color:transparent;background:var(--bg)"><div class="mt-12">' + body + '</div></div>';
}
function fbInput(el, t, change) {
  const S = el._fb, f = S.f;
  if (t.name === 'akses') { f.Akses = t.value; $$('.fb-right .radio-card', el).forEach(c => c.classList.toggle('on', c.querySelector('input').checked)); return fbDirty(el); }
  if (t.dataset.f) {
    const k = t.dataset.f;
    if (k === 'Status') { f.Status = t.checked ? 'Buka' : 'Tutup'; fbDirty(el); return fbPaint(el); }
    f[k] = t.value; fbDirty(el);
    if (change && (k === 'CabangID' || k === 'BatasWaktu')) fbPaint(el);
    return;
  }
  if (!t.dataset.qf) return;
  const q = S.qs[+t.dataset.qi]; if (!q) return;
  switch (t.dataset.qf) {
    case 'label': q.Label = t.value; break;
    case 'hint': q.Petunjuk = t.value; break;
    case 'wajib': q.Wajib = t.checked; if (change) fbPaint(el); break;
    case 'opt': q.Opsi[+t.dataset.oi] = t.value; break;
    case 'op': q.AturanAngka = Object.assign({ jumlahDigit: '' }, q.AturanAngka, { operator: t.value }); if (change) fbPaint(el); break;
    case 'dg': q.AturanAngka = Object.assign({ operator: '=' }, q.AturanAngka, { jumlahDigit: t.value ? +t.value : '' }); if (change) fbPaint(el); break;
    case 'mb': q.AturanBerkas = Object.assign({ jenis: ['jpg', 'png', 'pdf'] }, q.AturanBerkas, { maksMB: Math.min(2, Math.max(0.5, +t.value || 2)) }); break;
  }
  fbDirty(el);
}
const fbAutosave = debounce((el) => { if (el._fb && el._fb.saved && el._fb.dirty && !el.hidden) fbSimpan(el, null, true); }, 3000);
function fbDirty(el) { el._fb.dirty = true; const b = $('#fb-saved', el); if (b) { b.className = 'badge badge-amber'; b.textContent = 'Ada perubahan…'; } fbAutosave(el); }
async function fbSimpan(el, btn, auto) {
  const S = el._fb, f = S.f;
  if (!String(f.Judul || '').trim()) return toast('Judul formulir wajib diisi', '', 'warning');
  const bad = S.qs.findIndex(q => !String(q.Label || '').trim());
  if (bad > -1) { S.sel = bad; fbPaint(el); return toast('Isian ke-' + (bad + 1) + ' belum berjudul', '', 'warning'); }
  const payload = { form: { FormID: f.FormID, EventID: f.EventID, Judul: f.Judul, Deskripsi: f.Deskripsi, Akses: f.Akses, Status: f.Status, BatasWaktu: f.BatasWaktu, CabangID: f.CabangID },
    pertanyaan: S.qs.map(q => ({ PertanyaanID: q.PertanyaanID, Tipe: q.Tipe, Label: q.Label, Petunjuk: q.Petunjuk, Wajib: !!q.Wajib, Opsi: (q.Opsi || []).filter(o => String(o).trim()), AturanAngka: q.AturanAngka, AturanBerkas: q.AturanBerkas })) };
  S.dirty = false;
  const run = () => api('simpanFormulir', payload);
  const res = btn ? await busy(btn, run) : await run();
  if (!res.success) { S.dirty = true; toast('Formulir belum tersimpan', res.message, 'error'); const b = $('#fb-saved', el); if (b) { b.className = 'badge badge-red'; b.textContent = 'Gagal menyimpan'; } return; }
  const first = !S.saved;
  Object.assign(f, res.data.form);
  res.data.pertanyaan.forEach((q, i) => { if (S.qs[i]) S.qs[i].PertanyaanID = q.PertanyaanID; });
  S.saved = true; S.savedAt = new Date().toTimeString().slice(0, 5);
  if (!auto) toast('Formulir disimpan', f.Judul);
  invalidateEvent(f.EventID);
  if (first) { history.replaceState(null, '', '#/form/' + f.FormID); fbPaint(el); }
  else { const b = $('#fb-saved', el); if (b && !S.dirty) { b.className = 'badge badge-green'; b.innerHTML = '<span class="dot"></span>Tersimpan otomatis · ' + S.savedAt; } }
}
const FB = {
  simpan: (el, b) => fbSimpan(el, b),
  'toggle-left': (el) => { $('#fb', el).classList.toggle('show-left'); },
  'toggle-right': (el) => { $('#fb', el).classList.toggle('show-right'); },
  add: (el, b) => {
    const S = el._fb, t = b.dataset.t;
    const q = { Tipe: t, Label: '', Wajib: false, Petunjuk: '', Opsi: t === 'pilihan_ganda' || t === 'checkbox' ? ['Opsi 1', 'Opsi 2'] : [] };
    if (t === 'angka') q.AturanAngka = { operator: '=', jumlahDigit: '' };
    if (t === 'unggah_berkas') q.AturanBerkas = { jenis: ['jpg', 'png', 'pdf'], maksMB: 2 };
    const at = S.qs.length ? S.sel + 1 : 0;
    S.qs.splice(at, 0, q); S.sel = at; fbDirty(el); fbPaint(el);
    $('#fb', el).classList.remove('show-left');
    const c = $('.qcard[data-qi="' + at + '"]', el); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); const i = c.querySelector('.qlabel-input'); if (i) setTimeout(() => i.focus(), 250); }
  },
  dup: (el, b) => { const S = el._fb, i = +b.dataset.qi, q = JSON.parse(JSON.stringify(S.qs[i])); delete q.PertanyaanID; S.qs.splice(i + 1, 0, q); S.sel = i + 1; fbDirty(el); fbPaint(el); },
  del: (el, b) => { const S = el._fb; S.qs.splice(+b.dataset.qi, 1); S.sel = Math.max(0, S.sel - 1); fbDirty(el); fbPaint(el); },
  'opt-add': (el, b) => { const q = el._fb.qs[+b.dataset.qi]; q.Opsi.push('Opsi ' + (q.Opsi.length + 1)); fbDirty(el); fbPaint(el); const ins = $$('.qcard[data-qi="' + b.dataset.qi + '"] .opt-row input', el); const last = ins[ins.length - 1]; if (last) { last.focus(); last.select(); } },
  'opt-del': (el, b) => { el._fb.qs[+b.dataset.qi].Opsi.splice(+b.dataset.oi, 1); fbDirty(el); fbPaint(el); },
  ftype: (el, b) => { const q = el._fb.qs[+b.dataset.qi], a = q.AturanBerkas = q.AturanBerkas || { jenis: [], maksMB: 2 }, v = b.dataset.v, i = a.jenis.indexOf(v); if (i > -1) { if (a.jenis.length > 1) a.jenis.splice(i, 1); } else a.jenis.push(v); fbDirty(el); fbPaint(el); },
  salin: async (el) => { const f = el._fb.f, u = location.href.split('#')[0] + '#/f/' + f.TokenLink; if (await copyText(u)) toast('Link disalin', u); },
  preview: (el) => {
    const S = el._fb;
    modal({ title: 'Pratinjau: ' + S.f.Judul, size: 'lg', body: '<div style="background:var(--bg);border-radius:14px;padding:12px">' + (S.f.Akses === 'LoginSiswa' ? '<div class="card card-pad"><div class="field"><label>NISN <span class="req">*</span></label><input class="input" placeholder="10 digit NISN" disabled></div></div>' : '') +
      S.qs.map((q, i) => formField(Object.assign({ PertanyaanID: 'pv' + i, Opsi: [] }, q), i)).join('') + '<button class="btn btn-primary btn-block btn-lg mt-16" disabled>' + ic('send') + ' Kirim Pendaftaran</button></div>' });
  },
  cetak: async (el, b) => {
    const S = el._fb;
    if (!S.saved || S.dirty) { await fbSimpan(el, b); if (!S.saved) return; }
    const det = AppState.ev[S.f.EventID] || S.det;
    const f = Object.assign({}, S.f, { pertanyaan: S.qs.map((q, i) => Object.assign({ PertanyaanID: 'p' + i, Opsi: [] }, q)) });
    const det2 = Object.assign({}, det, { formulir: [f].concat((det.formulir || []).filter(x => x.FormID !== f.FormID)) });
    cetakDokumen(det2, 'Formulir', { formId: f.FormID });
  },
  hapus: async (el) => {
    const f = el._fb.f;
    if (!(await confirmBox({ title: 'Hapus formulir?', html: '<b>' + esc(f.Judul) + '</b> beserta seluruh jawabannya akan dihapus.', ok: 'Hapus', danger: true }))) return;
    const res = await api('hapusFormulir', { formId: f.FormID });
    if (toastRes(res, 'Formulir dihapus')) { invalidateEvent(f.EventID); go('ev/' + f.EventID + '/formulir'); }
  }
};

/* ============================================================
   JAWABAN FORMULIR
   ============================================================ */
registerPage('jawaban', {
  layout: 'shell', auth: 'staff', nav: 'formulir-admin', title: 'Jawaban Formulir',
  init(el) {
    el._q = '';
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && JW[b.dataset.act]) JW[b.dataset.act](el, b); });
    el.addEventListener('input', debounce((e) => { if (e.target.id === 'jw-q') { el._q = e.target.value.toLowerCase(); jwPaint(el); } }, 200));
  },
  async show(el, formId) {
    el._id = formId;
    const cached = Store.get(userKey('jw:' + formId), null);
    if (!cached) el.innerHTML = pageHead('Jawaban Formulir', 'Memuat…') + '<div class="card card-pad">' + Array.from({ length: 6 }, () => '<div class="sk sk-line" style="height:34px"></div>').join('') + '</div>';
    await swr('jw:' + formId, 'listJawaban', { formId }, (d) => { el._d = d; if (!el.hidden && el._id === formId) jwPaint(el); }, { fresh: 8000, onError: (r) => { el.innerHTML = errorBox(r.message); } });
  }
});
function jwJawabStr(q, v) { if (v === undefined || v === null || v === '') return ''; return Array.isArray(v) ? v.join(', ') : String(v); }
function jwPaint(el) {
  const d = el._d, f = d.form, qs = d.pertanyaan, base = location.href.split('#')[0];
  const show = qs.filter(q => q.Tipe !== 'unggah_berkas' && !/nama/i.test(q.Label)).slice(0, 3);
  const qb = qs.filter(q => q.Tipe === 'unggah_berkas');
  const rows = d.jawaban.filter(j => !el._q || j.nama.toLowerCase().indexOf(el._q) > -1 || JSON.stringify(j.isi).toLowerCase().indexOf(el._q) > -1);
  const ev = evById(f.EventID);
  el.innerHTML = '<div class="crumb"><a href="#/formulir-admin">Formulir</a>' + ic('chevron-right', 'ic-sm') + '<b>' + esc(f.Judul) + '</b></div>' +
    pageHead(esc(f.Judul), esc(ev ? ev.Judul : '') + ' · ' + d.jawaban.length + ' jawaban', '<a class="btn" href="#/form/' + esc(f.FormID) + '">' + ic('pencil', 'ic-sm') + ' Ubah Formulir</a><button class="btn" data-act="salin" data-v="' + esc(base + '#/f/' + f.TokenLink) + '">' + ic('link', 'ic-sm') + ' Salin Link</button>' +
      (f.CabangID ? '<button class="btn" data-act="pindah">' + ic('user-plus', 'ic-sm') + ' Jadikan Peserta</button>' : '') + '<button class="btn" data-act="excel">' + ic('sheet', 'ic-sm') + ' Ekspor Excel</button><button class="btn btn-primary" data-act="manual">' + ic('square-pen', 'ic-sm') + ' Input Manual</button>') +
    '<div class="card" style="overflow:hidden"><div class="toolbar"><div class="input-group search-in">' + ic('search') + '<input class="input" id="jw-q" placeholder="Cari nama atau isi jawaban" value="' + esc(el._q) + '"></div><span class="badge ' + (f.Status === 'Buka' ? 'badge-green' : 'badge-gray') + '">' + (f.Status === 'Buka' ? 'Dibuka' : 'Ditutup') + '</span></div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:50px">No</th><th>Pendaftar</th>' + show.map(q => '<th>' + esc(q.Label) + '</th>').join('') + (qb.length ? '<th>Berkas</th>' : '') + '<th>Waktu</th><th>Sumber</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
    (rows.map((j, i) => '<tr><td class="muted">' + (i + 1) + '</td><td><div class="row">' + avatarHtml(j.nama, '', 'avatar-sm') + '<div><b>' + esc(j.nama) + '</b>' + (j.kelas ? '<div class="small muted">Kelas ' + esc(j.kelas) + '</div>' : '') + '</div></div></td>' + show.map(q => '<td class="small">' + esc(jwJawabStr(q, j.isi[q.PertanyaanID]) || '-') + '</td>').join('') +
      (qb.length ? '<td>' + qb.map(q => j.berkas[q.PertanyaanID] ? '<button class="btn btn-soft btn-sm" data-act="berkas" data-id="' + esc(j.berkas[q.PertanyaanID].id) + '">' + ic('paperclip', 'ic-sm') + ' ' + esc(q.Label) + '</button>' : '').join(' ') + '</td>' : '') +
      '<td class="small" style="white-space:nowrap">' + esc(tglPendek(j.Waktu)) + ' ' + esc(jam(j.Waktu)) + '</td><td>' + (j.TipePengisi === 'InputManual' ? '<span class="badge badge-gray" title="Input manual">Input Manual oleh ' + esc(j.DiinputOleh) + '</span>' : j.TipePengisi === 'Siswa' ? '<span class="badge">Siswa (NISN)</span>' : '<span class="badge badge-green">Link publik</span>') + '</td>' +
      '<td class="acts"><button class="btn btn-ghost btn-icon btn-sm" data-act="detail" data-id="' + esc(j.JawabanID) + '" title="Detail">' + ic('eye', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="hapus" data-id="' + esc(j.JawabanID) + '" title="Hapus" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + '</button></td></tr>').join('') ||
      '<tr><td colspan="9">' + emptyState('inbox', 'Belum ada jawaban', 'Bagikan link formulir atau input jawaban dari formulir kertas.') + '</td></tr>') + '</tbody></table></div></div>';
}
const JW = {
  salin: async (el, b) => { if (await copyText(b.dataset.v)) toast('Link disalin', b.dataset.v); },
  excel: (el) => { const d = el._d, qs = d.pertanyaan; exportXlsx('Jawaban - ' + d.form.Judul.replace(/[\\/:*?"<>|]/g, '') + '.xlsx', [{ name: 'Jawaban', rows: [['No', 'Waktu', 'Sumber', 'Diinput oleh'].concat(qs.map(q => q.Label))].concat(d.jawaban.map((j, i) => [i + 1, j.Waktu.replace('T', ' '), j.TipePengisi, j.DiinputOleh].concat(qs.map(q => q.Tipe === 'unggah_berkas' ? (j.berkas[q.PertanyaanID] ? 'Ada berkas: ' + j.berkas[q.PertanyaanID].nama : '') : jwJawabStr(q, j.isi[q.PertanyaanID]))))) }]); },
  detail: (el, b) => {
    const d = el._d, j = d.jawaban.find(x => x.JawabanID === b.dataset.id);
    modal({ title: j.nama, sub: esc(tglPendek(j.Waktu) + ' ' + jam(j.Waktu)), size: 'lg', body: d.pertanyaan.map((q, i) => '<div style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div class="small muted">' + (i + 1) + '. ' + esc(q.Label) + '</div><div style="font-weight:600;margin-top:2px">' +
      (q.Tipe === 'unggah_berkas' ? (j.berkas[q.PertanyaanID] ? '<button class="btn btn-soft btn-sm" data-berkas="' + esc(j.berkas[q.PertanyaanID].id) + '">' + ic('paperclip', 'ic-sm') + ' ' + esc(j.berkas[q.PertanyaanID].nama) + '</button>' : '-') : esc(jwJawabStr(q, j.isi[q.PertanyaanID]) || '-')) + '</div></div>').join('') })
      .el.addEventListener('click', (e) => { const x = e.target.closest('[data-berkas]'); if (x) lihatBerkas(x.dataset.berkas, x); });
  },
  berkas: (el, b) => lihatBerkas(b.dataset.id, b),
  hapus: async (el, b) => {
    if (!(await confirmBox({ title: 'Hapus jawaban?', text: 'Jawaban ini akan dihapus permanen.', ok: 'Hapus', danger: true }))) return;
    const res = await api('hapusJawaban', { jawabanId: b.dataset.id });
    if (toastRes(res, 'Jawaban dihapus')) { el._d.jawaban = el._d.jawaban.filter(j => j.JawabanID !== b.dataset.id); swrPut('jw:' + el._id, el._d); jwPaint(el); refreshBoot(); }
  },
  pindah: async (el, b) => {
    const f = el._d.form;
    const res = await busy(b, () => api('pindahkanKePeserta', { formId: f.FormID, cabangId: f.CabangID }));
    if (toastRes(res, res.data ? res.data.ditambahkan + ' peserta ditambahkan' : '', 'Pendaftar yang sudah menjadi peserta dilewati.')) invalidateEvent(f.EventID);
  },
  manual: (el) => {
    const d = el._d, qs = d.pertanyaan.filter(q => q.Tipe !== 'unggah_berkas');
    const m = modal({ title: 'Input Jawaban Manual', sub: 'Dari formulir kertas yang sudah diisi', size: 'lg', body: '<div class="field"><label>NISN siswa (opsional)</label><input class="input mono" id="mn-nisn" maxlength="10" inputmode="numeric" placeholder="Hubungkan ke data siswa"></div>' + qs.map((q, i) => formField(q, i)).join(''),
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="mn-ok">' + ic('save', 'ic-sm') + ' Simpan Jawaban</button>' });
    m.q('#mn-ok').onclick = async (e) => {
      const jawaban = {};
      qs.forEach(q => {
        let v;
        if (q.Tipe === 'pilihan_ganda') { const r = m.q('input[name="' + q.PertanyaanID + '"]:checked'); v = r ? r.value : ''; }
        else if (q.Tipe === 'checkbox') v = m.qa('input[name="' + q.PertanyaanID + '"]:checked').map(x => x.value);
        else v = (m.q('#q_' + q.PertanyaanID).value || '').trim();
        if (Array.isArray(v) ? v.length : v) jawaban[q.PertanyaanID] = v;
      });
      const res = await busy(e.currentTarget, () => api('simpanJawabanManual', { formId: d.form.FormID, jawaban, nisn: m.q('#mn-nisn').value }));
      if (toastRes(res, 'Jawaban manual disimpan')) { m.close(); swrDrop('jw:' + el._id); route(); refreshBoot(); }
    };
  }
};
async function lihatBerkas(id, btn) {
  const res = await busy(btn, () => api('lihatBerkas', { fileId: id }));
  if (!res.success) return toast('Berkas tidak dapat dibuka', res.message, 'error');
  const bin = atob(res.data.b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: res.data.mime }), url = URL.createObjectURL(blob);
  if (/^image\//.test(res.data.mime)) modal({ title: res.data.nama, size: 'lg', body: '<img src="' + url + '" style="max-width:100%;border-radius:12px;margin:auto" alt="">', foot: '<a class="btn btn-primary" href="' + url + '" download="' + esc(res.data.nama) + '">' + ic('download', 'ic-sm') + ' Unduh</a>' });
  else { const a = document.createElement('a'); a.href = url; a.download = res.data.nama; a.click(); }
}

/* ============================================================
   PENGATURAN
   ============================================================ */
const SET_TABS = [['umum', 'Umum', 'sliders-horizontal'], ['kop', 'Kop Surat', 'file-text'], ['tampilan', 'Tampilan', 'palette'], ['demo', 'Mode Demo', 'flask-conical'], ['akun', 'Akun', 'key-round']];
registerPage('pengaturan', {
  layout: 'shell', auth: 'admin', nav: 'pengaturan', title: 'Pengaturan',
  init(el) {
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && SET[b.dataset.act]) SET[b.dataset.act](el, b, e); });
    el.addEventListener('input', (e) => setInput(el, e.target));
    el.addEventListener('change', (e) => setInput(el, e.target, true));
  },
  show(el, tab) {
    el._tab = SET_TABS.some(t => t[0] === tab) ? tab : (el._tab || 'umum');
    const s = B().settings || {};
    if (!el._draft) el._draft = Object.assign({}, s);
    if (!el._kop) el._kop = bacaSusunanKop(s.KopSusunan);
    setPaint(el);
    if (el._tab === 'demo' && AppState.mode === 'live') api('statusDemo', {}).then(r => { if (r.success) { B().demo = r.data; if (el._tab === 'demo' && !el.hidden) setPaint(el); } });
  },
  leave() { const el = $('.page[data-page="pengaturan"]'); if (el) { el._draft = null; el._kop = null; setPrimary((B().settings || {}).WarnaUtama); } }
});
function setPaint(el) {
  const body = (SET_RENDER[el._tab] || SET_RENDER.umum)(el);
  el.innerHTML = pageHead('Pengaturan', 'Konfigurasi profil sekolah, tata letak dokumen resmi, dan preferensi aplikasi.') +
    '<div class="tabs mb-16" style="border-radius:0;background:transparent;padding:0">' + SET_TABS.map(t => '<button data-act="tab" data-v="' + t[0] + '" class="' + (el._tab === t[0] ? 'on' : '') + '">' + ic(t[2], 'ic-sm') + t[1] + '</button>').join('') + '</div>' + body;
  if (SET_AFTER[el._tab]) SET_AFTER[el._tab](el);
}
const SET_RENDER = {}, SET_AFTER = {};
function setInput(el, t, change) {
  if (t.dataset.s) { el._draft[t.dataset.s] = t.value; if (el._tab === 'kop') kopPreview(el); return; }
  if (t.dataset.kop !== undefined) {
    const r = el._kop.find(x => x.id === t.dataset.id); if (!r) return;
    const k = t.dataset.kop;
    if (k === 'tampil') r.tampil = t.checked;
    if (k === 'isi') r.isi = t.value;
    if (k === 'ukuran') { const v = Number(t.value); if (v >= 5 && v <= 24 && Math.round(v * 2) === v * 2) { r.ukuran = v; t.classList.remove('is-error'); } else t.classList.add('is-error'); }
    kopPreview(el);
  }
  if (t.id === 'warna' || t.id === 'warna-hex') { const v = t.value; if (/^#[0-9a-f]{6}$/i.test(v)) { el._draft.WarnaUtama = v; setPrimary(v); const o = $(t.id === 'warna' ? '#warna-hex' : '#warna', el); if (o) o.value = v; $$('.color-swatch', el).forEach(s => s.classList.toggle('on', s.dataset.v.toLowerCase() === v.toLowerCase())); } }
  if (t.id === 'demo-auto' && change && B().demo && B().demo.aktif) SET.demoAuto(el, t);
}
const SET = {
  tab: (el, b) => { el._tab = b.dataset.v; history.replaceState(null, '', '#/pengaturan/' + el._tab); setPaint(el); if (el._tab === 'demo' && AppState.mode === 'live') api('statusDemo', {}).then(r => { if (r.success) { B().demo = r.data; if (el._tab === 'demo') setPaint(el); } }); }
};

/* ---- Umum ---- */
SET_RENDER.umum = (el) => {
  const d = el._draft, F = (k, label, ph, type) => '<div class="field"><label>' + label + '</label><input class="input" data-s="' + k + '" value="' + esc(d[k] || '') + '" placeholder="' + esc(ph || '') + '"' + (type ? ' type="' + type + '"' : '') + '></div>';
  return '<div class="card card-pad"><div class="card-title">Identitas Sekolah</div><div class="card-sub mb-16">Dipakai di tampilan aplikasi, kop surat, dan dokumen cetak.</div>' +
    '<div class="grid-2">' + F('NamaSekolah', 'Nama sekolah', 'SMP ...') + F('NPSN', 'NPSN', '8 digit') + '</div>' +
    '<div class="grid-2 mt-16">' + F('NamaPemkab', 'Nama Pemkab', 'Pemerintah Kabupaten ...') + F('NamaYayasan', 'Nama Dinas / Yayasan', 'Yayasan ...') + '</div>' +
    '<div class="mt-16">' + F('AlamatSekolah', 'Alamat sekolah', 'Jl. ...') + '</div>' +
    '<div class="grid-2 mt-16">' + F('TeleponSekolah', 'Telepon', '0812-...') + F('EmailSekolah', 'E-mail', 'info@sekolah.sch.id', 'email') + '</div>' +
    '<div class="grid-3 mt-16">' + F('TempatTtd', 'Kota tempat tanda tangan', 'mis. Sangatta') + F('TahunAjaran', 'Tahun ajaran (opsional)', tahunAjaran()) +
    '<div class="field"><label>Kepala sekolah</label><select class="select" data-s="KepalaSekolah_PTK_ID"><option value="">— Pilih dari data PTK —</option>' + ptkOptions(d.KepalaSekolah_PTK_ID) + '</select></div></div>' +
    '<div class="hint mt-8">Nama, jabatan, dan NIP/NIY/NUPTK kepala sekolah otomatis tampil di bawah tanda tangan dokumen.</div>' +
    '<div class="row mt-24" style="justify-content:flex-end"><button class="btn btn-primary" data-act="simpanUmum">' + ic('save', 'ic-sm') + ' Simpan Pengaturan</button></div></div>';
};
SET.simpanUmum = async (el, b) => {
  const d = el._draft, keys = ['NamaSekolah', 'NPSN', 'NamaPemkab', 'NamaYayasan', 'AlamatSekolah', 'TeleponSekolah', 'EmailSekolah', 'TempatTtd', 'TahunAjaran', 'KepalaSekolah_PTK_ID'];
  const p = {}; keys.forEach(k => p[k] = d[k] || '');
  const res = await busy(b, () => api('simpanPengaturan', { pengaturan: p }));
  if (toastRes(res, 'Pengaturan disimpan')) { Object.assign(B().settings, res.data.settings); swrPut('boot', B()); Shell.refreshBadges(); Shell.renderTop(); refreshBoot(); }
};

/* ---- Kop Surat ---- */
SET_RENDER.kop = (el) => {
  const s = B().settings || {};
  const fid = { logo: s.LogoFileId, logoInstansi: s.LogoInstansiFileId };
  const tile = (kind, label, side, url) => '<div class="logo-tile grow"><div class="logo-prev">' + (logoHtml(url) || '<span class="muted small">Belum ada</span>') + '</div><div class="grow" style="min-width:0"><div class="row between row-wrap"><b>' + label + '</b><span class="badge ' + (side === 'KIRI' ? '' : 'badge-amber') + '">Tercetak di sisi ' + side + ' kop</span></div>' +
    '<div class="small muted mt-8">' + (!url ? 'PNG persegi berlatar transparan' : url.indexOf('inisial:') === 0 ? 'Logo contoh (Mode Demo)' : /^data:/.test(url) ? 'Tersimpan · latar transparan terjaga' : 'Tersimpan di Drive · unggah ulang bila latarnya tampak hitam') + '</div><div class="row mt-12"><button class="btn btn-sm" data-act="unggahLogo" data-k="' + kind + '">' + ic(url ? 'refresh-cw' : 'upload', 'ic-sm') + ' ' + (url ? 'Ganti' : 'Unggah') + '</button>' + (url && url.indexOf('inisial:') < 0 && fid[kind] ? '<a class="btn btn-ghost btn-sm" href="' + esc('https://drive.google.com/file/d/' + fid[kind] + '/view') + '" target="_blank" rel="noopener">' + ic('eye', 'ic-sm') + ' Lihat</a>' : '') + '</div></div></div>';
  return '<div class="card card-pad mb-16"><div class="row between"><div><div class="card-title">Logo pada Kop</div><div class="card-sub">Atur logo yayasan atau dinas pendidikan serta lambang sekolah resmi untuk dokumen cetak.</div></div></div>' +
    '<div class="row gap-16 mt-16" style="flex-wrap:wrap">' + tile('logoInstansi', 'Logo Dinas / Yayasan', 'KIRI', s.LogoInstansiUrl) + tile('logo', 'Logo Sekolah', 'KANAN', s.LogoUrl) + '</div>' +
    '<div class="alert alert-blue small mt-16">' + ic('info', 'ic-sm') + '<span>Format disarankan: PNG persegi, latar transparan, resolusi ideal 300×300 px. Ukuran maksimal 10 MB per berkas (otomatis diperkecil ≤ 512 px).</span></div></div>' +
    '<div class="card card-pad"><div class="row between row-wrap"><div><div class="card-title">Kop Surat</div><div class="card-sub">Konfigurasi susunan baris teks, ukuran tipografi, dan pratinjau lembar kop cetak.</div></div><div class="row"><button class="btn btn-ghost" data-act="kopBaku">' + ic('rotate-ccw', 'ic-sm') + ' Susunan Baku</button><button class="btn" data-act="kopContoh">' + ic('printer', 'ic-sm') + ' Cetak Contoh Kop</button></div></div>' +
    '<div class="row between mt-16 small"><b class="muted" style="letter-spacing:.05em">PRATINJAU LEMBAR CETAK (A4)</b><span class="row muted">' + ic('check', 'ic-sm') + ' Sama persis dengan hasil cetak</span></div>' +
    '<div class="kop-preview-wrap mt-8"><div class="kop-paper doc" id="kop-prev"></div></div>' +
    '<div class="row between mt-24"><div><b style="font-size:16px">Baris Kop</b> <span class="muted small">— tahan ⋮⋮ lalu geser</span></div><span class="badge badge-gray">Gunakan ↑/↓ untuk memindah baris</span></div>' +
    '<div id="kop-rows" class="mt-12">' + el._kop.map((r, i) => kopRow(r, i)).join('') + '</div>' +
    '<div class="row between mt-16 row-wrap"><span class="small muted">💡 Baris yang kosong tidak dicetak · Isi identitas sekolah lengkap di tab <a href="#/pengaturan/umum">Umum</a></span><button class="btn btn-primary" data-act="kopSimpan">' + ic('save', 'ic-sm') + ' Simpan Pengaturan Kop</button></div></div>';
};
function kopRow(r, i) {
  return '<div class="kop-row" data-id="' + r.id + '"><span class="drag-h" data-drag title="Geser" aria-label="Pindahkan ' + esc(KOP_NAMA[r.id]) + '">' + ic('grip-vertical', 'ic-sm') + '</span><span class="no">' + String(i + 1).padStart(2, '0') + '</span>' +
    '<label class="check nm"><input type="checkbox" data-kop="tampil" data-id="' + r.id + '"' + (r.tampil ? ' checked' : '') + '> ' + esc(KOP_NAMA[r.id]) + '</label>' +
    (r.id.indexOf('tambahan') === 0 ? '<input class="input input-sm" style="max-width:220px" data-kop="isi" data-id="' + r.id + '" value="' + esc(r.isi || '') + '" placeholder="Ketik apa saja…">' : '') +
    '<span class="grow"></span><div class="input-group sz"><input class="input input-sm" type="number" step="0.5" min="5" max="24" data-kop="ukuran" data-id="' + r.id + '" value="' + r.ukuran + '" style="padding-right:30px"><span class="suffix small muted" style="right:10px">pt</span></div>' +
    '<span class="tg"><button type="button" class="tg-btn' + (r.tebal ? ' on' : '') + '" data-act="kopTg" data-k="tebal" data-id="' + r.id + '" title="Tebal">B</button><button type="button" class="tg-btn' + (r.kapital ? ' on' : '') + '" data-act="kopTg" data-k="kapital" data-id="' + r.id + '" title="HURUF BESAR">AA</button></span></div>';
}
function kopPreview(el) { const p = $('#kop-prev', el); if (!p) return; const s = Object.assign({}, B().settings, el._draft); p.innerHTML = susunKop(s, el._kop) + '<div style="height:8px"></div><div class="sk-line sk" style="width:40%;margin:0 auto 8px;animation:none"></div><div class="sk-line sk" style="width:90%;animation:none"></div><div class="sk-line sk" style="width:80%;animation:none"></div>'; }
SET_AFTER.kop = (el) => {
  kopPreview(el);
  dragSort($('#kop-rows', el), '.kop-row', (ids) => { el._kop = ids.map(id => el._kop.find(r => r.id === id)); $$('#kop-rows .kop-row .no', el).forEach((n, i) => n.textContent = String(i + 1).padStart(2, '0')); kopPreview(el); }, 'id');
};
SET.kopTg = (el, b) => { const r = el._kop.find(x => x.id === b.dataset.id); r[b.dataset.k] = !r[b.dataset.k]; b.classList.toggle('on', r[b.dataset.k]); kopPreview(el); };
SET.kopBaku = async (el) => { if (!(await confirmBox({ title: 'Pulihkan Susunan Baku', text: 'Urutan & gaya baris kembali ke bawaan. Isi baris tambahan ikut dikosongkan.', ok: 'Pulihkan' }))) return; el._kop = bacaSusunanKop(null); setPaint(el); toast('Susunan baku dipasang', 'Tekan Simpan agar susunan baku ini berlaku.', 'info'); };
SET.kopContoh = (el) => { const s = Object.assign({}, B().settings, el._draft); printHtml('<div class="doc doc-a4 print-page">' + susunKop(s, el._kop) + '<p style="text-align:center;color:#888;margin-top:30mm;font-family:Arial">— Contoh cetak kop surat —</p></div>'); };
SET.kopSimpan = async (el, b) => {
  const lama = B().settings.KopSusunan;
  B().settings.KopSusunan = JSON.stringify(el._kop);
  const res = await busy(b, () => api('simpanPengaturan', { pengaturan: { KopSusunan: JSON.stringify(el._kop) } }));
  if (res.success) { toast('Pengaturan kop surat disimpan.'); Object.assign(B().settings, res.data.settings); swrPut('boot', B()); }
  else { B().settings.KopSusunan = lama; toast('Gagal', res.message, 'error'); }
};
SET.unggahLogo = async (el, b) => {
  const kind = b.dataset.k;
  const r = await busy(b, () => uploadImage(kind, { max: 512, png: true, maxMB: 10, tampil: 320 }));
  if (!r) return;
  const ku = kind === 'logo' ? 'LogoUrl' : 'LogoInstansiUrl', kf = kind === 'logo' ? 'LogoFileId' : 'LogoInstansiFileId';
  B().settings[ku] = r.url; B().settings[kf] = r.fileId;
  if (el._draft) { el._draft[ku] = r.url; el._draft[kf] = r.fileId; }   // pratinjau kop ikut memakai logo baru
  if (AppState.pub && AppState.pub.sekolah) { AppState.pub.sekolah[ku] = r.url; swrPut('pub', AppState.pub, true); }
  swrPut('boot', B());
  toast('Logo diunggah'); setPaint(el); Shell.refreshBadges(); refreshBoot();
};

/* ---- Tampilan ---- */
const PRESET = ['#2563EB', '#1E3A8A', '#0F766E', '#15803D', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#B45309', '#0F172A'];
SET_RENDER.tampilan = (el) => {
  const w = el._draft.WarnaUtama || '#2563EB';
  return '<div class="card card-pad"><div class="card-title">Warna Utama Aplikasi</div><div class="card-sub mb-16">Berlaku langsung di seluruh aplikasi (tombol, menu aktif, grafik) tanpa memuat ulang.</div>' +
    '<div class="row row-wrap gap-12">' + PRESET.map(c => '<button class="color-swatch' + (c.toLowerCase() === w.toLowerCase() ? ' on' : '') + '" style="background:' + c + '" data-act="swatch" data-v="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<div class="row mt-16"><input type="color" id="warna" value="' + esc(w) + '" style="width:52px;height:42px;border:0;background:none;padding:0;cursor:pointer"><input class="input mono" id="warna-hex" value="' + esc(w) + '" style="width:140px"></div>' +
    '<div class="subcard mt-24"><div class="label mb-8">Pratinjau</div><div class="row row-wrap"><button class="btn btn-primary">Tombol Utama</button><button class="btn btn-soft">Tombol Lembut</button><span class="badge"><span class="dot"></span>Label</span><div class="prog" style="width:160px"><i style="width:64%"></i></div></div></div>' +
    '<div class="row mt-24" style="justify-content:flex-end"><button class="btn btn-primary" data-act="simpanWarna">' + ic('save', 'ic-sm') + ' Simpan Warna</button></div></div>';
};
SET.swatch = (el, b) => { const v = b.dataset.v; el._draft.WarnaUtama = v; setPrimary(v); $('#warna', el).value = v; $('#warna-hex', el).value = v; $$('.color-swatch', el).forEach(s => s.classList.toggle('on', s === b)); };
SET.simpanWarna = async (el, b) => {
  const res = await busy(b, () => api('simpanPengaturan', { pengaturan: { WarnaUtama: el._draft.WarnaUtama } }));
  if (toastRes(res, 'Warna utama disimpan')) { Object.assign(B().settings, res.data.settings); swrPut('boot', B()); refreshBoot(); }
};

/* ---- Mode Demo ---- */
SET_RENDER.demo = (el) => {
  if (AppState.mode === 'demo') return '<div class="card card-pad"><div class="row"><span class="icon-tile amber">' + ic('flask-conical') + '</span><div class="grow"><div class="card-title">Anda sedang di Mode Demo</div><div class="card-sub">Data di sini adalah data contoh yang terpisah dari data asli.</div></div></div>' +
    '<div class="row row-wrap mt-16"><button class="btn btn-soft" data-act="demoReset">' + ic('rotate-ccw', 'ic-sm') + ' Reset Data Demo</button><button class="btn" data-act="demoKeluar">' + ic('log-out', 'ic-sm') + ' Keluar Demo</button></div><p class="small muted mt-12">Mengakhiri demo hanya dapat dilakukan oleh Admin asli dari aplikasi utama.</p></div>';
  const d = B().demo || { aktif: false };
  if (!d.aktif) return '<div class="card card-pad"><div class="row" style="align-items:flex-start"><span class="icon-tile amber" style="width:56px;height:56px">' + ic('flask-conical', 'ic-lg') + '</span><div class="grow"><div class="card-title">Mode Demo</div><p class="muted mt-8" style="line-height:1.6;max-width:720px">Coba semua fitur MEvent dengan <b>data contoh</b> sebelum dipakai untuk event sungguhan: 45 siswa fiktif, 8 PTK, pemilihan OSIS dengan 3 pasangan calon, lomba dengan 3 cabang (termasuk satu kasus seri), formulir 6 jenis isian, kehadiran 2 hari, panitia & SK.</p>' +
    '<ul class="muted small" style="line-height:1.8;margin:12px 0 0;padding-left:18px"><li>Data contoh disimpan di spreadsheet & folder <b>terpisah</b> (MEvent_DEMO). Data asli tidak tersentuh.</li><li>Voting sungguhan tetap bisa berjalan bersamaan.</li><li>Saat demo diakhiri, spreadsheet & folder demo dipindah ke sampah Google Drive.</li></ul>' +
    '<div class="row row-wrap mt-24"><div class="field" style="width:240px"><label>Akhiri otomatis</label><select class="select" id="demo-auto"><option value="Tidak">Tidak</option><option value="1">Setelah 1 hari</option><option value="3">Setelah 3 hari</option><option value="7">Setelah 7 hari</option></select></div><button class="btn btn-amber btn-lg" data-act="demoMulai" style="align-self:flex-end">' + ic('play', 'ic-sm') + ' Mulai Demo</button></div></div></div></div>';
  const a = d.akun || {};
  return '<div class="alert alert-amber mb-16"><span class="icon-tile amber" style="width:40px;height:40px">' + ic('flask-conical') + '</span><div class="grow"><b>Mode Demo aktif</b> sejak ' + esc(String(d.dimulai || '').replace('T', ' ').slice(0, 16)) + ' oleh ' + esc(d.oleh || '-') + (d.berakhirPada ? ' · berakhir otomatis ' + esc(d.berakhirPada.replace('T', ' ')) : '') + '</div><button class="btn btn-amber" data-act="demoBuka">' + ic('external-link', 'ic-sm') + ' Buka Mode Demo</button></div>' +
    '<div class="row gap-16" style="align-items:flex-start;flex-wrap:wrap"><div class="card card-pad" style="flex:1.3 1 420px" id="kartu-demo"><div class="row between"><div class="card-title">Akun Demo</div><button class="btn btn-sm" data-act="demoCetak">' + ic('printer', 'ic-sm') + ' Cetak</button></div>' +
    '<table class="tbl compact mt-12"><tbody><tr><td class="muted">Admin Demo</td><td><span class="mono"><b>' + esc(a.admin && a.admin.username) + '</b></span> / <span class="mono"><b>' + esc(a.admin && a.admin.password) + '</b></span></td></tr>' +
    '<tr><td class="muted">PTK Demo</td><td>Pilih nama mana saja · kata sandi <b class="mono">' + esc(a.ptkPassword) + '</b><div class="small muted">' + (a.ptkContoh || []).map(esc).join('<br>') + '</div></td></tr>' +
    '<tr><td class="muted">Juri tamu</td><td>' + esc(a.juriTamu && a.juriTamu.nama) + ' · <b class="mono">' + esc(a.juriTamu && a.juriTamu.password) + '</b></td></tr><tr><td class="muted">NISN siswa</td><td class="mono">' + (a.nisn || []).join(', ') + ' <span class="small muted">(dan 9999000021–45)</span></td></tr></tbody></table></div>' +
    '<div class="card card-pad stack" style="flex:1 1 320px"><div class="field"><label>Akhiri otomatis</label><select class="select" id="demo-auto">' + [['Tidak', 'Tidak'], ['1', 'Setelah 1 hari'], ['3', 'Setelah 3 hari'], ['7', 'Setelah 7 hari']].map(o => '<option value="' + o[0] + '"' + (String(d.akhirOtomatis) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
    '<button class="btn btn-soft" data-act="demoReset">' + ic('rotate-ccw', 'ic-sm') + ' Reset Data Demo</button><button class="btn btn-danger" data-act="demoAkhiri">' + ic('trash-2', 'ic-sm') + ' Akhiri Demo & Hapus Data</button><p class="small muted">Spreadsheet & folder demo dipindah ke sampah Google Drive (terhapus permanen otomatis setelah 30 hari). Data asli tidak berubah.</p></div></div>';
};
SET.demoMulai = async (el, b) => {
  if (!(await confirmBox({ title: 'Mulai Mode Demo?', text: 'Aplikasi akan membuat data contoh terpisah. Data asli tidak akan berubah. Lanjutkan?', ok: 'Mulai Demo' }))) return;
  const langkah = ['Membuat spreadsheet demo', 'Menyiapkan struktur sheet', 'Mengisi data siswa', 'Mengisi data PTK', 'Membuat pemilihan OSIS', 'Membuat lomba & cabang', 'Mengisi nilai & suara', 'Membuat formulir & jawaban', 'Menyiapkan kehadiran'];
  const m = modal({ title: 'Menyiapkan Mode Demo', static: true, body: '<div class="center"><div class="boot-logo" style="margin:10px auto;background:var(--amber)"></div><b id="dm-step">Menyiapkan data contoh… 1 dari 9</b><div class="muted small mt-8" id="dm-sub">' + langkah[0] + '</div><div class="prog amber mt-16"><i id="dm-bar" style="width:5%"></i></div></div>' });
  let i = 0; const t = setInterval(() => { i = Math.min(langkah.length - 1, i + 1); m.q('#dm-step').textContent = 'Menyiapkan data contoh… ' + (i + 1) + ' dari ' + langkah.length; m.q('#dm-sub').textContent = langkah[i]; m.q('#dm-bar').style.width = Math.round((i + 1) / langkah.length * 92) + '%'; }, 2600);
  const res = await api('mulaiDemo', { akhirOtomatis: $('#demo-auto', el).value });
  clearInterval(t); m.close();
  if (!toastRes(res, 'Mode Demo siap', 'Data contoh telah dibuat.')) return;
  B().demo = res.data; setPaint(el); loadPublicBoot(true);
};
SET.demoAuto = async (el, t) => { const res = await api('setDemoOtomatis', { akhirOtomatis: t.value }); if (toastRes(res, 'Pengaturan disimpan')) { B().demo = res.data; setPaint(el); } };
SET.demoReset = async (el, b) => {
  if (!(await confirmBox({ title: 'Reset data demo?', text: 'Semua perubahan di Mode Demo dibuang dan data contoh dikembalikan ke kondisi awal.', ok: 'Reset' }))) return;
  const res = await busy(b, () => api('resetDemo', {}));
  if (toastRes(res, 'Data demo direset')) { if (AppState.mode === 'demo') { AppState.ev = {}; Store.delPrefix('c:demo:'); ensureStaffBoot(true); } }
};
SET.demoBuka = () => enterDemo();
SET.demoKeluar = () => exitDemo();
SET.demoCetak = () => printHtml('<div class="doc doc-a4 print-page" style="font-family:Arial">' + '<h2 class="doc-title">Akun Mode Demo — MEvent</h2>' + $('#kartu-demo').innerHTML.replace(/<button[\s\S]*?<\/button>/g, '') + '</div>');
SET.demoAkhiri = async (el, b) => {
  const ok = await confirmBox({ title: 'Akhiri Demo & Hapus Data', html: 'Spreadsheet <b>MEvent_DEMO</b> dan folder <b>Demo</b> akan dipindah ke sampah Google Drive. Semua akun & data demo tidak bisa dipakai lagi.', ok: 'Akhiri Demo', danger: true, typed: 'HAPUS DEMO' });
  if (!ok) return;
  const res = await busy(b, () => api('akhiriDemo', { konfirmasi: 'HAPUS DEMO' }));
  if (!toastRes(res, 'Demo diakhiri')) return;
  const s = res.data.sesudah;
  modal({ title: 'Demo diakhiri', size: 'sm', body: '<div class="center"><div class="thanks-ring" style="width:80px;height:80px;margin:0 auto 12px">' + ic('check', 'ic-xl') + '</div><p style="line-height:1.6">Data asli tidak berubah: <b>' + s.siswa + ' siswa, ' + s.ptk + ' PTK, ' + s.event + ' event</b>.</p>' + (res.data.sama ? '<span class="badge badge-green mt-8">' + ic('shield-check', 'ic-sm') + ' Terverifikasi sama sebelum & sesudah</span>' : '') + '</div>', foot: '<button class="btn btn-primary" data-close>Selesai</button>' });
  B().demo = { aktif: false }; setPaint(el); loadPublicBoot(true); Store.delPrefix('c:demo:');
};

/* ---- Akun ---- */
SET_RENDER.akun = () => '<div class="card card-pad" style="max-width:560px"><div class="card-title">Akun Admin</div><div class="card-sub mb-16">Ganti username dan/atau kata sandi admin.</div>' +
  '<div class="field"><label>Username baru (opsional)</label><input class="input" id="ak-un" placeholder="' + esc((AppState.user || {}).username || 'admin') + '" autocomplete="username"></div>' +
  '<div class="field mt-12"><label>Kata sandi lama <span class="req">*</span></label><input class="input" type="password" id="ak-lama" autocomplete="current-password"></div>' +
  '<div class="grid-2 mt-12"><div class="field"><label>Kata sandi baru <span class="req">*</span></label><input class="input" type="password" id="ak-baru" autocomplete="new-password" placeholder="min. 6 karakter"></div><div class="field"><label>Ulangi kata sandi baru</label><input class="input" type="password" id="ak-baru2" autocomplete="new-password"></div></div>' +
  '<div class="row mt-24" style="justify-content:flex-end"><button class="btn btn-primary" data-act="akunSimpan">' + ic('save', 'ic-sm') + ' Simpan</button></div></div>';
SET.akunSimpan = async (el, b) => {
  const baru = $('#ak-baru', el).value;
  if (baru !== $('#ak-baru2', el).value) return toast('Kata sandi baru tidak sama', '', 'warning');
  const res = await busy(b, () => api('ubahPasswordAdmin', { lama: $('#ak-lama', el).value, baru, username: $('#ak-un', el).value.trim() }));
  if (toastRes(res, 'Akun diperbarui', 'Gunakan kata sandi baru saat masuk berikutnya.')) { $$('#ak-lama,#ak-baru,#ak-baru2', el).forEach(i => i.value = ''); }
};

/* ============================================================
   EDITOR PIAGAM
   ============================================================ */
registerPage('piagam', {
  layout: 'bare', auth: 'staff', title: 'Editor Piagam',
  init(el) {
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && PE[b.dataset.act]) PE[b.dataset.act](el, b, e); });
    el.addEventListener('input', (e) => peInput(el, e.target));
    el.addEventListener('change', (e) => peInput(el, e.target, true));
    el.addEventListener('pointerdown', (e) => peDragStart(el, e));
    addEventListener('resize', debounce(() => { if (!el.hidden && el._pe) peFit(el); }, 150));
  },
  async show(el, eventId, cabangId) {
    el.innerHTML = '<div class="fb-top"><b>Memuat editor piagam…</b></div><div style="padding:24px">' + skeletonCards(2, 220) + '</div>';
    let det = AppState.ev[eventId];
    await loadEvent(eventId, (d) => { det = d; });
    if (!det || det.event.JenisEvent !== 'Lomba') { el.innerHTML = errorBox('Editor piagam tersedia untuk event lomba.'); return; }
    const cfg = cetakCfg(det, 'Piagam');
    const tid = (cfg.opsi && cfg.opsi.templateId) || 'tpl-klasik';
    const juara = [];
    det.cabang.filter(c => !cabangId || c.CabangID === cabangId).forEach(c => c.hasil.peserta.filter(p => p.juara || p.harapan).forEach(p => piagamUntuk(c, p).forEach(x => juara.push(x))));
    el._pe = { det, cabangId, cfg: Object.assign({}, cfg), tpl: JSON.parse(JSON.stringify(tplById(tid))), sel: 'nama', juara, idx: 0, dirty: false };
    await loadFonts(PIAGAM_FONTS);
    pePaint(el);
  }
});
function peData(el) {
  const P = el._pe;
  if (P.juara.length) { const x = P.juara[P.idx % P.juara.length]; return dataPiagam(P.det, x.c, x.p, P.idx); }
  return { nama: 'Siti Aisyah', kelas: '9A', juara: 1, cabang: 'Lomba Baca Puisi', event: P.det.event.Judul, tanggal: tgl(todayStr()), tempat: settingsNow().TempatTtd || 'Sangatta', no: '001', tahun: new Date().getFullYear() };
}
function pePaint(el) {
  const P = el._pe, det = P.det, L = P.tpl.TataLetak, e = L[P.sel] || {};
  const saved = (B().templates || []).filter(t => t.Sumber === 'Unggahan');
  const isTxt = ['judul', 'nomor', 'diberikan', 'nama', 'kelas', 'juara', 'cabang', 'event', 'tanggal', 'teks'].indexOf(P.sel) > -1, isLogo = P.sel === 'logoInstansi' || P.sel === 'logoSekolah';
  el.innerHTML = '<div class="fb-top"><a class="btn btn-ghost" href="#/ev/' + esc(det.event.EventID) + '/hasil' + (P.cabangId ? '/' + esc(P.cabangId) : '') + '">' + ic('arrow-left', 'ic-sm') + ' Kembali</a><div class="grow ellipsis" style="font-weight:700;font-size:16px">Editor Piagam — ' + esc(det.event.Judul) + '</div>' +
    '<button class="btn btn-ghost" data-act="next">' + ic('users', 'ic-sm') + ' Pratinjau Data Juara' + (P.juara.length ? ' (' + (P.idx % P.juara.length + 1) + '/' + P.juara.length + ')' : '') + '</button><button class="btn" data-act="simpan">' + ic('save', 'ic-sm') + ' Simpan Tata Letak</button>' +
    '<button class="btn btn-ghost btn-icon" data-act="props" title="Properti">' + ic('sliders-horizontal', 'ic-sm') + '</button><button class="btn btn-primary" data-act="cetak"' + (P.juara.length ? '' : ' disabled') + '>' + ic('printer', 'ic-sm') + ' Cetak Massal (' + P.juara.length + ' Piagam)</button></div>' +
    '<div class="pe" id="pe"><div class="pe-panel l"><div class="label mb-8">Template</div><div class="tpl-grid">' +
    TPL_BAWAAN.concat(saved.map(t => ({ TemplateID: t.TemplateID, NamaTemplate: t.NamaTemplate, gaya: 'unggahan' }))).map(t => { const tt = tplById(t.TemplateID); return '<button class="tpl' + (P.tpl.TemplateID === t.TemplateID ? ' on' : '') + '" data-act="tpl" data-id="' + esc(t.TemplateID) + '"><div class="th"><div style="position:absolute;inset:0;transform:scale(.4);transform-origin:0 0;width:250%;height:250%;pointer-events:none">' + latarPiagam(tt) + '</div></div><div class="tn ellipsis">' + esc(t.NamaTemplate) + '</div></button>'; }).join('') + '</div>' +
    '<button class="btn btn-soft btn-block mt-12" data-act="unggah" style="border-style:dashed">' + ic('upload', 'ic-sm') + ' Unggah Template Sendiri</button><div class="hint mt-8">JPG/PNG A4 lanskap, disarankan ≥ 3508×2480 px, maks. 2 MB.</div>' +
    (P.tpl.Sumber === 'Unggahan' ? '<button class="btn btn-ghost btn-sm mt-8" data-act="hapus-tpl" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + ' Hapus template ini</button>' : '') +
    '<div class="label mt-24 mb-8">Pengaturan Cetak</div><div class="stack">' +
    '<label class="switch"><input type="checkbox" id="pe-kop"' + (P.cfg.kop ? ' checked' : '') + '><span class="track"></span><b>Gunakan Kop Surat</b></label>' +
    '<label class="switch"><input type="checkbox" id="pe-ttd"' + (P.cfg.ttd ? ' checked' : '') + '><span class="track"></span><b>Tanda Tangan Kepala Sekolah</b></label>' +
    '<div class="field"><label>Penanda tangan 2</label><select class="select" id="pe-pt2"><option value="">— Tidak ada —</option>' + ptkOptions(P.cfg.pt2) + '</select></div>' +
    '<div class="field"><label>Jabatan tampil</label><input class="input" id="pe-jab" value="' + esc(P.cfg.jabatan2 || '') + '" placeholder="mis. Ketua Panitia"></div></div></div>' +
    '<div class="pe-stage" id="pe-stage"><div class="pe-canvas-host" id="pe-host"><div id="pe-canvas" style="transform-origin:0 0"></div></div><div class="row muted small">' + ic('mouse-pointer-2', 'ic-sm') + ' Klik elemen untuk memilih · seret untuk memindah</div></div>' +
    '<div class="pe-panel r"><div class="row between"><b style="font-size:16px">Properti Elemen</b></div><div class="row between mt-12"><b style="color:var(--primary)">' + esc(EL_LABEL[P.sel] || P.sel) + '</b><label class="switch"><input type="checkbox" data-p="show"' + (e.show ? ' checked' : '') + '><span class="track"></span><span class="small">Tampilkan</span></label></div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>Posisi X (%)</label><input class="input input-sm" type="number" step="0.5" data-p="x" value="' + e.x + '"></div><div class="field"><label>Posisi Y (%)</label><input class="input input-sm" type="number" step="0.5" data-p="y" value="' + e.y + '"></div></div>' +
    '<div class="field mt-12"><label>Perataan</label><div class="seg seg-light seg-block">' + [['left', 'align-left'], ['center', 'align-center'], ['right', 'align-right']].map(a => '<button type="button" data-act="align" data-v="' + a[0] + '" class="' + (e.align === a[0] ? 'on' : '') + '">' + ic(a[1], 'ic-sm') + '</button>').join('') + '</div></div>' +
    (isTxt ? '<div class="field mt-12"><label>Teks</label><input class="input input-sm" data-p="text" value="' + esc(e.text || '') + '"><div class="hint">Variabel: {nama} {kelas} {juara} {cabang} {event} {tanggal} {tempat} {no} {tahun}</div></div>' : '') +
    (isLogo ? '<div class="field mt-12"><label>Ukuran logo (mm)</label><input class="input input-sm" type="number" min="10" max="60" data-p="w" value="' + (e.w || 24) + '"></div>' : '') +
    (!isLogo && P.sel !== 'kop' ? '<div class="field mt-12"><label>Jenis Font</label><select class="select input-sm" data-p="font">' + PIAGAM_FONTS.map(f => '<option' + (e.font === f ? ' selected' : '') + ' style="font-family:\'' + f + '\'">' + f + '</option>').join('') + '</select></div>' +
      '<div class="grid-2 mt-12"><div class="field"><label>Ukuran (pt)</label><input class="input input-sm" type="number" min="6" max="96" step="0.5" data-p="size" value="' + e.size + '"></div><div class="field"><label>Warna</label><div class="row"><input type="color" data-p="color" value="' + (/^#/.test(e.color) ? e.color : '#1E293B') + '" style="width:40px;height:34px;border:0;padding:0;background:none"><input class="input input-sm mono" data-p="color" value="' + esc(e.color) + '"></div></div></div>' +
      '<div class="row mt-12"><button type="button" class="tg-btn' + (e.bold ? ' on' : '') + '" data-act="tg" data-k="bold"><b>B</b> Tebal</button><button type="button" class="tg-btn' + (e.italic ? ' on' : '') + '" data-act="tg" data-k="italic"><i>I</i> Miring</button></div>' : '') +
    '<div class="label mt-24 mb-8">Daftar Elemen</div>' + Object.keys(L).filter(k => !(k === 'kop' && !P.cfg.kop) && !((k === 'logoInstansi' || k === 'logoSekolah') && P.cfg.kop)).map(k => '<div class="layer-row' + (P.sel === k ? ' on' : '') + '" data-act="sel" data-k="' + k + '">' + ic(L[k].show ? 'eye' : 'eye-off', 'ic-sm') + '<span class="grow">' + esc(EL_LABEL[k] || k) + '</span></div>').join('') +
    '<button class="btn btn-ghost btn-sm mt-12" data-act="reset-layout">' + ic('rotate-ccw', 'ic-sm') + ' Kembalikan tata letak bawaan</button></div></div>';
  peCanvas(el);
}
function peCanvas(el) {
  const P = el._pe, c = $('#pe-canvas', el); if (!c) return;
  c.innerHTML = renderPiagam(P.tpl, peData(el), { edit: true, sel: P.sel, cfg: P.cfg });
  peFit(el);
}
function peFit(el) {
  const stage = $('#pe-stage', el), host = $('#pe-host', el), c = $('#pe-canvas', el); if (!stage || !c) return;
  const W = 1123, H = 794, sc = Math.min((stage.clientWidth - 48) / W, (window.innerHeight - 180) / H, 1.2);
  el._pe.scale = Math.max(.25, sc);
  c.style.transform = 'scale(' + el._pe.scale + ')';
  host.style.width = W * el._pe.scale + 'px'; host.style.height = H * el._pe.scale + 'px';
}
function peInput(el, t, change) {
  const P = el._pe; if (!P) return;
  if (t.id === 'pe-kop') { P.cfg.kop = t.checked; P.dirty = true; return pePaint(el); }
  if (t.id === 'pe-ttd') { P.cfg.ttd = t.checked; P.dirty = true; return peCanvas(el); }
  if (t.id === 'pe-pt2') { P.cfg.pt2 = t.value; if (t.value && !P.cfg.jabatan2) { P.cfg.jabatan2 = 'Ketua Panitia'; $('#pe-jab', el).value = P.cfg.jabatan2; } P.dirty = true; return peCanvas(el); }
  if (t.id === 'pe-jab') { P.cfg.jabatan2 = t.value; P.dirty = true; return peCanvas(el); }
  const k = t.dataset.p; if (!k) return;
  const e = P.tpl.TataLetak[P.sel];
  if (k === 'show') { e.show = t.checked; P.dirty = true; return pePaint(el); }
  if (k === 'x' || k === 'y' || k === 'size' || k === 'w') { const v = Number(t.value); if (!isNaN(v)) e[k] = v; }
  else if (k === 'color') { if (/^#[0-9a-f]{6}$/i.test(t.value) || change) { e.color = t.value; $$('[data-p=color]', el).forEach(x => { if (x !== t) x.value = t.value; }); } }
  else e[k] = t.value;
  P.dirty = true;
  if (k === 'font') loadFonts([t.value]).then(() => peCanvas(el)); else peCanvas(el);
}
function peDragStart(el, e) {
  const P = el._pe; if (!P) return;
  const node = e.target.closest('.pe-el'); if (!node || !e.target.closest('#pe-canvas')) return;
  e.preventDefault();
  const k = node.dataset.el;
  if (P.sel !== k) { P.sel = k; pePaint(el); }
  const host = $('#pe-host', el), rect = host.getBoundingClientRect();
  const L = P.tpl.TataLetak[k], sx = e.clientX, sy = e.clientY, ox = L.x, oy = L.y;
  const live = () => $('#pe-canvas [data-el="' + k + '"]', el);
  let moved = false;
  const move = (ev) => {
    moved = true;
    L.x = Math.round((ox + (ev.clientX - sx) / rect.width * 100) * 2) / 2;
    L.y = Math.round((oy + (ev.clientY - sy) / rect.height * 100) * 2) / 2;
    L.x = Math.max(-10, Math.min(110, L.x)); L.y = Math.max(-5, Math.min(105, L.y));
    const n = live(); if (n) { n.style.left = L.x + '%'; n.style.top = L.y + '%'; }
    const ix = $('[data-p=x]', el), iy = $('[data-p=y]', el); if (ix) ix.value = L.x; if (iy) iy.value = L.y;
  };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); if (moved) P.dirty = true; };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
const PE = {
  sel: (el, b) => { el._pe.sel = b.dataset.k; pePaint(el); },
  next: (el) => { el._pe.idx++; peCanvas(el); pePaint(el); },
  props: (el) => { $('#pe', el).classList.toggle('show-r'); },
  align: (el, b) => { el._pe.tpl.TataLetak[el._pe.sel].align = b.dataset.v; el._pe.dirty = true; pePaint(el); },
  tg: (el, b) => { const e = el._pe.tpl.TataLetak[el._pe.sel]; e[b.dataset.k] = !e[b.dataset.k]; el._pe.dirty = true; pePaint(el); },
  tpl: (el, b) => { const P = el._pe; P.tpl = JSON.parse(JSON.stringify(tplById(b.dataset.id))); P.dirty = true; pePaint(el); },
  'reset-layout': (el) => { const P = el._pe; P.tpl.TataLetak = layoutBaku(P.tpl.gaya === 'unggahan' ? 'formal' : P.tpl.gaya); P.dirty = true; pePaint(el); toast('Tata letak bawaan dipasang', 'Tekan Simpan Tata Letak agar berlaku.', 'info'); },
  unggah: async (el, b) => {
    const f = await pickFile('image/png,image/jpeg');
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast('Berkas terlalu besar', 'Maksimal 2 MB.', 'error');
    await busy(b, async () => {
      const img = await resizeImage(f, 3508, 'image/jpeg', .9);
      const up = await api('unggahBerkas', { kind: 'template', b64: img.b64, mime: img.mime, name: f.name });
      if (!up.success) return toast('Unggah gagal', up.message, 'error');
      const t = { NamaTemplate: f.name.replace(/\.[^.]+$/, '').slice(0, 40), Sumber: 'Unggahan', LatarFileId: up.data.fileId, TataLetak: layoutBaku('formal') };
      const res = await api('simpanTemplate', { template: t });
      if (!toastRes(res, 'Template diunggah', t.NamaTemplate)) return;
      (B().templates = B().templates || []).push(Object.assign({}, res.data.template));
      el._pe.tpl = JSON.parse(JSON.stringify(tplById(res.data.template.TemplateID)));
      pePaint(el); refreshBoot();
    });
  },
  'hapus-tpl': async (el) => {
    const P = el._pe;
    if (!(await confirmBox({ title: 'Hapus template?', text: P.tpl.NamaTemplate + ' akan dihapus.', ok: 'Hapus', danger: true }))) return;
    const res = await api('hapusTemplate', { templateId: P.tpl.TemplateID });
    if (toastRes(res, 'Template dihapus')) { B().templates = (B().templates || []).filter(t => t.TemplateID !== P.tpl.TemplateID); P.tpl = JSON.parse(JSON.stringify(tplById('tpl-klasik'))); pePaint(el); refreshBoot(); }
  },
  simpan: async (el, b) => {
    const P = el._pe, t = P.tpl;
    await busy(b, async () => {
      const r1 = await api('simpanTemplate', { template: { TemplateID: t.TemplateID, NamaTemplate: t.NamaTemplate, Sumber: t.Sumber, LatarFileId: t.LatarFileId, TataLetak: t.TataLetak } });
      const r2 = await api('simpanCetak', { eventId: P.det.event.EventID, jenis: 'Piagam', PakaiKop: P.cfg.kop, TtdKepsek: P.cfg.ttd, PenandaTangan2_PTK_ID: P.cfg.pt2, JabatanTampil2: P.cfg.jabatan2, Opsi: { templateId: t.TemplateID } });
      if (r1.success && r2.success) {
        toast('Tata letak disimpan');
        P.dirty = false;
        const list = B().templates || (B().templates = []), i = list.findIndex(x => x.TemplateID === t.TemplateID), row = { TemplateID: t.TemplateID, NamaTemplate: t.NamaTemplate, Sumber: t.Sumber, LatarFileId: t.LatarFileId, TataLetak: t.TataLetak };
        if (i > -1) list[i] = row; else list.push(row);
        invalidateEvent(P.det.event.EventID);
      } else toast('Gagal menyimpan', (r1.success ? r2 : r1).message, 'error');
    });
  },
  cetak: (el) => {
    const P = el._pe;
    printHtml(P.juara.map((x, i) => renderPiagam(P.tpl, dataPiagam(P.det, x.c, x.p, i), { cfg: P.cfg })).join(''), true);
  }
};

/* Layar Hasil (proyektor/IFP) ada di js/layar.js — dimuat saat dibuka. */
