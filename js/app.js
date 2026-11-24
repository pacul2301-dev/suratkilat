/* SuratKilat — cangkang aplikasi: login (Google / darurat), boot instan dari cache, navigasi per peran,
   badge & polling adaptif, prefetch saat idle, tema, PIN, PWA. */
(function () {
  'use strict';
  var U = window.SKU, S = window.SK, esc = U.esc, ic = U.ic, $ = U.$, $$ = U.$$;
  var ALL = ['superadmin', 'approver', 'pemohon'], SAAP = ['superadmin', 'approver'];
  var NAV = [
    ['dashboard', 'Dashboard', 'dashboard', ALL], ['buat', 'Buat Surat', 'edit_document', ALL], ['surat', 'Surat Saya', 'outbox', ALL, 'draf'],
    ['persetujuan', 'Persetujuan', 'approval_delegation', ['approver'], 'persetujuan'], ['masuk', 'Surat Masuk', 'move_to_inbox', SAAP, 'masukBaru'],
    ['disposisi', 'Disposisi', 'forward_to_inbox', ALL, 'disposisi'], ['distribusi', 'Distribusi & Ekspedisi', 'local_shipping', SAAP],
    ['agenda', 'Buku Agenda & Arsip', 'folder_special', ALL], ['retensi', 'Retensi', 'event_busy', SAAP], null,
    ['master', 'Master Data', 'dataset', SAAP], ['audit', 'Audit Log', 'history', SAAP], ['pengaturan', 'Pengaturan', 'settings', ALL]
  ];
  var sudahJalan = false;

  var App = window.App = {
    init: function () {
      U.Aktivitas.init();
      if (!U.konfigOk()) return tampilLogin('Konfigurasi belum lengkap: isi alamat server (GAS_URL) di berkas js/config.js lalu unggah ulang.');
      var ses = null; try { ses = JSON.parse(localStorage.getItem('sk_sesi') || 'null'); } catch (e) { }
      if (ses && ses.token && ses.me) {
        S.token = ses.token; S.me = ses.me; S.foto = ses.foto || '';
        var boot = U.Store.get('boot');
        if (boot && boot.d) { terapkanBoot(boot.d); tampilShell(); }
        muatBoot(!boot);
      } else tampilLogin();
      window.addEventListener('hashchange', function () { if (S.me && $('#shell') && !$('#shell').hidden) U.Router.jalan(); else if (!S.me) tampilLogin(); });
      setInterval(function () { if (S.me && U.Aktivitas.jatuh('badge', 45000, 180000)) App.segarBadge(true); }, 5000);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.me) App.segarBadge(true); });
      if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
    },
    sesiHabis: function (msg) { App.keluar(true, msg || 'Sesi berakhir. Silakan masuk kembali.'); },
    keluar: async function (lokal, pesan) {
      if (!lokal) { try { await U.apiRun('auth.logout', {}, { diam: true }); } catch (e) { } }
      try { localStorage.removeItem('sk_sesi'); } catch (e) { }
      if (window.google && google.accounts && google.accounts.id) try { google.accounts.id.disableAutoSelect(); } catch (e) { }
      S.token = null; S.me = null; U.tutupLapisan(); tampilLogin(pesan);
    },
    tandaiNav: function (nama) { $$('#nav a, #bottomNav a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === nama); }); },
    segarBadge: U.debounce(async function (diam) {
      try { var r = await U.apiRun('badge', {}, { diam: true }); if (r.success) { S.badge = r.data; gambarNav(); } } catch (e) { }
    }, 600),
    simpanBoot: function () { U.Store.set('boot', { t: Date.now(), d: { me: S.me, cfg: S.cfg, master: S.master, badge: S.badge, sistem: S.sistem } }); gambarNav(); gambarSys(); },
    muatUlangBoot: function () { return muatBoot(false, true); },
    gantiTema: function () { var gelap = document.documentElement.getAttribute('data-theme') !== 'dark'; document.documentElement.setAttribute('data-theme', gelap ? 'dark' : 'light'); try { localStorage.setItem('sk_tema', gelap ? 'dark' : 'light'); } catch (e) { } if (U.Router.aktif && U.Router.aktif.nama === 'dashboard') U.Router.jalan(); },
    aturPin: function (lanjut) {
      var ada = S.me.pejabat && S.me.pejabat.pinAda;
      var m = U.modal({ title: ada ? 'Ganti PIN Persetujuan' : 'Buat PIN Persetujuan', sub: '6 angka. Hindari tanggal lahir, angka berulang, atau berurutan.',
        body: '<div style="display:grid;gap:12px">' + (ada ? '<div class="field"><label>PIN lama</label><input class="input" id="pLama" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>' : '') +
          '<div class="field"><label>PIN baru</label><input class="input" id="pBaru" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div><div class="field"><label>Ulangi PIN baru</label><input class="input" id="pUlang" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div></div>',
        foot: '<button class="btn" data-x>Batal</button><button class="btn pri" data-ok>' + ic('password') + 'Simpan PIN</button>' });
      $('[data-x]', m.el).onclick = function () { m.close(); };
      $('[data-ok]', m.el).onclick = function () {
        var b = this, baru = $('#pBaru', m.el).value, ulang = $('#pUlang', m.el).value;
        if (!/^\d{6}$/.test(baru)) return U.toast('PIN harus 6 angka.', 'err'); if (baru !== ulang) return U.toast('Ulangan PIN tidak sama.', 'err');
        U.sibuk(b, async function () {
          var r = await U.api('pin.atur', { pinBaru: baru, pinLama: ($('#pLama', m.el) || {}).value || '' });
          if (!r.success) return U.toast(r.message, 'err');
          S.me.pejabat.pinAda = true; simpanSesi(); App.simpanBoot(); U.toast(r.message, 'ok'); m.close(); if (lanjut) lanjut();
        });
      };
    }
  };

  function simpanSesi() { try { localStorage.setItem('sk_sesi', JSON.stringify({ token: S.token, me: S.me, foto: S.foto })); } catch (e) { } }
  function terapkanBoot(d) { if (d.me) S.me = Object.assign({}, S.me, d.me); S.cfg = d.cfg || {}; S.master = d.master; S.badge = d.badge || {}; S.sistem = d.sistem || {}; }
  async function muatBoot(tampilkanSaatSelesai, paksa) {
    try {
      var r = await U.apiQ('boot', { origin: location.origin + location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') });
      if (!r.success) { if (r.code === 'AUTH') return; throw new Error(r.message); }
      var lamaHash = U.hash(JSON.stringify(S.master || {}));
      terapkanBoot(r.data); simpanSesi(); App.simpanBoot();
      if (tampilkanSaatSelesai || $('#shell').hidden) tampilShell();
      else if (paksa || lamaHash !== U.hash(JSON.stringify(S.master))) { var a = U.Router.aktif; if (a && a.nama !== 'buat' && !document.querySelector('.modal,.drawer')) U.Router.jalan(); }
      setTimeout(prefetch, 300);
    } catch (e) {
      if ($('#shell').hidden) tampilLogin(e.message); else U.toast(e.message, 'err');
    }
  }
  /** Prefetch menu yang sering dibuka saat peramban idle → pindah menu terasa instan. */
  function prefetch() {
    var jalan = function () {
      var th = String(new Date().getFullYear()), o = { maxAge: 60000, diam: true }, r = S.me.role;
      U.Data.ambil('dash.data', {}, o).catch(function () { });
      U.Data.ambil('surat.list', { lingkup: 'saya' }, o).catch(function () { });
      U.Data.ambil('dispo.list', { lingkup: 'saya' }, o).catch(function () { });
      U.Data.ambil('agenda.list', { tahun: th }, o).catch(function () { });
      if (r === 'approver') U.Data.ambil('surat.list', { lingkup: 'persetujuan' }, o).catch(function () { });
      if (r !== 'pemohon') U.Data.ambil('masuk.list', { tahun: th }, o).catch(function () { });
    };
    (window.requestIdleCallback || function (f) { setTimeout(f, 600); })(jalan);
  }

  // ============================================================ Login
  async function tampilLogin(pesan) {
    $('#shell').hidden = true; var el = $('#login'); el.hidden = false;
    var darurat = /^#\/?darurat/.test(location.hash);
    var cfg = null; try { cfg = JSON.parse(localStorage.getItem('sk_authcfg') || 'null'); } catch (e) { }
    el.innerHTML = '<div class="login-card"><div class="brand"><div class="brand-logo">' + ic('bolt', 'fill') + '</div></div><div><div class="eyebrow">' + esc((cfg && cfg.institusi) || 'Sistem Persuratan Digital') + '</div><h1>Masuk ke SuratKilat</h1></div>' +
      '<p>Persuratan otomatis, persetujuan PIN, disposisi, dan arsip digital ber-QR.</p>' +
      (pesan ? '<div class="callout ' + (/Konfigurasi/.test(pesan) ? 'bad' : 'info') + '" style="text-align:left">' + ic('info') + '<div>' + esc(pesan) + '</div></div>' : '') +
      (darurat ? '<form id="fDar" style="display:grid;gap:12px;text-align:left"><div class="field"><label>Nama pengguna</label><input class="input" id="dU" autocomplete="username" value="darurat"></div><div class="field"><label>Kata sandi</label><input class="input" id="dP" type="password" autocomplete="current-password"></div><button class="btn pri lg" id="bDar">' + ic('key') + 'Masuk (akses darurat)</button><a class="link-btn" href="#/">← Kembali ke login Google</a></form>'
        : '<div class="gbtn-wrap" id="gbtn"><div class="skel" style="width:280px;height:44px;border-radius:999px"></div></div><div id="loginInfo" class="hint"></div>') +
      '<div class="login-foot">Hanya akun yang didaftarkan Admin Tata Usaha yang dapat masuk.<br><a href="verifikasi.html">Verifikasi keaslian surat →</a></div></div>';
    if (!U.konfigOk()) return;
    U.warmUp('pub');
    if (darurat) {
      $('#fDar', el).onsubmit = function (e) {
        e.preventDefault(); var b = $('#bDar', el);
        U.sibuk(b, async function () { try { var r = await U.api('auth.darurat', { username: $('#dU', el).value, password: $('#dP', el).value }); if (!r.success) return U.toast(r.message, 'err'); setelahLogin(r.data); } catch (er) { U.toast(er.message, 'err'); } });
      };
      return;
    }
    try {
      var r = await U.api('auth.config', {});
      if (r.success) { cfg = r.data; localStorage.setItem('sk_authcfg', JSON.stringify(cfg)); }
    } catch (e) { $('#loginInfo', el).textContent = e.message; }
    if (!cfg || !cfg.googleClientId) { $('#gbtn', el).innerHTML = '<div class="callout rev" style="text-align:left">' + ic('warning') + '<div>Login Google belum diaktifkan oleh admin. Admin dapat masuk lewat alamat <b>…/#/darurat</b> lalu mengisi Client ID di Pengaturan → Login & Keamanan.</div></div>'; return; }
    try {
      await U.muatSkrip('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: onGoogle, auto_select: true, cancel_on_tap_outside: false, use_fedcm_for_prompt: true });
      $('#gbtn', el).innerHTML = '';
      google.accounts.id.renderButton($('#gbtn', el), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'id', width: Math.min(320, el.clientWidth - 80) });
      google.accounts.id.prompt();
    } catch (e) { $('#gbtn', el).innerHTML = '<div class="callout bad">' + ic('error') + esc(e.message) + '</div>'; }
  }
  async function onGoogle(resp) {
    var info = $('#loginInfo'); if (info) info.innerHTML = '<span class="skel" style="display:inline-block;width:160px;height:14px"></span> Memverifikasi akun…';
    try {
      var r = await U.api('auth.google', { idToken: resp.credential });
      if (!r.success) { if (info) info.textContent = ''; U.toast(r.message, 'err'); return; }
      setelahLogin(r.data);
    } catch (e) { if (info) info.textContent = ''; U.toast(e.message, 'err'); }
  }
  function setelahLogin(d) {
    S.token = d.token; S.me = d.me; S.foto = d.foto || ''; simpanSesi();
    if (/darurat/.test(location.hash)) history.replaceState(null, '', '#/dashboard');
    var boot = U.Store.get('boot');
    if (boot && boot.d && boot.d.me && boot.d.me.email === S.me.email) { terapkanBoot(boot.d); S.me = d.me; tampilShell(); muatBoot(false); }
    else { $('#login').innerHTML = '<div class="login-card"><div class="skel" style="height:60px"></div><div class="skel" style="height:20px"></div><p>Menyiapkan ruang kerja…</p></div>'; muatBoot(true); }
  }

  // ============================================================ Cangkang
  function tampilShell() {
    $('#login').hidden = true; $('#shell').hidden = false;
    $('#meNama').textContent = S.me.nama; $('#mePeran').textContent = S.me.labelPeran;
    $('#meAv').outerHTML = S.foto ? '<span class="avatar" id="meAv"><img alt="" src="' + esc(S.foto) + '" referrerpolicy="no-referrer"></span>' : U.avatar(S.me.nama).replace('class="avatar', 'id="meAv" class="avatar');
    gambarNav(); gambarSys();
    if (!sudahJalan) { sudahJalan = true; ikatShell(); }
    U.Router.jalan();
  }
  function gambarNav() {
    if (!S.me) return;
    var b = S.badge || {}, role = S.me.role;
    $('#nav').innerHTML = NAV.map(function (n) {
      if (!n) return '<div class="nav-sep"></div>';
      if (n[3].indexOf(role) < 0) return '';
      var c = n[4] ? b[n[4]] || 0 : 0, merah = n[4] === 'disposisi' && b.dispoTelat;
      return '<a href="#/' + n[0] + '" data-r="' + n[0] + '" title="' + esc(n[1]) + '">' + ic(n[2]) + '<span>' + esc(n[1]) + '</span>' + (c ? '<span class="cnt ' + (merah ? 'red' : '') + '">' + c + '</span>' : '') + '</a>';
    }).join('');
    var tengah = role === 'approver' ? ['persetujuan', 'Setujui', 'approval_delegation', 'persetujuan'] : ['surat', 'Surat Saya', 'outbox', 'draf'];
    var kanan = role === 'superadmin' ? ['masuk', 'Masuk', 'move_to_inbox', 'masukBaru'] : ['disposisi', 'Disposisi', 'forward_to_inbox', 'disposisi'];
    var item = function (x) { var c = b[x[3]] || 0; return '<a href="#/' + x[0] + '" data-r="' + x[0] + '">' + ic(x[2]) + x[1] + (c ? '<span class="bdg">' + c + '</span>' : '') + '</a>'; };
    $('#bottomNav').innerHTML = item(['dashboard', 'Beranda', 'dashboard']) + item(tengah) + '<a href="#/buat" data-r="buat" aria-label="Buat surat"><span class="fab">' + ic('add') + '</span></a>' + item(kanan) + '<button id="bnMenu">' + ic('menu') + 'Menu</button>';
    $('#bnMenu').onclick = function () { $('#sidebar').classList.add('open'); scrimSidebar(); };
    var adaNotif = (b.persetujuan || 0) + (b.disposisi || 0) + (b.masukBaru || 0) > 0;
    $('#notifDot').hidden = !adaNotif;
    if (U.Router.aktif) App.tandaiNav(U.Router.aktif.nama);
  }
  function gambarSys() {
    var s = S.sistem || {}, gb = function (x) { return (x / 1e9).toFixed(1); }, persen = s.driveBatas ? Math.min(100, s.driveTerpakai / s.driveBatas * 100) : 0;
    $('#sysBox').innerHTML = '<div class="sys-h">RINGKASAN SISTEM <i title="Sistem aktif"></i></div><span>Nomor terakhir:</span><b class="num">' + esc(s.nomorTerakhir || '—') + '</b>' +
      (s.driveBatas ? '<div class="row"><span>Drive</span><b class="num" style="font-size:12px">' + gb(s.driveTerpakai) + ' GB / ' + gb(s.driveBatas) + ' GB</b></div><div class="bar"><i style="width:' + persen + '%"></i></div>' : '') +
      '<span>Backup: ' + esc(s.backupTerakhir ? U.tgl(s.backupTerakhir) + ' ' + U.jam(s.backupTerakhir) : 'otomatis harian 07.00') + '</span>' + (S.me && S.me.role === 'superadmin' ? '<a href="#/pengaturan/sistem">Status sistem ↗</a>' : '');
  }
  function scrimSidebar() { var sc = document.createElement('div'); sc.className = 'scrim'; sc.style.zIndex = 105; document.body.appendChild(sc); sc.onclick = function () { $('#sidebar').classList.remove('open'); sc.remove(); }; $('#sidebar').addEventListener('click', function f(e) { if (e.target.closest('a')) { $('#sidebar').classList.remove('open'); sc.remove(); $('#sidebar').removeEventListener('click', f); } }); }
  function ikatShell() {
    $('#btnMenu').onclick = function () { $('#sidebar').classList.add('open'); scrimSidebar(); };
    $('#btnTema').onclick = App.gantiTema;
    $('#cari').addEventListener('keydown', function (e) { if (e.key === 'Enter') { var q = this.value.trim(); location.hash = '#/agenda?q=' + encodeURIComponent(q); } });
    window.addEventListener('scroll', function () { $('#topbar').classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
    $('#btnMe').onclick = function () {
      U.menu(this, [{ ic: 'person', label: S.me.email, href: '#/pengaturan/profil' }].concat(S.me.role === 'approver' ? [{ ic: 'password', label: 'PIN Persetujuan', href: '#/pengaturan/pin' }] : []).concat([{ ic: 'contrast', label: 'Tema terang / gelap', fn: App.gantiTema }, { ic: 'logout', label: 'Keluar', fn: function () { App.keluar(); } }]));
    };
    $('#btnNotif').onclick = function () {
      var b = S.badge || {}, it = [];
      if (b.persetujuan) it.push(['approval_delegation', b.persetujuan + ' surat menunggu persetujuan Anda', '#/persetujuan']);
      if (b.disposisi) it.push(['forward_to_inbox', b.disposisi + ' disposisi aktif' + (b.dispoTelat ? ' (' + b.dispoTelat + ' terlambat)' : ''), '#/disposisi']);
      if (b.masukBaru) it.push(['mark_email_unread', b.masukBaru + ' surat masuk baru perlu disposisi', '#/masuk']);
      if (b.draf) it.push(['edit_note', b.draf + ' draf / revisi menunggu Anda', '#/surat']);
      U.menu(this, [], { cls: 'notif-list', html: '<div class="eyebrow" style="padding:8px 10px">Pemberitahuan</div>' + (it.length ? it.map(function (x) { return '<a class="it" href="' + x[2] + '">' + ic(x[0]) + '<span>' + esc(x[1]) + '</span></a>'; }).join('') : '<div class="hint" style="padding:10px">Tidak ada pemberitahuan baru. 🎉</div>') });
      App.segarBadge(true);
    };
    $('#btnBantuan').onclick = function () {
      U.modal({ wide: true, title: 'Bantuan singkat', body: '<div style="display:grid;gap:14px;font-size:14px;line-height:1.6">' +
        '<div><b>Alur surat keluar</b><br>Draf → Diajukan → (Revisi) → Disetujui pejabat dengan PIN → Ditandatangani (PDF + QR + hash) → Dikirim → Diarsipkan. Surat dapat dibatalkan sebelum dikirim; nomornya tidak dipakai ulang.</div>' +
        '<div><b>Nomor surat</b><br>Dibuat otomatis tanpa bentrok saat ' + (S.cfg.NOMOR_SAAT === 'ajukan' ? 'surat diajukan' : 'pejabat menyetujui') + '. Tidak ada yang bisa mengubah nomor secara manual.</div>' +
        '<div><b>Pemisahan tugas</b><br>Pembuat surat tidak dapat menyetujui suratnya sendiri. Superadmin mengelola data, tetapi tidak menyetujui surat.</div>' +
        '<div><b>Klasifikasi keamanan</b><br>Biasa & Terbatas: sesuai peran/pihak terkait. Rahasia: Superadmin, Approver, penerima yang ditunjuk (pemohon tidak dapat mengunduh). Sangat Rahasia: Approver & penerima yang ditunjuk. Setiap akses dokumen rahasia tercatat di Audit Log.</div>' +
        '<div><b>Verifikasi</b><br>Pindai QR pada surat atau buka <a href="verifikasi.html" target="_blank">halaman verifikasi</a>. Pengunjung dapat mengunggah PDF untuk mengecek apakah dokumen telah diubah.</div>' +
        '<div class="hint">Tips: data tampil seketika dari cache perangkat dan diperbarui otomatis di latar. Ketik di kolom pencarian atas lalu tekan Enter untuk mencari di Buku Agenda.</div></div>' });
    };
  }

  document.addEventListener('DOMContentLoaded', App.init);
})();
