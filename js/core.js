/* SuratKilat — inti frontend: API ke GAS (fetch text/plain), dedupe + epoch tulis, penggabung batch,
   cache SWR (memori + localStorage), antrean drain, warmup, pengukur kinerja, router, dan komponen UI. */
(function () {
  'use strict';
  var GAS_URL = (window.APP_CONFIG || {}).GAS_URL || '';
  var S = window.SK = { me: null, cfg: {}, master: null, badge: {}, sistem: {}, token: null, foto: '' };

  // ============================================================ Utilitas
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n, cls) { return '<span class="ms ' + (cls || '') + '" aria-hidden="true">' + n + '</span>'; }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function keDate(v) { if (!v) return null; var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; }
  function tgl(v) { var d = keDate(v); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : '—'; }
  function tglPanjang(v) { var d = keDate(v) || new Date(); return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
  function jam(v) { var m = String(v || '').match(/[ T](\d{2}:\d{2})/); return m ? m[1] + ' WIB' : ''; }
  function hariIni() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function lalu(v) {
    var d = keDate(v); if (!d) return '';
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' mnt lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' hari lalu'; return tgl(v);
  }
  function sisaHari(v) { var d = keDate(v); if (!d) return null; var t = keDate(hariIni()); return Math.round((d - t) / 864e5); }
  function sapa() { var h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
  function inisial(n) { return String(n || '?').replace(/^((prof|dr|ir|drs|dra|hj|h|kh|ust|ustadz)\.?\s+)+/ig, '').split(/[\s,.]+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase() || '?'; }
  var WARNA_AV = ['#2563C9', '#0F766E', '#7C3AED', '#C2410C', '#BE185D', '#0369A1', '#4D7C0F', '#B45309'];
  function avatar(nama, cls) { var h = 0; String(nama).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return '<span class="avatar ' + (cls || '') + '" style="background:' + WARNA_AV[h % WARNA_AV.length] + '" title="' + esc(nama) + '">' + esc(inisial(nama)) + '</span>'; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function byId(list, id, key) { key = key || 'id'; for (var i = 0; i < (list || []).length; i++) if (list[i][key] === id) return list[i]; return null; }

  var STATUS = {
    'Draf': ['b-draft', 'Draf'], 'Diajukan': ['b-wait', 'Menunggu TTD'], 'Revisi': ['b-rev', 'Revisi'], 'Disetujui': ['b-ok', 'Disetujui'],
    'Ditandatangani': ['b-ok', 'Ditandatangani'], 'Dikirim': ['b-sent', 'Terkirim'], 'Diarsipkan': ['b-draft', 'Diarsipkan'], 'Dibatalkan': ['b-bad', 'Dibatalkan'],
    'Baru': ['b-wait', 'Baru'], 'Didisposisikan': ['b-sent', 'Didisposisikan'], 'Selesai Tindak Lanjut': ['b-ok', 'Selesai TL'],
    'Belum': ['b-draft', 'Belum'], 'Sebagian': ['b-wait', 'Sebagian'], 'Selesai': ['b-ok', 'Selesai'], 'Terpakai': ['b-ok', 'Terpakai']
  };
  function badge(st) { var s = STATUS[st] || ['b-draft', st || '—']; return '<span class="badge ' + s[0] + '">' + esc(s[1]) + '</span>'; }
  function klasBadge(k) { k = k || 'Biasa'; return '<span class="badge plain k-' + k.split(' ')[0] + '">' + esc(k) + '</span>'; }

  // ============================================================ Pengukur kinerja (console: Perf.table())
  var Perf = window.Perf = {
    log: [],
    add: function (a, total, server, cached) { this.log.push({ aksi: a, total: Math.round(total), server: server || 0, jaringan: Math.round(total - (server || 0)), cache: cached ? '✓' : '' }); if (this.log.length > 300) this.log.shift(); },
    table: function () { console.table(this.log.slice(-40)); },
    summary: function () { var g = {}; this.log.forEach(function (x) { var r = g[x.aksi] = g[x.aksi] || { n: 0, total: 0, server: 0 }; r.n++; r.total += x.total; r.server += x.server; }); Object.keys(g).forEach(function (k) { g[k].rata = Math.round(g[k].total / g[k].n); g[k].rataServer = Math.round(g[k].server / g[k].n); delete g[k].total; delete g[k].server; }); console.table(g); }
  };

  // ============================================================ Penyimpanan lokal per pengguna
  var Store = {
    k: function (key) { return 'sk:' + (S.me ? S.me.email : 'anon') + ':' + key; },
    get: function (key) { try { return JSON.parse(localStorage.getItem(this.k(key))); } catch (e) { return null; } },
    set: function (key, val) {
      try { localStorage.setItem(this.k(key), JSON.stringify(val)); }
      catch (e) { try { Object.keys(localStorage).filter(function (x) { return x.indexOf('sk:') === 0 && /list|agenda|audit/.test(x); }).forEach(function (x) { localStorage.removeItem(x); }); localStorage.setItem(this.k(key), JSON.stringify(val)); } catch (e2) { } }
    },
    del: function (key) { try { localStorage.removeItem(this.k(key)); } catch (e) { } },
    bersihPengguna: function (email) { try { Object.keys(localStorage).filter(function (x) { return x.indexOf('sk:' + email + ':') === 0; }).forEach(function (x) { localStorage.removeItem(x); }); } catch (e) { } }
  };

  // ============================================================ API
  var READ = /^(batch|boot|dash\.data|badge|sistem\.(ringkas|status)|surat\.(list|get|pratinjau|pdf|versi)|template\.get|masuk\.(list|get|scan)|dispo\.list|eksp\.(list|bukti)|agenda\.list|retensi\.list|audit\.list|registri\.list|pengguna\.list|penomoran\.list|pengaturan\.get|master\.gambar|verif\.cek|auth\.config|ping)$/;
  var inflight = {}, epoch = 0, sedang = 0;
  function indikator(d) { sedang += d; var el = $('#refreshInd'); if (sedang > 0 && !el) { el = document.createElement('div'); el.id = 'refreshInd'; el.className = 'refresh-ind'; document.body.appendChild(el); } if (sedang <= 0 && el) el.remove(); }
  function konfigOk() { return GAS_URL && !/GANTI|XXXX/.test(GAS_URL); }
  async function apiRun(action, data, opts) {
    opts = opts || {};
    if (!konfigOk()) throw new Error('Konfigurasi belum lengkap: isi GAS_URL di js/config.js');
    var t0 = performance.now(), ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, opts.timeout || 90000), res;
    if (!opts.diam) indikator(1);
    try {
      res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: S.token, data: data || {} }), signal: ctrl.signal, redirect: 'follow' });
    } catch (e) { throw new Error(navigator.onLine === false ? 'Anda sedang offline. Periksa koneksi internet.' : 'Tidak dapat terhubung ke server. Coba lagi.'); }
    finally { clearTimeout(to); if (!opts.diam) indikator(-1); }
    var j; try { j = await res.json(); } catch (e) { throw new Error('Server membalas tidak valid. Pastikan URL /exec benar dan akses deployment "Siapa saja".'); }
    Perf.add(action, performance.now() - t0, j.ms, j.cached);
    if (j.code === 'AUTH' && action !== 'auth.logout' && S.token) App.sesiHabis(j.message);
    if (j.nq) jadwalDrain();
    return j;
  }
  function api(action, data, opts) {
    if (!READ.test(action)) { epoch++; return apiRun(action, data, opts); }
    var k = epoch + '|' + action + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    var p = apiRun(action, data, opts);
    inflight[k] = p;
    p.then(function () { delete inflight[k]; }, function () { delete inflight[k]; });
    return p;
  }
  /** Penggabung batch: beberapa aksi baca di tik yang sama → 1 eksekusi GAS. */
  var Batcher = {
    q: null,
    add: function (action, data) { var self = this; return new Promise(function (res, rej) { if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); } self.q.push({ action: action, data: data || {}, res: res, rej: rej }); }); },
    flush: async function () {
      var q = this.q; this.q = null; var unik = [], peta = {};
      q.forEach(function (it) { var k = it.action + '|' + JSON.stringify(it.data); if (!peta[k]) { peta[k] = []; unik.push({ k: k, action: it.action, data: it.data }); } peta[k].push(it); });
      for (var i = 0; i < unik.length; i += 10) {
        var chunk = unik.slice(i, i + 10);
        try {
          if (chunk.length === 1) { var r1 = await api(chunk[0].action, chunk[0].data); peta[chunk[0].k].forEach(function (it) { it.res(r1); }); }
          else {
            var r = await api('batch', { calls: chunk.map(function (c) { return { action: c.action, data: c.data }; }) });
            chunk.forEach(function (c, ix) { var hasil = r.success ? r.data.results[ix] : r; peta[c.k].forEach(function (it) { it.res(hasil); }); });
          }
        } catch (e) { chunk.forEach(function (c) { peta[c.k].forEach(function (it) { it.rej(e); }); }); }
      }
    }
  };
  function apiQ(action, data) { return Batcher.add(action, data); }

  /** Data dengan pola stale-while-revalidate: tampil dari cache dulu, segarkan bila basi. */
  var Data = {
    mem: {},
    key: function (a, d) { return a + ':' + JSON.stringify(d || {}); },
    peek: function (a, d) { var k = this.key(a, d), c = this.mem[k] || Store.get(k); return c ? c.d : null; },
    simpan: function (a, d, nilai) { var k = this.key(a, d), c = { t: Date.now(), d: nilai, h: hash(JSON.stringify(nilai)) }; this.mem[k] = c; Store.set(k, c); },
    ambil: async function (a, d, o) {
      o = o || {};
      var k = this.key(a, d), c = this.mem[k] || Store.get(k);
      if (c) { this.mem[k] = c; if (o.onData && !o._sudah) { o.onData(c.d, true); o._sudah = true; } }
      if (!o.fresh && c && c.t && Date.now() - c.t < (o.maxAge === undefined ? 30000 : o.maxAge)) return c.d;
      var r;
      try { r = await apiQ(a, d); } catch (e) { if (c) { if (!o.diam) toast(e.message, 'err'); return c.d; } throw e; }
      if (!r.success) { if (c) { if (r.code !== 'AUTH') toast(r.message, 'err'); return c.d; } var er = new Error(r.message); er.code = r.code; throw er; }
      var h = hash(JSON.stringify(r.data)), berubah = !c || c.h !== h;
      this.mem[k] = { t: Date.now(), d: r.data, h: h }; Store.set(k, this.mem[k]);
      if (berubah && o.onData) o.onData(r.data, false);
      return r.data;
    },
    /** Tandai basi semua kunci yang diawali salah satu aksi → dibaca ulang saat dibuka. */
    basi: function (aksi) {
      var self = this;
      Object.keys(this.mem).forEach(function (k) { if (aksi.some(function (a) { return k.indexOf(a + ':') === 0; })) self.mem[k].t = 0; });
      try { Object.keys(localStorage).forEach(function (k) { var kk = k.split(':').slice(2).join(':'); if (k.indexOf('sk:') === 0 && aksi.some(function (a) { return kk.indexOf(a + ':') === 0; })) { var v = JSON.parse(localStorage.getItem(k)); if (v) { v.t = 0; localStorage.setItem(k, JSON.stringify(v)); } } }); } catch (e) { }
    }
  };

  // ============================================================ Antrean email (drain) & warmup
  var drainT = null, drainN = 0;
  function jadwalDrain() { clearTimeout(drainT); drainN = 0; drainT = setTimeout(drain, 400); }
  async function drain() { try { var r = await apiRun('drain', {}, { diam: true }); if (r.success && r.data && r.data.left > 0 && ++drainN < 3) drainT = setTimeout(drain, 1500); } catch (e) { } }
  function warmUp(scope) {
    if (!konfigOk()) return;
    try { var k = 'sk_warm_' + scope, t = Number(sessionStorage.getItem(k) || 0); if (Date.now() - t < 240000) return; sessionStorage.setItem(k, String(Date.now())); } catch (e) { }
    fetch(GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(function () { });
  }
  /** Aktivitas pengguna untuk polling adaptif. */
  var Aktivitas = {
    at: Date.now(), last: {},
    init: function () { var s = this;['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) { addEventListener(ev, function () { s.at = Date.now(); }, { passive: true }); }); },
    jatuh: function (key, aktifMs, diamMs) {
      if (document.visibilityState !== 'visible') return false;
      var batas = Date.now() - this.at > 120000 ? diamMs : aktifMs;
      if (Date.now() - (this.last[key] || 0) < batas - 500) return false;
      this.last[key] = Date.now(); return true;
    }
  };

  // ============================================================ Komponen UI
  function toast(msg, tipe, ms) {
    var box = $('#toasts'); if (!box || !msg) return;
    var el = document.createElement('div'); el.className = 'toast ' + (tipe || '');
    el.innerHTML = ic(tipe === 'err' ? 'error' : tipe === 'ok' ? 'check_circle' : 'info') + '<span>' + esc(msg) + '</span>';
    box.appendChild(el); setTimeout(function () { el.remove(); }, ms || (tipe === 'err' ? 6000 : 3200));
  }
  var lapisan = [];
  function tutupAtas() { var l = lapisan.pop(); if (l) l.close(true); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lapisan.length) tutupAtas(); });
  function buatLapisan(el, scrim, onClose) {
    var obj = { el: el, close: function (dariEsc) { el.remove(); if (scrim) scrim.remove(); var i = lapisan.indexOf(obj); if (i >= 0) lapisan.splice(i, 1); if (onClose) onClose(dariEsc); document.body.style.overflow = lapisan.length ? 'hidden' : ''; } };
    lapisan.push(obj); document.body.style.overflow = 'hidden';
    return obj;
  }
  /** Modal: { title, body (html), foot (html), wide, xl, onClose } → { el, close } */
  function modal(o) {
    var m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="scrim"></div><div class="modal-box ' + (o.wide ? 'wide' : '') + (o.xl ? ' xl' : '') + '">' +
      '<button class="icon-btn modal-x" aria-label="Tutup">' + ic('close') + '</button>' + (o.title ? '<h2>' + esc(o.title) + '</h2>' : '') + (o.sub ? '<p class="hint" style="margin:0 0 14px;font-size:14px">' + esc(o.sub) + '</p>' : '') +
      '<div class="modal-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
    document.body.appendChild(m);
    var l = buatLapisan(m, null, o.onClose);
    $('.scrim', m).onclick = function () { if (!o.kunci) l.close(); };
    $('.modal-x', m).onclick = function () { l.close(); };
    var f = $('input:not([type=hidden]),select,textarea,[contenteditable]', $('.modal-b', m)); if (f && !o.tanpaFokus) setTimeout(function () { f.focus(); }, 60);
    return l;
  }
  /** Konfirmasi (opsional dengan isian alasan). Resolve: true / teks isian / false. */
  function konfirmasi(o) {
    return new Promise(function (resolve) {
      var adaInput = !!o.input, selesai = false;
      var m = modal({
        title: o.title, kunci: false, body: '<p style="margin:0 0 12px;color:var(--ink-2)">' + esc(o.msg || '') + '</p>' +
          (adaInput ? '<div class="field"><label>' + esc(o.input.label) + '</label><textarea class="textarea" id="kfIn" placeholder="' + esc(o.input.ph || '') + '"></textarea><span class="hint" id="kfHint"></span></div>' : ''),
        foot: '<button class="btn" data-x>Batal</button><button class="btn ' + (o.danger ? 'danger' : 'pri') + '" data-ok>' + esc(o.okText || 'Ya, lanjutkan') + '</button>',
        onClose: function () { if (!selesai) resolve(false); }
      });
      $('[data-x]', m.el).onclick = function () { m.close(); };
      $('[data-ok]', m.el).onclick = function () {
        var v = true;
        if (adaInput) { v = $('#kfIn', m.el).value.trim(); if (v.length < (o.input.min || 1)) { $('#kfIn', m.el).classList.add('bad'); $('#kfHint', m.el).textContent = 'Wajib diisi minimal ' + (o.input.min || 1) + ' karakter.'; return; } }
        selesai = true; m.close(); resolve(v);
      };
    });
  }
  /** Drawer detail di kanan (layar penuh di HP). */
  function drawer(o) {
    var sc = document.createElement('div'); sc.className = 'scrim';
    var d = document.createElement('aside'); d.className = 'drawer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="drawer-h"><div style="flex:1;min-width:0">' + (o.eyebrow ? '<div class="eyebrow">' + esc(o.eyebrow) + '</div>' : '') + '<h2>' + esc(o.title || '') + '</h2>' + (o.sub || '') + '</div><button class="icon-btn" data-x aria-label="Tutup">' + ic('close') + '</button></div>' +
      '<div class="drawer-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="drawer-f">' + o.foot + '</div>' : '');
    document.body.appendChild(sc); document.body.appendChild(d);
    var l = buatLapisan(d, sc, o.onClose);
    sc.onclick = function () { l.close(); }; $('[data-x]', d).onclick = function () { l.close(); };
    l.isi = function (p) { if (p.title !== undefined) $('.drawer-h h2', d).textContent = p.title; if (p.body !== undefined) $('.drawer-b', d).innerHTML = p.body; var f = $('.drawer-f', d); if (p.foot !== undefined) { if (!f) { f = document.createElement('div'); f.className = 'drawer-f'; d.appendChild(f); } f.innerHTML = p.foot; f.hidden = !p.foot; } };
    return l;
  }
  /** Menu kecil di dekat tombol. items: [{ic, label, fn, href}] */
  function menu(anchor, items, opsi) {
    tutupMenu();
    var m = document.createElement('div'); m.className = 'menu' + (opsi && opsi.cls ? ' ' + opsi.cls : ''); m.id = 'menuAktif';
    m.innerHTML = opsi && opsi.html ? opsi.html : items.map(function (it, i) { return it.href ? '<a href="' + esc(it.href) + '" data-i="' + i + '">' + ic(it.ic || 'chevron_right') + esc(it.label) + '</a>' : '<button data-i="' + i + '">' + ic(it.ic || 'chevron_right') + esc(it.label) + '</button>'; }).join('');
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect(), w = m.offsetWidth;
    m.style.top = (r.bottom + window.scrollY + 6) + 'px'; m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    $$('[data-i]', m).forEach(function (b) { b.onclick = function () { var it = items[+b.dataset.i]; tutupMenu(); if (it.fn) it.fn(); }; });
    setTimeout(function () { document.addEventListener('click', luarMenu); }, 0);
    return m;
  }
  function luarMenu(e) { var m = $('#menuAktif'); if (m && !m.contains(e.target)) tutupMenu(); }
  function tutupMenu() { var m = $('#menuAktif'); if (m) m.remove(); document.removeEventListener('click', luarMenu); }

  /** Pemuat skrip malas (pdf.js, xlsx, jspdf) — hanya saat dibutuhkan. */
  var skrip = {};
  function muatSkrip(url) { if (!skrip[url]) skrip[url] = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = function () { delete skrip[url]; rej(new Error('Gagal memuat pustaka ' + url.split('/').pop())); }; document.head.appendChild(s); }); return skrip[url]; }

  /** Pilih berkas → {nama, mime, b64}. Gambar besar dikompres di peramban (≤2000px, JPEG 0,85). */
  function pilihBerkas(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = o.accept || 'application/pdf,image/*';
      inp.onchange = function () { if (inp.files[0]) bacaBerkas(inp.files[0], o).then(resolve, function (e) { toast(e.message, 'err'); resolve(null); }); else resolve(null); };
      inp.click();
    });
  }
  async function bacaBerkas(file, o) {
    o = o || {};
    var maks = (o.maksMB || Number(S.cfg.MAKS_UNGGAH_MB) || 10) * 1048576;
    if (/^image\//.test(file.type) && file.type !== 'image/png' && file.size > 900000 && !o.asli) file = await kompres(file);
    if (file.size > maks) throw new Error('Ukuran berkas ' + (file.size / 1048576).toFixed(1) + ' MB melebihi batas ' + (maks / 1048576) + ' MB.');
    var b64 = await new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1]); }; fr.onerror = function () { rej(new Error('Berkas tidak bisa dibaca.')); }; fr.readAsDataURL(file); });
    return { nama: file.name, mime: file.type, b64: b64, ukuran: file.size };
  }
  function kompres(file) {
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { res(file); }; img.src = url;
    });
  }
  function b64Blob(b64, mime) { var bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
  function unduhBlob(blob, nama) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

  /** Penampil PDF/gambar: pdf.js (malas) + watermark untuk dokumen rahasia; cadangan iframe. */
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  async function tampilDokumen(d, judul) {
    var blob = b64Blob(d.b64, d.mime || 'application/pdf'), url = URL.createObjectURL(blob);
    var m = modal({ xl: true, tanpaFokus: true, body: '<div class="pdf-h"><b style="font-size:16px">' + esc(judul || d.nama) + '</b>' + (d.watermark ? '<span class="badge plain k-Rahasia">' + esc(d.watermark.split('·')[0]) + '</span>' : '') + (d.draf ? '<span class="badge b-draft">Draf pratinjau</span>' : '') +
      '<span style="flex:1"></span>' + (d.unduh !== false ? '<button class="btn sm line" data-dl>' + ic('download') + 'Unduh</button>' : '') + '<button class="btn sm line" data-pr>' + ic('print') + 'Cetak</button></div><div class="pdfv" id="pdfv"><div class="skel" style="width:70%;height:80%"></div></div>',
      onClose: function () { URL.revokeObjectURL(url); } });
    m.el.querySelector('.modal-b').style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
    var wadah = $('#pdfv', m.el), kanvas = [];
    var dl = $('[data-dl]', m.el); if (dl) dl.onclick = function () { unduhBlob(blob, d.nama || 'dokumen.pdf'); };
    $('[data-pr]', m.el).onclick = function () {
      var w = window.open('', '_blank'); if (!w) { toast('Izinkan pop-up untuk mencetak.', 'err'); return; }
      var isi = kanvas.length ? kanvas.map(function (c) { return '<img src="' + c.toDataURL('image/png') + '" style="width:100%;page-break-after:always">'; }).join('') : (/^image\//.test(d.mime) ? '<img src="' + url + '" style="width:100%">' : '<iframe src="' + url + '" style="width:100%;height:100vh;border:0"></iframe>');
      w.document.write('<html><head><title>' + esc(d.nama || 'Cetak') + '</title><style>body{margin:0}@page{margin:0}</style></head><body>' + isi + '</body></html>'); w.document.close(); setTimeout(function () { w.focus(); w.print(); }, 500);
    };
    if (/^image\//.test(d.mime)) { wadah.innerHTML = '<img alt="Pratinjau" src="' + url + '">' + (d.watermark ? wmHtml(d.watermark) : ''); return; }
    try {
      await muatSkrip(PDFJS);
      var pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = PDFJS.replace('pdf.min.js', 'pdf.worker.min.js');
      var doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise; wadah.innerHTML = '';
      var lebar = Math.min(wadah.clientWidth - 28, 900);
      for (var p = 1; p <= doc.numPages; p++) {
        var page = await doc.getPage(p), vp0 = page.getViewport({ scale: 1 }), skala = lebar / vp0.width * (window.devicePixelRatio || 1), vp = page.getViewport({ scale: skala });
        var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = lebar + 'px'; wadah.appendChild(c); kanvas.push(c);
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if (d.watermark) cap(c, d.watermark);
      }
    } catch (e) { wadah.innerHTML = '<iframe title="Dokumen" src="' + url + '#toolbar=0"></iframe>'; }
  }
  function cap(c, teks) { var g = c.getContext('2d'); g.save(); g.translate(c.width / 2, c.height / 2); g.rotate(-Math.PI / 6); g.font = 'bold ' + Math.round(c.width / 18) + 'px Inter, sans-serif'; g.fillStyle = 'rgba(185,28,28,.16)'; g.textAlign = 'center'; for (var y = -c.height; y < c.height; y += c.width / 5) g.fillText(teks, 0, y); g.restore(); }
  function wmHtml(t) { return '<div style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;color:rgba(185,28,28,.18);font:800 34px Inter;transform:rotate(-30deg)">' + esc(t) + '</div>'; }

  /** Dialog PIN 6 digit (gaya Stitch). onKirim(pin) → Promise<{ok, pesan, kunci}> */
  function dialogPin(o) {
    var m = modal({
      tanpaFokus: true, body: '<div style="text-align:center"><div class="lock-ic">' + ic('lock', 'fill') + '</div><h2>Verifikasi Persetujuan Digital</h2>' +
        '<p style="color:var(--muted);margin:6px 0 0">Masukkan 6-digit PIN Pejabat untuk mengesahkan dan menerbitkan QR Code resmi surat <b style="color:var(--primary-ink)">' + esc(o.nomor || 'ini') + '</b></p>' +
        '<div class="pin-boxes" id="pinBox">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="Digit PIN ' + (i + 1) + '" autocomplete="one-time-code">'; }).join('') + '</div>' +
        '<div class="info-pill" id="pinInfo">' + ic('shield') + 'Maksimal 5 percobaan · PIN tidak pernah disimpan di perangkat</div></div>',
      foot: '<button class="btn lg" data-x>Batal</button><button class="btn pri lg" data-ok>Konfirmasi TTE ' + ic('arrow_forward') + '</button>'
    });
    var box = $('#pinBox', m.el), ins = $$('input', box), ok = $('[data-ok]', m.el);
    $('.modal-f', m.el).classList.add('even');
    function nilai() { return ins.map(function (x) { return x.value; }).join(''); }
    ins.forEach(function (inp, i) {
      inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (nilai().length === 6) kirim(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); ins[i - 1].value = ''; } if (e.key === 'Enter') kirim(); });
      inp.addEventListener('paste', function (e) { var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); t.split('').forEach(function (c, j) { if (ins[j]) ins[j].value = c; }); if (t.length === 6) kirim(); } });
    });
    setTimeout(function () { ins[0].focus(); }, 80);
    $('[data-x]', m.el).onclick = function () { m.close(); };
    ok.onclick = kirim;
    var jalan = false;
    async function kirim() {
      if (jalan) return; var pin = nilai();
      if (pin.length !== 6) { box.classList.add('shake'); setTimeout(function () { box.classList.remove('shake'); }, 400); return; }
      jalan = true; ok.classList.add('busy');
      try {
        var r = await o.onKirim(pin);
        if (r.ok) { m.close(); return; }
        $('#pinInfo', m.el).innerHTML = ic('error') + esc(r.pesan); $('#pinInfo', m.el).style.cssText = 'background:var(--bad-bg);color:var(--bad)';
        ins.forEach(function (x) { x.value = ''; }); box.classList.add('shake'); setTimeout(function () { box.classList.remove('shake'); ins[0].focus(); }, 400);
        if (r.kunci) ok.disabled = true;
      } finally { jalan = false; ok.classList.remove('busy'); }
    }
    return m;
  }

  /** Tombol sibuk saat menunggu janji. */
  async function sibuk(btn, fn) { if (!btn) return fn(); if (btn.classList.contains('busy')) return; btn.classList.add('busy'); btn.disabled = true; try { return await fn(); } finally { btn.classList.remove('busy'); btn.disabled = false; } }

  // ============================================================ Router hash
  var Router = {
    rute: {}, aktif: null,
    add: function (nama, def) { this.rute[nama] = def; },
    parse: function () { var h = (location.hash || '#/dashboard').replace(/^#\/?/, ''); var q = ''; if (h.indexOf('?') >= 0) { q = h.split('?')[1]; h = h.split('?')[0]; } var p = h.split('/'); return { nama: p[0] || 'dashboard', arg: p.slice(1).map(decodeURIComponent), q: new URLSearchParams(q) }; },
    ke: function (hash) { if (location.hash === hash) this.jalan(); else location.hash = hash; },
    jalan: function () {
      if (!S.me) return;
      var r = this.parse(), def = this.rute[r.nama];
      if (!def || (def.roles && def.roles.indexOf(S.me.role) < 0)) { r = { nama: 'dashboard', arg: [], q: new URLSearchParams() }; def = this.rute.dashboard; }
      while (lapisan.length) lapisan.pop().close(true);
      tutupMenu();
      var view = $('#view'), sama = this.aktif && this.aktif.nama === r.nama && this.aktif.halaman;
      this.aktif = { nama: r.nama, arg: r.arg, halaman: sama ? this.aktif.halaman : null };
      App.tandaiNav(r.nama);
      document.title = (def.title || 'SuratKilat') + ' · SuratKilat';
      if (!sama || def.renderUlang) { view.innerHTML = ''; window.scrollTo(0, 0); this.aktif.halaman = true; def.render(view, r.arg, r.q); }
      else if (def.argBerubah) def.argBerubah(view, r.arg, r.q); else def.render(view, r.arg, r.q);
      if (window.innerWidth < 768) $('#sidebar').classList.remove('open');
    }
  };

  // ============================================================ Pembantu tampilan umum
  function judul(o) {
    return '<div class="ph"><div><div class="ph-t">' + (o.eyebrow ? '' : '') + '<h1>' + esc(o.title) + '</h1>' + (o.icon ? '<span class="ph-ic">' + ic(o.icon) + '</span>' : '') + (o.chip || '') + '</div>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div><div class="row" style="display:flex;gap:10px;flex-wrap:wrap">' + (o.aksi || '') + '</div></div>';
  }
  function kosong(teks, ikon) { return '<div class="empty">' + ic(ikon || 'inbox') + '<div>' + esc(teks) + '</div></div>'; }
  function skel(n, h) { var s = ''; for (var i = 0; i < (n || 4); i++) s += '<div class="skel" style="height:' + (h || 56) + 'px;margin-bottom:10px"></div>'; return s; }
  function docIc(r) { var rahasia = /Rahasia/.test(r.klas || ''), cls = rahasia ? 'r' : r.t === 'M' ? 'm' : r.status === 'Draf' ? 'd' : 'k'; return '<span class="doc-ic ' + cls + '">' + ic(rahasia ? 'lock' : r.t === 'M' ? 'move_to_inbox' : 'description') + '</span>'; }
  /** Paginasi klien: kembalikan potongan & html pager. */
  function paginasi(list, hal, per, onKe) {
    var total = list.length, n = Math.max(1, Math.ceil(total / per)); hal = Math.min(Math.max(1, hal), n);
    var potong = list.slice((hal - 1) * per, hal * per), tombol = [];
    var tampil = [1]; for (var i = hal - 1; i <= hal + 1; i++) if (i > 1 && i < n) tampil.push(i); if (n > 1) tampil.push(n);
    var prev = 0; tampil.forEach(function (p) { if (p - prev > 1) tombol.push('<span>…</span>'); tombol.push('<button data-pg="' + p + '" class="' + (p === hal ? 'on' : '') + '">' + p + '</button>'); prev = p; });
    var html = '<div class="pager"><span>Menampilkan <b class="num">' + (total ? (hal - 1) * per + 1 : 0) + '–' + Math.min(hal * per, total) + '</b> dari <b class="num">' + total + '</b></span><div class="pg"><button data-pg="' + (hal - 1) + '" ' + (hal <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + ic('chevron_left') + '</button>' + tombol.join('') + '<button data-pg="' + (hal + 1) + '" ' + (hal >= n ? 'disabled' : '') + ' aria-label="Berikutnya">' + ic('chevron_right') + '</button></div></div>';
    return { list: potong, html: html, ikat: function (root) { $$('[data-pg]', root).forEach(function (b) { b.onclick = function () { onKe(+b.dataset.pg); }; }); } };
  }
  /** Ekspor tabel (mengikuti filter aktif) ke Excel / PDF — pustaka dimuat saat diklik. */
  async function eksporExcel(nama, kolom, baris) {
    await muatSkrip('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    var data = [kolom.map(function (k) { return k.label; })].concat(baris.map(function (r) { return kolom.map(function (k) { return typeof k.val === 'function' ? k.val(r) : r[k.key]; }); }));
    var ws = XLSX.utils.aoa_to_sheet(data); ws['!cols'] = kolom.map(function (k) { return { wch: k.w || 18 }; });
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data'); XLSX.writeFile(wb, nama + '.xlsx');
  }
  async function eksporPdf(nama, judulDok, kolom, baris) {
    await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14); doc.text(judulDok, 40, 40); doc.setFontSize(9); doc.setTextColor(110);
    doc.text((S.cfg.INSTITUSI_NAMA || '') + ' · dicetak ' + tglPanjang() + ' oleh ' + (S.me ? S.me.nama : ''), 40, 56);
    doc.autoTable({ startY: 70, head: [kolom.map(function (k) { return k.label; })], body: baris.map(function (r) { return kolom.map(function (k) { var v = typeof k.val === 'function' ? k.val(r) : r[k.key]; return v === undefined || v === null ? '' : String(v); }); }), styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [29, 91, 191] } });
    doc.save(nama + '.pdf');
  }

  window.SKU = {
    $: $, $$: $$, esc: esc, ic: ic, tgl: tgl, tglPanjang: tglPanjang, jam: jam, hariIni: hariIni, lalu: lalu, sisaHari: sisaHari, sapa: sapa, avatar: avatar, inisial: inisial,
    debounce: debounce, byId: byId, badge: badge, klasBadge: klasBadge, BULAN: BULAN, BLN: BLN, HARI: HARI, keDate: keDate, hash: hash,
    api: api, apiQ: apiQ, apiRun: apiRun, Data: Data, Store: Store, warmUp: warmUp, Aktivitas: Aktivitas, konfigOk: konfigOk, GAS_URL: GAS_URL,
    toast: toast, modal: modal, konfirmasi: konfirmasi, drawer: drawer, menu: menu, tutupMenu: tutupMenu, muatSkrip: muatSkrip, pilihBerkas: pilihBerkas, bacaBerkas: bacaBerkas,
    b64Blob: b64Blob, unduhBlob: unduhBlob, tampilDokumen: tampilDokumen, dialogPin: dialogPin, sibuk: sibuk, Router: Router, judul: judul, kosong: kosong, skel: skel, docIc: docIc,
    paginasi: paginasi, eksporExcel: eksporExcel, eksporPdf: eksporPdf, tutupLapisan: function () { while (lapisan.length) lapisan.pop().close(true); }
  };
})();
