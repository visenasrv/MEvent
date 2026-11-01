/* ============================================================
   MEvent — admin.js (dimuat setelah login admin/panitia)
   Shell (sidebar + topbar), dasbor, data siswa & PTK, event,
   detail event (info, panitia & SK, calon, cabang, juri &
   kriteria, formulir, hasil, kehadiran, cetak).
   ============================================================ */
'use strict';

const isAdmin = () => AppState.role === 'admin';
const B = () => AppState.boot || {};
const statusBadge = (s) => '<span class="badge ' + (s === 'Berjalan' ? 'badge-green' : s === 'Selesai' ? 'badge-blue' : 'badge-gray') + '">' + (s === 'Berjalan' ? '<span class="dot"></span>' : '') + esc(s || 'Draf') + '</span>';
const jenisIcon = (j) => j === 'OSIS' ? 'vote' : j === 'Lomba' ? 'trophy' : 'calendar-days';
function evById(id) { return (B().events || []).find(e => e.EventID === id) || null; }

/* ============================================================
   SHELL
   ============================================================ */
window.Shell = {
  el: null,
  build() {
    const root = document.createElement('div');
    root.id = 'shell-root'; root.className = 'shell';
    root.innerHTML = '<aside class="side" id="side"></aside><div class="main"><header class="topbar" id="topbar"></header><div class="content" id="shell-content"></div></div>';
    this.el = root;
    this.renderSide(); this.renderTop();
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-shell]'); if (!a) { if (root.classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('.hamb')) root.classList.remove('nav-open'); return; }
      const act = a.dataset.shell;
      if (act === 'hamb') root.classList.toggle('nav-open');
      if (act === 'logout') { e.preventDefault(); confirmBox({ title: 'Keluar?', text: 'Anda akan keluar dari panel.', ok: 'Keluar' }).then(ok => { if (ok) logout(); }); }
      if (act === 'bell') { e.stopPropagation(); this.toggleBell(a); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.bell-wrap')) $$('.pop', root).forEach(p => p.remove()); if (!e.target.closest('.search')) { const sp = $('.search-pop', root); if (sp) sp.remove(); } });
    return root;
  },
  navItems() {
    const b = B(), adm = isAdmin();
    const pendingForm = (b.forms || []).filter(f => f.Status === 'Buka').length;
    const items = [['dasbor', 'layout-dashboard', 'Dasbor'], ['event', 'calendar', 'Event'], ['formulir-admin', 'file-text', 'Formulir', pendingForm]];
    if (adm) items.push(['siswa', 'users', 'Data Siswa'], ['data-ptk', 'user-check', 'Data PTK']);
    items.push(['kehadiran', 'clock', 'Kehadiran'], ['cetak', 'printer', 'Cetak Dokumen'], ['layar', 'monitor', 'Layar Hasil']);
    if (adm) items.push(['pengaturan', 'settings', 'Pengaturan']);
    else items.push(['ptk', 'house', 'Beranda PTK']);
    return items;
  },
  renderSide() {
    const s = (B().settings) || sekolah();
    const logo = logoHtml(s.LogoUrl);
    $('#side', this.el).innerHTML = '<div class="side-brand"><span class="brand-mark">' + (logo || ic('graduation-cap', 'ic-lg')) + '</span><div class="grow" style="min-width:0"><div class="brand-name">MEvent</div><div class="brand-sub ellipsis">' + esc(s.NamaSekolah || '') + '</div></div></div>' +
      '<nav class="nav" id="nav">' + this.navItems().map(i => '<a href="#/' + i[0] + '" data-nav="' + i[0] + '">' + ic(i[1]) + '<span>' + i[2] + '</span>' + (i[3] ? '<span class="pill-num">' + i[3] + '</span>' : '') + '</a>').join('') + '</nav>' +
      '<div class="side-foot">' + (AppState.mode === 'demo' ? '<div class="badge badge-amber" style="margin:0 0 8px 12px">' + ic('flask-conical', 'ic-sm') + ' Mode Demo</div>' : '') + '<a href="#" data-shell="logout">' + ic('log-out') + '<span>Keluar</span></a></div>';
  },
  renderTop() {
    const u = AppState.user || {}, d = new Date();
    $('#topbar', this.el).innerHTML = '<button class="btn btn-ghost btn-icon hamb" data-shell="hamb" aria-label="Menu">' + ic('menu') + '</button>' +
      '<div class="search">' + ic('search') + '<input class="input" id="gsearch" placeholder="Cari kegiatan, formulir, siswa..." autocomplete="off"></div>' +
      '<div class="top-meta"><div>Tahun Ajaran ' + esc((B().settings && B().settings.TahunAjaran) || tahunAjaran()) + '</div><b>' + HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() + '</b></div>' +
      '<div class="bell-wrap" style="position:relative"><button class="btn btn-ghost btn-icon bell" data-shell="bell" aria-label="Notifikasi">' + ic('bell') + '<span class="dotn" id="bell-dot" hidden></span></button></div>' +
      '<div class="top-user"><span class="avatar">' + ic('user-round', 'ic-sm') + '</span><div><div class="nm">' + esc(u.nama || 'Admin') + '</div><div class="rl">' + (isAdmin() ? 'Administrator' : 'Panitia') + '</div></div></div>';
    const inp = $('#gsearch', this.el);
    inp.addEventListener('input', debounce(() => this.search(inp), 150));
    inp.addEventListener('focus', () => { if (inp.value) this.search(inp); if (isAdmin() && !AppState.siswa) loadSiswa(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('.search-pop a', this.el); if (a) { location.hash = a.getAttribute('href'); inp.blur(); $('.search-pop', this.el).remove(); } } if (e.key === 'Escape') inp.blur(); });
    this.refreshBadges();
  },
  search(inp) {
    const q = inp.value.trim().toLowerCase(), host = inp.parentElement;
    let pop = $('.search-pop', host);
    if (!q) { if (pop) pop.remove(); return; }
    if (!pop) { pop = document.createElement('div'); pop.className = 'search-pop'; host.appendChild(pop); }
    const r = [];
    (B().events || []).filter(e => e.Judul.toLowerCase().indexOf(q) > -1).slice(0, 5).forEach(e => r.push('<a href="#/ev/' + e.EventID + '">' + ic(jenisIcon(e.JenisEvent), 'ic-sm') + '<span class="grow ellipsis">' + esc(e.Judul) + '</span><span class="badge badge-gray">Event</span></a>'));
    (B().forms || []).filter(f => f.Judul.toLowerCase().indexOf(q) > -1).slice(0, 4).forEach(f => r.push('<a href="#/jawaban/' + f.FormID + '">' + ic('file-text', 'ic-sm') + '<span class="grow ellipsis">' + esc(f.Judul) + '</span><span class="badge badge-gray">Formulir</span></a>'));
    (AppState.siswa || []).filter(s => s.Nama.toLowerCase().indexOf(q) > -1 || s.NISN.indexOf(q) > -1).slice(0, 6).forEach(s => r.push('<a href="#/siswa/' + encodeURIComponent(s.NISN) + '">' + ic('user-round', 'ic-sm') + '<span class="grow ellipsis">' + esc(s.Nama) + ' <span class="muted">· ' + esc(s.Kelas) + '</span></span><span class="badge badge-gray">Siswa</span></a>'));
    (B().ptk || []).filter(p => p.Nama.toLowerCase().indexOf(q) > -1).slice(0, 4).forEach(p => r.push('<a href="#/data-ptk/' + p.PTK_ID + '">' + ic('user-check', 'ic-sm') + '<span class="grow ellipsis">' + esc(p.Nama) + '</span><span class="badge badge-gray">PTK</span></a>'));
    pop.innerHTML = r.join('') || '<div class="sp-empty">Tidak ada hasil untuk "' + esc(q) + '"</div>';
    pop.onclick = (e) => { if (e.target.closest('a')) { pop.remove(); inp.value = ''; } };
  },
  toggleBell(btn) {
    const host = btn.parentElement, old = $('.pop', host);
    if (old) return old.remove();
    const al = B().alerts || [], rec = (B().recentJawaban || []).slice(0, 3);
    const pop = document.createElement('div'); pop.className = 'pop';
    pop.innerHTML = '<div class="small muted" style="padding:6px 10px;font-weight:700;letter-spacing:.05em">NOTIFIKASI</div>' +
      al.map(a => '<div class="pop-item" data-go="ev/' + a.EventID + '/hasil' + (a.CabangID ? '/' + a.CabangID : '') + '"><span class="icon-tile amber" style="width:36px;height:36px">' + ic('triangle-alert', 'ic-sm') + '</span><div><b>Hasil seri perlu ditetapkan</b><div class="small muted">' + esc(a.label) + '</div></div></div>').join('') +
      rec.map(j => '<div class="pop-item" data-go="jawaban/' + j.FormID + '"><span class="icon-tile" style="width:36px;height:36px">' + ic('file-text', 'ic-sm') + '</span><div><b>' + esc(j.nama) + '</b><div class="small muted">' + esc(j.FormJudul) + ' · ' + esc(relWaktu(j.Waktu)) + '</div></div></div>').join('') +
      (!al.length && !rec.length ? '<div class="empty" style="padding:20px">Belum ada notifikasi.</div>' : '');
    pop.onclick = (e) => { const it = e.target.closest('[data-go]'); if (it) { pop.remove(); go(it.dataset.go); } };
    host.appendChild(pop);
  },
  refreshBadges() {
    if (!this.el) return;
    const dot = $('#bell-dot', this.el); if (dot) dot.hidden = !(B().alerts || []).length;
    const cur = $('#nav a.on', this.el), key = cur && cur.dataset.nav;
    this.renderSide();
    if (key) { const a = $('#nav a[data-nav="' + key + '"]', this.el); if (a) a.classList.add('on'); }
  },
  activate(nav) {
    if (!this.el) return;
    if (this._role !== AppState.role + AppState.mode) { this._role = AppState.role + AppState.mode; this.renderSide(); this.renderTop(); }
    $$('#nav a', this.el).forEach(a => a.classList.toggle('on', a.dataset.nav === nav));
    this.el.classList.remove('nav-open');
  }
};
function pageHead(title, sub, actions, crumb) {
  return (crumb ? '<div class="crumb">' + crumb + '</div>' : '') + '<div class="page-head"><div><h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><div class="row row-wrap">' + (actions || '') + '</div></div>';
}
function emptyState(icon, title, sub, btn) { return '<div class="empty"><div class="empty-art">' + ic(icon, 'ic-xl') + '</div><div class="empty-title">' + title + '</div>' + (sub ? '<div>' + sub + '</div>' : '') + (btn || '') + '</div>'; }

/* ---------------- Data bersama ---------------- */
async function loadSiswa(force) {
  const res = await swr('siswa', 'listSiswa', {}, (d) => { AppState.siswa = d; }, { fresh: force ? 0 : 60000, force: !!force });
  return AppState.siswa || [];
}
function siswaById(id) { return (AppState.siswa || []).find(s => s.SiswaID === id); }
async function loadEvent(id, render, force) {
  const res = await swr('ev:' + id, 'eventDetail', { eventId: id }, (d) => { AppState.ev[id] = d; if (render) render(d); }, { fresh: force ? 0 : 20000, force: !!force,
    onError: (r) => { if (render) render(null, r); } });
  return res;
}
/** Setelah perubahan: buang cache event & ambil ulang di latar (render bila berubah). */
const _invT = {};
window.invalidateEvent = function (id) {
  swrDrop('ev:' + id);
  clearTimeout(_invT[id]);
  _invT[id] = setTimeout(() => segarkanEvent(id), 250);   // beberapa simpan beruntun → satu penyegaran
};
/** Detail event + boot dasbor dalam SATU panggilan server (batch), render ulang hanya bila berubah. */
async function segarkanEvent(id) {
  window._batchAt = Date.now();
  const res = await api('batch', { calls: [{ action: 'eventDetail', data: { eventId: id } }, { action: 'staffBoot' }] });
  if (!res.success) return;
  const d = res.data.eventDetail, b = res.data.staffBoot;
  if (d && d.success) {
    const lama = AppState.ev[id], beda = !lama || hashStr(JSON.stringify(lama)) !== hashStr(JSON.stringify(d.data));
    AppState.ev[id] = d.data; swrPut('ev:' + id, d.data);
    const el = $('.page[data-page="ev"]');
    if (beda && el && !el.hidden && el._id === id && !document.querySelector('#overlay-root .backdrop')) evRender(el);
  }
  if (b && b.success) { AppState.boot = b.data; swrPut('boot', b.data); if (window.Shell) Shell.refreshBadges(); }
}
/** Optimistic UI: ubah & tampilkan dulu, simpan di latar, kembalikan bila server menolak. */
async function optimis(el, ubah, batal, kirim, sukses) {
  ubah(); evRender(el);
  const res = await kirim();
  if (res.success) { if (sukses) toast(sukses[0], sukses[1] || ''); return res; }
  batal(); evRender(el); toast('Gagal menyimpan', res.message, 'error');
  return res;
}
function ptkOptions(sel, filter) { return (B().ptk || []).filter(p => p.Aktif !== 'Tidak' && (!filter || filter(p))).map(p => '<option value="' + esc(p.PTK_ID) + '"' + (p.PTK_ID === sel ? ' selected' : '') + '>' + esc(p.Nama) + (p.Jabatan ? ' — ' + esc(p.Jabatan) : '') + '</option>').join(''); }
function kelasDatalist(id) { return '<datalist id="' + id + '">' + (B().kelas || []).map(k => '<option value="' + esc(k) + '">').join('') + '</datalist>'; }

/* ============================================================
   DASBOR
   ============================================================ */
registerPage('dasbor', {
  layout: 'shell', auth: 'staff', nav: 'dasbor', title: 'Dasbor',
  init(el) {
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'go') go(b.dataset.to);
      if (a === 'buat-event') bukaFormEvent();
      if (a === 'voting') {
        const buka = b.dataset.v === '1';
        if (!buka && !(await confirmBox({ title: 'Tutup voting?', text: 'Siswa dan PTK tidak bisa memilih lagi sampai voting dibuka kembali.', ok: 'Tutup Voting', danger: true }))) return;
        const res = await busy(b, () => api('setVoting', { eventId: b.dataset.id, buka }));
        if (toastRes(res, buka ? 'Voting dibuka' : 'Voting ditutup')) { const o = B().osis; if (o) o.VotingDibuka = buka ? 'Ya' : 'Tidak'; dashPaint(el); refreshBoot(); invalidateEvent(b.dataset.id); }
      }
    });
  },
  async show(el) {
    dashPaint(el);
    clearInterval(el._poll);
    const tick = () => { if (!el.hidden && document.visibilityState === 'visible') ensureStaffBoot(true).then(() => { if (!el.hidden) dashPaint(el); Shell.refreshBadges(); }); };
    if (!AppState.boot || Date.now() - (Store.get(userKey('boot'), { t: 0 }).t) > 10000) tick();
    el._poll = setInterval(tick, 30000);
  },
  leave() { const el = $('.page[data-page="dasbor"]'); if (el) clearInterval(el._poll); }
});
function dashPaint(el) {
  const b = B(); if (!b.counts) { el.innerHTML = skeletonCards(4); return; }
  const c = b.counts, o = b.osis;
  const al = b.alerts[0];
  const stat = (lbl, n, icon, tile, foot, up) => '<div class="card stat"><div class="row between"><span class="lbl">' + lbl + '</span><span class="icon-tile ' + tile + '">' + ic(icon) + '</span></div><div class="num">' + fmtNum(n) + '</div><div class="foot' + (up ? ' up' : '') + '">' + foot + '</div></div>';
  let part = '', bars = '';
  if (o) {
    const tot = o.totalSiswa + o.totalPtk, pem = o.pemilihSiswa + o.pemilihPtk, p = pct(pem, tot), R = 80, C = 2 * Math.PI * R;
    part = '<div class="card card-pad"><div class="row between" style="align-items:flex-start"><div><div class="card-title">Partisipasi Pemilihan OSIS</div><div class="card-sub">' + esc(o.Judul) + '</div></div>' + statusBadge(o.VotingDibuka === 'Ya' ? 'Berjalan' : o.Status) + '</div>' +
      '<div class="donut"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="' + R + '" fill="none" stroke="var(--primary-tint)" stroke-width="22"/><circle cx="100" cy="100" r="' + R + '" fill="none" stroke="var(--primary)" stroke-width="22" stroke-linecap="round" stroke-dasharray="' + (C * p / 100) + ' ' + C + '" style="transition:stroke-dasharray .8s"/></svg><div class="ctr"><b>' + Math.round(p) + '%</b><span>TERCAPAI</span></div></div>' +
      '<div class="row between mt-8"><span class="row" style="font-weight:600"><i style="width:9px;height:9px;border-radius:50%;background:var(--primary)"></i>Siswa</span><span class="tnum"><b>' + o.pemilihSiswa + '</b> / ' + o.totalSiswa + ' (' + fmtNum(pct(o.pemilihSiswa, o.totalSiswa), 1) + '%)</span></div><div class="prog mt-8"><i style="width:' + pct(o.pemilihSiswa, o.totalSiswa) + '%"></i></div>' +
      '<div class="row between mt-12"><span class="row" style="font-weight:600"><i style="width:9px;height:9px;border-radius:50%;background:var(--green)"></i>PTK (Guru & Staf)</span><span class="tnum"><b>' + o.pemilihPtk + '</b> / ' + o.totalPtk + ' (' + fmtNum(pct(o.pemilihPtk, o.totalPtk), 1) + '%)</span></div><div class="prog green mt-8"><i style="width:' + pct(o.pemilihPtk, o.totalPtk) + '%"></i></div>' +
      '<div class="row mt-24">' + (o.VotingDibuka === 'Ya' ? '<button class="btn btn-danger-soft grow" data-act="voting" data-v="0" data-id="' + esc(o.EventID) + '">' + ic('lock', 'ic-sm') + ' Tutup Voting</button>' : '<button class="btn btn-soft grow" data-act="voting" data-v="1" data-id="' + esc(o.EventID) + '">' + ic('lock-open', 'ic-sm') + ' Buka Voting</button>') +
      '<button class="btn btn-primary grow" data-act="go" data-to="tayang/' + esc(o.EventID) + '">' + ic('monitor', 'ic-sm') + ' Buka Layar Hasil</button></div></div>';
    const maxP = Math.max(50, ...o.kandidat.map(k => k.persen));
    bars = '<div class="card card-pad"><div class="row between row-wrap"><div><div class="row"><span class="card-title">Perolehan Suara Sementara</span><span class="badge badge-green"><span class="dot"></span>Live</span></div><div class="card-sub">Total ' + o.totalSuara + ' suara masuk dari ' + (o.totalSiswa + o.totalPtk) + ' pemilih tetap</div></div></div>' +
      (o.kandidat.length ? '<div class="bars">' + [0.5, 1].map(f => '<div class="gl" style="bottom:' + (f * 100 * 50 / maxP) + '%"><span>' + Math.round(f * 50) + '%</span></div>').join('') +
        o.kandidat.slice().sort((a, b) => a.NoUrut - b.NoUrut).map(k => '<div class="bar-col"><div class="v">' + k.suara + ' suara</div><div class="p">' + fmtNum(k.persen, 1) + '%</div><div class="b" style="height:' + Math.max(2, k.persen / maxP * 100) + '%;opacity:' + ([1, .55, .32][k.peringkat - 1] || .25) + '"></div></div>').join('') + '</div>' +
        '<div class="bar-lbls">' + o.kandidat.slice().sort((a, b) => a.NoUrut - b.NoUrut).map(k => '<div><b>' + (k.Tipe === 'Pasangan' ? 'Paslon ' : 'Calon ') + noUrut(k.NoUrut) + '</b><span class="ellipsis" style="display:block">' + esc(k.Nama1.split(' ')[0]) + (k.Nama2 ? ' &amp; ' + esc(k.Nama2.split(' ')[0]) : '') + '</span></div>').join('') + '</div>' : emptyState('vote', 'Belum ada calon', '')) +
      '<div class="row between mt-24 small"><span class="row muted">' + ic('refresh-cw', 'ic-sm') + ' Pembaruan otomatis setiap 30 detik</span><a href="#/ev/' + esc(o.EventID) + '/hasil" class="link-btn">Lihat Rekap Suara ' + ic('chevron-right', 'ic-sm') + '</a></div></div>';
  }
  const evs = b.events.slice(0, 4);
  el.innerHTML =
    (al ? '<div class="alert alert-amber mb-16" style="padding:16px 20px"><span class="icon-tile amber" style="width:40px;height:40px">' + ic('triangle-alert') + '</span><div class="grow"><b style="font-size:15px">' + b.alerts.length + ' hasil seri perlu ditetapkan</b> — <span>' + esc(al.label) + '</span></div><button class="btn btn-amber" data-act="go" data-to="ev/' + esc(al.EventID) + '/hasil' + (al.CabangID ? '/' + al.CabangID : '') + '">Tetapkan Sekarang ' + ic('arrow-right', 'ic-sm') + '</button></div>' : '') +
    '<div class="grid-4 mb-16">' +
    stat('Event Berjalan', c.eventBerjalan, 'calendar', '', '<span class="badge-dot" style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span> ' + c.osisBerjalan + ' Pemilihan OSIS, ' + c.lombaBerjalan + ' Lomba aktif') +
    stat('Siswa Terdaftar', c.siswa, 'users', 'indigo', ic('badge-check', 'ic-sm') + ' Siswa aktif di aplikasi') +
    stat('PTK & Juri Aktif', c.ptk, 'user-check', 'green', ic('clipboard-check', 'ic-sm') + ' ' + c.juriAktif + ' juri di event berjalan') +
    stat('Pendaftar Formulir', c.pendaftar, 'file-text', 'amber', ic('trending-up', 'ic-sm') + ' +' + c.pendaftarHariIni + ' pendaftar hari ini', c.pendaftarHariIni > 0) + '</div>' +
    (o ? '<div class="row gap-16 mb-16" style="align-items:stretch;flex-wrap:wrap"><div style="flex:1 1 340px">' + part + '</div><div style="flex:1.5 1 420px">' + bars + '</div></div>' : '') +
    '<div class="row gap-16" style="align-items:flex-start;flex-wrap:wrap"><div class="card" style="flex:1.7 1 520px;min-width:0;overflow:hidden"><div class="card-head"><div><div class="card-title">Daftar Event</div><div class="card-sub">Kelola jadwal dan status penyelenggaraan agenda sekolah</div></div>' + (isAdmin() ? '<button class="btn btn-primary" data-act="buat-event">' + ic('plus', 'ic-sm') + ' Buat Event</button>' : '') + '</div>' +
    (evs.length ? '<div class="tbl-wrap mt-16"><table class="tbl"><thead><tr><th>Nama Event</th><th>Jenis</th><th>Tanggal</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
      evs.map(e => '<tr><td><div class="row" style="gap:12px"><span class="icon-tile" style="width:38px;height:38px">' + ic(jenisIcon(e.JenisEvent), 'ic-sm') + '</span><div style="min-width:0"><div style="font-weight:700">' + esc(e.Judul) + '</div><div class="small muted">' + (e.JenisEvent === 'Lomba' ? e.jumlahCabang + ' cabang · ' + e.jumlahPeserta + ' peserta' : e.JenisEvent === 'OSIS' ? e.jumlahKandidat + ' calon' : esc(e.Tempat || '')) + '</div></div></div></td><td>' + esc(e.JenisEvent) + '</td><td style="white-space:nowrap">' + esc(rentangTgl(e.TanggalMulai, e.TanggalSelesai)) + '</td><td>' + statusBadge(e.Status) + '</td><td style="text-align:right"><button class="btn btn-soft btn-sm" data-act="go" data-to="ev/' + esc(e.EventID) + '">Detail</button></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="row between" style="padding:14px 24px 18px"><span class="small muted">Menampilkan ' + evs.length + ' dari ' + b.events.length + ' event</span><a class="link-btn" href="#/event">Kelola Semua Event ' + ic('arrow-right', 'ic-sm') + '</a></div>'
      : emptyState('calendar-plus', 'Belum ada event', 'Buat event pertama untuk memulai.', isAdmin() ? '<button class="btn btn-primary" data-act="buat-event">' + ic('plus', 'ic-sm') + ' Buat Event</button>' : '')) + '</div>' +
    '<div class="card" style="flex:1 1 320px"><div class="card-head"><div><div class="card-title">Jawaban Formulir Terbaru</div><div class="card-sub">Pendaftaran peserta masuk</div></div><a class="link-btn" href="#/formulir-admin">Lihat Semua</a></div><div class="card-body">' +
    (b.recentJawaban.length ? b.recentJawaban.map(j => '<a class="row" style="padding:10px 0;color:inherit;align-items:flex-start" href="#/jawaban/' + esc(j.FormID) + '">' + avatarHtml(j.nama) + '<div class="grow" style="min-width:0"><div class="row between"><b class="ellipsis">' + esc(j.nama) + '</b><span class="small muted" style="white-space:nowrap">' + esc(relWaktu(j.Waktu)) + '</span></div><div class="small muted">' + (j.kelas ? 'Kelas ' + esc(j.kelas) : '') + '</div><span class="badge mt-8" style="max-width:100%"><span class="ellipsis">' + esc(j.FormJudul) + '</span></span></div></a>').join('')
      : emptyState('inbox', 'Belum ada jawaban', 'Jawaban formulir terbaru tampil di sini.')) + '</div></div></div>';
}

/* ============================================================
   EVENT — daftar & form
   ============================================================ */
registerPage('event', {
  layout: 'shell', auth: 'staff', nav: 'event', title: 'Event',
  init(el) {
    el._f = 'Semua';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'f') { el._f = b.dataset.v; evListPaint(el); }
      if (b.dataset.act === 'buat') bukaFormEvent();
      if (b.dataset.act === 'buka') go('ev/' + b.dataset.id);
    });
  },
  show(el) { evListPaint(el); ensureStaffBoot().then(() => evListPaint(el)); }
});
function evListPaint(el) {
  const list = (B().events || []).filter(e => el._f === 'Semua' || e.Status === el._f || e.JenisEvent === el._f);
  el.innerHTML = pageHead('Event', 'Pemilihan OSIS, perlombaan, dan kegiatan sekolah lainnya', isAdmin() ? '<button class="btn btn-primary" data-act="buat">' + ic('plus', 'ic-sm') + ' Buat Event</button>' : '') +
    '<div class="seg mb-16">' + ['Semua', 'Berjalan', 'Draf', 'Selesai', 'OSIS', 'Lomba', 'Lainnya'].map(v => '<button data-act="f" data-v="' + v + '" class="' + (el._f === v ? 'on' : '') + '">' + v + '</button>').join('') + '</div>' +
    (list.length ? '<div class="ev-grid">' + list.map(e => '<div class="card ev-card card-tap" tabindex="0" role="button" data-act="buka" data-id="' + esc(e.EventID) + '"><div class="row between"><span class="icon-tile ' + (e.JenisEvent === 'Lomba' ? 'amber' : e.JenisEvent === 'OSIS' ? '' : 'teal') + '">' + ic(jenisIcon(e.JenisEvent)) + '</span>' + statusBadge(e.Status) + '</div>' +
      '<div><div style="font-weight:700;font-size:16px;line-height:1.3">' + esc(e.Judul) + '</div><div class="small muted mt-8">' + esc(e.JenisEvent === 'OSIS' ? 'Pemilihan OSIS' : e.JenisEvent === 'Lomba' ? 'Perlombaan' : 'Event lainnya') + '</div></div>' +
      '<div class="meta"><span>' + ic('calendar', 'ic-sm') + esc(rentangTgl(e.TanggalMulai, e.TanggalSelesai)) + '</span>' + (e.JenisEvent === 'Lomba' ? '<span>' + ic('trophy', 'ic-sm') + e.jumlahCabang + ' cabang · ' + e.jumlahPeserta + ' peserta</span>' : e.JenisEvent === 'OSIS' ? '<span>' + ic('users', 'ic-sm') + e.jumlahKandidat + ' calon</span>' : '') + '<span>' + ic('file-text', 'ic-sm') + e.jumlahFormulir + ' formulir</span></div></div>').join('') + '</div>'
      : '<div class="card">' + emptyState('calendar-plus', 'Belum ada event', el._f === 'Semua' ? 'Buat event pertama: pemilihan OSIS, lomba, atau kegiatan lain.' : 'Tidak ada event dengan filter ini.', isAdmin() && el._f === 'Semua' ? '<button class="btn btn-primary" data-act="buat">' + ic('plus', 'ic-sm') + ' Buat Event</button>' : '') + '</div>');
}
function bukaFormEvent(ev) {
  const e = ev || { JenisEvent: 'OSIS', Judul: '', TanggalMulai: todayStr(), TanggalSelesai: todayStr(), Tempat: '', Deskripsi: '', Status: 'Draf' };
  const jenis = [['OSIS', 'vote', 'Pemilihan OSIS', 'Calon, voting NISN & PTK'], ['Lomba', 'trophy', 'Perlombaan', 'Cabang, juri, voting siswa'], ['Lainnya', 'calendar-days', 'Event Lainnya', 'Formulir & daftar hadir']];
  const m = modal({
    title: ev ? 'Ubah Event' : 'Buat Event Baru', size: 'lg',
    body: (!ev ? '<div class="label mb-8">Jenis event</div><div class="grid-3 mb-16" id="jenis">' + jenis.map(j => '<label class="radio-card' + (e.JenisEvent === j[0] ? ' on' : '') + '" style="flex-direction:column;gap:8px"><input type="radio" name="jenis" value="' + j[0] + '"' + (e.JenisEvent === j[0] ? ' checked' : '') + ' hidden><span class="icon-tile">' + ic(j[1]) + '</span><b>' + j[2] + '</b><span class="small muted">' + j[3] + '</span></label>').join('') + '</div>' : '') +
      '<div class="field"><label>Judul event <span class="req">*</span></label><input class="input" id="e-judul" value="' + esc(e.Judul) + '" placeholder="mis. Pemilihan Ketua OSIS 2026/2027"></div>' +
      '<div class="grid-2 mt-16"><div class="field"><label>Tanggal mulai</label><input class="input" type="date" id="e-mulai" value="' + esc(e.TanggalMulai) + '"></div><div class="field"><label>Tanggal selesai</label><input class="input" type="date" id="e-selesai" value="' + esc(e.TanggalSelesai) + '"></div></div>' +
      '<div class="grid-2 mt-16"><div class="field"><label>Tempat</label><input class="input" id="e-tempat" value="' + esc(e.Tempat) + '" placeholder="mis. Aula Sekolah"></div><div class="field"><label>Status</label><select class="select" id="e-status">' + ['Draf', 'Berjalan', 'Selesai'].map(s => '<option' + (e.Status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div></div>' +
      '<div class="field mt-16"><label>Deskripsi</label><textarea class="textarea" id="e-desk" placeholder="Keterangan singkat event">' + esc(e.Deskripsi) + '</textarea></div><div id="e-err"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="e-simpan">' + ic('save', 'ic-sm') + ' ' + (ev ? 'Simpan Perubahan' : 'Buat Event') + '</button>'
  });
  m.el.addEventListener('change', (x) => { if (x.target.name === 'jenis') m.qa('#jenis .radio-card').forEach(c => c.classList.toggle('on', c.querySelector('input').checked)); });
  m.q('#e-simpan').onclick = async (x) => {
    const d = { EventID: e.EventID, Judul: m.q('#e-judul').value.trim(), TanggalMulai: m.q('#e-mulai').value, TanggalSelesai: m.q('#e-selesai').value, Tempat: m.q('#e-tempat').value, Status: m.q('#e-status').value, Deskripsi: m.q('#e-desk').value };
    if (!ev) d.JenisEvent = (m.q('input[name=jenis]:checked') || {}).value;
    if (!d.Judul) { m.q('#e-judul').classList.add('is-error'); m.q('#e-err').innerHTML = '<div class="err-text mt-8">Judul event wajib diisi.</div>'; return; }
    const res = await busy(x.currentTarget, () => api('simpanEvent', { event: d }));
    if (!res.success) { m.q('#e-err').innerHTML = '<div class="alert alert-red mt-12 small">' + esc(res.message) + '</div>'; return; }
    m.close();
    toast(ev ? 'Event diperbarui' : 'Event dibuat', d.Judul);
    const evn = res.data.event;
    const list = B().events || (B().events = []);
    const i = list.findIndex(z => z.EventID === evn.EventID);
    if (i > -1) Object.assign(list[i], evn); else list.unshift(Object.assign({ jumlahCabang: 0, jumlahPeserta: 0, jumlahKandidat: 0, jumlahFormulir: 0 }, evn));
    refreshBoot();
    if (ev) invalidateEvent(evn.EventID); else go('ev/' + evn.EventID + '/' + (evn.JenisEvent === 'OSIS' ? 'calon' : evn.JenisEvent === 'Lomba' ? 'cabang' : 'info'));
  };
}


/* ============================================================
   BAGIKAN LINK — voting (siswa & PTK/juri), formulir, layar hasil
   ============================================================ */
window.bukaBagikan = async function (eventId, fokus) {
  let det = AppState.ev[eventId];
  if (!det) { await loadEvent(eventId); det = AppState.ev[eventId]; }
  if (!det) return toast('Gagal memuat event', '', 'error');
  const e = det.event, jalan = e.Status === 'Berjalan';
  const rows = [];
  if (e.JenisEvent === 'OSIS') rows.push({ id: 'vote', icon: 'vote', judul: 'Link Voting OSIS — Siswa & PTK', ket: 'Siswa masuk dengan NISN; PTK memilih nama lalu kata sandi. Setelah memilih, layar otomatis kembali ke login siswa — cocok untuk HP/laptop yang dipakai bergantian.', url: linkApp('voting-osis/' + e.EventID),
    warn: !jalan ? 'Status event masih ' + e.Status + '. Ubah ke Berjalan dan buka voting agar link bisa dipakai.' : e.VotingDibuka !== 'Ya' ? 'Voting belum dibuka. Buka voting di tab Calon.' : '' });
  if (e.JenisEvent === 'Lomba') rows.push({ id: 'vote', icon: 'trophy', judul: 'Link Voting & Penilaian Lomba — Siswa & Juri', ket: 'Siswa memilih kelas lalu nama untuk voting; juri (PTK atau juri tamu) masuk untuk mengisi nilai. Setelah siswa memilih, layar kembali ke login siswa.', url: linkApp('voting-lomba/' + e.EventID),
    warn: !jalan ? 'Status event masih ' + e.Status + '. Ubah ke Berjalan agar link bisa dipakai.' : !(det.cabang || []).some(c => c.VotingDibuka === 'Ya') ? 'Belum ada cabang dengan voting dibuka (juri tetap bisa masuk).' : '' });
  (det.formulir || []).forEach(f => rows.push({ id: 'f-' + f.FormID, icon: 'file-text', judul: 'Formulir — ' + f.Judul, ket: f.Akses === 'LoginSiswa' ? 'Khusus siswa (memasukkan NISN).' : 'Siapa saja yang memiliki link dapat mengisi.', url: linkApp('f/' + f.TokenLink), warn: f.Status !== 'Buka' ? 'Formulir sedang ditutup.' : '' }));
  if (e.JenisEvent !== 'Lainnya') rows.push({ id: 'layar', icon: 'monitor', judul: 'Link Layar Hasil — IFP / Proyektor', ket: 'Buka di IFP atau proyektor tanpa login admin. Admin tetap bisa memakai aplikasi di perangkat lain. Hasil tampil setelah tombol "Tampilkan Hasil" ditekan.', url: '', layar: true });
  const card = (r) => '<div class="share-row" data-row="' + esc(r.id) + '"><div class="share-qr" data-qr>' + (r.url ? '<div class="sk" style="width:100%;height:100%"></div>' : ic('qr-code', 'ic-xl')) + '</div>' +
    '<div class="grow" style="min-width:0"><div class="row" style="gap:8px"><span class="icon-tile" style="width:32px;height:32px">' + ic(r.icon, 'ic-sm') + '</span><b>' + esc(r.judul) + '</b></div><div class="small muted mt-8" style="line-height:1.5">' + esc(r.ket) + '</div>' +
    (r.warn ? '<div class="alert alert-amber small mt-8">' + ic('triangle-alert', 'ic-sm') + '<span>' + esc(r.warn) + '</span></div>' : '') +
    '<div class="share-url mt-8"><input class="input input-sm mono" readonly value="' + esc(r.url) + '" data-url placeholder="' + (r.layar ? 'Membuat link layar…' : '') + '"></div>' +
    '<div class="row row-wrap mt-8"><button class="btn btn-primary btn-sm" data-sh="salin">' + ic('copy', 'ic-sm') + ' Salin</button><button class="btn btn-sm" data-sh="buka">' + ic('external-link', 'ic-sm') + ' Buka</button><button class="btn btn-sm" data-sh="besar">' + ic('qr-code', 'ic-sm') + ' QR Besar</button>' +
    (r.layar ? '<button class="btn btn-ghost btn-sm" data-sh="ganti" title="Link lama tidak berlaku lagi">' + ic('refresh-cw', 'ic-sm') + ' Ganti Link</button>' : '') + '</div></div></div>';
  const m = modal({ title: 'Bagikan Link — ' + e.Judul, size: 'lg', sub: 'Salin, buka, atau tampilkan kode QR agar siswa dan guru cukup memindai.', body: '<div class="stack" style="gap:14px">' + rows.map(card).join('') + '</div>' + (AppState.mode === 'demo' ? '<div class="alert alert-amber small mt-16">' + ic('flask-conical', 'ic-sm') + '<span>Link Mode Demo membuka data contoh dan berhenti berfungsi setelah demo diakhiri.</span></div>' : '') });
  const paintQr = async (row, url) => { const box = row.querySelector('[data-qr]'); try { box.innerHTML = await qrSvg(url, 120); } catch (x) { box.innerHTML = ic('qr-code', 'ic-xl'); } };
  const setUrl = (id, url) => { const row = m.q('[data-row="' + id + '"]'); if (!row) return; row.querySelector('[data-url]').value = url; paintQr(row, url); };
  rows.forEach(r => { if (r.url) setUrl(r.id, r.url); });
  const layarLink = async (baru) => {
    const res = await api('linkLayar', { eventId: e.EventID, baru: !!baru });
    if (!res.success) { toast('Gagal membuat link layar', res.message, 'error'); return; }
    setUrl('layar', linkApp('layar-tv/' + e.EventID + '/' + res.data.token));
    if (baru) toast('Link layar diganti', 'Link lama sudah tidak berlaku.');
  };
  if (rows.some(r => r.layar)) layarLink(false);
  if (fokus) setTimeout(() => { const r = m.q('[data-row="' + (fokus === 'layar' ? 'layar' : fokus) + '"]'); if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('flash'); } }, 60);
  m.el.addEventListener('click', async (x) => {
    const b = x.target.closest('[data-sh]'); if (!b) return;
    const row = b.closest('[data-row]'), url = row.querySelector('[data-url]').value, r = rows.find(z => z.id === row.dataset.row);
    if (!url && b.dataset.sh !== 'ganti') return toast('Link belum siap', 'Tunggu sebentar.', 'info');
    if (b.dataset.sh === 'salin') { if (await copyText(url)) toast('Link disalin', r.judul); }
    if (b.dataset.sh === 'buka') window.open(url, '_blank', 'noopener');
    if (b.dataset.sh === 'ganti') { if (await confirmBox({ title: 'Ganti link layar?', text: 'Layar yang sedang memakai link lama akan berhenti menampilkan hasil sampai dibuka dengan link baru.', ok: 'Ganti Link' })) busy(b, () => layarLink(true)); }
    if (b.dataset.sh === 'besar') {
      const svg = await qrSvg(url, 520).catch(() => '');
      const q = modal({ title: r.judul, size: 'lg', body: '<div class="center qr-big">' + svg + '<div class="mono small mt-12" style="word-break:break-all">' + esc(url) + '</div><p class="muted mt-8">Pindai dengan kamera HP untuk membuka.</p></div>',
        foot: '<button class="btn" data-close>Tutup</button><button class="btn btn-primary" id="qr-dl">' + ic('download', 'ic-sm') + ' Unduh QR</button>' });
      q.q('#qr-dl').onclick = () => downloadBlob('QR - ' + r.judul.replace(/[\\/:*?"<>|]/g, '') + '.svg', new Blob([svg], { type: 'image/svg+xml' }));
    }
  });
};

/* ============================================================
   DETAIL EVENT
   ============================================================ */
const EV_TABS = {
  OSIS: [['info', 'Info'], ['panitia', 'Panitia & SK'], ['calon', 'Calon'], ['formulir', 'Formulir'], ['hasil', 'Hasil'], ['kehadiran', 'Kehadiran'], ['cetak', 'Cetak']],
  Lomba: [['info', 'Info'], ['panitia', 'Panitia & SK'], ['cabang', 'Cabang & Peserta'], ['juri', 'Juri & Kriteria'], ['formulir', 'Formulir'], ['hasil', 'Hasil'], ['kehadiran', 'Kehadiran'], ['cetak', 'Cetak']],
  Lainnya: [['info', 'Info'], ['panitia', 'Panitia & SK'], ['formulir', 'Formulir'], ['kehadiran', 'Kehadiran'], ['cetak', 'Cetak']]
};
const EVH = {};   // handler aksi: EVH[act](el, btn, det)
registerPage('ev', {
  layout: 'shell', auth: 'staff', nav: 'event', title: 'Detail Event',
  init(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !el._det) return;
      const fn = EVH[b.dataset.act]; if (fn) fn(el, b, el._det, e);
    });
    el.addEventListener('change', (e) => { const t = e.target.closest('[data-chg]'); if (t && EVH[t.dataset.chg] && el._det) EVH[t.dataset.chg](el, t, el._det, e); });
    el.addEventListener('input', (e) => { const t = e.target.closest('[data-inp]'); if (t && EVH[t.dataset.inp] && el._det) EVH[t.dataset.inp](el, t, el._det, e); });
  },
  async show(el, id, tab, sub) {
    const changed = el._id !== id;
    el._id = id; el._tab = tab || 'info'; el._sub = sub || el._sub;
    if (changed) { el._sub = sub || ''; el._det = null; }
    const cached = AppState.ev[id];
    if (cached) { el._det = cached; evRender(el); }
    else { const e = evById(id); el.innerHTML = pageHead(esc(e ? e.Judul : 'Memuat…'), '', '', '<a href="#/event">Event</a>' + ic('chevron-right', 'ic-sm') + '<b>' + esc(e ? e.Judul : '…') + '</b>') + '<div class="tabs-card"><div class="tabs"><button class="on">Memuat…</button></div></div>' + skeletonCards(3, 140); }
    await loadEvent(id, (d, err) => {
      if (!d) { if (!el._det) el.innerHTML = errorBox(err ? err.message : 'Event tidak ditemukan.'); return; }
      el._det = d; if (!el.hidden && el._id === id) evRender(el);
    });
  }
});
function evRender(el) {
  const det = el._det = AppState.ev[el._id] || el._det, ev = det.event;
  const tabs = EV_TABS[ev.JenisEvent] || EV_TABS.Lainnya;
  if (!tabs.some(t => t[0] === el._tab)) el._tab = 'info';
  const body = (EV_RENDER[el._tab] || EV_RENDER.info)(det, el);
  const actions = '<button class="btn btn-soft" data-act="bagikan">' + ic('share-2', 'ic-sm') + ' Bagikan Link</button>' + (ev.JenisEvent !== 'Lainnya' ? '<a class="btn" href="#/tayang/' + esc(ev.EventID) + '">' + ic('monitor', 'ic-sm') + ' Layar Hasil</a>' : '') +
    (isAdmin() ? '<button class="btn btn-ghost btn-icon" data-act="hapus-event" title="Hapus event">' + ic('trash-2', 'ic-sm') + '</button>' : '');
  el.innerHTML = '<div class="crumb"><a href="#/event">Event</a>' + ic('chevron-right', 'ic-sm') + '<b>' + esc(ev.Judul) + '</b></div>' +
    '<div class="page-head"><div><div class="row row-wrap"><h1>' + esc(ev.Judul) + '</h1>' + statusBadge(ev.Status) + '</div><div class="row muted mt-8">' + ic('calendar', 'ic-sm') + '<span>' + esc(rentangTgl(ev.TanggalMulai, ev.TanggalSelesai)) + '</span>' + (ev.Tempat ? ic('map-pin', 'ic-sm') + '<span>' + esc(ev.Tempat) + '</span>' : '') + '</div></div><div class="row">' + actions + '</div></div>' +
    '<div class="tabs-card"><div class="tabs" role="tablist">' + tabs.map(t => '<button role="tab" data-act="tab" data-v="' + t[0] + '" class="' + (el._tab === t[0] ? 'on' : '') + '">' + t[1] + (t[0] === 'hasil' && (det.hasil && det.hasil.seri || (det.cabang || []).some(c => c.hasil.seri)) ? ' <span class="badge badge-amber" style="height:20px">Seri</span>' : '') + '</button>').join('') + '</div></div>' +
    '<div id="ev-body">' + body + '</div>';
  if (EV_AFTER[el._tab]) EV_AFTER[el._tab](det, el);
}
EVH.bagikan = (el, b, det) => bukaBagikan(det.event.EventID, b.dataset.fokus || '');
EVH.tab = (el, b) => { el._tab = b.dataset.v; history.replaceState(null, '', '#/ev/' + el._id + '/' + el._tab + (el._sub ? '/' + el._sub : '')); evRender(el); window.scrollTo({ top: 0 }); };
EVH['hapus-event'] = async (el, b, det) => {
  const ok = await confirmBox({ title: 'Hapus event?', html: 'Semua data <b>' + esc(det.event.Judul) + '</b> (calon/cabang, peserta, suara, nilai, formulir, jawaban, kehadiran) akan dihapus permanen.', ok: 'Hapus Event', danger: true, typed: 'HAPUS' });
  if (!ok) return;
  const res = await api('hapusEvent', { eventId: det.event.EventID });
  if (toastRes(res, 'Event dihapus')) { delete AppState.ev[det.event.EventID]; swrDrop('ev:' + det.event.EventID); B().events = (B().events || []).filter(e => e.EventID !== det.event.EventID); refreshBoot(); go('event'); }
};
const EV_RENDER = {}, EV_AFTER = {};

/* ---------------- Tab: Info ---------------- */
EV_RENDER.info = (det) => {
  const e = det.event;
  const stats = e.JenisEvent === 'OSIS' ? [['Calon', det.kandidat.length, 'users'], ['Suara masuk', det.hasil.totalSuara, 'vote'], ['Partisipasi', fmtNum(pct(det.hasil.pemilihSiswa + det.hasil.pemilihPtk, det.hasil.totalSiswa + det.hasil.totalPtk), 1) + '%', 'chart-pie']]
    : e.JenisEvent === 'Lomba' ? [['Cabang', det.cabang.length, 'trophy'], ['Peserta', det.cabang.reduce((s, c) => s + c.peserta.length, 0), 'users'], ['Juri', uniq([].concat(...det.cabang.map(c => c.juri.map(j => j.PTK_ID || j.Nama)))).length, 'clipboard-check']]
      : [['Formulir', det.formulir.length, 'file-text'], ['Pendaftar', det.formulir.reduce((s, f) => s + f.jumlahJawaban, 0), 'inbox'], ['Kehadiran', det.kehadiran.length, 'clock']];
  return '<div class="row gap-16" style="align-items:flex-start;flex-wrap:wrap"><div class="card card-pad" style="flex:2 1 480px"><div class="card-title mb-16">Informasi Event</div>' +
    '<div class="field"><label>Judul event</label><input class="input" id="i-judul" value="' + esc(e.Judul) + '"></div>' +
    '<div class="grid-3 mt-16"><div class="field"><label>Tanggal mulai</label><input class="input" type="date" id="i-mulai" value="' + esc(e.TanggalMulai) + '"></div><div class="field"><label>Tanggal selesai</label><input class="input" type="date" id="i-selesai" value="' + esc(e.TanggalSelesai) + '"></div>' +
    '<div class="field"><label>Status</label><select class="select" id="i-status">' + ['Draf', 'Berjalan', 'Selesai'].map(s => '<option' + (e.Status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div></div>' +
    '<div class="field mt-16"><label>Tempat</label><input class="input" id="i-tempat" value="' + esc(e.Tempat) + '" placeholder="mis. Aula Sekolah"></div>' +
    '<div class="field mt-16"><label>Deskripsi</label><textarea class="textarea" id="i-desk">' + esc(e.Deskripsi) + '</textarea></div>' +
    '<div class="hint mt-8">Status <b>Berjalan</b> diperlukan agar voting & formulir dapat diakses. Mengubah status ke Draf/Selesai otomatis menutup voting.</div>' +
    '<div class="row mt-16" style="justify-content:flex-end"><button class="btn btn-primary" data-act="simpan-info">' + ic('save', 'ic-sm') + ' Simpan</button></div></div>' +
    '<div style="flex:1 1 280px" class="stack">' + stats.map(s => '<div class="card stat" style="min-height:0"><div class="row between"><span class="lbl">' + s[0] + '</span><span class="icon-tile">' + ic(s[2]) + '</span></div><div class="num" style="font-size:32px">' + s[1] + '</div></div>').join('') +
    '<div class="card card-pad small muted">Dibuat oleh ' + esc(e.DibuatOleh || '-') + (e.DibuatPada ? ' · ' + esc(tglPendek(e.DibuatPada)) : '') + '</div></div></div>';
};
EVH['simpan-info'] = async (el, b, det) => {
  const d = { EventID: det.event.EventID, Judul: $('#i-judul', el).value.trim(), TanggalMulai: $('#i-mulai', el).value, TanggalSelesai: $('#i-selesai', el).value, Status: $('#i-status', el).value, Tempat: $('#i-tempat', el).value, Deskripsi: $('#i-desk', el).value };
  const res = await busy(b, () => api('simpanEvent', { event: d }));
  if (toastRes(res, 'Event disimpan')) { Object.assign(det.event, res.data.event); evRender(el); invalidateEvent(det.event.EventID); }
};

/* ---------------- Tab: Panitia & SK ---------------- */
EV_RENDER.panitia = (det, el) => {
  const adm = isAdmin();
  el._pan = el._pan && el._pan.ev === det.event.EventID ? el._pan : { ev: det.event.EventID, list: det.panitia.map(p => ({ PTK_ID: p.PTK_ID, JabatanPanitia: p.JabatanPanitia })) };
  const sk = det.sk || {};
  const rows = el._pan.list.map((p, i) => {
    const t = ptkById(p.PTK_ID) || {};
    return '<tr><td style="width:40px" class="muted">' + (i + 1) + '</td><td><div class="row">' + avatarHtml(t.Nama || '?', '', 'avatar-sm') + '<div><b>' + esc(t.Nama || '(PTK dihapus)') + '</b><div class="small muted">' + esc(nomorPtk(t)) + '</div></div></div></td>' +
      '<td style="width:220px">' + (adm ? '<input class="input input-sm" list="jab-list" data-inp="pan-jab" data-i="' + i + '" value="' + esc(p.JabatanPanitia) + '">' : esc(p.JabatanPanitia)) + '</td>' +
      (adm ? '<td class="acts" style="width:120px"><button class="btn btn-ghost btn-icon btn-sm" data-act="pan-up" data-i="' + i + '" title="Naik">' + ic('arrow-up', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="pan-del" data-i="' + i + '" title="Hapus">' + ic('trash-2', 'ic-sm') + '</button></td>' : '') + '</tr>';
  }).join('');
  return '<div class="row gap-16" style="align-items:flex-start;flex-wrap:wrap"><div class="card" style="flex:1.3 1 460px;overflow:hidden"><div class="card-head"><div><div class="card-title">Panitia Event</div><div class="card-sub">PTK yang ditunjuk dapat mengelola event ini (formulir, hasil, kehadiran, cetak).</div></div></div>' +
    '<datalist id="jab-list">' + ['Ketua Panitia', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Seksi Acara', 'Seksi Perlengkapan', 'Seksi Dokumentasi', 'Seksi Konsumsi', 'Anggota'].map(x => '<option value="' + x + '">').join('') + '</datalist>' +
    '<div class="tbl-wrap mt-16"><table class="tbl"><tbody>' + (rows || '<tr><td>' + emptyState('users', 'Belum ada panitia', adm ? 'Tambahkan PTK sebagai panitia.' : '') + '</td></tr>') + '</tbody></table></div>' +
    (adm ? '<div class="row row-wrap" style="padding:16px 24px 20px"><select class="select grow" id="pan-ptk" style="min-width:200px"><option value="">— Pilih PTK —</option>' + ptkOptions('', p => !el._pan.list.some(x => x.PTK_ID === p.PTK_ID)) + '</select><button class="btn btn-soft" data-act="pan-add">' + ic('user-plus', 'ic-sm') + ' Tambah</button><button class="btn btn-primary" data-act="pan-save">' + ic('save', 'ic-sm') + ' Simpan Panitia</button></div>' : '') + '</div>' +
    '<div class="card card-pad" style="flex:1 1 380px"><div class="row between"><div><div class="card-title">Surat Keputusan (SK) Panitia</div><div class="card-sub">Nomor SK diketik manual.</div></div><button class="btn btn-soft btn-sm" data-act="cetak-doc" data-jenis="SK">' + ic('printer', 'ic-sm') + ' Cetak SK</button></div>' +
    '<div class="grid-2 mt-16"><div class="field"><label>Nomor SK</label><input class="input" id="sk-no" value="' + esc(sk.NomorSK || '') + '" placeholder="mis. 421.3/012/SMP/X/2026"' + (adm ? '' : ' readonly') + '></div><div class="field"><label>Tanggal SK</label><input class="input" type="date" id="sk-tgl" value="' + esc(sk.TanggalSK || todayStr()) + '"' + (adm ? '' : ' readonly') + '></div></div>' +
    '<div class="field mt-12"><label>Menimbang</label><textarea class="textarea" id="sk-menimbang" rows="3"' + (adm ? '' : ' readonly') + ' placeholder="a. bahwa ...">' + esc(sk.Menimbang || '') + '</textarea></div>' +
    '<div class="field mt-12"><label>Mengingat</label><textarea class="textarea" id="sk-mengingat" rows="3"' + (adm ? '' : ' readonly') + ' placeholder="1. Undang-Undang ...">' + esc(sk.Mengingat || '') + '</textarea></div>' +
    '<div class="field mt-12"><label>Memutuskan / Menetapkan</label><textarea class="textarea" id="sk-memutuskan" rows="3"' + (adm ? '' : ' readonly') + ' placeholder="Menetapkan susunan panitia ...">' + esc(sk.Memutuskan || '') + '</textarea></div>' +
    '<div class="field mt-12"><label>Penanda tangan</label><select class="select" id="sk-ttd"' + (adm ? '' : ' disabled') + '><option value="">Kepala sekolah (dari Pengaturan)</option>' + ptkOptions(sk.PenandaTangan_PTK_ID) + '</select></div>' +
    (adm ? '<div class="row mt-16" style="justify-content:flex-end"><button class="btn btn-primary" data-act="sk-save">' + ic('save', 'ic-sm') + ' Simpan SK</button></div>' : '') + '</div></div>';
};
EVH['pan-jab'] = (el, t) => { el._pan.list[+t.dataset.i].JabatanPanitia = t.value; };
EVH['pan-add'] = (el) => { const v = $('#pan-ptk', el).value; if (!v) return toast('Pilih PTK dulu', '', 'warning'); el._pan.list.push({ PTK_ID: v, JabatanPanitia: el._pan.list.length ? 'Anggota' : 'Ketua Panitia' }); evRender(el); };
EVH['pan-del'] = (el, b) => { el._pan.list.splice(+b.dataset.i, 1); evRender(el); };
EVH['pan-up'] = (el, b) => { const i = +b.dataset.i; if (i > 0) { const l = el._pan.list; [l[i - 1], l[i]] = [l[i], l[i - 1]]; evRender(el); } };
EVH['pan-save'] = async (el, b, det) => {
  const res = await busy(b, () => api('simpanPanitia', { eventId: det.event.EventID, list: el._pan.list }));
  if (toastRes(res, 'Panitia disimpan')) { el._pan = null; invalidateEvent(det.event.EventID); }
};
EVH['sk-save'] = async (el, b, det) => {
  const sk = { SK_ID: det.sk && det.sk.SK_ID, NomorSK: $('#sk-no', el).value, TanggalSK: $('#sk-tgl', el).value, Menimbang: $('#sk-menimbang', el).value, Mengingat: $('#sk-mengingat', el).value, Memutuskan: $('#sk-memutuskan', el).value, PenandaTangan_PTK_ID: $('#sk-ttd', el).value };
  const res = await busy(b, () => api('simpanSK', { eventId: det.event.EventID, sk }));
  if (toastRes(res, 'SK disimpan')) { det.sk = res.data.sk; invalidateEvent(det.event.EventID); }
};

/* ---------------- Tab: Calon OSIS ---------------- */
EV_RENDER.calon = (det) => {
  const e = det.event, h = det.hasil, tunggal = e.SistemCalon === 'Tunggal', adaSuara = h.totalSuara > 0;
  return '<div class="card card-pad mb-16"><div class="row row-wrap between" style="gap:12px"><div><div class="card-title">Sistem Pencalonan</div><div class="card-sub">' + (tunggal ? 'Setiap calon maju sendiri. <b>Suara terbanyak menjadi Ketua</b>, suara terbanyak kedua menjadi <b>Wakil Ketua</b>.' : 'Calon maju berpasangan: Ketua & Wakil Ketua dalam satu nomor urut.') + '</div></div>' +
    '<div class="seg" id="sistem-calon">' + [['Pasangan', 'users', 'Pasangan'], ['Tunggal', 'user-round', 'Calon Tunggal']].map(x => '<button data-act="sistem-calon" data-v="' + x[0] + '" class="' + ((tunggal ? 'Tunggal' : 'Pasangan') === x[0] ? 'on' : '') + '"' + (adaSuara ? ' disabled title="Tidak dapat diubah karena sudah ada suara masuk"' : '') + '>' + ic(x[1], 'ic-sm') + ' ' + x[2] + '</button>').join('') + '</div></div></div>' +
    '<div class="card card-pad mb-16 row row-wrap between"><div class="row"><span class="icon-tile ' + (e.VotingDibuka === 'Ya' ? 'green' : 'gray') + '">' + ic(e.VotingDibuka === 'Ya' ? 'lock-open' : 'lock') + '</span><div><div class="card-title">Voting ' + (e.VotingDibuka === 'Ya' ? 'sedang dibuka' : 'ditutup') + '</div><div class="card-sub">' + h.totalSuara + ' suara masuk · ' + (h.pemilihSiswa) + ' siswa & ' + h.pemilihPtk + ' PTK sudah memilih</div></div></div>' +
    '<label class="switch"><input type="checkbox" data-chg="voting-osis"' + (e.VotingDibuka === 'Ya' ? ' checked' : '') + '><span class="track"></span><b>' + (e.VotingDibuka === 'Ya' ? 'Buka' : 'Tutup') + '</b></label></div>' +
    '<div class="row between mb-16"><div class="card-title">Daftar Calon (' + det.kandidat.length + ')</div><button class="btn btn-primary" data-act="calon-baru">' + ic('user-plus', 'ic-sm') + ' Tambah Calon</button></div>' +
    (det.kandidat.length ? '<div class="ev-grid">' + det.kandidat.map(k => '<div class="card card-pad"><div class="row"><span class="cand-no">' + noUrut(k.NoUrut) + '</span><div class="grow" style="min-width:0"><div style="font-weight:700" class="ellipsis">' + esc(k.Slogan || (k.Tipe === 'Pasangan' ? 'Pasangan Calon' : 'Calon')) + '</div><span class="badge badge-gray">' + (k.Tipe === 'Perorangan' ? 'Calon tunggal' : 'Pasangan') + '</span></div></div>' +
      '<div class="cand-photos' + (k.Tipe === 'Pasangan' ? '' : ' single') + ' mt-12"><div><div class="cand-photo" style="aspect-ratio:1">' + photoHtml(k.FotoFileId, k.Nama1, 300) + '</div><div class="cand-name">' + esc(k.Nama1) + '</div><div class="small muted">' + esc(k.Kelas1) + '</div></div>' +
      (k.Tipe === 'Pasangan' ? '<div><div class="cand-photo" style="aspect-ratio:1">' + photoHtml(k.FotoFileId2, k.Nama2, 300) + '</div><div class="cand-name">' + esc(k.Nama2) + '</div><div class="small muted">' + esc(k.Kelas2) + '</div></div>' : '') + '</div>' +
      '<div class="row mt-16"><button class="btn btn-soft btn-sm grow" data-act="calon-edit" data-id="' + esc(k.KandidatID) + '">' + ic('pencil', 'ic-sm') + ' Ubah</button><button class="btn btn-danger-soft btn-sm btn-icon" data-act="calon-hapus" data-id="' + esc(k.KandidatID) + '" title="Hapus">' + ic('trash-2', 'ic-sm') + '</button></div></div>').join('') + '</div>'
      : '<div class="card">' + emptyState('user-plus', 'Belum ada calon', tunggal ? 'Tambahkan minimal 2 calon beserta foto, visi, dan misi.' : 'Tambahkan pasangan calon ketua & wakil beserta foto, visi, dan misi.', '<button class="btn btn-primary" data-act="calon-baru">' + ic('user-plus', 'ic-sm') + ' Tambah Calon</button>') + '</div>');
};
EVH['voting-osis'] = async (el, t, det) => {
  const buka = t.checked;
  if (!buka && !(await confirmBox({ title: 'Tutup voting?', text: 'Pemilih tidak bisa memberikan suara sampai voting dibuka kembali.', ok: 'Tutup Voting', danger: true }))) { t.checked = true; return; }
  const e = det.event, lama = { v: e.VotingDibuka, s: e.Status };
  const res = await optimis(el, () => { e.VotingDibuka = buka ? 'Ya' : 'Tidak'; if (buka) e.Status = 'Berjalan'; }, () => { e.VotingDibuka = lama.v; e.Status = lama.s; },
    () => api('setVoting', { eventId: e.EventID, buka }), [buka ? 'Voting dibuka' : 'Voting ditutup', buka ? 'Siswa & PTK sekarang bisa memilih.' : '']);
  if (res.success) invalidateEvent(e.EventID);
};
EVH['sistem-calon'] = async (el, b, det) => {
  const v = b.dataset.v, e = det.event;
  if ((e.SistemCalon === 'Tunggal' ? 'Tunggal' : 'Pasangan') === v) return;
  if (det.kandidat.length && !(await confirmBox({ title: 'Ubah sistem pencalonan?', html: v === 'Tunggal' ? 'Semua calon menjadi <b>calon tunggal</b>. Data calon wakil (nama, kelas, foto) pada setiap nomor urut akan dihapus.' : 'Semua calon menjadi <b>pasangan</b>. Lengkapi calon wakil untuk setiap nomor urut sebelum voting dibuka.', ok: 'Ubah Sistem' }))) return;
  const lama = { sistem: e.SistemCalon, kand: det.kandidat.map(k => Object.assign({}, k)) };
  const res = await optimis(el,
    () => { e.SistemCalon = v; det.kandidat.forEach(k => { if (v === 'Tunggal') Object.assign(k, { Tipe: 'Perorangan', Nama2: '', Kelas2: '', FotoFileId2: '' }); else k.Tipe = 'Pasangan'; }); },
    () => { e.SistemCalon = lama.sistem; det.kandidat = lama.kand; },
    () => api('simpanEvent', { event: { EventID: e.EventID, Judul: e.Judul, SistemCalon: v } }),
    ['Sistem pencalonan diubah', v === 'Tunggal' ? 'Wakil diambil dari suara terbanyak ke-2' : 'Pasangan Ketua & Wakil']);
  if (res.success) invalidateEvent(e.EventID);
};
EVH['calon-baru'] = (el, b, det) => formCalon(el, det, null);
EVH['calon-edit'] = (el, b, det) => formCalon(el, det, det.kandidat.find(k => k.KandidatID === b.dataset.id));
EVH['calon-hapus'] = async (el, b, det) => {
  const k = det.kandidat.find(x => x.KandidatID === b.dataset.id);
  if (!(await confirmBox({ title: 'Hapus calon?', text: 'Calon nomor ' + noUrut(k.NoUrut) + ' (' + k.Nama1 + ') akan dihapus.', ok: 'Hapus', danger: true }))) return;
  const res = await api('hapusKandidat', { kandidatId: k.KandidatID });
  if (toastRes(res, 'Calon dihapus')) { det.kandidat = det.kandidat.filter(x => x !== k); evRender(el); invalidateEvent(det.event.EventID); }
};
function formCalon(el, det, k) {
  const tunggal = det.event.SistemCalon === 'Tunggal';
  const c = Object.assign({ Tipe: tunggal ? 'Perorangan' : 'Pasangan', NoUrut: (det.kandidat.reduce((m, x) => Math.max(m, +x.NoUrut), 0) + 1), Nama1: '', Kelas1: '', Nama2: '', Kelas2: '', FotoFileId: '', FotoFileId2: '', Visi: '', Misi: '', Slogan: '' }, k || {});
  if (!AppState.siswa) loadSiswa();
  const fotoBox = (key, label) => '<div class="field"><label>' + label + '</label><div class="row"><span class="photo-thumb" id="pv-' + key + '" style="width:64px;height:64px;border-radius:14px">' + photoHtml(c[key], label, 160) + '</span><button type="button" class="btn btn-soft btn-sm" data-up="' + key + '">' + ic('upload', 'ic-sm') + ' Unggah</button>' + (c[key] ? '<button type="button" class="btn btn-ghost btn-sm" data-rm="' + key + '">Hapus</button>' : '') + '</div></div>';
  const m = modal({
    title: k ? 'Ubah Calon' : 'Tambah Calon', size: 'lg',
    body: '<datalist id="sw-list">' + (AppState.siswa || []).map(s => '<option value="' + esc(s.Nama) + '">' + esc(s.Kelas) + '</option>').join('') + '</datalist>' + kelasDatalist('kls-list') +
      '<div class="grid-2"><div class="field"><label>Nomor urut <span class="req">*</span></label><input class="input" type="number" min="1" id="c-no" value="' + esc(c.NoUrut) + '"></div><div class="field"><label>Sistem pencalonan</label><div class="alert alert-blue small" style="margin:0">' + ic(tunggal ? 'user-round' : 'users', 'ic-sm') + '<span>' + (tunggal ? 'Calon tunggal — wakil dari suara terbanyak ke-2' : 'Pasangan Ketua & Wakil') + '</span></div></div></div>' +
      '<div class="field mt-16"><label>Slogan / tagline</label><input class="input" id="c-slogan" value="' + esc(c.Slogan) + '" placeholder="mis. Maju Bersama, Berprestasi Nyata"></div>' +
      '<div class="subcard mt-16"><div class="label mb-8">' + (tunggal ? 'Calon' : 'Calon Ketua') + '</div><div class="grid-2"><div class="field"><label>Nama <span class="req">*</span></label><input class="input" id="c-n1" list="sw-list" value="' + esc(c.Nama1) + '"></div><div class="field"><label>Kelas</label><input class="input" id="c-k1" list="kls-list" value="' + esc(c.Kelas1) + '"></div></div><div class="mt-12">' + fotoBox('FotoFileId', tunggal ? 'Foto calon' : 'Foto calon ketua') + '</div></div>' +
      (tunggal ? '' : '<div class="subcard mt-16" id="c-wakil"><div class="label mb-8">Calon Wakil</div><div class="grid-2"><div class="field"><label>Nama <span class="req">*</span></label><input class="input" id="c-n2" list="sw-list" value="' + esc(c.Nama2) + '"></div><div class="field"><label>Kelas</label><input class="input" id="c-k2" list="kls-list" value="' + esc(c.Kelas2) + '"></div></div><div class="mt-12">' + fotoBox('FotoFileId2', 'Foto calon wakil') + '</div></div>') +
      '<div class="field mt-16"><label>Visi</label><textarea class="textarea" id="c-visi" rows="2">' + esc(c.Visi) + '</textarea></div><div class="field mt-12"><label>Misi</label><textarea class="textarea" id="c-misi" rows="4" placeholder="1. ...&#10;2. ...">' + esc(c.Misi) + '</textarea></div><div id="c-err"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="c-save">' + ic('save', 'ic-sm') + ' Simpan Calon</button>'
  });
  m.el.addEventListener('click', async (e) => {
    const up = e.target.closest('[data-up]');
    if (up) { const key = up.dataset.up; const r = await busy(up, () => uploadImage('foto', { max: 700 })); if (r) { c[key] = r.fileId; m.q('#pv-' + key).innerHTML = photoHtml(r.fileId, '', 160); toast('Foto diunggah'); } }
    const rm = e.target.closest('[data-rm]'); if (rm) { c[rm.dataset.rm] = ''; m.q('#pv-' + rm.dataset.rm).innerHTML = photoHtml('', '?'); rm.remove(); }
  });
  m.el.addEventListener('change', (e) => { const map = { 'c-n1': 'c-k1', 'c-n2': 'c-k2' }; if (map[e.target.id]) { const s = (AppState.siswa || []).find(x => x.Nama === e.target.value); if (s) m.q('#' + map[e.target.id]).value = s.Kelas; } });
  m.q('#c-save').onclick = async (e) => {
    const d = Object.assign({}, c, { EventID: det.event.EventID, NoUrut: m.q('#c-no').value, Slogan: m.q('#c-slogan').value, Nama1: m.q('#c-n1').value.trim(), Kelas1: m.q('#c-k1').value.trim(), Nama2: tunggal ? '' : m.q('#c-n2').value.trim(), Kelas2: tunggal ? '' : m.q('#c-k2').value.trim(), Visi: m.q('#c-visi').value, Misi: m.q('#c-misi').value });
    const res = await busy(e.currentTarget, () => api('simpanKandidat', { kandidat: d }));
    if (!res.success) { m.q('#c-err').innerHTML = '<div class="alert alert-red mt-12 small">' + esc(res.message) + '</div>'; return; }
    m.close(); toast('Calon disimpan', d.Nama1);
    const i = det.kandidat.findIndex(x => x.KandidatID === res.data.kandidat.KandidatID);
    if (i > -1) det.kandidat[i] = res.data.kandidat; else det.kandidat.push(res.data.kandidat);
    det.kandidat.sort((a, b) => a.NoUrut - b.NoUrut);
    evRender(el); invalidateEvent(det.event.EventID);
  };
}

/* ---------------- Tab: Cabang & Peserta ---------------- */
function curCabang(el, det) {
  if (!det.cabang || !det.cabang.length) return null;
  let c = det.cabang.find(x => x.CabangID === el._sub);
  if (!c) { c = det.cabang[0]; el._sub = c.CabangID; }
  return c;
}
EV_RENDER.cabang = (det, el) => {
  const c = curCabang(el, det);
  const modeLbl = (x) => x.ModePenilaian === 'Gabungan' ? 'Gabungan ' + x.BobotJuri + '/' + x.BobotVoting : x.ModePenilaian === 'Voting' ? 'Voting saja' : 'Juri saja';
  const left = '<div><div class="row between mb-16"><div class="row"><b style="font-size:16px">Daftar Cabang</b><span class="badge">' + det.cabang.length + '</span></div><span class="small muted">Urut jadwal</span></div>' +
    det.cabang.map(x => '<div class="card list-card card-tap' + (c && x.CabangID === c.CabangID ? ' on' : '') + '" data-act="pilih-cabang" data-id="' + esc(x.CabangID) + '" tabindex="0" role="button"><div class="row between"><b style="font-size:16px;' + (c && x.CabangID === c.CabangID ? 'color:var(--primary)' : '') + '">' + esc(x.NamaCabang) + '</b>' + (c && x.CabangID === c.CabangID ? ic('circle-check', '') : ic('chevron-right', 'ic-sm')) + '</div>' +
      '<div class="small muted mt-8">' + esc(hariTgl(x.TanggalPelaksanaan)) + ' · ' + x.peserta.length + ' Peserta</div><div class="row mt-8"><span class="badge ' + (x.ModePenilaian === 'Voting' ? 'badge-amber' : x.ModePenilaian === 'Gabungan' ? '' : 'badge-gray') + '">' + modeLbl(x) + '</span><span class="small muted row gap-4">' + ic('users', 'ic-sm') + x.juri.length + ' Juri</span>' + (x.VotingDibuka === 'Ya' ? '<span class="badge badge-green"><span class="dot"></span>Voting</span>' : '') + '</div></div>').join('') +
    '<button class="btn btn-soft btn-block btn-lg" data-act="cabang-baru">' + ic('circle-plus', 'ic-sm') + ' Tambah Cabang</button>' +
    (c ? '<div class="card card-pad mt-16"><b>Rekap Cabang Ini</b><div class="grid-2 mt-12" style="gap:10px"><div class="subcard" style="padding:14px"><div class="small muted">Total Peserta</div><div style="font-size:22px;font-weight:800">' + c.peserta.length + ' Siswa</div></div><div class="subcard" style="padding:14px"><div class="small muted">Juri Ditugaskan</div><div style="font-size:22px;font-weight:800;color:var(--primary)">' + c.juri.length + ' Juri</div></div></div></div>' : '') + '</div>';
  if (!c) return '<div class="split"><div>' + left + '</div><div class="card">' + emptyState('trophy', 'Belum ada cabang lomba', 'Tambahkan cabang seperti Baca Puisi, Pidato, atau Lomba Poster.', '<button class="btn btn-primary" data-act="cabang-baru">' + ic('plus', 'ic-sm') + ' Tambah Cabang</button>') + '</div></div>';
  el._cf = el._cf && el._cf.id === c.CabangID ? el._cf : { id: c.CabangID, mode: c.ModePenilaian, bj: +c.BobotJuri || 60, bv: +c.BobotVoting || 40 };
  const f = el._cf, total = f.bj + f.bv;
  const right = '<div class="card card-pad"><div class="row between row-wrap"><div><div class="card-title" style="font-size:19px">Pengaturan Cabang: ' + esc(c.NamaCabang) + '</div><div class="card-sub">Kelola jadwal, tentukan bobot penilaian, serta kelola daftar peserta dan dewan juri.</div></div><button class="btn btn-ghost btn-sm" data-act="cabang-hapus">' + ic('trash-2', 'ic-sm') + ' Hapus Cabang</button></div>' +
    '<div class="grid-3 mt-16"><div class="field"><label>Nama Cabang</label><input class="input" id="cb-nama" value="' + esc(c.NamaCabang) + '"></div><div class="field"><label>Tanggal Pelaksanaan</label><input class="input" type="date" id="cb-tgl" value="' + esc(c.TanggalPelaksanaan) + '"></div>' +
    '<div class="field"><label>Jumlah Juara</label><select class="select" id="cb-jj">' + [1, 2, 3, 4, 5, 6].map(n => '<option value="' + n + '"' + (+c.JumlahJuara === n ? ' selected' : '') + '>' + n + ' (Juara ' + Array.from({ length: n }, (_, i) => i + 1).join(', ') + ')</option>').join('') + '</select></div></div>' +
    '<div class="field mt-16"><label>Mode Penilaian</label><div class="hint" style="margin-top:-4px">Pilih metode penentuan pemenang cabang ini.</div><div class="seg seg-light mt-8" style="max-width:520px;display:flex">' + [['Juri', 'Juri saja'], ['Voting', 'Voting saja'], ['Gabungan', 'Gabungan']].map(x => '<button type="button" style="flex:1" data-act="cb-mode" data-v="' + x[0] + '" class="' + (f.mode === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
    (f.mode === 'Gabungan' ? '<div class="subcard mt-16"><div class="row row-wrap gap-16"><div class="row"><b class="small">Bobot Juri:</b><div class="input-group" style="width:110px"><input class="input" type="number" min="0" max="100" id="cb-bj" data-inp="cb-bobot" value="' + f.bj + '" style="padding-right:30px"><span class="suffix muted small" style="right:12px">%</span></div></div>' +
      '<div class="row"><b class="small">Bobot Voting:</b><div class="input-group" style="width:110px"><input class="input" type="number" min="0" max="100" id="cb-bv" data-inp="cb-bobot" value="' + f.bv + '" style="padding-right:30px"><span class="suffix muted small" style="right:12px">%</span></div></div>' +
      '<span class="badge ' + (total === 100 ? 'badge-green' : 'badge-red') + '" id="cb-total" style="height:32px;margin-left:auto">' + ic(total === 100 ? 'circle-check' : 'circle-alert', 'ic-sm') + ' Total ' + total + '%' + (total === 100 ? ' (Valid)' : ' — harus 100%') + '</span></div>' +
      '<div class="weight-bar mt-16"><i id="wb-j" style="width:' + f.bj + '%;background:var(--primary)"></i><i id="wb-v" style="width:' + f.bv + '%;background:var(--amber)"></i></div><div class="legend mt-8"><span><i style="background:var(--primary)"></i>Juri: <b id="lg-j">' + f.bj + '%</b></span><span><i style="background:var(--amber)"></i>Voting Siswa: <b id="lg-v">' + f.bv + '%</b></span></div></div>' : '') +
    (f.mode !== 'Juri' ? '<div class="subcard mt-16 row between"><div><b>Voting Siswa Dibuka</b><div class="small muted">Izinkan seluruh siswa memberikan suara favorit melalui portal voting siswa.</div></div><label class="switch"><input type="checkbox" data-chg="voting-cabang"' + (c.VotingDibuka === 'Ya' ? ' checked' : '') + '><span class="track"></span></label></div>' : '') +
    '<div class="row mt-16" style="justify-content:flex-end"><button class="btn btn-primary" data-act="cabang-simpan">' + ic('save', 'ic-sm') + ' Simpan Pengaturan</button></div>' +
    '<div class="subcard mt-24"><div class="row between row-wrap"><div class="row"><b style="font-size:16px">Peserta Cabang</b><span class="badge">' + c.peserta.length + ' Siswa</span></div><div class="row row-wrap"><button class="btn btn-sm" data-act="ambil-formulir">' + ic('file-text', 'ic-sm') + ' Ambil dari Formulir</button><button class="btn btn-primary btn-sm" data-act="peserta-tambah">' + ic('user-plus', 'ic-sm') + ' Tambah dari Data Siswa</button></div></div>' +
    (c.peserta.length ? '<div class="tbl-wrap mt-12" style="background:#fff;border-radius:12px"><table class="tbl" id="tbl-peserta"><thead><tr><th style="width:36px"></th><th style="width:70px">No Urut</th><th style="width:60px">Foto</th><th>Nama Peserta</th><th>Kelas</th><th>Keterangan</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
      c.peserta.map(p => '<tr data-pid="' + esc(p.PesertaID) + '"><td><span class="drag-h" data-drag title="Geser untuk mengurutkan">' + ic('grip-vertical', 'ic-sm') + '</span></td><td><b style="font-size:16px">' + noUrut(p.NoUrut) + '</b></td><td><button class="photo-thumb" style="border:0;cursor:pointer" data-act="peserta-foto" data-id="' + esc(p.PesertaID) + '" title="Ganti foto">' + photoHtml(p.FotoFileId, p.NamaTampil, 120) + '</button></td>' +
        '<td><b>' + esc(p.NamaTampil) + '</b></td><td>' + esc(p.Kelas) + '</td><td class="small muted">' + esc(p.Keterangan || '-') + '</td><td class="acts"><button class="btn btn-ghost btn-icon btn-sm" data-act="peserta-edit" data-id="' + esc(p.PesertaID) + '" title="Ubah">' + ic('pencil', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="peserta-hapus" data-id="' + esc(p.PesertaID) + '" title="Hapus" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div>'
      : '<div class="empty" style="padding:24px">Belum ada peserta. Tambahkan dari data siswa atau dari jawaban formulir.</div>') + '</div>' +
    '<div class="subcard mt-16"><div class="row between"><div class="row"><b style="font-size:16px">Dewan Juri Cabang</b><span class="badge">' + c.juri.length + ' Juri</span></div><button class="link-btn" data-act="tab" data-v="juri">' + ic('user-plus', 'ic-sm') + ' Kelola Juri</button></div>' +
    '<div class="row row-wrap mt-12">' + (c.juri.map(j => '<div class="card row" style="padding:10px 14px">' + avatarHtml(j.Nama) + '<div><div class="row"><b>' + esc(j.Nama) + '</b><span class="badge ' + (j.TipeJuri === 'Tamu' ? 'badge-amber' : '') + '">' + (j.TipeJuri === 'Tamu' ? 'Tamu' : 'PTK') + '</span></div><div class="small muted">' + esc(j.Jabatan || '') + '</div></div></div>').join('') || '<span class="muted small">' + (c.ModePenilaian === 'Voting' ? 'Mode voting saja tidak memerlukan juri.' : 'Belum ada juri.') + '</span>') + '</div></div></div>';
  return '<div class="split"><div>' + left + '</div>' + right + '</div>';
};
EV_AFTER.cabang = (det, el) => { const t = $('#tbl-peserta tbody', el); if (t) dragSort(t, 'tr', (ids) => { const c = curCabang(el, det); api('urutPeserta', { cabangId: c.CabangID, ids }).then(r => { if (r.success) { ids.forEach((id, i) => { const p = c.peserta.find(x => x.PesertaID === id); if (p) p.NoUrut = i + 1; }); c.peserta.sort((a, b) => a.NoUrut - b.NoUrut); evRender(el); invalidateEvent(det.event.EventID); toast('Urutan disimpan'); } else toast('Gagal', r.message, 'error'); }); }, 'pid'); };
EVH['pilih-cabang'] = (el, b) => { el._sub = b.dataset.id; el._cf = null; history.replaceState(null, '', '#/ev/' + el._id + '/' + el._tab + '/' + el._sub); evRender(el); };
EVH['cb-mode'] = (el, b) => { el._cf.mode = b.dataset.v; evRender(el); };
EVH['cb-bobot'] = (el, t) => {
  const f = el._cf; let bj = +($('#cb-bj', el).value || 0), bv = +($('#cb-bv', el).value || 0);
  if (t.id === 'cb-bj' && bj >= 0 && bj <= 100) { bv = 100 - bj; $('#cb-bv', el).value = bv; } else if (t.id === 'cb-bv' && bv >= 0 && bv <= 100) { bj = 100 - bv; $('#cb-bj', el).value = bj; }
  f.bj = bj; f.bv = bv;
  const tot = bj + bv, tb = $('#cb-total', el);
  tb.className = 'badge ' + (tot === 100 ? 'badge-green' : 'badge-red'); tb.innerHTML = ic(tot === 100 ? 'circle-check' : 'circle-alert', 'ic-sm') + ' Total ' + tot + '%' + (tot === 100 ? ' (Valid)' : ' — harus 100%');
  $('#wb-j', el).style.width = bj + '%'; $('#wb-v', el).style.width = bv + '%'; $('#lg-j', el).textContent = bj + '%'; $('#lg-v', el).textContent = bv + '%';
};
EVH['cabang-simpan'] = async (el, b, det) => {
  const c = curCabang(el, det), f = el._cf;
  const d = { CabangID: c.CabangID, EventID: det.event.EventID, NamaCabang: $('#cb-nama', el).value.trim(), TanggalPelaksanaan: $('#cb-tgl', el).value, JumlahJuara: $('#cb-jj', el).value, ModePenilaian: f.mode, BobotJuri: f.bj, BobotVoting: f.bv };
  if (f.mode === 'Gabungan' && f.bj + f.bv !== 100) return toast('Total bobot harus 100%', '', 'error');
  const res = await busy(b, () => api('simpanCabang', { cabang: d }));
  if (toastRes(res, 'Pengaturan cabang disimpan', 'Perubahan pada "' + d.NamaCabang + '" berhasil diperbarui.')) { Object.assign(c, res.data.cabang); el._cf = null; evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['voting-cabang'] = async (el, t, det) => {
  const c = curCabang(el, det), buka = t.checked, lama = { v: c.VotingDibuka, s: det.event.Status };
  const res = await optimis(el, () => { c.VotingDibuka = buka ? 'Ya' : 'Tidak'; if (buka) det.event.Status = 'Berjalan'; }, () => { c.VotingDibuka = lama.v; det.event.Status = lama.s; },
    () => api('setVoting', { cabangId: c.CabangID, buka }), [buka ? 'Voting cabang dibuka' : 'Voting cabang ditutup', c.NamaCabang]);
  if (res.success) invalidateEvent(det.event.EventID);
};
EVH['cabang-baru'] = (el, b, det) => {
  const m = modal({ title: 'Tambah Cabang Lomba', body: '<div class="field"><label>Nama cabang <span class="req">*</span></label><input class="input" id="nc-nama" placeholder="mis. Baca Puisi" list="cb-sug"><datalist id="cb-sug">' + ['Baca Puisi', 'Pidato', 'Lomba Poster', 'Cerita Rakyat', 'Menyanyi Solo', 'Cerdas Cermat', 'Kaligrafi', 'Tari Kreasi', 'Futsal', 'Tarik Tambang'].map(x => '<option value="' + x + '">').join('') + '</datalist></div>' +
    '<div class="grid-2 mt-16"><div class="field"><label>Tanggal pelaksanaan</label><input class="input" type="date" id="nc-tgl" value="' + esc(det.event.TanggalMulai || todayStr()) + '"></div><div class="field"><label>Mode penilaian</label><select class="select" id="nc-mode"><option value="Juri">Juri saja</option><option value="Voting">Voting saja</option><option value="Gabungan">Gabungan (60/40)</option></select></div></div><div id="nc-err"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="nc-ok">' + ic('plus', 'ic-sm') + ' Tambah</button>' });
  m.q('#nc-ok').onclick = async (e) => {
    const mode = m.q('#nc-mode').value;
    const d = { EventID: det.event.EventID, NamaCabang: m.q('#nc-nama').value.trim(), TanggalPelaksanaan: m.q('#nc-tgl').value, ModePenilaian: mode, BobotJuri: mode === 'Gabungan' ? 60 : 100, BobotVoting: mode === 'Gabungan' ? 40 : 0, JumlahJuara: 3 };
    const res = await busy(e.currentTarget, () => api('simpanCabang', { cabang: d }));
    if (!res.success) { m.q('#nc-err').innerHTML = '<div class="alert alert-red mt-12 small">' + esc(res.message) + '</div>'; return; }
    m.close(); toast('Cabang ditambahkan', d.NamaCabang);
    det.cabang.push(Object.assign({ peserta: [], kriteria: [], juri: [], nilai: [], hasil: { peserta: [], seri: false, juriProgress: [] } }, res.data.cabang));
    el._sub = res.data.cabang.CabangID; el._cf = null; evRender(el); invalidateEvent(det.event.EventID);
  };
};
EVH['cabang-hapus'] = async (el, b, det) => {
  const c = curCabang(el, det);
  if (!(await confirmBox({ title: 'Hapus cabang?', html: 'Cabang <b>' + esc(c.NamaCabang) + '</b> beserta peserta, juri, kriteria, nilai, dan suaranya akan dihapus.', ok: 'Hapus Cabang', danger: true }))) return;
  const res = await api('hapusCabang', { cabangId: c.CabangID });
  if (toastRes(res, 'Cabang dihapus')) { det.cabang = det.cabang.filter(x => x !== c); el._sub = ''; evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['peserta-tambah'] = async (el, b, det) => {
  const c = curCabang(el, det);
  const list = await loadSiswa();
  const sudah = new Set(c.peserta.map(p => p.SiswaID));
  const st = { q: '', kelas: '', sel: new Set() };
  const m = modal({ title: 'Tambah Peserta — ' + c.NamaCabang, size: 'lg',
    body: '<div class="row row-wrap"><div class="input-group grow">' + ic('search') + '<input class="input" id="ps-q" placeholder="Cari nama atau NISN"></div><select class="select" id="ps-k" style="width:150px"><option value="">Semua kelas</option>' + (B().kelas || []).map(k => '<option>' + esc(k) + '</option>').join('') + '</select></div>' +
      '<div id="ps-list" class="mt-12" style="max-height:50vh;overflow:auto;border:1px solid var(--border);border-radius:12px"></div>' +
      '<details class="mt-16"><summary class="link-btn">Tambah peserta manual (bukan dari data siswa)</summary><div class="grid-3 mt-12"><input class="input" id="ps-mn" placeholder="Nama peserta / tim"><input class="input" id="ps-mk" placeholder="Kelas"><input class="input" id="ps-mket" placeholder="Keterangan (opsional)"></div></details>',
    foot: '<span class="muted small grow" id="ps-count">0 dipilih</span><button class="btn" data-close>Batal</button><button class="btn btn-primary" id="ps-ok">' + ic('user-plus', 'ic-sm') + ' Tambahkan</button>' });
  const paint = () => {
    const rows = list.filter(s => s.Aktif !== 'Tidak' && (!st.kelas || s.Kelas === st.kelas) && (!st.q || s.Nama.toLowerCase().indexOf(st.q) > -1 || s.NISN.indexOf(st.q) > -1)).slice(0, 300);
    m.q('#ps-list').innerHTML = rows.map(s => '<label class="name-row" style="cursor:' + (sudah.has(s.SiswaID) ? 'default;opacity:.5' : 'pointer') + '"><input type="checkbox" class="check" data-sid="' + esc(s.SiswaID) + '"' + (st.sel.has(s.SiswaID) || sudah.has(s.SiswaID) ? ' checked' : '') + (sudah.has(s.SiswaID) ? ' disabled' : '') + ' style="width:18px;height:18px;accent-color:var(--primary)">' + avatarHtml(s.Nama, '', 'avatar-sm') + '<span class="grow"><b>' + esc(s.Nama) + '</b> <span class="muted small">· ' + esc(s.Kelas) + ' · ' + esc(s.NISN) + '</span></span>' + (sudah.has(s.SiswaID) ? '<span class="badge badge-gray">Sudah</span>' : '') + '</label>').join('') || '<div class="empty">Tidak ada siswa.</div>';
    m.q('#ps-count').textContent = st.sel.size + ' dipilih';
  };
  paint();
  m.q('#ps-q').oninput = debounce((e) => { st.q = e.target.value.toLowerCase(); paint(); }, 150);
  m.q('#ps-k').onchange = (e) => { st.kelas = e.target.value; paint(); };
  m.q('#ps-list').onchange = (e) => { const s = e.target.dataset.sid; if (!s) return; if (e.target.checked) st.sel.add(s); else st.sel.delete(s); m.q('#ps-count').textContent = st.sel.size + ' dipilih'; };
  m.q('#ps-ok').onclick = async (e) => {
    const manual = m.q('#ps-mn').value.trim() ? { NamaTampil: m.q('#ps-mn').value.trim(), Kelas: m.q('#ps-mk').value.trim(), Keterangan: m.q('#ps-mket').value.trim() } : null;
    if (!st.sel.size && !manual) return toast('Pilih minimal satu siswa', '', 'warning');
    const res = await busy(e.currentTarget, () => api('tambahPeserta', { cabangId: c.CabangID, siswaIds: Array.from(st.sel), manual }));
    if (toastRes(res, res.data && res.data.peserta.length + ' peserta ditambahkan')) { m.close(); c.peserta = c.peserta.concat(res.data.peserta); evRender(el); invalidateEvent(det.event.EventID); }
  };
};
EVH['peserta-edit'] = (el, b, det) => {
  const c = curCabang(el, det), p = c.peserta.find(x => x.PesertaID === b.dataset.id);
  const m = modal({ title: 'Ubah Peserta', body: '<div class="field"><label>Nama tampil</label><input class="input" id="pe-n" value="' + esc(p.NamaTampil) + '"></div><div class="grid-2 mt-12"><div class="field"><label>Kelas</label><input class="input" id="pe-k" value="' + esc(p.Kelas) + '"></div><div class="field"><label>No. urut</label><input class="input" type="number" id="pe-no" value="' + esc(p.NoUrut) + '"></div></div><div class="field mt-12"><label>Keterangan (mis. judul puisi / karya)</label><input class="input" id="pe-ket" value="' + esc(p.Keterangan) + '"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="pe-ok">Simpan</button>' });
  m.q('#pe-ok').onclick = async (e) => {
    const d = { PesertaID: p.PesertaID, NamaTampil: m.q('#pe-n').value.trim(), Kelas: m.q('#pe-k').value.trim(), NoUrut: m.q('#pe-no').value, Keterangan: m.q('#pe-ket').value.trim() };
    const res = await busy(e.currentTarget, () => api('simpanPeserta', { peserta: d }));
    if (toastRes(res, 'Peserta disimpan')) { m.close(); Object.assign(p, res.data.peserta); c.peserta.sort((a, b) => a.NoUrut - b.NoUrut); evRender(el); invalidateEvent(det.event.EventID); }
  };
};
EVH['peserta-foto'] = async (el, b, det) => {
  const c = curCabang(el, det), p = c.peserta.find(x => x.PesertaID === b.dataset.id);
  const r = await uploadImage('peserta', { max: 700, onStart: () => b.classList.add('sk') });
  b.classList.remove('sk');
  if (!r) return;
  const res = await api('simpanPeserta', { peserta: { PesertaID: p.PesertaID, FotoFileId: r.fileId } });
  if (toastRes(res, 'Foto peserta diperbarui')) { p.FotoFileId = r.fileId; evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['peserta-hapus'] = async (el, b, det) => {
  const c = curCabang(el, det), p = c.peserta.find(x => x.PesertaID === b.dataset.id);
  if (!(await confirmBox({ title: 'Hapus peserta?', text: p.NamaTampil + ' akan dihapus dari cabang beserta nilai dan suaranya.', ok: 'Hapus', danger: true }))) return;
  const res = await api('hapusPeserta', { pesertaId: p.PesertaID });
  if (toastRes(res, 'Peserta dihapus')) { c.peserta = c.peserta.filter(x => x !== p); evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['ambil-formulir'] = async (el, b, det) => {
  const c = curCabang(el, det);
  const forms = det.formulir;
  if (!forms.length) return toast('Belum ada formulir', 'Buat formulir pendaftaran di tab Formulir.', 'info');
  const m = modal({ title: 'Ambil Peserta dari Formulir', body: '<p class="muted mb-16">Pendaftar dari formulir akan ditambahkan sebagai peserta <b>' + esc(c.NamaCabang) + '</b>. Pendaftar yang sudah ada dilewati otomatis. Nama dicocokkan lewat NISN bila tersedia.</p><div class="field"><label>Formulir</label><select class="select" id="af-f">' + forms.map(f => '<option value="' + esc(f.FormID) + '"' + (f.CabangID === c.CabangID ? ' selected' : '') + '>' + esc(f.Judul) + ' (' + f.jumlahJawaban + ' jawaban)</option>').join('') + '</select></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="af-ok">' + ic('user-plus', 'ic-sm') + ' Pindahkan ke Peserta</button>' });
  m.q('#af-ok').onclick = async (e) => {
    const res = await busy(e.currentTarget, () => api('pindahkanKePeserta', { formId: m.q('#af-f').value, cabangId: c.CabangID }));
    if (toastRes(res, res.data ? res.data.ditambahkan + ' peserta ditambahkan' : '')) { m.close(); invalidateEvent(det.event.EventID); }
  };
};

/* Geser untuk mengurutkan (Pointer Events: sentuh & tetikus) */
function dragSort(container, itemSel, onDone, idAttr) {
  let drag = null;
  container.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('[data-drag]'); if (!h) return;
    const item = h.closest(itemSel); if (!item) return;
    e.preventDefault();
    drag = { item, startY: e.clientY, moved: false };
    item.classList.add('dragging');
    h.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (!drag) return;
      drag.moved = true;
      const items = Array.from(container.querySelectorAll(itemSel)).filter(x => x !== item);
      let after = null;
      for (const it of items) { const r = it.getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { after = it; break; } }
      if (after) container.insertBefore(item, after); else container.appendChild(item);
    };
    const up = () => {
      h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
      item.classList.remove('dragging');
      const moved = drag && drag.moved; drag = null;
      if (moved) onDone(Array.from(container.querySelectorAll(itemSel)).map(x => x.dataset[idAttr]));
    };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  });
  container.addEventListener('keydown', (e) => {
    const h = e.target.closest('[data-drag]'); if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const item = h.closest(itemSel), sib = e.key === 'ArrowUp' ? item.previousElementSibling : item.nextElementSibling;
    if (!sib) return;
    if (e.key === 'ArrowUp') container.insertBefore(item, sib); else container.insertBefore(sib, item);
    h.focus();
    onDone(Array.from(container.querySelectorAll(itemSel)).map(x => x.dataset[idAttr]));
  });
  container.querySelectorAll('[data-drag]').forEach(h => h.setAttribute('tabindex', '0'));
}

/* ---------------- Tab: Juri & Kriteria ---------------- */
EV_RENDER.juri = (det, el) => {
  const c = curCabang(el, det);
  if (!c) return '<div class="card">' + emptyState('trophy', 'Belum ada cabang', 'Tambahkan cabang lomba terlebih dahulu.', '<button class="btn btn-primary" data-act="tab" data-v="cabang">Ke Cabang & Peserta</button>') + '</div>';
  el._kr = el._kr && el._kr.id === c.CabangID ? el._kr : { id: c.CabangID, list: c.kriteria.map(k => ({ KriteriaID: k.KriteriaID, NamaKriteria: k.NamaKriteria, NilaiMin: +k.NilaiMin, NilaiMaks: +k.NilaiMaks, Bobot: +k.Bobot, Keterangan: k.Keterangan })) };
  const tot = el._kr.list.reduce((s, k) => s + (+k.Bobot || 0), 0);
  const prog = {}; (c.hasil.juriProgress || []).forEach(p => prog[p.JuriID] = p);
  const chips = '<div class="row row-wrap mb-16">' + det.cabang.map(x => '<button class="chip' + (x.CabangID === c.CabangID ? ' on' : '') + '" data-act="pilih-cabang" data-id="' + esc(x.CabangID) + '">' + esc(x.NamaCabang) + '</button>').join('') + '</div>';
  if (c.ModePenilaian === 'Voting') return chips + '<div class="card">' + emptyState('vote', 'Cabang ini memakai voting saja', 'Ubah mode penilaian menjadi "Juri saja" atau "Gabungan" untuk memakai juri & kriteria.', '<button class="btn btn-primary" data-act="tab" data-v="cabang">Ubah Mode</button>') + '</div>';
  return chips + '<div class="row gap-16" style="align-items:flex-start;flex-wrap:wrap">' +
    '<div class="card" style="flex:1 1 420px;overflow:hidden"><div class="card-head"><div><div class="card-title">Dewan Juri — ' + esc(c.NamaCabang) + '</div><div class="card-sub">Juri dari data PTK atau juri tamu dengan kata sandi sendiri.</div></div></div>' +
    '<div class="card-body">' + (c.juri.map(j => { const p = prog[j.JuriID] || { dinilai: 0, total: c.peserta.length }; return '<div class="row" style="padding:12px 0;border-bottom:1px solid #F1F5F9">' + avatarHtml(j.Nama) + '<div class="grow" style="min-width:0"><div class="row"><b class="ellipsis">' + esc(j.Nama) + '</b><span class="badge ' + (j.TipeJuri === 'Tamu' ? 'badge-amber' : '') + '">' + (j.TipeJuri === 'Tamu' ? 'Tamu' : 'PTK') + '</span>' + (!j.punyaSandi ? '<span class="badge badge-red" title="Juri belum bisa login">Belum ada sandi</span>' : '') + '</div><div class="small muted">' + esc(j.Jabatan || '') + '</div>' +
      '<div class="row mt-8"><div class="prog grow ' + (p.dinilai >= p.total && p.total ? 'green' : '') + '"><i style="width:' + pct(p.dinilai, p.total) + '%"></i></div><span class="small muted tnum">' + p.dinilai + '/' + p.total + ' dinilai</span></div></div>' +
      '<div class="row gap-4">' + (j.TipeJuri === 'Tamu' ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="juri-sandi" data-id="' + esc(j.JuriID) + '" title="Ubah sandi">' + ic('key-round', 'ic-sm') + '</button>' : '') + '<button class="btn btn-ghost btn-icon btn-sm" data-act="nilai-manual" data-id="' + esc(j.JuriID) + '" title="Input nilai dari lembar cetak">' + ic('square-pen', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="juri-hapus" data-id="' + esc(j.JuriID) + '" title="Hapus" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + '</button></div></div>'; }).join('') || '<div class="muted small">Belum ada juri untuk cabang ini.</div>') +
    '<div class="subcard mt-16"><div class="seg seg-light seg-block mb-12" id="jr-tipe"><button type="button" class="on" data-act="jr-tipe" data-v="PTK">Dari data PTK</button><button type="button" data-act="jr-tipe" data-v="Tamu">Juri tamu</button></div>' +
    '<div id="jr-ptk"><div class="row"><select class="select grow" id="jr-ptkid"><option value="">— Pilih PTK —</option>' + ptkOptions('', p => !c.juri.some(j => j.PTK_ID === p.PTK_ID)) + '</select><button class="btn btn-primary" data-act="juri-tambah">' + ic('user-plus', 'ic-sm') + ' Tambah</button></div><div class="hint mt-8">PTK masuk dengan kata sandi akun PTK-nya.</div></div>' +
    '<div id="jr-tamu" hidden><div class="grid-2"><input class="input" id="jr-nama" placeholder="Nama juri tamu"><input class="input" id="jr-jab" placeholder="Jabatan / keterangan"></div><div class="row mt-12"><input class="input grow" id="jr-pw" placeholder="Kata sandi untuk juri tamu (min. 4)"><button class="btn btn-primary" data-act="juri-tambah">' + ic('user-plus', 'ic-sm') + ' Tambah</button></div></div></div></div>' +
    '<div class="row" style="padding:0 24px 20px;flex-wrap:wrap"><label class="switch grow"><input type="checkbox" data-chg="kunci"' + (c.Terkunci === 'Ya' ? ' checked' : '') + '><span class="track"></span><span><b>Kunci Penilaian</b><br><span class="small muted">Juri tidak bisa mengubah nilai lagi.</span></span></label><button class="btn btn-soft btn-sm" data-act="cetak-doc" data-jenis="LembarJuri">' + ic('printer', 'ic-sm') + ' Cetak Lembar Juri</button></div></div>' +
    '<div class="card" style="flex:1.2 1 460px;overflow:hidden"><div class="card-head"><div><div class="card-title">Kriteria Penilaian</div><div class="card-sub">Total bobot harus 100%. Nilai juri dinormalisasi ke skala 0–100.</div></div><span class="badge ' + (Math.abs(tot - 100) < .001 ? 'badge-green' : 'badge-red') + '" id="kr-tot" style="height:30px">Total ' + tot + '%</span></div>' +
    '<div class="card-body"><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Kriteria</th><th style="width:76px">Min</th><th style="width:76px">Maks</th><th style="width:86px">Bobot %</th><th style="width:40px"></th></tr></thead><tbody>' +
    el._kr.list.map((k, i) => '<tr><td><input class="input input-sm" data-inp="kr" data-i="' + i + '" data-f="NamaKriteria" value="' + esc(k.NamaKriteria) + '" placeholder="mis. Penghayatan"><input class="input input-sm mt-8" data-inp="kr" data-i="' + i + '" data-f="Keterangan" value="' + esc(k.Keterangan || '') + '" placeholder="Keterangan (opsional)"></td>' +
      '<td><input class="input input-sm" type="number" data-inp="kr" data-i="' + i + '" data-f="NilaiMin" value="' + k.NilaiMin + '"></td><td><input class="input input-sm" type="number" data-inp="kr" data-i="' + i + '" data-f="NilaiMaks" value="' + k.NilaiMaks + '"></td><td><input class="input input-sm" type="number" data-inp="kr" data-i="' + i + '" data-f="Bobot" value="' + k.Bobot + '"></td>' +
      '<td><button class="btn btn-ghost btn-icon btn-sm" data-act="kr-del" data-i="' + i + '" style="color:var(--red)">' + ic('x', 'ic-sm') + '</button></td></tr>').join('') +
    '</tbody></table></div><div class="row mt-12"><button class="btn btn-soft btn-sm" data-act="kr-add">' + ic('plus', 'ic-sm') + ' Tambah Kriteria</button><button class="btn btn-primary btn-sm" data-act="kr-save" style="margin-left:auto">' + ic('save', 'ic-sm') + ' Simpan Kriteria</button></div>' +
    (c.nilai.length ? '<div class="alert alert-amber small mt-16">' + ic('triangle-alert', 'ic-sm') + '<span>Menghapus kriteria juga menghapus nilai juri pada kriteria tersebut.</span></div>' : '') + '</div></div></div>';
};
EVH['jr-tipe'] = (el, b) => { $$('#jr-tipe button', el).forEach(x => x.classList.toggle('on', x === b)); $('#jr-ptk', el).hidden = b.dataset.v !== 'PTK'; $('#jr-tamu', el).hidden = b.dataset.v !== 'Tamu'; el._jrTipe = b.dataset.v; };
EVH['juri-tambah'] = async (el, b, det) => {
  const c = curCabang(el, det), tipe = el._jrTipe || 'PTK';
  const juri = tipe === 'PTK' ? { CabangID: c.CabangID, TipeJuri: 'PTK', PTK_ID: $('#jr-ptkid', el).value } : { CabangID: c.CabangID, TipeJuri: 'Tamu', NamaTamu: $('#jr-nama', el).value.trim(), JabatanTamu: $('#jr-jab', el).value.trim(), password: $('#jr-pw', el).value };
  if (tipe === 'PTK' && !juri.PTK_ID) return toast('Pilih PTK dulu', '', 'warning');
  const res = await busy(b, () => api('simpanJuri', { juri }));
  if (toastRes(res, 'Juri ditambahkan')) { el._jrTipe = 'PTK'; invalidateEvent(det.event.EventID); }
};
EVH['juri-hapus'] = async (el, b, det) => {
  const c = curCabang(el, det), j = c.juri.find(x => x.JuriID === b.dataset.id);
  if (!(await confirmBox({ title: 'Hapus juri?', text: j.Nama + ' dan seluruh nilainya di cabang ini akan dihapus.', ok: 'Hapus', danger: true }))) return;
  const res = await api('hapusJuri', { juriId: j.JuriID });
  if (toastRes(res, 'Juri dihapus')) { c.juri = c.juri.filter(x => x !== j); evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['juri-sandi'] = (el, b, det) => {
  const c = curCabang(el, det), j = c.juri.find(x => x.JuriID === b.dataset.id);
  const m = modal({ title: 'Kata Sandi Juri Tamu', size: 'sm', body: '<p class="muted mb-16">' + esc(j.Nama) + '</p><div class="field"><label>Kata sandi baru</label><input class="input" id="js-pw" placeholder="min. 4 karakter"></div>', foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="js-ok">Simpan</button>' });
  m.q('#js-ok').onclick = async (e) => {
    const res = await busy(e.currentTarget, () => api('simpanJuri', { juri: { JuriID: j.JuriID, CabangID: c.CabangID, TipeJuri: 'Tamu', NamaTamu: j.Nama, JabatanTamu: j.Jabatan, password: m.q('#js-pw').value } }));
    if (toastRes(res, 'Kata sandi diubah')) { m.close(); invalidateEvent(det.event.EventID); }
  };
};
EVH.kunci = async (el, t, det) => {
  const c = curCabang(el, det), kunci = t.checked, lama = c.Terkunci;
  const res = await optimis(el, () => { c.Terkunci = kunci ? 'Ya' : 'Tidak'; if (c.hasil) c.hasil.Terkunci = kunci; }, () => { c.Terkunci = lama; if (c.hasil) c.hasil.Terkunci = lama === 'Ya'; },
    () => api('kunciPenilaian', { cabangId: c.CabangID, kunci }), [kunci ? 'Penilaian dikunci' : 'Kunci penilaian dibuka']);
  if (res.success) invalidateEvent(det.event.EventID);
};
EVH.kr = (el, t) => { const k = el._kr.list[+t.dataset.i], f = t.dataset.f; k[f] = (f === 'NamaKriteria' || f === 'Keterangan') ? t.value : +t.value; const tot = el._kr.list.reduce((s, x) => s + (+x.Bobot || 0), 0), b = $('#kr-tot', el); b.textContent = 'Total ' + tot + '%'; b.className = 'badge ' + (Math.abs(tot - 100) < .001 ? 'badge-green' : 'badge-red'); };
EVH['kr-add'] = (el) => { el._kr.list.push({ NamaKriteria: '', NilaiMin: 0, NilaiMaks: 100, Bobot: Math.max(0, 100 - el._kr.list.reduce((s, x) => s + (+x.Bobot || 0), 0)), Keterangan: '' }); evRender(el); };
EVH['kr-del'] = (el, b) => { el._kr.list.splice(+b.dataset.i, 1); evRender(el); };
EVH['kr-save'] = async (el, b, det) => {
  const c = curCabang(el, det);
  const res = await busy(b, () => api('simpanKriteria', { cabangId: c.CabangID, list: el._kr.list }));
  if (toastRes(res, 'Kriteria disimpan')) { c.kriteria = res.data.kriteria; el._kr = null; evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['nilai-manual'] = (el, b, det) => {
  const c = curCabang(el, det), j = c.juri.find(x => x.JuriID === b.dataset.id);
  if (!c.kriteria.length) return toast('Atur kriteria dulu', '', 'warning');
  const nv = {}; c.nilai.filter(n => n.JuriID === j.JuriID).forEach(n => { (nv[n.PesertaID] = nv[n.PesertaID] || {})[n.KriteriaID] = n.KriteriaID === '_catatan' ? n.Catatan : n.Nilai; });
  const m = modal({ title: 'Input Nilai dari Lembar Cetak', sub: esc(j.Nama) + ' · ' + esc(c.NamaCabang), size: 'xl',
    body: '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Peserta</th>' + c.kriteria.map(k => '<th style="min-width:100px">' + esc(k.NamaKriteria) + '<div class="small muted" style="text-transform:none;letter-spacing:0">' + k.NilaiMin + '–' + k.NilaiMaks + ' · ' + k.Bobot + '%</div></th>').join('') + '</tr></thead><tbody>' +
      c.peserta.map(p => '<tr><td><b>' + noUrut(p.NoUrut) + '</b> ' + esc(p.NamaTampil) + '</td>' + c.kriteria.map(k => '<td><input class="input input-sm" type="number" min="' + k.NilaiMin + '" max="' + k.NilaiMaks + '" data-p="' + esc(p.PesertaID) + '" data-k="' + esc(k.KriteriaID) + '" value="' + esc((nv[p.PesertaID] || {})[k.KriteriaID] ?? '') + '"></td>').join('') + '</tr>').join('') + '</tbody></table></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="nm-ok">' + ic('save', 'ic-sm') + ' Simpan Nilai</button>' });
  m.q('#nm-ok').onclick = async (e) => {
    const rows = {};
    m.qa('input[data-p]').forEach(i => { if (i.value === '') return; (rows[i.dataset.p] = rows[i.dataset.p] || {})[i.dataset.k] = Number(i.value); });
    const res = await busy(e.currentTarget, () => api('simpanNilaiMatrix', { cabangId: c.CabangID, juriId: j.JuriID, rows: Object.keys(rows).map(pid => ({ pesertaId: pid, nilai: rows[pid] })) }));
    if (toastRes(res, 'Nilai disimpan', res.data ? res.data.tersimpan + ' peserta' : '')) { m.close(); invalidateEvent(det.event.EventID); }
  };
};

/* ---------------- Tab: Formulir ---------------- */
EV_RENDER.formulir = (det) => {
  return '<div class="row between mb-16"><div><div class="card-title">Formulir Pendaftaran</div><div class="card-sub">Buat formulir dengan 6 jenis isian; bagikan lewat link atau cetak untuk diisi manual.</div></div><button class="btn btn-primary" data-act="form-baru">' + ic('plus', 'ic-sm') + ' Buat Formulir</button></div>' +
    (det.formulir.length ? '<div class="ev-grid">' + det.formulir.map(f => '<div class="card ev-card"><div class="row between"><span class="icon-tile">' + ic('file-text') + '</span><span class="badge ' + (f.Status === 'Buka' ? 'badge-green' : 'badge-gray') + '">' + (f.Status === 'Buka' ? 'Dibuka' : 'Ditutup') + '</span></div>' +
      '<div><div style="font-weight:700;font-size:16px">' + esc(f.Judul) + '</div><div class="small muted mt-8">' + (f.Akses === 'LoginSiswa' ? 'Khusus siswa (NISN)' : 'Siapa saja yang punya link') + (f.BatasWaktu ? ' · s.d. ' + esc(tglPendek(f.BatasWaktu)) : '') + '</div></div>' +
      '<div class="meta"><span>' + ic('list', 'ic-sm') + f.pertanyaan.length + ' isian</span><span>' + ic('inbox', 'ic-sm') + f.jumlahJawaban + ' jawaban</span></div>' +
      '<div class="row row-wrap"><a class="btn btn-soft btn-sm grow" href="#/jawaban/' + esc(f.FormID) + '">' + ic('inbox', 'ic-sm') + ' Jawaban</a><a class="btn btn-sm" href="#/form/' + esc(f.FormID) + '">' + ic('pencil', 'ic-sm') + ' Ubah</a><button class="btn btn-sm btn-icon" data-act="salin" data-v="' + esc(linkApp('f/' + f.TokenLink)) + '" title="Salin link">' + ic('link', 'ic-sm') + '</button><button class="btn btn-sm btn-icon" data-act="bagikan" data-fokus="f-' + esc(f.FormID) + '" title="Kode QR & bagikan">' + ic('qr-code', 'ic-sm') + '</button><button class="btn btn-sm btn-icon" data-act="cetak-doc" data-jenis="Formulir" data-form="' + esc(f.FormID) + '" title="Cetak formulir kosong">' + ic('printer', 'ic-sm') + '</button></div></div>').join('') + '</div>'
      : '<div class="card">' + emptyState('file-plus', 'Belum ada formulir', 'Buat formulir pendaftaran lomba, pemilihan, atau event lain.', '<button class="btn btn-primary" data-act="form-baru">' + ic('plus', 'ic-sm') + ' Buat Formulir</button>') + '</div>');
};
EVH['form-baru'] = (el, b, det) => go('form/baru/' + det.event.EventID);
EVH.salin = async (el, b) => { if (await copyText(b.dataset.v)) toast('Link disalin', b.dataset.v); };

/* ---------------- Tab: Hasil ---------------- */
EV_RENDER.hasil = (det, el) => {
  const ev = det.event;
  if (ev.JenisEvent === 'OSIS') {
    const h = det.hasil, maxV = Math.max(1, ...h.kandidat.map(k => k.suara)), tunggal = h.sistem === 'Tunggal';
    const ketua = h.kandidat.find(k => k.jabatan === 'Ketua'), wakil = h.kandidat.find(k => k.jabatan === 'Wakil Ketua');
    return (h.seri ? '<div class="alert alert-amber mb-16"><span class="icon-tile amber" style="width:40px;height:40px">' + ic('triangle-alert') + '</span><div class="grow"><b>Hasil seri</b> — ' + (tunggal ? 'perolehan suara sama pada posisi Ketua/Wakil Ketua. Tetapkan urutannya' : 'perolehan suara teratas sama. Tetapkan pemenang') + ' beserta alasannya.</div><button class="btn btn-amber" data-act="seri-osis">' + (tunggal ? 'Tetapkan Urutan' : 'Tetapkan Pemenang') + '</button></div>' : '') +
      (tunggal && (ketua || wakil) ? '<div class="grid-2 mb-16">' + [['Ketua', ketua, 'crown', 'amber'], ['Wakil Ketua', wakil, 'award', '']].map(x => '<div class="card card-pad row"><span class="icon-tile ' + x[3] + '">' + ic(x[2]) + '</span><div class="grow"><div class="small muted" style="font-weight:700;letter-spacing:.05em">' + x[0].toUpperCase() + ' TERPILIH</div><div style="font-weight:800;font-size:18px">' + (x[1] ? esc(x[1].Nama1) : '<span class="muted">Belum ditetapkan</span>') + '</div>' + (x[1] ? '<div class="small muted">Calon ' + noUrut(x[1].NoUrut) + ' · ' + x[1].suara + ' suara</div>' : '') + '</div></div>').join('') + '</div>' : '') +
      (h.penetapan ? '<div class="alert alert-blue mb-16">' + ic('gavel') + '<div><b>Pemenang ditetapkan</b> oleh ' + esc(h.penetapan.DitetapkanOleh) + ' — ' + esc(h.penetapan.Alasan) + '</div></div>' : '') +
      '<div class="grid-4 mb-16">' + [['Total Suara', h.totalSuara, 'vote'], ['Pemilih Siswa', h.pemilihSiswa + ' / ' + h.totalSiswa, 'users'], ['Pemilih PTK', h.pemilihPtk + ' / ' + h.totalPtk, 'user-check'], ['Partisipasi', fmtNum(pct(h.pemilihSiswa + h.pemilihPtk, h.totalSiswa + h.totalPtk), 1) + '%', 'chart-pie']].map(s => '<div class="card stat" style="min-height:0"><div class="row between"><span class="lbl">' + s[0] + '</span><span class="icon-tile">' + ic(s[2]) + '</span></div><div class="num" style="font-size:28px">' + s[1] + '</div></div>').join('') + '</div>' +
      '<div class="card" style="overflow:hidden"><div class="card-head"><div class="card-title">Peringkat Calon</div><div class="row"><a class="btn btn-sm" href="#/tayang/' + esc(ev.EventID) + '">' + ic('monitor', 'ic-sm') + ' Layar Hasil</a><button class="btn btn-sm" data-act="cetak-doc" data-jenis="Rekap">' + ic('printer', 'ic-sm') + ' Rekap</button><button class="btn btn-sm" data-act="cetak-doc" data-jenis="BeritaAcara">' + ic('file-text', 'ic-sm') + ' Berita Acara</button></div></div>' +
      '<div class="tbl-wrap mt-16"><table class="tbl"><thead><tr><th style="width:80px">Peringkat</th><th>Calon</th><th style="width:40%">Perolehan</th><th class="num">Suara</th><th class="num">%</th></tr></thead><tbody>' +
      h.kandidat.map(k => '<tr class="' + (k.seri ? 'row-seri' : '') + '"><td><span class="rank r' + k.peringkat + '">' + k.peringkat + '</span></td><td><div class="row"><span class="cand-no" style="width:36px;height:36px;font-size:15px">' + noUrut(k.NoUrut) + '</span><div><b>' + esc(k.Nama1) + (k.Nama2 ? ' &amp; ' + esc(k.Nama2) : '') + '</b><div class="small muted">' + esc([k.Kelas1, k.Kelas2].filter(Boolean).join(' & ')) + '</div></div>' + (k.seri ? '<span class="badge badge-amber">Seri</span>' : '') + (tunggal && k.jabatan ? '<span class="badge ' + (k.jabatan === 'Ketua' ? 'badge-amber' : '') + '">' + ic(k.jabatan === 'Ketua' ? 'crown' : 'award', 'ic-sm') + ' ' + esc(k.jabatan) + '</span>' : '') + '</div></td><td><div class="prog"><i style="width:' + (k.suara / maxV * 100) + '%"></i></div></td><td class="num"><b>' + k.suara + '</b></td><td class="num">' + fmtNum(k.persen, 1) + '%</td></tr>').join('') + '</tbody></table></div></div>';
  }
  if (ev.JenisEvent !== 'Lomba') return '';
  const c = curCabang(el, det);
  if (!c) return '<div class="card">' + emptyState('trophy', 'Belum ada cabang', '') + '</div>';
  const h = c.hasil, showJ = h.ModePenilaian !== 'Voting', showV = h.ModePenilaian !== 'Juri';
  return '<div class="row row-wrap mb-16">' + det.cabang.map(x => '<button class="chip' + (x.CabangID === c.CabangID ? ' on' : '') + '" data-act="pilih-cabang" data-id="' + esc(x.CabangID) + '">' + esc(x.NamaCabang) + (x.hasil.seri ? ' <span class="badge badge-amber" style="height:20px">Seri</span>' : '') + '</button>').join('') + '</div>' +
    (h.seri ? '<div class="alert alert-amber mb-16"><span class="icon-tile amber" style="width:40px;height:40px">' + ic('triangle-alert') + '</span><div class="grow"><b>Skor akhir seri</b> pada posisi juara. Tetapkan urutan juara secara manual beserta alasannya.</div><button class="btn btn-amber" data-act="seri-lomba">Tetapkan Urutan</button></div>' : '') +
    (h.penetapan ? '<div class="alert alert-blue mb-16">' + ic('gavel') + '<div><b>Urutan ditetapkan</b> oleh ' + esc(h.penetapan.DitetapkanOleh) + ' — ' + esc(h.penetapan.Alasan) + '</div></div>' : '') +
    '<div class="card" style="overflow:hidden"><div class="card-head"><div><div class="card-title">Peringkat — ' + esc(c.NamaCabang) + '</div><div class="card-sub">' + (h.ModePenilaian === 'Gabungan' ? 'Skor Akhir = Skor Juri × ' + h.BobotJuri + '% + Skor Voting × ' + h.BobotVoting + '%' : h.ModePenilaian === 'Juri' ? 'Skor akhir = rata-rata nilai juri (0–100)' : 'Skor voting = suara ÷ suara tertinggi × 100') + (showV ? ' · ' + h.totalSuara + ' suara' : '') + '</div></div>' +
    '<div class="row row-wrap"><a class="btn btn-sm" href="#/tayang/' + esc(ev.EventID) + '/' + esc(c.CabangID) + '">' + ic('monitor', 'ic-sm') + ' Layar</a><button class="btn btn-sm" data-act="cetak-doc" data-jenis="Rekap">' + ic('printer', 'ic-sm') + ' Rekap</button><a class="btn btn-sm" href="#/piagam/' + esc(ev.EventID) + '/' + esc(c.CabangID) + '">' + ic('award', 'ic-sm') + ' Editor Piagam</a><button class="btn btn-primary btn-sm" data-act="piagam-cetak">' + ic('printer', 'ic-sm') + ' Cetak Piagam Juara</button></div></div>' +
    '<div class="tbl-wrap mt-16"><table class="tbl"><thead><tr><th style="width:80px">Peringkat</th><th>Peserta</th>' + (showJ ? '<th class="num">Skor Juri</th>' : '') + (showV ? '<th class="num">Suara</th><th class="num">Skor Voting</th>' : '') + '<th class="num">Skor Akhir</th><th>Keterangan</th><th></th></tr></thead><tbody>' +
    (h.peserta.map(p => '<tr class="' + (p.seri ? 'row-seri' : '') + '"><td><span class="rank r' + p.peringkat + '">' + p.peringkat + '</span></td><td><div class="row"><span class="photo-thumb">' + photoHtml(p.FotoFileId, p.NamaTampil, 120) + '</span><div><b>' + esc(p.NamaTampil) + '</b><div class="small muted">' + esc(p.Kelas) + (showJ ? ' · ' + p.jumlahJuriMenilai + ' juri' : '') + '</div></div></div></td>' +
      (showJ ? '<td class="num">' + fmtNum(p.skorJuri, 2) + '</td>' : '') + (showV ? '<td class="num">' + p.suara + '</td><td class="num">' + fmtNum(p.skorVoting, 2) + '</td>' : '') + '<td class="num"><b style="font-size:16px">' + fmtNum(p.skorAkhir, 2) + '</b></td>' +
      '<td>' + (p.juara ? '<span class="badge badge-amber">' + ic('trophy', 'ic-sm') + ' Juara ' + p.juara + '</span>' : '') + (p.seri ? ' <span class="badge badge-red">Seri</span>' : '') + '</td><td class="acts">' + (p.juara ? '<button class="btn btn-ghost btn-sm" data-act="piagam-satu" data-id="' + esc(p.PesertaID) + '">' + ic('award', 'ic-sm') + ' Piagam</button>' : '') + '</td></tr>').join('') || '<tr><td colspan="8">' + emptyState('users', 'Belum ada peserta', '') + '</td></tr>') +
    '</tbody></table></div></div>';
};
EVH['seri-osis'] = (el, b, det) => {
  const h = det.hasil, ids = (h.seriIds || []).concat(h.penetapan ? h.penetapan.urutan : []);
  const skor = uniq(h.kandidat.filter(k => ids.indexOf(k.KandidatID) > -1).map(k => k.suara));
  const tied = h.kandidat.filter(k => skor.indexOf(k.suara) > -1);   // urut sesuai peringkat saat ini
  formSeri(det, '', tied.map(k => ({ id: k.KandidatID, label: noUrut(k.NoUrut) + ' — ' + k.Nama1 + (k.Nama2 ? ' & ' + k.Nama2 : ''), sub: k.suara + ' suara' })), h.sistem === 'Tunggal' ? 'tunggal' : true, el);
};
EVH['seri-lomba'] = (el, b, det) => {
  const c = curCabang(el, det), ids = c.hasil.seriIds;
  const groupScores = uniq(c.hasil.peserta.filter(p => ids.indexOf(p.PesertaID) > -1).map(p => p.skorAkhir));
  const tied = c.hasil.peserta.filter(p => groupScores.indexOf(p.skorAkhir) > -1);
  formSeri(det, c.CabangID, tied.map(p => ({ id: p.PesertaID, label: p.NamaTampil + ' (' + p.Kelas + ')', sub: 'Skor ' + fmtNum(p.skorAkhir, 2) })), false, el);
};
function formSeri(det, cabangId, items, osis, el) {
  let order = items.slice();
  const m = modal({ title: osis === 'tunggal' ? 'Tetapkan Urutan Ketua & Wakil' : osis ? 'Tetapkan Pemenang' : 'Tetapkan Urutan Juara', size: 'lg',
    body: '<p class="muted mb-16">' + (osis === 'tunggal' ? 'Atur urutan calon dengan suara sama. Urutan lebih atas mendapat peringkat lebih tinggi (peringkat 1 = Ketua, peringkat 2 = Wakil Ketua).' : osis ? 'Pilih pemenang di antara calon dengan suara sama. Urutan teratas = pemenang.' : 'Atur urutan peserta dengan skor sama. Geser atau gunakan tombol panah.') + '</p><div id="sr-list"></div>' +
      '<div class="field mt-16"><label>Alasan / catatan penetapan <span class="req">*</span></label><textarea class="textarea" id="sr-alasan" placeholder="mis. Berdasarkan musyawarah panitia dan dewan guru pada ' + esc(tgl(todayStr())) + '"></textarea><div class="hint">Keputusan & alasan dicatat di log dan tampil di berita acara/rekap.</div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="sr-ok">' + ic('gavel', 'ic-sm') + ' Tetapkan</button>' });
  const paint = () => {
    m.q('#sr-list').innerHTML = order.map((x, i) => '<div class="kop-row" data-id="' + esc(x.id) + '"><span class="drag-h" data-drag>' + ic('grip-vertical', 'ic-sm') + '</span><span class="rank r' + (i + 1) + '">' + (i + 1) + '</span><div class="grow"><b>' + esc(x.label) + '</b><div class="small muted">' + esc(x.sub) + '</div></div><button class="btn btn-ghost btn-icon btn-sm" data-up="' + i + '"' + (i ? '' : ' disabled') + '>' + ic('arrow-up', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-down="' + i + '"' + (i < order.length - 1 ? '' : ' disabled') + '>' + ic('arrow-down', 'ic-sm') + '</button></div>').join('');
  };
  paint();
  dragSort(m.q('#sr-list'), '.kop-row', (ids) => { order = ids.map(id => order.find(x => x.id === id)); paint(); }, 'id');
  m.q('#sr-list').addEventListener('click', (e) => {
    const u = e.target.closest('[data-up]'), d = e.target.closest('[data-down]');
    if (u) { const i = +u.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; paint(); }
    if (d) { const i = +d.dataset.down; [order[i + 1], order[i]] = [order[i], order[i + 1]]; paint(); }
  });
  m.q('#sr-ok').onclick = async (e) => {
    const alasan = m.q('#sr-alasan').value.trim();
    if (!alasan) { m.q('#sr-alasan').classList.add('is-error'); return toast('Isi alasan penetapan', '', 'warning'); }
    const res = await busy(e.currentTarget, () => api('tetapkanSeri', { eventId: det.event.EventID, cabangId, urutan: order.map(x => x.id), alasan }));
    if (toastRes(res, 'Penetapan disimpan')) { m.close(); invalidateEvent(det.event.EventID); }
  };
}
function piagamTemplateId(det) { const c = cetakCfg(det, 'Piagam'); return (c.opsi && c.opsi.templateId) || 'tpl-klasik'; }
function cetakPiagam(det, entries) {
  if (!entries.length) return toast('Belum ada juara', 'Piagam dicetak untuk peserta yang menjadi juara.', 'info');
  const tpl = tplById(piagamTemplateId(det));
  openCetak({ det, jenis: 'Piagam', landscape: true, title: 'Piagam Juara (' + entries.length + ')',
    build: (cfg) => entries.map((x, i) => renderPiagam(tpl, dataPiagam(det, x.c, x.p, i), { cfg })).join('') });
}
EVH['piagam-cetak'] = (el, b, det) => { const c = curCabang(el, det); cetakPiagam(det, c.hasil.peserta.filter(p => p.juara).map(p => ({ c, p }))); };
EVH['piagam-satu'] = (el, b, det) => { const c = curCabang(el, det); cetakPiagam(det, c.hasil.peserta.filter(p => p.PesertaID === b.dataset.id).map(p => ({ c, p }))); };

/* ---------------- Tab: Kehadiran ---------------- */
EV_RENDER.kehadiran = (det, el) => {
  const st = el._kh = el._kh && el._kh.ev === det.event.EventID ? el._kh : { ev: det.event.EventID, tgl: '', kelas: '', q: '' };
  const all = det.kehadiran, dates = uniq(all.map(r => r.tanggal)).sort();
  const rows = all.filter(r => (!st.tgl || r.tanggal === st.tgl) && (!st.kelas || r.kelas === st.kelas) && (!st.q || r.nama.toLowerCase().indexOf(st.q) > -1));
  const SUM = { VotingOSIS: ['Voting OSIS', ''], VotingLomba: ['Voting Lomba', 'badge-amber'], PesertaLomba: ['Peserta', 'badge-green'], Manual: ['Manual', 'badge-gray'] };
  const lomba = det.event.JenisEvent === 'Lomba';
  const hariIni = all.filter(r => !st.tgl || r.tanggal === st.tgl);
  const rekapVoting = lomba ? (det.cabang || []).filter(c => c.ModePenilaian !== 'Juri').map(c => [c.NamaCabang, hariIni.filter(r => (r.voting || []).indexOf(c.NamaCabang) > -1).length]) : [];
  return '<div class="card" style="overflow:hidden"><div class="toolbar"><div class="input-group search-in">' + ic('search') + '<input class="input" data-inp="kh-q" placeholder="Cari nama siswa" value="' + esc(st.q) + '"></div>' +
    '<select class="select" style="width:190px" data-chg="kh-tgl"><option value="">Semua tanggal (' + dates.length + ')</option>' + dates.map(d => '<option value="' + d + '"' + (st.tgl === d ? ' selected' : '') + '>' + esc(hariTgl(d)) + '</option>').join('') + '</select>' +
    '<select class="select" style="width:140px" data-chg="kh-kelas"><option value="">Semua kelas</option>' + uniq(all.map(r => r.kelas)).sort(kelasSort).map(k => '<option' + (st.kelas === k ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select>' +
    '<button class="btn" data-act="kh-tambah">' + ic('user-plus', 'ic-sm') + ' Tambah</button><button class="btn" data-act="kh-excel">' + ic('sheet', 'ic-sm') + ' Excel</button><button class="btn btn-primary" data-act="cetak-doc" data-jenis="DaftarHadir">' + ic('printer', 'ic-sm') + ' Cetak</button></div>' +
    '<div class="row row-wrap" style="padding:0 18px 12px">' + dates.map(d => '<span class="badge badge-gray">' + esc(tglPendek(d)) + ': ' + all.filter(r => r.tanggal === d).length + ' hadir</span>').join('') +
    (rekapVoting.length ? '<span class="small muted" style="margin-left:8px">Sudah voting' + (st.tgl ? ' (' + esc(tglPendek(st.tgl)) + ')' : '') + ':</span>' + rekapVoting.map(x => '<span class="badge badge-amber">' + ic('vote', 'ic-sm') + esc(x[0]) + ': ' + x[1] + ' siswa</span>').join('') : '') + '</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:50px">No</th><th>Nama</th><th>Kelas</th><th>Tanggal</th><th>Jam</th><th>Sumber</th>' + (lomba ? '<th>Lomba yang di-voting</th>' : '') + '<th></th></tr></thead><tbody>' +
    (rows.slice(0, 500).map((r, i) => '<tr><td class="muted">' + (i + 1) + '</td><td><div class="row">' + avatarHtml(r.nama, '', 'avatar-sm') + '<b>' + esc(r.nama) + '</b></div></td><td>' + esc(r.kelas) + '</td><td>' + esc(tglPendek(r.tanggal)) + '</td><td>' + esc(r.jam || '-') + '</td><td>' + r.sumber.map(s => '<span class="badge ' + (SUM[s] || ['', ''])[1] + '">' + esc((SUM[s] || [s])[0]) + '</span>').join(' ') + ((r.peserta || []).length ? '<div class="small muted mt-8">Peserta: ' + esc(r.peserta.join(', ')) + '</div>' : '') + '</td>' +
      (lomba ? '<td>' + ((r.voting || []).length ? '<div class="row row-wrap" style="gap:4px">' + r.voting.map(v => '<span class="chip-sm">' + ic('vote', 'ic-sm') + esc(v) + '</span>').join('') + '</div>' : '<span class="muted small">—</span>') +
        ((r.votingSemua || []).length > (r.voting || []).length ? '<div class="small muted mt-8">Total event: ' + esc(r.votingSemua.join(', ')) + '</div>' : '') + '</td>' : '') +
      '<td class="acts"><button class="btn btn-ghost btn-icon btn-sm" data-act="kh-hapus" data-t="' + esc(r.tanggal) + '" data-s="' + esc(r.siswaId) + '" title="Tandai tidak hadir" style="color:var(--red)">' + ic('user-x', 'ic-sm') + '</button></td></tr>').join('') || '<tr><td colspan="' + (lomba ? 8 : 7) + '">' + emptyState('clock', 'Belum ada kehadiran', 'Kehadiran tercatat otomatis dari voting dan peserta lomba. Anda juga bisa menambah manual.') + '</td></tr>') +
    '</tbody></table></div><div class="pager"><span class="small muted">' + rows.length + ' baris' + (rows.length > 500 ? ' (500 ditampilkan)' : '') + '</span></div></div>';
};
EVH['kh-q'] = debounce((el, t) => { el._kh.q = t.value.toLowerCase(); evRender(el); const i = $('[data-inp="kh-q"]', el); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
EVH['kh-tgl'] = (el, t) => { el._kh.tgl = t.value; evRender(el); };
EVH['kh-kelas'] = (el, t) => { el._kh.kelas = t.value; evRender(el); };
EVH['kh-hapus'] = async (el, b, det) => {
  const res = await api('koreksiKehadiran', { eventId: det.event.EventID, aksi: 'hapus', tanggal: b.dataset.t, siswaId: b.dataset.s });
  if (toastRes(res, 'Kehadiran dikoreksi')) { det.kehadiran = det.kehadiran.filter(r => !(r.tanggal === b.dataset.t && r.siswaId === b.dataset.s)); evRender(el); invalidateEvent(det.event.EventID); }
};
EVH['kh-tambah'] = async (el, b, det) => {
  const list = await loadSiswa();
  const m = modal({ title: 'Tambah Kehadiran Manual', body: '<div class="field"><label>Tanggal</label><input class="input" type="date" id="kt-tgl" value="' + esc(el._kh.tgl || todayStr()) + '"></div><div class="field mt-12"><label>Siswa</label><input class="input" id="kt-q" list="kt-list" placeholder="Ketik nama atau NISN"><datalist id="kt-list">' + list.filter(s => s.Aktif !== 'Tidak').map(s => '<option value="' + esc(s.NISN) + '">' + esc(s.Nama) + ' — ' + esc(s.Kelas) + '</option>').join('') + '</datalist><div class="hint">Pilih dari daftar (berdasarkan NISN).</div></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="kt-ok">Tambah</button>' });
  m.q('#kt-ok').onclick = async (e) => {
    const v = m.q('#kt-q').value.trim(), s = list.find(x => x.NISN === v || x.Nama.toLowerCase() === v.toLowerCase());
    if (!s) return toast('Siswa tidak ditemukan', 'Pilih dari daftar.', 'warning');
    const res = await busy(e.currentTarget, () => api('koreksiKehadiran', { eventId: det.event.EventID, aksi: 'tambah', tanggal: m.q('#kt-tgl').value, siswaId: s.SiswaID }));
    if (toastRes(res, 'Kehadiran ditambahkan', s.Nama)) { m.close(); invalidateEvent(det.event.EventID); }
  };
};
EVH['kh-excel'] = (el, b, det) => {
  const rows = det.kehadiran;
  const lomba = det.event.JenisEvent === 'Lomba';
  exportXlsx('Kehadiran - ' + det.event.Judul.replace(/[\\/:*?"<>|]/g, '') + '.xlsx', [{ name: 'Kehadiran', rows: [['No', 'Nama', 'NISN', 'Kelas', 'L/P', 'Tanggal', 'Jam', 'Sumber'].concat(lomba ? ['Voting Lomba (hari itu)', 'Seluruh Lomba di-voting', 'Peserta Lomba'] : [])].concat(rows.map((r, i) => [i + 1, r.nama, r.nisn, r.kelas, r.jk, r.tanggal, r.jam, r.sumber.join(', ')].concat(lomba ? [(r.voting || []).join(', '), (r.votingSemua || []).join(', '), (r.peserta || []).join(', ')] : []))) }]);
};

/* ---------------- Tab: Cetak ---------------- */
EV_RENDER.cetak = (det) => {
  const e = det.event;
  const docs = [['DaftarHadir', 'clock', 'Daftar Hadir', 'Per hari atau rekap beberapa hari, per cabang/kelas.']];
  if (e.JenisEvent !== 'Lainnya') docs.push(['Rekap', 'chart-column', 'Rekap Hasil Suara', e.JenisEvent === 'OSIS' ? 'Perolehan suara & partisipasi pemilih.' : 'Peringkat & skor per cabang lomba.']);
  if (e.JenisEvent === 'OSIS') docs.push(['BeritaAcara', 'file-pen-line', 'Berita Acara Pemilihan', 'Selalu memakai kop & tanda tangan kepala sekolah.']);
  if (e.JenisEvent === 'Lomba') docs.push(['LembarJuri', 'clipboard-list', 'Lembar Penilaian Juri', 'Tabel peserta × kriteria untuk diisi juri.'], ['Piagam', 'award', 'Piagam Juara', 'Template bawaan/unggahan, satuan atau massal.']);
  docs.push(['Formulir', 'file-text', 'Formulir Kosong', 'Cetak formulir pendaftaran untuk diisi manual.'], ['SK', 'stamp', 'SK Panitia', 'Selalu memakai kop & tanda tangan kepala sekolah.']);
  return '<div class="ev-grid">' + docs.map(d => { const c = cetakCfg(det, d[0]); return '<div class="card ev-card card-tap" tabindex="0" role="button" data-act="' + (d[0] === 'Piagam' ? 'go-piagam' : 'cetak-doc') + '" data-jenis="' + d[0] + '"><div class="row between"><span class="icon-tile">' + ic(d[1]) + '</span>' + ic('printer', 'ic-sm') + '</div><div><div style="font-weight:700;font-size:16px">' + d[2] + '</div><div class="small muted mt-8">' + d[3] + '</div></div>' +
    '<div class="row row-wrap"><span class="badge ' + (c.kop ? '' : 'badge-gray') + '">Kop: ' + (c.kop ? 'Ya' : 'Tidak') + '</span><span class="badge ' + (c.ttd ? '' : 'badge-gray') + '">TTD Kepsek: ' + (c.ttd ? 'Ya' : 'Tidak') + '</span>' + (c.kunci ? '<span class="badge badge-gray">' + ic('lock', 'ic-sm') + 'Terkunci</span>' : '') + '</div></div>'; }).join('') + '</div>';
};
EVH['go-piagam'] = (el, b, det) => go('piagam/' + det.event.EventID + (el._sub ? '/' + el._sub : ''));
EVH['cetak-doc'] = (el, b, det) => cetakDokumen(det, b.dataset.jenis, { formId: b.dataset.form, cabangId: el._sub });
function cetakDokumen(det, jenis, o = {}) {
  const e = det.event;
  if (jenis === 'BeritaAcara') return openCetak({ det, jenis, build: (cfg) => docBeritaAcara(det, cfg) });
  if (jenis === 'SK') return openCetak({ det, jenis, build: (cfg) => docSK(det, cfg) });
  if (jenis === 'Rekap') {
    const opt = { cabangId: e.JenisEvent === 'Lomba' ? (o.cabangId || '') : '' };
    return openCetak({ det, jenis, build: (cfg) => docRekap(det, cfg, opt),
      extra: e.JenisEvent === 'Lomba' ? '<div class="field"><label>Cabang</label><select class="select" id="x-cab"><option value="">Semua cabang</option>' + det.cabang.map(c => '<option value="' + esc(c.CabangID) + '"' + (opt.cabangId === c.CabangID ? ' selected' : '') + '>' + esc(c.NamaCabang) + '</option>').join('') + '</select></div>' : '',
      onExtra: (m) => { const s = m.q('#x-cab'); if (s) s.addEventListener('change', () => { opt.cabangId = s.value; }, true); } });
  }
  if (jenis === 'LembarJuri') {
    if (!det.cabang.length) return toast('Belum ada cabang', '', 'warning');
    const opt = { cabangId: o.cabangId && det.cabang.some(c => c.CabangID === o.cabangId) ? o.cabangId : det.cabang[0].CabangID, juriId: '' };
    const juriOpts = () => { const c = det.cabang.find(x => x.CabangID === opt.cabangId); return '<option value="">Semua juri (1 lembar per juri)</option><option value="_kosong">Lembar kosong (tanpa nama juri)</option>' + c.juri.map(j => '<option value="' + esc(j.JuriID) + '">' + esc(j.Nama) + '</option>').join(''); };
    return openCetak({ det, jenis, build: (cfg) => docLembarJuri(det, cfg, opt),
      extra: '<div class="field"><label>Cabang</label><select class="select" id="x-cab">' + det.cabang.filter(c => c.ModePenilaian !== 'Voting').map(c => '<option value="' + esc(c.CabangID) + '"' + (opt.cabangId === c.CabangID ? ' selected' : '') + '>' + esc(c.NamaCabang) + '</option>').join('') + '</select></div><div class="field"><label>Juri</label><select class="select" id="x-juri">' + juriOpts() + '</select></div>',
      onExtra: (m) => { m.q('#x-cab').addEventListener('change', (ev) => { opt.cabangId = ev.target.value; opt.juriId = ''; m.q('#x-juri').innerHTML = juriOpts(); }, true); m.q('#x-juri').addEventListener('change', (ev) => { opt.juriId = ev.target.value; }, true); } });
  }
  if (jenis === 'Formulir') {
    if (!det.formulir.length) return toast('Belum ada formulir', '', 'warning');
    const opt = { formId: o.formId || det.formulir[0].FormID };
    return openCetak({ det, jenis, build: (cfg) => docFormulirKosong(det, cfg, opt),
      extra: '<div class="field"><label>Formulir</label><select class="select" id="x-f">' + det.formulir.map(f => '<option value="' + esc(f.FormID) + '"' + (opt.formId === f.FormID ? ' selected' : '') + '>' + esc(f.Judul) + '</option>').join('') + '</select></div>',
      onExtra: (m) => m.q('#x-f').addEventListener('change', (ev) => { opt.formId = ev.target.value; }, true) });
  }
  if (jenis === 'DaftarHadir') {
    const dates = uniq(det.kehadiran.map(r => r.tanggal)).sort();
    if (!dates.length) return toast('Belum ada data kehadiran', '', 'info');
    const opt = { mode: 'hari', tanggal: [dates[dates.length - 1]], cabangId: '', kelas: '' };
    const sync = (m) => { opt.mode = m.q('#x-mode').value; m.q('#x-tgl-wrap').hidden = opt.mode !== 'hari'; m.q('#x-rek-wrap').hidden = opt.mode !== 'rekap';
      opt.tanggal = opt.mode === 'hari' ? [m.q('#x-tgl').value] : m.qa('#x-rek-wrap input:checked').map(i => i.value); opt.cabangId = m.q('#x-cab') ? m.q('#x-cab').value : ''; opt.kelas = m.q('#x-kls').value; };
    return openCetak({ det, jenis, build: (cfg) => docDaftarHadir(det, cfg, opt),
      extra: '<div class="field"><label>Jenis</label><select class="select" id="x-mode"><option value="hari">Per hari</option><option value="rekap">Rekap beberapa hari</option></select></div>' +
        '<div class="field" id="x-tgl-wrap"><label>Tanggal</label><select class="select" id="x-tgl">' + dates.map(d => '<option value="' + d + '"' + (d === opt.tanggal[0] ? ' selected' : '') + '>' + esc(hariTgl(d)) + '</option>').join('') + '</select></div>' +
        '<div class="field" id="x-rek-wrap" hidden><label>Tanggal yang direkap</label>' + dates.map(d => '<label class="check"><input type="checkbox" value="' + d + '" checked> ' + esc(tglPendek(d)) + '</label>').join('') + '</div>' +
        (e.JenisEvent === 'Lomba' ? '<div class="field"><label>Cabang</label><select class="select" id="x-cab"><option value="">Semua</option>' + det.cabang.map(c => '<option value="' + esc(c.CabangID) + '">' + esc(c.NamaCabang) + '</option>').join('') + '</select></div>' : '') +
        '<div class="field"><label>Kelas</label><select class="select" id="x-kls"><option value="">Semua kelas</option>' + uniq(det.kehadiran.map(r => r.kelas)).sort(kelasSort).map(k => '<option>' + esc(k) + '</option>').join('') + '</select></div>',
      onExtra: (m) => { m.el.addEventListener('change', () => sync(m), true); } });
  }
}

/* ============================================================
   MENU PINTAS: Kehadiran, Cetak Dokumen, Layar Hasil
   ============================================================ */
function eventPicker(title, sub, tab, filter, icon) {
  return {
    layout: 'shell', auth: 'staff', nav: tab === 'tayang' ? 'layar' : tab, title,
    show(el) {
      const list = (B().events || []).filter(filter || (() => true));
      el.innerHTML = pageHead(title, sub) + (list.length ? '<div class="ev-grid">' + list.map(e => '<a class="card ev-card card-tap" style="color:inherit" href="#/' + (tab === 'tayang' ? 'tayang/' + e.EventID : 'ev/' + e.EventID + '/' + tab) + '"><div class="row between"><span class="icon-tile">' + ic(jenisIcon(e.JenisEvent)) + '</span>' + statusBadge(e.Status) + '</div><div style="font-weight:700;font-size:16px">' + esc(e.Judul) + '</div><div class="meta"><span>' + ic('calendar', 'ic-sm') + esc(rentangTgl(e.TanggalMulai, e.TanggalSelesai)) + '</span></div><span class="btn btn-soft btn-sm">' + ic(icon, 'ic-sm') + ' Buka</span></a>').join('') + '</div>'
        : '<div class="card">' + emptyState('calendar', 'Belum ada event', '') + '</div>');
    }
  };
}
registerPage('kehadiran', eventPicker('Kehadiran', 'Pilih event untuk melihat, mengoreksi, dan mencetak daftar hadir.', 'kehadiran', null, 'clock'));
registerPage('cetak', eventPicker('Cetak Dokumen', 'Daftar hadir, rekap, berita acara, lembar juri, piagam, formulir, dan SK.', 'cetak', null, 'printer'));
registerPage('layar', eventPicker('Layar Hasil', 'Tayangkan grafik suara di proyektor atau panel interaktif.', 'tayang', (e) => e.JenisEvent !== 'Lainnya', 'monitor'));

/* ============================================================
   DATA SISWA
   ============================================================ */
registerPage('siswa', {
  layout: 'shell', auth: 'admin', nav: 'siswa', title: 'Data Siswa',
  init(el) {
    el._st = { q: '', kelas: '', jk: '', page: 1, sel: new Set() };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && SISWA[b.dataset.act]) SISWA[b.dataset.act](el, b); });
    el.addEventListener('input', debounce((e) => { if (e.target.id === 'sw-q') { el._st.q = e.target.value.toLowerCase(); el._st.page = 1; siswaTable(el); } }, 200));
    el.addEventListener('change', (e) => {
      if (e.target.id === 'sw-k') { el._st.kelas = e.target.value; el._st.page = 1; siswaTable(el); }
      if (e.target.id === 'sw-jk') { el._st.jk = e.target.value; el._st.page = 1; siswaTable(el); }
      if (e.target.dataset.sid) { if (e.target.checked) el._st.sel.add(e.target.dataset.sid); else el._st.sel.delete(e.target.dataset.sid); siswaSelBar(el); }
      if (e.target.id === 'sw-all') { $$('[data-sid]', el).forEach(c => { c.checked = e.target.checked; if (c.checked) el._st.sel.add(c.dataset.sid); else el._st.sel.delete(c.dataset.sid); }); siswaSelBar(el); }
    });
  },
  async show(el, q) {
    if (q) el._st.q = decodeURIComponent(q).toLowerCase();
    el.innerHTML = pageHead('Data Siswa', '<span id="sw-sub">Memuat…</span>', '<button class="btn btn-ghost" data-act="template">' + ic('download', 'ic-sm') + ' Unduh Template Excel</button><button class="btn" data-act="impor">' + ic('upload', 'ic-sm') + ' Impor Excel</button><button class="btn btn-primary" data-act="tambah">' + ic('plus', 'ic-sm') + ' Tambah Siswa</button>') +
      '<div class="card" style="overflow:hidden"><div class="toolbar"><div class="input-group search-in">' + ic('search') + '<input class="input" id="sw-q" placeholder="Cari nama atau NISN..." value="' + esc(el._st.q) + '"></div><select class="select" id="sw-k" style="width:150px"><option value="">Kelas: Semua</option>' + (B().kelas || []).map(k => '<option' + (el._st.kelas === k ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select>' +
      '<select class="select" id="sw-jk" style="width:170px"><option value="">Jenis Kelamin: Semua</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select><button class="btn" data-act="ekspor">' + ic('sheet', 'ic-sm') + ' Ekspor Excel</button></div>' +
      '<div id="sw-selbar"></div><div id="sw-table">' + '<div style="padding:18px">' + Array.from({ length: 8 }, () => '<div class="sk sk-line" style="height:36px"></div>').join('') + '</div></div></div>';
    if (AppState.siswa) siswaTable(el);
    await loadSiswa();
    if (!el.hidden) siswaTable(el);
  }
});
function siswaFiltered(el) { const st = el._st; return (AppState.siswa || []).filter(s => (!st.kelas || s.Kelas === st.kelas) && (!st.jk || s.JenisKelamin === st.jk) && (!st.q || s.Nama.toLowerCase().indexOf(st.q) > -1 || s.NISN.indexOf(st.q) > -1)); }
function siswaTable(el) {
  const st = el._st, all = siswaFiltered(el), per = 20, pages = Math.max(1, Math.ceil(all.length / per));
  st.page = Math.min(st.page, pages);
  const rows = all.slice((st.page - 1) * per, st.page * per);
  const sub = $('#sw-sub', el); if (sub) sub.textContent = (AppState.siswa || []).filter(s => s.Aktif !== 'Tidak').length + ' siswa aktif';
  const tbl = $('#sw-table', el); if (!tbl) return;
  tbl.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" id="sw-all" class="check" style="width:18px;height:18px;accent-color:var(--primary)"></th><th style="width:50px">No</th><th>Nama</th><th>L/P</th><th>NISN</th><th>Tempat, Tanggal Lahir</th><th>Kelas</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
    (rows.map((s, i) => '<tr><td><input type="checkbox" data-sid="' + esc(s.SiswaID) + '"' + (st.sel.has(s.SiswaID) ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--primary)"></td><td class="muted">' + ((st.page - 1) * per + i + 1) + '</td><td><div class="row">' + avatarHtml(s.Nama, '', 'avatar-sm') + '<b>' + esc(s.Nama) + '</b></div></td><td>' + esc(s.JenisKelamin) + '</td><td class="mono">' + esc(s.NISN) + '</td>' +
      '<td>' + esc([s.TempatLahir, s.TanggalLahir ? tglPendek(s.TanggalLahir) : ''].filter(Boolean).join(', ') || '-') + '</td><td><span class="badge badge-gray">' + esc(s.Kelas) + '</span></td><td>' + (s.Aktif === 'Tidak' ? '<span class="badge badge-red">Nonaktif</span>' : '<span class="badge badge-green">Aktif</span>') + '</td>' +
      '<td class="acts"><button class="btn btn-ghost btn-icon btn-sm" data-act="edit" data-id="' + esc(s.SiswaID) + '" title="Ubah">' + ic('pencil', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="hapus1" data-id="' + esc(s.SiswaID) + '" title="Hapus" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + '</button></td></tr>').join('') ||
      '<tr><td colspan="9">' + emptyState('users', (AppState.siswa || []).length ? 'Tidak ada siswa yang cocok' : 'Belum ada data siswa', (AppState.siswa || []).length ? 'Ubah kata kunci atau filter.' : 'Impor dari Excel atau tambah satu per satu.', (AppState.siswa || []).length ? '' : '<button class="btn btn-primary" data-act="impor">' + ic('upload', 'ic-sm') + ' Impor Excel</button>') + '</td></tr>') + '</tbody></table></div>' +
    '<div class="pager"><span class="small muted">Menampilkan ' + (all.length ? (st.page - 1) * per + 1 : 0) + '–' + Math.min(st.page * per, all.length) + ' dari ' + all.length + ' siswa</span><div class="pg">' + pagerBtns(st.page, pages) + '</div></div>';
}
function pagerBtns(page, pages) {
  if (pages <= 1) return '';
  const nums = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return '<button data-act="pg" data-p="' + Math.max(1, page - 1) + '">‹</button>' + nums.map(n => n === '…' ? '<span class="muted" style="padding:6px">…</span>' : '<button data-act="pg" data-p="' + n + '" class="' + (n === page ? 'on' : '') + '">' + n + '</button>').join('') + '<button data-act="pg" data-p="' + Math.min(pages, page + 1) + '">›</button>';
}
function siswaSelBar(el) {
  const n = el._st.sel.size, bar = $('#sw-selbar', el);
  bar.innerHTML = n ? '<div class="alert alert-blue" style="margin:0 18px 12px">' + ic('square-check', 'ic-sm') + '<span class="grow"><b>' + n + '</b> siswa dipilih</span><button class="btn btn-danger-soft btn-sm" data-act="hapus-sel">' + ic('trash-2', 'ic-sm') + ' Hapus</button><button class="btn btn-ghost btn-sm" data-act="batal-sel">Batal</button></div>' : '';
}
const SISWA = {
  pg: (el, b) => { el._st.page = +b.dataset.p; siswaTable(el); },
  tambah: (el) => formSiswa(el, null),
  edit: (el, b) => formSiswa(el, siswaById(b.dataset.id)),
  'batal-sel': (el) => { el._st.sel.clear(); siswaSelBar(el); siswaTable(el); },
  hapus1: (el, b) => hapusSiswa(el, [b.dataset.id]),
  'hapus-sel': (el) => hapusSiswa(el, Array.from(el._st.sel)),
  ekspor: (el) => { const rows = siswaFiltered(el); exportXlsx('Data Siswa.xlsx', [{ name: 'Siswa', rows: [['Nama', 'Jenis Kelamin', 'NISN', 'Tempat Lahir', 'Tanggal Lahir', 'Kelas', 'Status']].concat(rows.map(s => [s.Nama, s.JenisKelamin, s.NISN, s.TempatLahir, s.TanggalLahir, s.Kelas, s.Aktif === 'Tidak' ? 'Nonaktif' : 'Aktif'])) }]); },
  template: () => exportXlsx('Template Impor Siswa.xlsx', [{ name: 'Siswa', rows: [['Nama', 'Jenis Kelamin', 'NISN', 'Tempat Lahir', 'Tanggal Lahir', 'Kelas'], ['Ahmad Fauzi', 'L', '0098231401', 'Sangatta', '2012-03-14', '8A'], ['Aulia Rahma', 'P', '0094128842', 'Bontang', '2013-07-02', '7B']] }]),
  impor: (el) => imporDialog(el, 'siswa')
};
async function hapusSiswa(el, ids) {
  if (!(await confirmBox({ title: 'Hapus ' + ids.length + ' siswa?', text: 'Siswa yang sudah memiliki riwayat voting/lomba akan dinonaktifkan, bukan dihapus.', ok: 'Hapus', danger: true }))) return;
  const res = await api('hapusSiswa', { ids });
  if (toastRes(res, 'Selesai', res.data ? res.data.dihapus + ' dihapus, ' + res.data.dinonaktifkan + ' dinonaktifkan' : '')) {
    el._st.sel.clear(); siswaSelBar(el);
    await loadSiswa(true); if (!el.hidden) siswaTable(el); refreshBoot();
  }
}
function formSiswa(el, s) {
  const x = Object.assign({ Nama: '', JenisKelamin: 'L', NISN: '', TempatLahir: '', TanggalLahir: '', Kelas: '', Aktif: 'Ya' }, s || {});
  const m = modal({ title: s ? 'Ubah Siswa' : 'Tambah Siswa', body: kelasDatalist('k-dl') +
    '<div class="field"><label>Nama lengkap <span class="req">*</span></label><input class="input" id="s-nama" value="' + esc(x.Nama) + '"></div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>NISN <span class="req">*</span></label><input class="input mono" id="s-nisn" inputmode="numeric" maxlength="10" value="' + esc(x.NISN) + '"></div><div class="field"><label>Jenis kelamin</label><div class="seg seg-block" id="s-jk"><button type="button" data-v="L" class="' + (x.JenisKelamin === 'L' ? 'on' : '') + '">Laki-laki</button><button type="button" data-v="P" class="' + (x.JenisKelamin === 'P' ? 'on' : '') + '">Perempuan</button></div></div></div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>Tempat lahir</label><input class="input" id="s-tl" value="' + esc(x.TempatLahir) + '"></div><div class="field"><label>Tanggal lahir</label><input class="input" type="date" id="s-tgl" value="' + esc(x.TanggalLahir) + '"></div></div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>Kelas <span class="req">*</span></label><input class="input" id="s-kls" list="k-dl" value="' + esc(x.Kelas) + '" placeholder="mis. 8A"></div><div class="field"><label>Status</label><select class="select" id="s-akt"><option value="Ya">Aktif</option><option value="Tidak"' + (x.Aktif === 'Tidak' ? ' selected' : '') + '>Nonaktif</option></select></div></div><div id="s-err"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="s-ok">' + ic('save', 'ic-sm') + ' Simpan</button>' });
  m.q('#s-jk').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; x.JenisKelamin = b.dataset.v; m.qa('#s-jk button').forEach(z => z.classList.toggle('on', z === b)); };
  m.q('#s-ok').onclick = async (e) => {
    const d = { SiswaID: x.SiswaID, Nama: m.q('#s-nama').value.trim(), NISN: m.q('#s-nisn').value.replace(/\D/g, ''), JenisKelamin: x.JenisKelamin, TempatLahir: m.q('#s-tl').value.trim(), TanggalLahir: m.q('#s-tgl').value, Kelas: m.q('#s-kls').value.trim().toUpperCase(), Aktif: m.q('#s-akt').value };
    if (d.NISN.length !== 10) { m.q('#s-nisn').classList.add('is-error'); m.q('#s-err').innerHTML = '<div class="err-text mt-8">NISN harus 10 digit angka.</div>'; return; }
    const res = await busy(e.currentTarget, () => api('simpanSiswa', { siswa: d }));
    if (!res.success) { m.q('#s-err').innerHTML = '<div class="alert alert-red mt-12 small">' + esc(res.message) + '</div>'; return; }
    m.close(); toast('Siswa disimpan', d.Nama);
    const list = AppState.siswa || (AppState.siswa = []);
    const i = list.findIndex(z => z.SiswaID === res.data.siswa.SiswaID);
    if (i > -1) list[i] = res.data.siswa; else list.unshift(res.data.siswa);
    siswaTable(el); swrDrop('siswa'); refreshBoot();
  };
}

/* ---------------- Impor Excel (siswa & PTK) ---------------- */
function xlDate(v) {
  if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  const s = String(v || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return null;
}
async function imporDialog(el, jenis) {
  const isS = jenis === 'siswa';
  const st = { file: null, rows: [], skip: true };
  const m = modal({ kind: 'drawer', title: isS ? 'Impor Data Siswa' : 'Impor Data PTK', sub: 'Unggah berkas spreadsheet siswa baru atau pembaruan semester.',
    body: '<div class="alert alert-blue" style="align-items:flex-start">' + ic('info') + '<div><b>Format kolom wajib:</b><div class="small" style="margin-top:4px">' + (isS ? 'Nama | Jenis Kelamin (L/P) | NISN (10 digit) | Tempat Lahir | Tanggal Lahir (YYYY-MM-DD) | Kelas' : 'Nama | Tanggal Lahir (YYYY-MM-DD) | NIP/NIY/NUPTK | Jabatan (opsional)') + '</div></div></div>' +
      '<label class="card-tap mt-16" id="im-drop" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px;border:2px dashed var(--border-2);border-radius:16px;background:var(--bg);cursor:pointer;text-align:center"><span class="icon-tile" style="border-radius:50%;width:56px;height:56px">' + ic('cloud-upload', 'ic-lg') + '</span><b>Tarik & lepaskan file Anda di sini</b><span class="hint">Format yang didukung: .XLSX, .XLS, atau .CSV (Maks. 5 MB)</span><input type="file" id="im-file" accept=".xlsx,.xls,.csv" hidden></label>' +
      '<div id="im-out"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="im-ok" disabled>' + ic('save', 'ic-sm') + ' Simpan</button>' });
  const drop = m.q('#im-drop');
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.borderColor = 'var(--primary)'; }));
  drop.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.style.borderColor = ''; if (e.dataTransfer.files[0]) baca(e.dataTransfer.files[0]); });
  m.q('#im-file').onchange = (e) => { if (e.target.files[0]) baca(e.target.files[0]); };
  async function baca(file) {
    if (file.size > 5 * 1024 * 1024) return toast('Berkas terlalu besar', 'Maksimal 5 MB.', 'error');
    st.file = file;
    m.q('#im-out').innerHTML = '<div class="card card-pad mt-16"><div class="sk sk-line"></div></div>';
    let X; try { X = await loadXLSX(); } catch (e) { m.q('#im-out').innerHTML = '<div class="alert alert-red mt-16">Gagal memuat pembaca Excel. Periksa koneksi.</div>'; return; }
    const wb = X.read(await file.arrayBuffer(), { cellDates: true });
    const aoa = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    let hi = aoa.findIndex(r => r.some(c => /nama/i.test(String(c))));
    const head = hi > -1 ? aoa[hi].map(h => String(h).toLowerCase().trim()) : [];
    const col = (re, def) => { const i = head.findIndex(h => re.test(h)); return i > -1 ? i : def; };
    const data = aoa.slice(hi + 1).filter(r => r.some(c => String(c).trim() !== ''));
    const ada = {};
    if (isS) (AppState.siswa || []).forEach(s => ada[s.NISN] = s);
    const seen = {};
    st.rows = data.map((r, i) => {
      const o = { _baris: (hi + 1) + i + 1, _err: '', _info: '' };
      if (isS) {
        const c = { n: col(/^nama/, 0), jk: col(/jenis|^jk$|^l\/p$/, 1), nisn: col(/nisn/, 2), tl: col(/tempat/, 3), tg: col(/tanggal|tgl/, 4), k: col(/kelas|rombel/, 5) };
        let nisn = r[c.nisn]; nisn = typeof nisn === 'number' ? String(nisn).padStart(10, '0') : String(nisn || '').replace(/\D/g, '');
        Object.assign(o, { Nama: String(r[c.n] || '').trim(), JenisKelamin: String(r[c.jk] || '').trim(), NISN: nisn, TempatLahir: String(r[c.tl] || '').trim(), TanggalLahir: xlDate(r[c.tg]), Kelas: String(r[c.k] || '').trim().toUpperCase() });
        const jk = o.JenisKelamin.toLowerCase();
        if (!o.Nama) o._err = 'Nama kosong';
        else if (o.NISN.length !== 10) o._err = 'NISN harus 10 digit';
        else if (seen[o.NISN]) o._err = 'NISN ganda';
        else if (!(jk === 'l' || jk === 'p' || /^laki|^perem/.test(jk))) o._err = 'Jenis kelamin harus L/P';
        else if (o.TanggalLahir === null) o._err = 'Format tgl salah';
        else if (!o.Kelas) o._err = 'Kelas kosong';
        else if (ada[o.NISN]) o._info = 'Diperbarui';
        if (o.NISN) seen[o.NISN] = 1;
      } else {
        const c = { n: col(/^nama/, 0), tg: col(/tanggal|tgl/, 1), no: col(/nip|niy|nuptk|nomor/, 2), j: col(/jabatan/, 3) };
        Object.assign(o, { Nama: String(r[c.n] || '').trim(), TanggalLahir: xlDate(r[c.tg]), NIP_NIY_NUPTK: String(r[c.no] || '').replace(/\.0$/, '').trim(), Jabatan: c.j !== undefined ? String(r[c.j] || '').trim() : '' });
        if (!o.Nama) o._err = 'Nama kosong'; else if (o.TanggalLahir === null) o._err = 'Format tgl salah';
        else if ((B().ptk || []).some(p => p.Nama.toLowerCase() === o.Nama.toLowerCase() || (o.NIP_NIY_NUPTK && p.NIP_NIY_NUPTK === o.NIP_NIY_NUPTK))) o._info = 'Diperbarui';
      }
      return o;
    });
    paint();
  }
  function paint() {
    const bad = st.rows.filter(r => r._err), ok = st.rows.filter(r => !r._err);
    m.q('#im-out').innerHTML = '<div class="card row mt-16" style="padding:14px 16px"><span class="icon-tile green">' + ic('file-spreadsheet') + '</span><div class="grow"><b>' + esc(st.file.name) + '</b><div class="small muted">' + Math.round(st.file.size / 1024) + ' KB · Siap dianalisis</div></div><span class="row small" style="color:var(--green-text);font-weight:700">' + ic('circle-check', 'ic-sm') + ' Berhasil dibaca</span></div>' +
      '<div class="grid-3 mt-16" style="gap:10px"><div class="card center" style="padding:14px;background:var(--primary-tint);border-color:var(--primary-tint-2)"><div style="font-size:26px;font-weight:800">' + st.rows.length + '</div><div class="small">Baris Dibaca</div></div><div class="card center" style="padding:14px;background:var(--green-tint);border-color:#BBF7D0"><div style="font-size:26px;font-weight:800;color:var(--green-text)">' + ok.length + '</div><div class="small" style="color:var(--green-text)">Valid</div></div><div class="card center" style="padding:14px;background:var(--red-tint);border-color:#FECACA"><div style="font-size:26px;font-weight:800;color:var(--red-text)">' + bad.length + '</div><div class="small" style="color:var(--red-text)">Bermasalah</div></div></div>' +
      '<div class="row between mt-16"><b>Pratinjau & Validasi Data</b>' + (bad.length ? '<span class="badge badge-red">Menampilkan baris kendala</span>' : '<span class="badge badge-green">Semua baris valid</span>') + '</div>' +
      '<div class="tbl-wrap mt-8" style="border:1px solid var(--border);border-radius:12px;max-height:280px"><table class="tbl compact"><thead><tr><th>Baris</th><th>Nama</th><th>' + (isS ? 'NISN' : 'Nomor') + '</th>' + (isS ? '<th>Kelas</th>' : '') + '<th>Keterangan</th></tr></thead><tbody>' +
      (bad.length ? bad : ok.slice(0, 30)).map(r => '<tr class="' + (r._err ? 'row-err' : '') + '"><td style="color:' + (r._err ? 'var(--red-text)' : 'inherit') + ';font-weight:600">Baris ' + r._baris + '</td><td>' + esc(r.Nama || '-') + '</td><td class="mono small">' + esc(isS ? r.NISN : r.NIP_NIY_NUPTK) + '</td>' + (isS ? '<td>' + esc(r.Kelas || '-') + '</td>' : '') + '<td>' + (r._err ? '<span class="err-text">' + ic('circle-alert', 'ic-sm') + esc(r._err) + '</span>' : r._info ? '<span class="badge">' + esc(r._info) + '</span>' : '<span class="badge badge-green">Baru</span>') + '</td></tr>').join('') +
      '</tbody></table></div>' + (bad.length ? '<label class="check mt-12"><input type="checkbox" id="im-skip" checked> Lewati baris bermasalah</label>' : '');
    const okBtn = m.q('#im-ok');
    okBtn.disabled = !ok.length;
    okBtn.innerHTML = ic('save', 'ic-sm') + ' Simpan ' + ok.length + ' Baris';
  }
  m.q('#im-ok').onclick = async (e) => {
    const bad = st.rows.filter(r => r._err);
    if (bad.length && m.q('#im-skip') && !m.q('#im-skip').checked) return toast('Perbaiki baris bermasalah', 'Atau centang "Lewati baris bermasalah".', 'warning');
    const ok = st.rows.filter(r => !r._err);
    const btn = e.currentTarget;
    let baru = 0, ubah = 0, gagal = [];
    await busy(btn, async () => {
      for (let i = 0; i < ok.length; i += 100) {
        btn.lastChild && (btn.lastChild.textContent = ' Menyimpan ' + Math.min(i + 100, ok.length) + '/' + ok.length + '…');
        const res = await api(isS ? 'imporSiswa' : 'imporPtk', { rows: ok.slice(i, i + 100) });
        if (!res.success) { toast('Impor terhenti', res.message, 'error'); break; }
        baru += res.data.baru; ubah += res.data.diperbarui; gagal = gagal.concat(res.data.gagal);
      }
    });
    m.close();
    toast((isS ? 'Data siswa' : 'Data PTK') + ' berhasil diimpor', baru + ' baru, ' + ubah + ' diperbarui' + (gagal.length ? ', ' + gagal.length + ' gagal' : ''));
    if (isS) { await loadSiswa(true); if (!el.hidden) siswaTable(el); }
    ensureStaffBoot(true).then(() => { if (!isS && !el.hidden) ptkTable(el); Shell.refreshBadges(); });
  };
}

/* ============================================================
   DATA PTK
   ============================================================ */
registerPage('data-ptk', {
  layout: 'shell', auth: 'admin', nav: 'data-ptk', title: 'Data PTK',
  init(el) {
    el._q = '';
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && PTKH[b.dataset.act]) PTKH[b.dataset.act](el, b); });
    el.addEventListener('input', debounce((e) => { if (e.target.id === 'pt-q') { el._q = e.target.value.toLowerCase(); ptkTable(el); } }, 200));
  },
  show(el, id) {
    el.innerHTML = pageHead('Data PTK', 'Pendidik & tenaga kependidikan — dipakai untuk login PTK, panitia, juri, dan tanda tangan dokumen.',
      '<button class="btn btn-ghost" data-act="template">' + ic('download', 'ic-sm') + ' Template</button><button class="btn" data-act="impor">' + ic('upload', 'ic-sm') + ' Impor Excel</button><button class="btn" data-act="massal">' + ic('key-round', 'ic-sm') + ' Kata Sandi Massal</button><button class="btn btn-primary" data-act="tambah">' + ic('plus', 'ic-sm') + ' Tambah PTK</button>') +
      '<div class="card" style="overflow:hidden"><div class="toolbar"><div class="input-group search-in">' + ic('search') + '<input class="input" id="pt-q" placeholder="Cari nama atau nomor" value="' + esc(el._q) + '"></div><button class="btn" data-act="ekspor">' + ic('sheet', 'ic-sm') + ' Ekspor Excel</button></div><div id="pt-table"></div></div>';
    ptkTable(el);
    if (id) { const p = ptkById(id); if (p) formPtk(el, p); }
  }
});
function ptkTable(el) {
  const kep = (B().settings || {}).KepalaSekolah_PTK_ID;
  const rows = (B().ptk || []).filter(p => !el._q || p.Nama.toLowerCase().indexOf(el._q) > -1 || String(p.NIP_NIY_NUPTK).indexOf(el._q) > -1);
  const t = $('#pt-table', el); if (!t) return;
  t.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:50px">No</th><th>Nama</th><th>Jabatan</th><th>NIP/NIY/NUPTK</th><th>Tanggal Lahir</th><th>Login</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' +
    (rows.map((p, i) => '<tr><td class="muted">' + (i + 1) + '</td><td><div class="row">' + avatarHtml(p.Nama, '', 'avatar-sm') + '<div><b>' + esc(p.Nama) + '</b>' + (p.PTK_ID === kep ? ' <span class="badge badge-amber">Kepala Sekolah</span>' : '') + '</div></div></td><td>' + esc(p.Jabatan || '-') + '</td><td>' + (p.NIP_NIY_NUPTK ? '<span class="badge badge-gray">' + esc(p.JenisNomor) + '</span> <span class="mono small">' + esc(p.NIP_NIY_NUPTK) + '</span>' : '-') + '</td><td>' + esc(p.TanggalLahir ? tglPendek(p.TanggalLahir) : '-') + '</td>' +
      '<td>' + (p.punyaSandi ? '<span class="badge badge-green">' + ic('key-round', 'ic-sm') + ' Siap</span>' : '<span class="badge badge-red">Belum ada sandi</span>') + '</td><td>' + (p.Aktif === 'Tidak' ? '<span class="badge badge-red">Nonaktif</span>' : '<span class="badge badge-green">Aktif</span>') + '</td>' +
      '<td class="acts"><button class="btn btn-ghost btn-icon btn-sm" data-act="sandi" data-id="' + esc(p.PTK_ID) + '" title="Atur kata sandi">' + ic('key-round', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="edit" data-id="' + esc(p.PTK_ID) + '" title="Ubah">' + ic('pencil', 'ic-sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-act="hapus" data-id="' + esc(p.PTK_ID) + '" title="Hapus" style="color:var(--red)">' + ic('trash-2', 'ic-sm') + '</button></td></tr>').join('') ||
      '<tr><td colspan="8">' + emptyState('user-check', 'Belum ada data PTK', 'Impor dari Excel atau tambah satu per satu.') + '</td></tr>') + '</tbody></table></div>';
}
const PTKH = {
  tambah: (el) => formPtk(el, null),
  edit: (el, b) => formPtk(el, ptkById(b.dataset.id)),
  impor: (el) => imporDialog(el, 'ptk'),
  template: () => exportXlsx('Template Impor PTK.xlsx', [{ name: 'PTK', rows: [['Nama', 'Tanggal Lahir', 'NIP/NIY/NUPTK', 'Jabatan'], ['Ibu Nur Aini, S.Pd.', '1985-03-21', '198503212010012001', 'Guru Bahasa Indonesia'], ['Bpk. Hendra Wijaya, S.Kom.', '1988-07-02', '2015001', 'Guru Informatika']] }]),
  ekspor: () => exportXlsx('Data PTK.xlsx', [{ name: 'PTK', rows: [['Nama', 'Tanggal Lahir', 'Jenis Nomor', 'NIP/NIY/NUPTK', 'Jabatan', 'Status']].concat((B().ptk || []).map(p => [p.Nama, p.TanggalLahir, p.JenisNomor, p.NIP_NIY_NUPTK, p.Jabatan, p.Aktif === 'Tidak' ? 'Nonaktif' : 'Aktif'])) }]),
  hapus: async (el, b) => {
    const p = ptkById(b.dataset.id);
    if (!(await confirmBox({ title: 'Hapus PTK?', text: p.Nama + ' akan dihapus (atau dinonaktifkan bila sudah menjadi panitia/juri/pemilih).', ok: 'Hapus', danger: true }))) return;
    const res = await api('hapusPtk', { ids: [p.PTK_ID] });
    if (toastRes(res, 'Selesai')) ensureStaffBoot(true).then(() => ptkTable(el));
  },
  sandi: (el, b) => {
    const p = ptkById(b.dataset.id);
    const m = modal({ title: 'Atur Kata Sandi', size: 'sm', body: '<p class="muted mb-16">' + esc(p.Nama) + '</p><div class="field"><label>Kata sandi baru</label><div class="row"><input class="input grow mono" id="pw-new" value="' + sandiAcakFE() + '"><button class="btn btn-icon" id="pw-gen" title="Acak ulang">' + ic('refresh-cw', 'ic-sm') + '</button></div><div class="hint">Berikan kata sandi ini kepada yang bersangkutan.</div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="pw-ok">Simpan</button>' });
    m.q('#pw-gen').onclick = () => { m.q('#pw-new').value = sandiAcakFE(); };
    m.q('#pw-ok').onclick = async (e) => {
      const res = await busy(e.currentTarget, () => api('setPasswordPtk', { ptkId: p.PTK_ID, password: m.q('#pw-new').value }));
      if (toastRes(res, 'Kata sandi disimpan', p.Nama)) { m.close(); p.punyaSandi = true; ptkTable(el); refreshBoot(); }
    };
  },
  massal: async (el, b) => {
    const kosong = (B().ptk || []).filter(p => !p.punyaSandi && p.Aktif !== 'Tidak').length;
    const m = modal({ title: 'Kata Sandi Massal', body: '<p class="muted">Buat kata sandi acak untuk banyak PTK sekaligus, lalu cetak kartunya.</p><label class="radio-card on mt-16"><input type="radio" name="pm" value="kosong" checked><span><b>Hanya yang belum punya sandi</b><br><span class="small muted">' + kosong + ' PTK</span></span></label><label class="radio-card"><input type="radio" name="pm" value="semua"><span><b>Semua PTK aktif</b><br><span class="small muted">Sandi lama akan diganti</span></span></label>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="pm-ok">' + ic('key-round', 'ic-sm') + ' Buat Kata Sandi</button>' });
    m.el.addEventListener('change', () => m.qa('.radio-card').forEach(c => c.classList.toggle('on', c.querySelector('input').checked)));
    m.q('#pm-ok').onclick = async (e) => {
      const semua = m.q('input[name=pm]:checked').value === 'semua';
      if (semua && !(await confirmBox({ title: 'Ganti semua kata sandi?', text: 'Semua PTK harus memakai kata sandi baru.', ok: 'Ganti', danger: true }))) return;
      const res = await busy(e.currentTarget, () => api('passwordMassal', semua ? { ids: (B().ptk || []).filter(p => p.Aktif !== 'Tidak').map(p => p.PTK_ID) } : { hanyaKosong: true }));
      if (!toastRes(res, 'Kata sandi dibuat', res.data ? res.data.daftar.length + ' PTK' : '')) return;
      m.close();
      const list = res.data.daftar;
      if (!list.length) return;
      const r = modal({ title: 'Kartu Kata Sandi PTK', size: 'lg', body: '<div class="alert alert-amber small mb-16">' + ic('triangle-alert', 'ic-sm') + '<span>Kata sandi hanya ditampilkan sekali. Cetak atau salin sekarang.</span></div><div class="grid-2" id="kartu">' + list.map(x => '<div class="card card-pad"><div class="small muted">' + esc(sekolah().NamaSekolah || '') + ' · MEvent</div><b style="font-size:16px">' + esc(x.Nama) + '</b><div class="small muted">' + esc(x.Jabatan || '') + '</div><div class="mt-8">Kata sandi: <b class="mono" style="font-size:18px">' + esc(x.password) + '</b></div></div>').join('') + '</div>',
        foot: '<button class="btn" data-close>Tutup</button><button class="btn btn-primary" id="kp-print">' + ic('printer', 'ic-sm') + ' Cetak</button>' });
      r.q('#kp-print').onclick = () => printHtml('<div class="doc doc-a4 print-page" style="font-family:Arial"><h2 class="doc-title">Kartu Kata Sandi PTK — MEvent</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:8mm">' + list.map(x => '<div style="border:1px dashed #555;padding:5mm;border-radius:3mm"><div style="font-size:9pt;color:#555">' + esc(sekolah().NamaSekolah || '') + '</div><b>' + esc(x.Nama) + '</b><div style="font-size:9pt">' + esc(x.Jabatan || '') + '</div><div style="margin-top:3mm">Kata sandi: <b style="font-family:monospace;font-size:14pt">' + esc(x.password) + '</b></div><div style="font-size:8pt;color:#555;margin-top:2mm">Masuk: menu PTK / Juri → pilih nama → kata sandi</div></div>').join('') + '</div></div>');
      ensureStaffBoot(true).then(() => ptkTable(el));
    };
  }
};
function sandiAcakFE() { const ch = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(6)); for (let i = 0; i < 6; i++) s += ch[r[i] % ch.length]; return s; }
function formPtk(el, p) {
  const x = Object.assign({ Nama: '', TanggalLahir: '', NIP_NIY_NUPTK: '', JenisNomor: '', Jabatan: '', Aktif: 'Ya' }, p || {});
  const m = modal({ title: p ? 'Ubah PTK' : 'Tambah PTK', body: '<div class="field"><label>Nama lengkap & gelar <span class="req">*</span></label><input class="input" id="p-nama" value="' + esc(x.Nama) + '" placeholder="mis. Ibu Nur Aini, S.Pd."></div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>Jabatan</label><input class="input" id="p-jab" value="' + esc(x.Jabatan) + '" placeholder="mis. Guru Matematika"></div><div class="field"><label>Tanggal lahir</label><input class="input" type="date" id="p-tgl" value="' + esc(x.TanggalLahir) + '"></div></div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>Jenis nomor</label><select class="select" id="p-jn"><option value="">Otomatis</option>' + ['NIP', 'NIY', 'NUPTK'].map(j => '<option' + (x.JenisNomor === j ? ' selected' : '') + '>' + j + '</option>').join('') + '</select></div><div class="field"><label>NIP / NIY / NUPTK</label><input class="input mono" id="p-no" value="' + esc(x.NIP_NIY_NUPTK) + '"></div></div>' +
    '<div class="hint mt-8">Nomor tampil di bawah tanda tangan pada dokumen cetak.</div>' +
    '<div class="grid-2 mt-12"><div class="field"><label>' + (p ? 'Kata sandi baru (kosongkan bila tidak diubah)' : 'Kata sandi (opsional)') + '</label><input class="input mono" id="p-pw" placeholder="min. 4 karakter"></div><div class="field"><label>Status</label><select class="select" id="p-akt"><option value="Ya">Aktif</option><option value="Tidak"' + (x.Aktif === 'Tidak' ? ' selected' : '') + '>Nonaktif</option></select></div></div><div id="p-err"></div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" id="p-ok">' + ic('save', 'ic-sm') + ' Simpan</button>' });
  m.q('#p-ok').onclick = async (e) => {
    const d = { PTK_ID: x.PTK_ID, Nama: m.q('#p-nama').value.trim(), Jabatan: m.q('#p-jab').value.trim(), TanggalLahir: m.q('#p-tgl').value, JenisNomor: m.q('#p-jn').value, NIP_NIY_NUPTK: m.q('#p-no').value.trim(), Aktif: m.q('#p-akt').value, password: m.q('#p-pw').value };
    const res = await busy(e.currentTarget, () => api('simpanPtk', { ptk: d }));
    if (!res.success) { m.q('#p-err').innerHTML = '<div class="alert alert-red mt-12 small">' + esc(res.message) + '</div>'; return; }
    m.close(); toast('PTK disimpan', d.Nama);
    const list = B().ptk, i = list.findIndex(z => z.PTK_ID === res.data.ptk.PTK_ID), row = Object.assign({ punyaSandi: !!d.password || (i > -1 && list[i].punyaSandi) }, res.data.ptk);
    if (i > -1) list[i] = row; else list.push(row);
    ptkTable(el); refreshBoot();
  };
}
