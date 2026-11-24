/* Halaman verifikasi publik: cek kode QR ke server (tanpa login) + cocokkan hash PDF di peramban. */
(function () {
  'use strict';
  var GAS = (window.APP_CONFIG || {}).GAS_URL || '', hashResmi = '';
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n) { return '<span class="ms">' + n + '</span>'; }
  async function api(action, data) {
    var r = await fetch(GAS, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: data }) });
    return r.json();
  }
  function tampil(d) {
    var st = d.status, sah = st === 'Sah', batal = st === 'Dibatalkan';
    $('#inst').textContent = d.instansi || '';
    $('#hasil').innerHTML = '<div class="vic ' + (sah ? 'ok' : 'bad') + '">' + ic(sah ? 'verified' : batal ? 'block' : 'help') + '</div>' +
      '<h1 style="color:' + (sah ? 'var(--ok)' : 'var(--bad)') + ';margin-top:10px">' + (sah ? 'Surat Sah' : batal ? 'Surat Dibatalkan' : 'Tidak Ditemukan') + '</h1>' +
      (d.nomor ? '<div class="vtbl" style="margin-top:14px"><div><span>Nomor surat</span><b>' + esc(d.nomor) + '</b></div><div><span>Tanggal</span><b>' + esc(d.tanggal) + '</b></div><div><span>Instansi penerbit</span><b>' + esc(d.instansi) + '</b></div><div><span>Pengesahan</span><b>' + esc(d.pengesahan) + '</b></div>' + (batal ? '<div><span>Dibatalkan</span><b>' + esc(d.dibatalkanPada) + '</b></div>' : '') + '</div>'
        : '<p class="hint">Kode verifikasi tidak dikenal. Dokumen mungkin palsu atau kode salah ketik.</p>');
    hashResmi = d.hash || '';
    $('#boxHash').hidden = !(sah && hashResmi);
    document.title = (sah ? '✓ Surat Sah' : batal ? '✕ Dibatalkan' : 'Tidak ditemukan') + ' — Verifikasi Surat';
  }
  async function cek(kode) {
    $('#hasil').innerHTML = '<div class="vic wait">' + ic('hourglass_top') + '</div><p class="hint">Memeriksa kode…</p>';
    try {
      var r = await api('verif.cek', { kode: kode });
      if (!r.success) throw new Error(r.message);
      tampil(r.data);
    } catch (e) { $('#hasil').innerHTML = '<div class="vic bad">' + ic('wifi_off') + '</div><p>' + esc(e.message || 'Gagal terhubung ke server verifikasi.') + '</p>'; }
  }
  async function sha256(buf) { var h = await crypto.subtle.digest('SHA-256', buf); return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  async function cekBerkas(f) {
    if (!f) return;
    var out = $('#hasilHash'); out.innerHTML = '<p class="hint">Menghitung sidik digital…</p>';
    var h = await sha256(await f.arrayBuffer()), cocok = h === hashResmi;
    out.innerHTML = '<div class="callout ' + (cocok ? 'ok' : 'bad') + '" style="text-align:left">' + ic(cocok ? 'check_circle' : 'gpp_bad') + '<div><b>' + (cocok ? 'Berkas identik dengan arsip resmi.' : 'PERINGATAN: berkas berbeda dari arsip resmi — dokumen mungkin telah diubah.') + '</b><br><span class="hint" style="word-break:break-all">SHA-256: ' + h + '</span></div></div>';
  }
  document.addEventListener('DOMContentLoaded', function () {
    try { var c = JSON.parse(localStorage.getItem('sk_authcfg') || 'null'); if (c && c.institusi) $('#inst').textContent = c.institusi; } catch (e) { }
    var kode = new URLSearchParams(location.search).get('v') || '';
    $('#fKode').onsubmit = function (e) { e.preventDefault(); var k = $('#kode').value.trim(); if (k) { history.replaceState(null, '', '?v=' + encodeURIComponent(k)); cek(k); } };
    var dz = $('#dzHash');
    dz.onclick = function () { var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf'; i.onchange = function () { cekBerkas(i.files[0]); }; i.click(); };
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = function () { dz.classList.remove('over'); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove('over'); cekBerkas(e.dataTransfer.files[0]); };
    if (!GAS || /GANTI|XXXX/.test(GAS)) { $('#hasil').innerHTML = '<p class="hint">Server verifikasi belum dikonfigurasi.</p>'; return; }
    if (kode) cek(kode); else { $('#hasil').innerHTML = '<div class="vic wait">' + ic('qr_code_scanner') + '</div><p>Pindai QR pada surat, atau masukkan kode di bawah.</p>'; }
    $('#fKode').hidden = false;
  });
})();
