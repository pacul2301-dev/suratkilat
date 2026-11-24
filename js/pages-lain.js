/* Halaman: Surat Masuk, Disposisi, Distribusi & Ekspedisi, Buku Agenda & Arsip, Retensi, Master Data, Audit Log, Pengaturan. */
(function () {
  'use strict';
  var U = window.SKU, S = window.SK, esc = U.esc, ic = U.ic, $ = U.$, $$ = U.$$, R = U.Router;
  function M() { return S.master || { unit: [], pejabat: [], klasifikasi: [], jenis: [], template: [], pengguna: [], kop: [] }; }
  function namaJenis(id) { var j = U.byId(M().jenis, id); return j ? j.nama : id || '—'; }
  function namaUnit(id) { var u = U.byId(M().unit, id); return u ? u.nama : id || '—'; }
  function namaUser(e) { var u = U.byId(M().pengguna, e, 'email'); return u ? u.nama : e; }
  function tahunOpsi(sel) { var y = new Date().getFullYear(), s = ''; for (var i = y; i >= y - 5; i--) s += '<option' + (String(i) === String(sel) ? ' selected' : '') + '>' + i + '</option>'; return s; }
  function gagal(el, e, fn) { el.innerHTML = '<div class="callout bad">' + ic('error') + '<div>' + esc(e.message) + ' <button class="btn sm" data-ulang>Coba lagi</button></div></div>'; $('[data-ulang]', el).onclick = fn; }
  function segarSetelah(aksi) { U.Data.basi(aksi); App.segarBadge(); }
  function seg(id, opsi, nilai) { return '<div class="seg" id="' + id + '">' + opsi.map(function (o) { return '<button type="button" data-v="' + esc(o) + '" class="' + (o === nilai ? 'on' : '') + '">' + esc(o) + '</button>'; }).join('') + '</div>'; }
  function ikatSeg(root, id) { $$('#' + id + ' button', root).forEach(function (b) { b.onclick = function () { $$('#' + id + ' button', root).forEach(function (x) { x.classList.toggle('on', x === b); }); }; }); return function () { var on = $('#' + id + ' .on', root); return on ? on.dataset.v : ''; }; }
  function dropzone(root, id, onBerkas, teks) {
    var dz = $('#' + id, root), berkas = null;
    var set = function (b) { berkas = b; if (b) { dz.innerHTML = ic(/pdf/.test(b.mime) ? 'picture_as_pdf' : 'image') + '<b>' + esc(b.nama) + '</b><div class="hint">' + (b.ukuran / 1048576).toFixed(2) + ' MB · klik untuk mengganti</div>'; } onBerkas && onBerkas(b); };
    dz.innerHTML = ic('cloud_upload') + '<b>' + esc(teks || 'Seret berkas ke sini atau klik untuk memilih') + '</b><div class="hint">PDF / JPG / PNG · maks ' + (S.cfg.MAKS_UNGGAH_MB || 10) + ' MB · foto besar dikompres otomatis</div>';
    dz.onclick = function () { U.pilihBerkas().then(function (b) { if (b) set(b); }); };
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = function () { dz.classList.remove('over'); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove('over'); var f = e.dataTransfer.files[0]; if (f) U.bacaBerkas(f).then(set, function (er) { U.toast(er.message, 'err'); }); };
    return function () { return berkas; };
  }

  // ============================================================ Surat Masuk
  var tabMasuk = 'semua';
  R.add('masuk', {
    title: 'Surat Masuk', roles: ['superadmin', 'approver'],
    render: function (view, arg, q) {
      var sa = S.me.role === 'superadmin', th = q.get('tahun') || new Date().getFullYear();
      view.innerHTML = U.judul({ title: 'Surat Masuk', icon: 'move_to_inbox', sub: 'Pencatatan surat masuk, scan arsip, dan disposisi pimpinan.', aksi: sa ? '<button class="btn pri" id="bCatat">' + ic('add') + 'Catat Surat Masuk</button>' : '' }) +
        '<div class="stat-cards" id="statMasuk"></div><div class="toolbar"><div class="tabs" id="tabMasuk"></div><span class="grow"></span><span class="pill-sel"><label>Tahun</label><select id="thMasuk">' + tahunOpsi(th) + '</select></span><label class="pill-search">' + ic('search') + '<input id="cariMasuk" placeholder="Cari agenda, asal, perihal…"></label></div><div id="listMasuk">' + U.skel(5) + '</div>';
      if (sa) $('#bCatat', view).onclick = function () { formMasuk(); };
      $('#thMasuk', view).onchange = function () { location.hash = '#/masuk?tahun=' + this.value; };
      var data = [], hal = 1;
      function gambar() {
        var f = ($('#cariMasuk', view).value || '').toLowerCase(), g = { semua: data, Baru: [], Didisposisikan: [], 'Selesai Tindak Lanjut': [], Diarsipkan: [] };
        data.forEach(function (r) { (g[r.status] = g[r.status] || []).push(r); });
        var telat = data.reduce(function (a, r) { return a + (r.terlambat || 0); }, 0);
        $('#statMasuk', view).innerHTML = [['Surat Baru', g.Baru.length, 'Perlu disposisi', 'mark_email_unread'], ['Didisposisikan', g.Didisposisikan.length, 'Sedang ditindaklanjuti', 'forward_to_inbox'], ['Selesai TL', g['Selesai Tindak Lanjut'].length, 'Tindak lanjut tuntas', 'task_alt'], ['Disposisi Terlambat', telat, 'Lewat batas waktu', 'alarm']].map(function (s, i) { return '<div class="stat"><div><div class="eyebrow">' + s[0] + '</div><div class="v num" style="' + (i === 3 && s[1] ? 'color:var(--red)' : '') + '">' + s[1] + '<small>' + s[2] + '</small></div></div><span class="ic">' + ic(s[3]) + '</span></div>'; }).join('');
        $('#tabMasuk', view).innerHTML = [['semua', 'Semua'], ['Baru', 'Baru'], ['Didisposisikan', 'Didisposisikan'], ['Selesai Tindak Lanjut', 'Selesai'], ['Diarsipkan', 'Diarsipkan']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tabMasuk === t[0] ? 'on' : '') + '">' + t[1] + ' (' + (g[t[0]] || []).length + ')</button>'; }).join('');
        $$('#tabMasuk button', view).forEach(function (b) { b.onclick = function () { tabMasuk = b.dataset.t; hal = 1; gambar(); }; });
        var list = (g[tabMasuk] || []).filter(function (r) { return !f || (r.nomor + ' ' + r.asal + ' ' + r.perihal + ' ' + r.nomorAsal).toLowerCase().indexOf(f) >= 0; });
        var pg = U.paginasi(list, hal, 15, function (h) { hal = h; gambar(); });
        $('#listMasuk', view).innerHTML = '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>No. agenda & perihal</th><th>Asal instansi</th><th>Diterima</th><th>Disposisi</th><th>Status</th><th>Keamanan</th></tr></thead><tbody>' +
          (pg.list.length ? pg.list.map(function (r) { return '<tr data-id="' + esc(r.id) + '"><td class="c-main"><div class="doc">' + U.docIc(r) + '<div><div class="no">' + esc(r.nomor) + (r.nomorAsal ? ' · <span style="color:var(--muted)">' + esc(r.nomorAsal) + '</span>' : '') + '</div><div class="ttl">' + esc(r.perihal) + '</div></div></div></td><td data-l="Asal"><div class="person">' + ic('account_balance') + esc(r.asal) + '</div></td><td data-l="Diterima" class="when">' + U.tgl(r.tanggal) + '</td><td data-l="Disposisi">' + (r.jmlDispo ? r.dispoAktif + ' aktif / ' + r.jmlDispo + (r.terlambat ? ' <span class="deadline late">' + r.terlambat + ' telat</span>' : '') : '<span class="hint">—</span>') + '</td><td data-l="Status">' + U.badge(r.status) + '</td><td data-l="Keamanan">' + U.klasBadge(r.klas) + '</td></tr>'; }).join('') : '<tr><td colspan="6">' + U.kosong('Belum ada surat masuk.', 'inbox') + '</td></tr>') + '</tbody></table></div>' + pg.html + '</div>';
        pg.ikat(view);
        $$('tr[data-id]', view).forEach(function (tr) { tr.onclick = function () { location.hash = '#/masuk/' + tr.dataset.id; }; });
      }
      $('#cariMasuk', view).oninput = U.debounce(function () { hal = 1; gambar(); }, 120);
      U.Data.ambil('masuk.list', { tahun: String(th) }, { maxAge: 20000, onData: function (d) { data = d; gambar(); } }).catch(function (e) { gagal($('#listMasuk', view), e, function () { R.jalan(); }); });
      if (arg[0]) bukaMasuk(arg[0]);
    },
    argBerubah: function (view, arg) { if (arg[0]) bukaMasuk(arg[0]); }
  });

  function formMasuk(lama) {
    var m = M(), d = lama || {};
    var mm = U.modal({
      wide: true, title: lama ? 'Ubah Data Surat Masuk' : 'Catat Surat Masuk', sub: 'Nomor agenda dibuat otomatis. Scan disimpan di Google Drive sesuai klasifikasi keamanan.',
      body: '<form class="grid2" id="fm" novalidate><div class="field"><label>Tanggal diterima <span class="req">*</span></label><input class="input" type="date" id="mTerima" value="' + esc(d.tanggal || U.hariIni()) + '"></div>' +
        '<div class="field"><label>Tanggal surat</label><input class="input" type="date" id="mTglSurat" value="' + esc(d.tanggalSurat || '') + '"></div>' +
        '<div class="field"><label>Asal instansi / pengirim <span class="req">*</span></label><input class="input" id="mAsal" value="' + esc(d.asal || '') + '" placeholder="Kementerian / Lembaga / Perusahaan"></div>' +
        '<div class="field"><label>Nomor surat asal</label><input class="input" id="mNo" value="' + esc(d.nomorAsal || '') + '" placeholder="B/123/LL4/2026"></div>' +
        '<div class="field" style="grid-column:1/-1"><label>Perihal <span class="req">*</span></label><input class="input" id="mPerihal" value="' + esc(d.perihal || '') + '"></div>' +
        '<div class="field"><label>Kode klasifikasi arsip <span class="req">*</span></label><select class="select" id="mKode">' + m.klasifikasi.map(function (k) { return '<option value="' + esc(k.kode) + '"' + (k.kode === d.kodeKlas ? ' selected' : '') + '>' + esc(k.kode + ' — ' + k.uraian + ' (' + k.retensi + ' th)') + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Klasifikasi keamanan</label>' + seg('mKlas', ['Biasa', 'Terbatas', 'Rahasia', 'Sangat Rahasia'], d.klas || 'Biasa') + '</div>' +
        '<div class="field" style="grid-column:1/-1"><label>Scan surat ' + (lama ? '(opsional — ganti scan)' : '<span class="req">*</span>') + '</label><div class="dropzone" id="mScan"></div></div></form>',
      foot: '<button class="btn" data-x>Batal</button><button class="btn pri" data-ok>' + ic('save') + 'Simpan & Beri Nomor Agenda</button>'
    });
    var el = mm.el, ambilKlas = ikatSeg(el, 'mKlas'), ambilBerkas = dropzone(el, 'mScan');
    $('[data-x]', el).onclick = function () { mm.close(); };
    $('[data-ok]', el).onclick = function () {
      var btn = this, v = function (id) { return $('#' + id, el).value.trim(); };
      var p = { id: d.id || '', tanggalTerima: v('mTerima'), tanggalSurat: v('mTglSurat'), asal: v('mAsal'), nomorAsal: v('mNo'), perihal: v('mPerihal'), kodeKlasifikasi: v('mKode'), klasifikasi: ambilKlas(), berkas: ambilBerkas() };
      if (!p.asal || !p.perihal) return U.toast('Asal instansi dan perihal wajib diisi.', 'err');
      if (!lama && !p.berkas) return U.toast('Unggah scan surat.', 'err');
      U.sibuk(btn, async function () {
        var r = await U.api('masuk.simpan', p, { timeout: 120000 });
        if (!r.success) return U.toast(r.message, 'err');
        U.toast(r.message || 'Tersimpan.', 'ok'); mm.close(); segarSetelah(['masuk.list', 'masuk.get', 'agenda.list', 'dash.data']); R.jalan();
      });
    };
  }

  async function bukaMasuk(id) {
    var dw = U.drawer({ eyebrow: 'Detail surat masuk', title: 'Memuat…', body: U.skel(4, 70), onClose: function () { if (/^#\/masuk\//.test(location.hash)) history.replaceState(null, '', '#/masuk'); } });
    try { gambarMasuk(dw, await U.Data.ambil('masuk.get', { id: id }, { maxAge: 0 })); }
    catch (e) { dw.isi({ title: 'Tidak dapat dibuka', body: '<div class="callout bad">' + ic('error') + esc(e.message) + '</div>' }); }
  }
  function gambarMasuk(dw, m) {
    var sa = S.me.role === 'superadmin', now = U.hariIni();
    var body = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + U.badge(m.status) + U.klasBadge(m.klas) + '</div>' +
      (m.akses.tertutup ? '<div class="callout bad">' + ic('lock') + '<div>Dokumen <b>' + esc(m.klas) + '</b>: isi tidak dapat ditampilkan untuk peran Anda.</div></div>' : '') +
      '<dl class="kv"><dt>Perihal</dt><dd>' + esc(m.perihal) + '</dd><dt>Asal instansi</dt><dd>' + esc(m.asal) + '</dd><dt>No. surat asal</dt><dd>' + esc(m.nomorAsal || '—') + '</dd>' +
      '<dt>Tanggal surat</dt><dd>' + U.tgl(m.tanggalSurat) + '</dd><dt>Diterima</dt><dd>' + U.tgl(m.tanggal) + '</dd><dt>Klasifikasi arsip</dt><dd>' + esc(m.kodeKlas) + ' · retensi s.d. ' + U.tgl(m.retensi) + '</dd><dt>Dicatat oleh</dt><dd>' + esc(namaUser(m.input)) + '</dd></dl>' +
      '<div><div class="eyebrow" style="margin-bottom:10px">Disposisi (' + m.disposisi.length + ')</div>' + (m.disposisi.length ? '<div style="display:grid;gap:10px">' + m.disposisi.map(function (x) {
        var sisa = U.sisaHari(x.batas), cls = x.status !== 'Selesai' && sisa !== null ? (sisa < 0 ? 'late' : sisa <= 2 ? 'soon' : '') : '';
        return '<div class="dispo-card"><div class="head">' + U.avatar(x.kepadaNama) + '<div style="flex:1;min-width:0"><b>' + esc(x.kepadaNama) + '</b><div class="hint">dari ' + esc(x.dariNama) + ' · ' + U.lalu(x.dibuat) + '</div></div>' + U.badge(x.status) + '</div><div>' + esc(x.instruksi) + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (x.batas ? '<span class="deadline ' + cls + '">' + ic('event') + ' Batas ' + U.tgl(x.batas) + (cls === 'late' ? ' · terlambat' : '') + '</span>' : '') + (x.catatan ? '<span class="hint">Catatan: ' + esc(x.catatan) + '</span>' : '') + '</div></div>';
      }).join('') + '</div>' : '<div class="hint">Belum ada disposisi.</div>') + '</div>' +
      (m.bolehDisposisi ? '<div class="panel" style="margin:0"><div class="panel-in" id="formDispo"><div class="panel-h"><h3>Beri Disposisi</h3></div>' +
        '<div class="field"><label>Kepada (bisa lebih dari satu) <span class="req">*</span></label><label class="pill-search" style="min-width:0">' + ic('search') + '<input id="cariPenerima" placeholder="Cari nama / email…"></label><div class="user-pick" id="pickPenerima">' +
        M().pengguna.filter(function (u) { return u.status === 'Aktif' && u.email !== S.me.email; }).map(function (u) { return '<label class="check" data-cari="' + esc((u.nama + ' ' + u.email + ' ' + namaUnit(u.unit)).toLowerCase()) + '"><input type="checkbox" value="' + esc(u.email) + '">' + U.avatar(u.nama) + '<span><b>' + esc(u.nama) + '</b><br><span class="hint">' + esc(namaUnit(u.unit)) + ' · ' + esc(u.peran) + '</span></span></label>'; }).join('') + '</div></div>' +
        '<div class="field"><label>Instruksi <span class="req">*</span></label><div class="quick-instr">' + ['Tindak lanjuti', 'Hadiri & laporkan', 'Pelajari & beri saran', 'Koordinasikan', 'Siapkan jawaban', 'Arsipkan', 'Untuk diketahui'].map(function (t) { return '<button type="button">' + t + '</button>'; }).join('') + '</div><textarea class="textarea" id="dInstruksi" placeholder="Instruksi untuk penerima…"></textarea></div>' +
        '<div class="field"><label>Batas waktu</label><input class="input" type="date" id="dBatas" min="' + now + '"></div><button class="btn pri" id="bDispo" style="justify-self:end">' + ic('send') + 'Kirim Disposisi</button></div></div>' : '');
    var foot = (m.akses.isi && m.adaScan ? '<button class="btn line" data-a="scan">' + ic('document_scanner') + 'Lihat Scan</button>' : '') + (sa && m.akses.lihat ? '<button class="btn line" data-a="ubah">' + ic('edit') + 'Ubah</button>' : '') + (sa && m.status !== 'Diarsipkan' ? '<button class="btn" data-a="arsip">' + ic('inventory_2') + 'Arsipkan</button>' : '');
    dw.isi({ title: m.nomor, body: body, foot: foot });
    var el = dw.el;
    $$('[data-a]', el).forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.a === 'scan') U.sibuk(b, async function () { var r = await U.api('masuk.scan', { id: m.id }); if (!r.success) return U.toast(r.message, 'err'); U.tampilDokumen(r.data, m.nomor + ' — scan'); });
        if (b.dataset.a === 'ubah') { dw.close(true); formMasuk(m); }
        if (b.dataset.a === 'arsip') U.sibuk(b, async function () { var r = await U.api('masuk.arsipkan', { ids: [m.id] }); if (!r.success) return U.toast(r.message, 'err'); U.toast(r.message, 'ok'); dw.close(true); segarSetelah(['masuk.list', 'masuk.get', 'agenda.list']); R.jalan(); });
      };
    });
    if (m.bolehDisposisi) {
      var fd = $('#formDispo', el);
      $('#cariPenerima', fd).oninput = function () { var f = this.value.toLowerCase(); $$('[data-cari]', fd).forEach(function (l) { l.hidden = f && l.dataset.cari.indexOf(f) < 0; }); };
      $$('.quick-instr button', fd).forEach(function (b) { b.onclick = function () { var t = $('#dInstruksi', fd); t.value = (t.value ? t.value.trim() + ' ' : '') + b.textContent + '.'; t.focus(); }; });
      $('#bDispo', fd).onclick = function () {
        var btn = this, kepada = $$('#pickPenerima input:checked', fd).map(function (i) { return i.value; }), ins = $('#dInstruksi', fd).value.trim();
        if (!kepada.length) return U.toast('Pilih penerima disposisi.', 'err'); if (ins.length < 3) return U.toast('Tulis instruksi disposisi.', 'err');
        U.sibuk(btn, async function () { var r = await U.api('dispo.beri', { idMasuk: m.id, kepada: kepada, instruksi: ins, batas: $('#dBatas', fd).value }); if (!r.success) return U.toast(r.message, 'err'); U.toast(r.message, 'ok'); segarSetelah(['masuk.list', 'masuk.get', 'dispo.list', 'dash.data']); U.Data.simpan('masuk.get', { id: m.id }, r.data); gambarMasuk(dw, r.data); });
      };
    }
  }
  window.SKMasuk = { buka: bukaMasuk };

  // ============================================================ Disposisi
  var tabDispo = 'saya';
  R.add('disposisi', {
    title: 'Disposisi',
    render: function (view) {
      var ap = S.me.role !== 'pemohon';
      var tabs = [['saya', 'Untuk Saya']].concat(S.me.role === 'approver' ? [['dari', 'Saya Berikan']] : []).concat(ap ? [['semua', 'Semua (monitoring)']] : []);
      if (!tabs.some(function (t) { return t[0] === tabDispo; })) tabDispo = 'saya';
      view.innerHTML = U.judul({ title: 'Disposisi & Tindak Lanjut', icon: 'forward_to_inbox', sub: 'Instruksi pimpinan atas surat masuk beserta batas waktu dan status tindak lanjut.' }) +
        '<div class="toolbar"><div class="tabs" id="tabDispo">' + tabs.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (t[0] === tabDispo ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><span class="grow"></span><span class="pill-sel"><label>Status</label><select id="stDispo"><option value="">Semua</option><option>Belum</option><option>Sebagian</option><option>Selesai</option><option value="telat">Terlambat</option></select></span></div><div id="listDispo">' + U.skel(3, 150) + '</div>';
      $$('#tabDispo button', view).forEach(function (b) { b.onclick = function () { tabDispo = b.dataset.t; R.jalan(); }; });
      var data = [];
      function gambar() {
        var st = $('#stDispo', view).value, now = U.hariIni();
        var list = data.filter(function (x) { return !st || (st === 'telat' ? x.status !== 'Selesai' && x.batas && x.batas < now : x.status === st); });
        $('#listDispo', view).innerHTML = list.length ? '<div class="cards-grid">' + list.map(function (x) {
          var sisa = U.sisaHari(x.batas), cls = x.status !== 'Selesai' && sisa !== null ? (sisa < 0 ? 'late' : sisa <= 2 ? 'soon' : '') : '';
          return '<div class="dispo-card" data-id="' + esc(x.id) + '"><div class="head"><span class="no" style="color:var(--primary-ink);font-weight:700">' + esc(x.nomorAgenda) + '</span>' + U.klasBadge(x.klas) + '<span style="flex:1"></span>' + U.badge(x.status) + '</div>' +
            '<b style="font-size:15px">' + esc(x.perihal) + '</b><div class="hint">' + ic('account_balance') + ' ' + esc(x.asal) + '</div>' +
            '<div style="background:var(--subtle);border-radius:12px;padding:10px 12px"><div class="hint">' + esc(x.dariNama) + ' → ' + esc(x.kepadaNama) + '</div><div style="margin-top:4px">' + esc(x.instruksi) + '</div></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (x.batas ? '<span class="deadline ' + cls + '">' + ic('event') + ' ' + (cls === 'late' ? 'Terlambat ' + (-sisa) + ' hari' : sisa === 0 ? 'Batas hari ini' : 'Batas ' + U.tgl(x.batas)) + '</span>' : '<span class="deadline">Tanpa batas waktu</span>') + (x.catatan ? '<span class="hint">“' + esc(x.catatan) + '”</span>' : '') + '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm line" data-lihat>' + ic('visibility') + 'Lihat surat</button>' + (tabDispo === 'saya' && x.status !== 'Selesai' ? '<button class="btn sm" data-tl="Sebagian">' + ic('hourglass_top') + 'Sebagian</button><button class="btn sm ok" data-tl="Selesai">' + ic('task_alt') + 'Selesai</button>' : '') + '</div></div>';
        }).join('') + '</div>' : U.kosong(tabDispo === 'saya' ? 'Tidak ada disposisi untuk Anda.' : 'Belum ada disposisi.', 'inbox');
        $$('.dispo-card', view).forEach(function (c) {
          var x = U.byId(data, c.dataset.id);
          $('[data-lihat]', c).onclick = function () { bukaMasuk(x.idMasuk); };
          $$('[data-tl]', c).forEach(function (b) {
            b.onclick = async function () {
              var cat = await U.konfirmasi({ title: 'Tindak lanjut: ' + b.dataset.tl, msg: 'Laporkan apa yang sudah dikerjakan. Pemberi disposisi akan menerima notifikasi bila selesai.', okText: 'Simpan', input: { label: 'Catatan tindak lanjut', min: 3 } });
              if (!cat) return;
              U.sibuk(b, async function () {
                var r = await U.api('dispo.update', { id: x.id, status: b.dataset.tl, catatan: cat });
                if (!r.success) return U.toast(r.message, 'err');
                Object.assign(x, r.data); U.Data.simpan('dispo.list', { lingkup: tabDispo }, data); gambar(); U.toast(r.message, 'ok'); segarSetelah(['dash.data', 'masuk.get', 'masuk.list']);
              });
            };
          });
        });
      }
      $('#stDispo', view).onchange = gambar;
      U.Data.ambil('dispo.list', { lingkup: tabDispo }, { maxAge: 15000, onData: function (d) { data = d; gambar(); } }).catch(function (e) { gagal($('#listDispo', view), e, function () { R.jalan(); }); });
    }
  });

  // ============================================================ Distribusi & Ekspedisi
  R.add('distribusi', {
    title: 'Distribusi & Ekspedisi', roles: ['superadmin', 'approver'],
    render: function (view, arg, q) {
      var sa = S.me.role === 'superadmin';
      view.innerHTML = U.judul({ title: 'Distribusi & Ekspedisi', icon: 'local_shipping', sub: 'Kirim surat bertanda tangan lewat email atau catat pengiriman fisik beserta bukti terima.' }) +
        '<div class="sec-h" style="margin-top:0"><div><div class="eyebrow">Siap dikirim</div><h2>Surat Ditandatangani</h2></div></div><div id="siap">' + U.skel(3) + '</div>' +
        '<div class="sec-h"><div><div class="eyebrow">Buku ekspedisi</div><h2>Riwayat Pengiriman</h2></div><button class="btn sm line" id="xlsEksp">' + ic('table_view') + 'Unduh Excel</button></div><div id="eksp">' + U.skel(3) + '</div>';
      var data = null;
      function gambar(d) {
        data = d;
        var siap = d.siap.filter(function (s) { return s.status === 'Ditandatangani'; });
        $('#siap', view).innerHTML = '<div class="tbl-wrap cards"><table class="tbl"><thead><tr><th>Nomor & perihal</th><th>Tujuan</th><th>Keamanan</th><th></th></tr></thead><tbody>' + (siap.length ? siap.map(function (s) {
          return '<tr data-id="' + esc(s.id) + '"><td class="c-main"><div class="doc">' + U.docIc({ t: 'K', klas: s.klas }) + '<div><div class="no">' + esc(s.nomor) + '</div><div class="ttl">' + esc(s.perihal) + '</div></div></div></td><td data-l="Tujuan">' + esc(s.tujuan) + '</td><td data-l="Keamanan">' + U.klasBadge(s.klas) + '</td><td class="acts">' + (sa ? '<button class="btn sm pri" data-email>' + ic('mail') + 'Email</button> <button class="btn sm" data-catat>' + ic('local_shipping') + 'Catat</button>' : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="4">' + U.kosong('Semua surat bertanda tangan sudah dikirim.', 'outbox') + '</td></tr>') + '</tbody></table></div>';
        $('#eksp', view).innerHTML = '<div class="tbl-wrap cards"><table class="tbl"><thead><tr><th>Surat</th><th>Tanggal</th><th>Cara</th><th>Penerima</th><th>Bukti</th></tr></thead><tbody>' + (d.ekspedisi.length ? d.ekspedisi.map(function (x) {
          return '<tr data-surat="' + esc(x.idSurat) + '"><td class="c-main"><div class="doc">' + U.docIc({ t: 'K', klas: x.klas }) + '<div><div class="no">' + esc(x.nomor) + '</div><div class="ttl">' + esc(x.perihal) + '</div></div></div></td><td data-l="Tanggal" class="when">' + U.tgl(x.tanggal) + '</td><td data-l="Cara">' + esc(x.cara) + '</td><td data-l="Penerima">' + esc(x.penerima) + '<div class="hint">oleh ' + esc(x.oleh) + '</div></td><td data-l="Bukti">' + (x.adaBukti ? '<button class="btn sm line" data-bukti="' + esc(x.id) + '">' + ic('receipt_long') + 'Lihat</button>' : '<span class="hint">—</span>') + '</td></tr>';
        }).join('') : '<tr><td colspan="5">' + U.kosong('Belum ada catatan pengiriman.', 'local_shipping') + '</td></tr>') + '</tbody></table></div>';
        $$('#siap tr[data-id]', view).forEach(function (tr) {
          var s = U.byId(d.siap, tr.dataset.id);
          tr.onclick = function (e) { if (e.target.closest('button')) return; SKSurat.bukaDetail(s.id, { tanpaHash: true }); };
          var be = $('[data-email]', tr), bc = $('[data-catat]', tr);
          if (be) be.onclick = function () { kirimEmail(s); }; if (bc) bc.onclick = function () { catatKirim(s); };
        });
        $$('[data-bukti]', view).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); U.sibuk(b, async function () { var r = await U.api('eksp.bukti', { id: b.dataset.bukti }); if (!r.success) return U.toast(r.message, 'err'); U.tampilDokumen(r.data, 'Bukti terima'); }); }; });
        $$('#eksp tr[data-surat]', view).forEach(function (tr) { tr.onclick = function (e) { if (!e.target.closest('button')) SKSurat.bukaDetail(tr.dataset.surat, { tanpaHash: true }); }; });
        var pre = q.get('surat'); if (pre && sa) { var s0 = U.byId(d.siap, pre); if (s0) { history.replaceState(null, '', '#/distribusi'); kirimEmail(s0); } }
      }
      $('#xlsEksp', view).onclick = function () { var b = this; if (data) U.sibuk(b, function () { return U.eksporExcel('Buku-Ekspedisi', [{ label: 'Nomor', key: 'nomor', w: 26 }, { label: 'Perihal', key: 'perihal', w: 40 }, { label: 'Tanggal', key: 'tanggal' }, { label: 'Cara', key: 'cara' }, { label: 'Penerima', key: 'penerima', w: 30 }, { label: 'Dicatat oleh', key: 'oleh' }], data.ekspedisi); }); };
      U.Data.ambil('eksp.list', {}, { maxAge: 20000, onData: gambar }).catch(function (e) { gagal($('#siap', view), e, function () { R.jalan(); }); });
    }
  });
  function kirimEmail(s) {
    var lampiran = s.klas === 'Biasa' || s.klas === 'Terbatas';
    var m = U.modal({ title: 'Kirim lewat email', sub: s.nomor + ' — ' + s.perihal, body: '<div style="display:grid;gap:14px"><div class="field"><label>Email penerima <span class="req">*</span></label><input class="input" id="eKe" placeholder="biro@mitra.go.id, sekretariat@…"><span class="hint">Pisahkan dengan koma, maksimal 20 alamat.</span></div>' +
      '<div class="field"><label>Pesan pengantar</label><textarea class="textarea" id="ePesan">Dengan hormat,\nbersama ini kami sampaikan surat resmi dari ' + esc(S.cfg.INSTITUSI_NAMA || '') + '. Keaslian surat dapat diverifikasi melalui QR Code pada dokumen.</textarea></div>' +
      '<div class="callout ' + (lampiran ? 'info' : 'bad') + '">' + ic(lampiran ? 'attach_file' : 'lock') + '<div>' + (lampiran ? 'PDF final akan dilampirkan.' : 'Klasifikasi ' + esc(s.klas) + ': PDF <b>tidak</b> dilampirkan. Penerima hanya menerima nomor surat dan tautan verifikasi.') + '</div></div></div>',
      foot: '<button class="btn" data-x>Batal</button><button class="btn pri" data-ok>' + ic('send') + 'Kirim</button>' });
    $('[data-x]', m.el).onclick = function () { m.close(); };
    $('[data-ok]', m.el).onclick = function () { var b = this; U.sibuk(b, async function () { var r = await U.api('eksp.email', { idSurat: s.id, kepada: $('#eKe', m.el).value, pesan: $('#ePesan', m.el).value }, { timeout: 120000 }); if (!r.success) return U.toast(r.message, 'err'); U.toast(r.message, 'ok'); m.close(); segarSetelah(['eksp.list', 'surat.list', 'surat.get', 'agenda.list']); R.jalan(); }); };
  }
  function catatKirim(s) {
    var m = U.modal({ title: 'Catat pengiriman', sub: s.nomor + ' — ' + s.perihal, body: '<div class="grid2"><div class="field"><label>Cara kirim</label><select class="select" id="kCara">' + (S.cfg.CARA_KIRIM || ['Kurir', 'Pos']).filter(function (c) { return c !== 'Email'; }).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div><div class="field"><label>Tanggal kirim</label><input class="input" type="date" id="kTgl" value="' + U.hariIni() + '"></div>' +
      '<div class="field" style="grid-column:1/-1"><label>Penerima <span class="req">*</span></label><input class="input" id="kPenerima" value="' + esc(s.tujuan || '') + '"></div><div class="field" style="grid-column:1/-1"><label>Bukti terima (opsional)</label><div class="dropzone" id="kBukti"></div></div></div>',
      foot: '<button class="btn" data-x>Batal</button><button class="btn pri" data-ok>' + ic('save') + 'Simpan</button>' });
    var ambil = dropzone(m.el, 'kBukti', null, 'Foto/scan tanda terima');
    $('[data-x]', m.el).onclick = function () { m.close(); };
    $('[data-ok]', m.el).onclick = function () { var b = this; U.sibuk(b, async function () { var r = await U.api('eksp.simpan', { idSurat: s.id, cara: $('#kCara', m.el).value, tanggal: $('#kTgl', m.el).value, penerima: $('#kPenerima', m.el).value, berkas: ambil() }, { timeout: 120000 }); if (!r.success) return U.toast(r.message, 'err'); U.toast(r.message, 'ok'); m.close(); segarSetelah(['eksp.list', 'surat.list', 'surat.get', 'agenda.list']); R.jalan(); }); };
  }

  // ============================================================ Buku Agenda & Arsip
  var AG = { tab: 'semua', klas: '', status: '', dari: '', sampai: '', cari: '', hal: 1, pilih: {} };
  var KOLOM_AGENDA = [{ label: 'Jenis', val: function (r) { return r.t === 'K' ? 'Keluar' : 'Masuk'; }, w: 8 }, { label: 'Nomor', key: 'nomor', w: 26 }, { label: 'Perihal', key: 'perihal', w: 44 }, { label: 'Pihak terkait', val: function (r) { return r.t === 'M' ? r.asal : r.tujuan; }, w: 30 }, { label: 'Tanggal', key: 'tanggal', w: 12 }, { label: 'Kode arsip', key: 'kodeKlas', w: 10 }, { label: 'Keamanan', key: 'klas', w: 14 }, { label: 'Status', key: 'status', w: 16 }];
  R.add('agenda', {
    title: 'Buku Agenda & Arsip',
    render: function (view, arg, q) {
      var sa = S.me.role === 'superadmin', th = q.get('tahun') || new Date().getFullYear();
      if (q.get('q') !== null) AG.cari = q.get('q') || ''; if (q.get('status')) { AG.status = q.get('status'); AG.tab = 'semua'; }
      view.innerHTML = U.judul({ title: 'Buku Agenda & Arsip Digital', icon: 'folder_special', sub: 'Penyimpanan arsip dinamis, buku agenda keluar-masuk, dan pengesahan digital terpusat.', aksi: '<button class="btn line" id="bXls">' + ic('table_view') + 'Unduh Excel</button><button class="btn line" id="bPdfAg">' + ic('picture_as_pdf') + 'Unduh PDF</button><button class="btn" onclick="window.print()">' + ic('print') + 'Cetak Agenda</button>' }) +
        '<div class="stat-cards" id="agStat"></div><div class="toolbar" id="agTool"></div><div id="agBulk"></div><div id="agList">' + U.skel(6) + '</div>';
      var data = [];
      function saring() {
        var f = AG.cari.toLowerCase();
        return data.filter(function (r) {
          if (AG.tab === 'K' && r.t !== 'K' || AG.tab === 'M' && r.t !== 'M') return false;
          if (AG.klas && r.klas !== AG.klas) return false; if (AG.status && r.status !== AG.status) return false;
          if (AG.dari && r.tanggal < AG.dari) return false; if (AG.sampai && r.tanggal > AG.sampai) return false;
          return !f || (r.nomor + ' ' + r.perihal + ' ' + (r.asal || '') + ' ' + (r.tujuan || '') + ' ' + (r.nomorAsal || '') + ' ' + (r.pejabat || '')).toLowerCase().indexOf(f) >= 0;
        });
      }
      function gambar() {
        var k = data.filter(function (r) { return r.t === 'K'; }).length, mm = data.length - k, peringatan = Number(S.cfg.RETENSI_PERINGATAN_HARI) || 90;
        var vital = data.filter(function (r) { var kl = U.byId(M().klasifikasi, r.kodeKlas, 'kode'); return kl && kl.nasib === 'Permanen'; }).length;
        var dekat = data.filter(function (r) { var s = U.sisaHari(r.retensi); return s !== null && s <= peringatan; }).length;
        $('#agStat', view).innerHTML = [['Total arsip ' + th, data.length, 'Surat', 'inventory_2'], ['Arsip vital', vital, 'Permanen', 'verified_user'], ['Jadwal retensi', dekat, 'Mendekati/lewat', 'event_busy'], ['Surat keluar / masuk', k + ' / ' + mm, '', 'swap_horiz']].map(function (s) { return '<div class="stat"><div><div class="eyebrow">' + s[0] + '</div><div class="v num">' + s[1] + '<small>' + s[2] + '</small></div></div><span class="ic">' + ic(s[3]) + '</span></div>'; }).join('');
        var statusSet = {}; data.forEach(function (r) { statusSet[r.status] = 1; });
        $('#agTool', view).innerHTML = '<div class="tabs">' + [['semua', 'Semua', data.length], ['K', 'Surat Keluar', k], ['M', 'Surat Masuk', mm]].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (AG.tab === t[0] ? 'on' : '') + '">' + t[1] + ' (' + t[2] + ')</button>'; }).join('') + '</div>' +
          '<span class="pill-sel"><label>Klasifikasi:</label><select id="agKlas"><option value="">Semua</option>' + ['Biasa', 'Terbatas', 'Rahasia', 'Sangat Rahasia'].map(function (x) { return '<option' + (AG.klas === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></span>' +
          '<span class="pill-sel"><label>Status:</label><select id="agStatus"><option value="">Semua Status</option>' + Object.keys(statusSet).map(function (x) { return '<option' + (AG.status === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></span>' +
          '<span class="pill-sel">' + ic('calendar_month') + '<input type="date" id="agDari" value="' + AG.dari + '" aria-label="Dari tanggal">–<input type="date" id="agSampai" value="' + AG.sampai + '" aria-label="Sampai tanggal"></span>' +
          '<span class="pill-sel"><label>Tahun</label><select id="agTh">' + tahunOpsi(th) + '</select></span><label class="pill-search grow">' + ic('search') + '<input id="agCari" value="' + esc(AG.cari) + '" placeholder="Cari kata kunci arsip…"></label>';
        $$('#agTool .tabs button', view).forEach(function (b) { b.onclick = function () { AG.tab = b.dataset.t; AG.hal = 1; gambar(); }; });
        $('#agKlas', view).onchange = function () { AG.klas = this.value; AG.hal = 1; tabel(); };
        $('#agStatus', view).onchange = function () { AG.status = this.value; AG.hal = 1; tabel(); };
        $('#agDari', view).onchange = function () { AG.dari = this.value; AG.hal = 1; tabel(); };
        $('#agSampai', view).onchange = function () { AG.sampai = this.value; AG.hal = 1; tabel(); };
        $('#agTh', view).onchange = function () { location.hash = '#/agenda?tahun=' + this.value; };
        $('#agCari', view).oninput = U.debounce(function (e) { AG.cari = e.target.value; AG.hal = 1; tabel(); }, 120);
        tabel();
      }
      function tabel() {
        var list = saring(), pg = U.paginasi(list, AG.hal, 15, function (h) { AG.hal = h; tabel(); }), nPilih = Object.keys(AG.pilih).length;
        $('#agBulk', view).innerHTML = sa ? '<div class="bulk"><label class="check" style="padding:0"><input type="checkbox" id="agAll"' + (pg.list.length && pg.list.every(function (r) { return AG.pilih[r.t + r.id]; }) ? ' checked' : '') + '><b>' + nPilih + ' dokumen dipilih</b></label><span class="eyebrow">| Tindakan cepat:</span><button class="btn sm line" id="agArsip"' + (nPilih ? '' : ' disabled') + '>' + ic('inventory_2') + 'Pindahkan ke Arsip</button><button class="btn sm line" id="agEks"' + (nPilih ? '' : ' disabled') + '>' + ic('download') + 'Ekspor Terpilih</button></div>' : '';
        $('#agList', view).innerHTML = '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr>' + (sa ? '<th style="width:40px"></th>' : '') + '<th>Nomor & perihal surat</th><th>Pihak terkait / unit</th><th>Tanggal & waktu</th><th>Tingkat keamanan</th><th>Status surat</th></tr></thead><tbody>' +
          (pg.list.length ? pg.list.map(function (r) {
            var pihak = r.t === 'M' ? r.asal : (r.tujuan || namaUnit(r.unit)), key = r.t + r.id;
            return '<tr data-t="' + r.t + '" data-id="' + esc(r.id) + '" class="' + (AG.pilih[key] ? 'sel' : '') + '">' + (sa ? '<td class="c-hide-m"><input type="checkbox" data-pilih="' + esc(key) + '"' + (AG.pilih[key] ? ' checked' : '') + ' aria-label="Pilih"></td>' : '') +
              '<td class="c-main"><div class="doc">' + U.docIc(r) + '<div><div class="no">' + esc(r.nomor || 'Belum bernomor') + '</div><div class="ttl">' + esc(r.perihal) + '</div></div></div></td><td data-l="Pihak"><div class="person">' + (r.t === 'M' ? ic('account_balance') : U.avatar(pihak)) + '<span>' + esc(pihak) + (r.t === 'M' ? ' <span class="hint">→ ' + r.jmlDispo + ' disposisi</span>' : '') + '</span></div></td>' +
              '<td data-l="Tanggal" class="when">' + U.tgl(r.tanggal) + '<small>' + (U.jam(r.disetujui || r.dibuat) || '') + '</small></td><td data-l="Keamanan">' + U.klasBadge(r.klas) + '</td><td data-l="Status">' + U.badge(r.status) + '</td></tr>';
          }).join('') : '<tr><td colspan="6">' + U.kosong('Tidak ada arsip yang cocok dengan filter.', 'search_off') + '</td></tr>') + '</tbody></table></div>' + pg.html + '</div>';
        pg.ikat(view);
        $$('#agList tr[data-id]', view).forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('input')) return; if (tr.dataset.t === 'M') (S.me.role === 'pemohon' ? bukaMasuk : function (id) { location.hash = '#/masuk/' + id; })(tr.dataset.id); else SKSurat.bukaDetail(tr.dataset.id, { tanpaHash: true }); }; });
        $$('[data-pilih]', view).forEach(function (c) { c.onchange = function () { if (c.checked) AG.pilih[c.dataset.pilih] = 1; else delete AG.pilih[c.dataset.pilih]; tabel(); }; });
        var all = $('#agAll', view); if (all) all.onchange = function () { pg.list.forEach(function (r) { if (all.checked) AG.pilih[r.t + r.id] = 1; else delete AG.pilih[r.t + r.id]; }); tabel(); };
        var ba = $('#agArsip', view); if (ba) ba.onclick = function () {
          var k = [], mm = []; Object.keys(AG.pilih).forEach(function (x) { (x[0] === 'K' ? k : mm).push(x.slice(1)); });
          U.sibuk(ba, async function () { var pesan = []; if (k.length) { var r1 = await U.api('surat.arsipkan', { ids: k }); pesan.push(r1.message); } if (mm.length) { var r2 = await U.api('masuk.arsipkan', { ids: mm }); pesan.push(r2.message); } AG.pilih = {}; U.toast(pesan.join(' '), 'ok'); segarSetelah(['agenda.list', 'surat.list', 'masuk.list']); R.jalan(); });
        };
        var be = $('#agEks', view); if (be) be.onclick = function () { U.sibuk(be, function () { return U.eksporExcel('Agenda-Terpilih', KOLOM_AGENDA, data.filter(function (r) { return AG.pilih[r.t + r.id]; })); }); };
      }
      $('#bXls', view).onclick = function () { var b = this; U.sibuk(b, function () { return U.eksporExcel('Buku-Agenda-' + th, KOLOM_AGENDA, saring()); }); };
      $('#bPdfAg', view).onclick = function () { var b = this; U.sibuk(b, function () { return U.eksporPdf('Buku-Agenda-' + th, 'Buku Agenda Surat ' + th, KOLOM_AGENDA, saring()); }); };
      U.Data.ambil('agenda.list', { tahun: String(th) }, { maxAge: 30000, onData: function (d) { data = d.baris; gambar(); } }).catch(function (e) { gagal($('#agList', view), e, function () { R.jalan(); }); });
    }
  });

  // ============================================================ Retensi
  R.add('retensi', {
    title: 'Retensi Arsip', roles: ['superadmin', 'approver'],
    render: function (view) {
      var filter = 'dekat';
      view.innerHTML = U.judul({ title: 'Jadwal Retensi Arsip', icon: 'event_busy', sub: 'Tanggal jatuh retensi dihitung otomatis dari kode klasifikasi arsip. Pemusnahan & Berita Acara tersedia di Fase 2.', aksi: '<button class="btn line" id="xlsRet">' + ic('table_view') + 'Unduh Excel</button>' }) +
        '<div class="stat-cards" id="retStat"></div><div class="toolbar"><div class="tabs" id="retTab"></div></div><div id="retList">' + U.skel(5) + '</div>';
      var d = null;
      function gambar() {
        var p = d.peringatanHari, lewat = d.baris.filter(function (r) { return r.sisa < 0; }), dekat = d.baris.filter(function (r) { return r.sisa >= 0 && r.sisa <= p; });
        $('#retStat', view).innerHTML = [['Lewat jatuh tempo', lewat.length, 'arsip', 'warning'], ['≤ ' + p + ' hari lagi', dekat.length, 'arsip', 'schedule'], ['Nasib akhir permanen', d.baris.filter(function (r) { return r.nasib === 'Permanen'; }).length, 'arsip vital', 'verified_user'], ['Total tercatat', d.baris.length, 'arsip', 'inventory_2']].map(function (s, i) { return '<div class="stat"><div><div class="eyebrow">' + s[0] + '</div><div class="v num" style="' + (i === 0 && s[1] ? 'color:var(--red)' : '') + '">' + s[1] + '<small>' + s[2] + '</small></div></div><span class="ic">' + ic(s[3]) + '</span></div>'; }).join('');
        $('#retTab', view).innerHTML = [['dekat', 'Mendekati & lewat'], ['lewat', 'Lewat tempo'], ['semua', 'Semua']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (filter === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
        $$('#retTab button', view).forEach(function (b) { b.onclick = function () { filter = b.dataset.t; gambar(); }; });
        var list = filter === 'lewat' ? lewat : filter === 'dekat' ? lewat.concat(dekat) : d.baris;
        $('#retList', view).innerHTML = '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Arsip</th><th>Klasifikasi</th><th>Retensi aktif</th><th>Nasib akhir</th><th>Jatuh tempo</th></tr></thead><tbody>' + (list.length ? list.map(function (r) {
          var cls = r.sisa < 0 ? 'late' : r.sisa <= p ? 'soon' : '';
          return '<tr data-t="' + r.t + '" data-id="' + esc(r.id) + '"><td class="c-main"><div class="doc">' + U.docIc(r) + '<div><div class="no">' + esc(r.nomor || '-') + '</div><div class="ttl">' + esc(r.perihal) + '</div></div></div></td><td data-l="Klasifikasi"><b>' + esc(r.kodeKlas) + '</b><div class="hint">' + esc(r.uraian) + '</div></td><td data-l="Retensi">' + r.retensiTahun + ' tahun</td><td data-l="Nasib">' + (r.nasib === 'Permanen' ? '<span class="badge b-sent">Permanen</span>' : '<span class="badge b-draft">Musnah</span>') + '</td><td data-l="Jatuh tempo"><span class="deadline ' + cls + '">' + U.tgl(r.jatuh) + ' · ' + (r.sisa < 0 ? 'lewat ' + (-r.sisa) + ' hari' : r.sisa + ' hari lagi') + '</span></td></tr>';
        }).join('') : '<tr><td colspan="5">' + U.kosong('Tidak ada arsip pada kategori ini.', 'event_available') + '</td></tr>') + '</tbody></table></div></div>';
        $$('#retList tr[data-id]', view).forEach(function (tr) { tr.onclick = function () { if (tr.dataset.t === 'M') location.hash = '#/masuk/' + tr.dataset.id; else SKSurat.bukaDetail(tr.dataset.id, { tanpaHash: true }); }; });
      }
      $('#xlsRet', view).onclick = function () { var b = this; if (d) U.sibuk(b, function () { return U.eksporExcel('Jadwal-Retensi', [{ label: 'Jenis', val: function (r) { return r.t === 'K' ? 'Keluar' : 'Masuk'; } }, { label: 'Nomor', key: 'nomor', w: 26 }, { label: 'Perihal', key: 'perihal', w: 40 }, { label: 'Kode', key: 'kodeKlas' }, { label: 'Uraian', key: 'uraian', w: 30 }, { label: 'Retensi (th)', key: 'retensiTahun' }, { label: 'Nasib akhir', key: 'nasib' }, { label: 'Jatuh tempo', key: 'jatuh' }, { label: 'Sisa hari', key: 'sisa' }], d.baris); }); };
      U.Data.ambil('retensi.list', {}, { maxAge: 60000, onData: function (x) { d = x; gambar(); } }).catch(function (e) { gagal($('#retList', view), e, function () { R.jalan(); }); });
    }
  });

  // ============================================================ Master Data
  var MTAB = [['unit', 'Unit Kerja', 'apartment'], ['pejabat', 'Pejabat', 'badge'], ['klasifikasi', 'Klasifikasi Arsip', 'category'], ['jenis', 'Jenis Surat', 'description'], ['template', 'Template', 'draft'], ['kop', 'Kop Surat', 'image'], ['penomoran', 'Penomoran', 'pin'], ['pengguna', 'Pengguna', 'group']];
  R.add('master', {
    title: 'Master Data', roles: ['superadmin', 'approver'],
    render: function (view, arg) {
      var tab = arg[0] && MTAB.some(function (t) { return t[0] === arg[0]; }) ? arg[0] : 'unit', sa = S.me.role === 'superadmin', t = U.byId(MTAB.map(function (x) { return { id: x[0], label: x[1] }; }), tab);
      view.innerHTML = U.judul({ title: 'Master Data', icon: 'dataset', sub: sa ? 'Data induk persuratan. Data tidak dihapus — cukup dinonaktifkan.' : 'Anda dapat melihat data induk (ubah oleh Superadmin).' }) +
        '<div class="toolbar"><div class="tabs">' + MTAB.map(function (x) { return '<button data-t="' + x[0] + '" class="' + (x[0] === tab ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div><div id="mBody"></div>';
      $$('.toolbar .tabs button', view).forEach(function (b) { b.onclick = function () { location.hash = '#/master/' + b.dataset.t; }; });
      ({ unit: mUnit, pejabat: mPejabat, klasifikasi: mKlas, jenis: mJenis, template: mTemplate, kop: mKop, penomoran: mNomor, pengguna: mPengguna })[tab]($('#mBody', view), sa, t);
    }
  });
  function tabelMaster(el, o) {
    el.innerHTML = '<div class="sec-h" style="margin-top:0"><div><div class="eyebrow">' + esc(o.eyebrow || '') + '</div><h2>' + esc(o.judul) + '</h2></div><div style="display:flex;gap:8px;flex-wrap:wrap">' + (o.aksiExtra || '') + (o.tambah ? '<button class="btn pri" data-tambah>' + ic('add') + 'Tambah</button>' : '') + '</div></div>' +
      '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr>' + o.kolom.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + (o.baris.length ? o.baris.join('') : '<tr><td colspan="' + o.kolom.length + '">' + U.kosong('Belum ada data.', 'database') + '</td></tr>') + '</tbody></table></div></div>';
    if (o.tambah) $('[data-tambah]', el).onclick = function () { o.tambah(); };
    $$('tr[data-i]', el).forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('button,a')) return; o.klik && o.klik(+tr.dataset.i); }; });
  }
  function formMaster(o) {
    var m = U.modal({ title: o.title, wide: o.wide, body: '<form class="grid2" id="fmMaster" novalidate>' + o.fields.map(function (f) {
      var v = f.v === undefined || f.v === null ? '' : f.v, ro = f.ro ? ' disabled' : '';
      var inp = f.type === 'select' ? '<select class="select" name="' + f.k + '"' + ro + '>' + f.opsi.map(function (op) { var val = Array.isArray(op) ? op[0] : op, lb = Array.isArray(op) ? op[1] : op; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lb) + '</option>'; }).join('') + '</select>'
        : '<input class="input" name="' + f.k + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '"' + ro + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<div class="field"' + (f.full ? ' style="grid-column:1/-1"' : '') + '><label>' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>' + inp + (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }).join('') + '</form>' + (o.extra || ''), foot: o.ro ? '<button class="btn" data-x>Tutup</button>' : '<button class="btn" data-x>Batal</button><button class="btn pri" data-ok>' + ic('save') + 'Simpan</button>' });
    $('[data-x]', m.el).onclick = function () { m.close(); };
    var ok = $('[data-ok]', m.el);
    if (ok) ok.onclick = function () {
      var baris = {}; $$('[name]', m.el).forEach(function (i) { baris[i.name] = i.value.trim(); });
      if (o.id) baris.id = o.id;
      U.sibuk(ok, async function () {
        var r = await U.api('master.simpan', { jenis: o.jenis, baris: baris, ubah: !!o.id });
        if (!r.success) return U.toast(r.message, 'err');
        if (r.data && r.data.master) S.master = Object.assign(S.master || {}, r.data.master);
        App.simpanBoot(); U.toast(r.message, 'ok'); m.close(); R.jalan();
      });
    };
    if (o.setelah) o.setelah(m);
    return m;
  }
  function unitOpsi() { return [['', '—']].concat(M().unit.map(function (u) { return [u.id, u.kode + ' — ' + u.nama]; })); }
  function statusSel(v) { return { k: 'status', label: 'Status', type: 'select', opsi: ['Aktif', 'Nonaktif'], v: v || 'Aktif' }; }
  function mUnit(el, sa) {
    var d = M().unit;
    var form = function (u) { u = u || {}; formMaster({ title: u.id ? 'Ubah Unit Kerja' : 'Tambah Unit Kerja', jenis: 'unit', id: u.id, ro: !sa, fields: [{ k: 'kode', label: 'Kode unit', v: u.kode, req: 1, hint: 'Dipakai di nomor surat, mis. TU, KEU' }, { k: 'nama', label: 'Nama unit', v: u.nama, req: 1 }, { k: 'idKop', label: 'Kop surat', type: 'select', opsi: [['', '— tanpa kop gambar —']].concat(M().kop.map(function (k) { return [k.id, k.nama]; })), v: u.idKop }, statusSel(u.status)] }); };
    tabelMaster(el, { judul: 'Unit Kerja', eyebrow: d.length + ' unit', kolom: ['Kode', 'Nama unit', 'Status'], baris: d.map(function (u, i) { return '<tr data-i="' + i + '"><td data-l="Kode"><b>' + esc(u.kode) + '</b></td><td data-l="Nama" class="c-main">' + esc(u.nama) + '</td><td data-l="Status">' + (u.status === 'Aktif' ? '<span class="badge b-ok">Aktif</span>' : '<span class="badge b-bad">Nonaktif</span>') + '</td></tr>'; }), tambah: sa ? function () { form(); } : null, klik: function (i) { form(d[i]); } });
  }
  function mPejabat(el, sa) {
    var d = M().pejabat;
    var form = function (p) {
      p = p || {};
      formMaster({ title: p.id ? 'Ubah Pejabat' : 'Tambah Pejabat', jenis: 'pejabat', id: p.id, ro: !sa, wide: true, fields: [{ k: 'nama', label: 'Nama lengkap & gelar', v: p.nama, req: 1, full: 1 }, { k: 'jabatan', label: 'Jabatan', v: p.jabatan, req: 1 }, { k: 'nip', label: 'NIP / NIDN', v: p.nip }, { k: 'unit', label: 'Unit', type: 'select', opsi: unitOpsi(), v: p.unit }, { k: 'email', label: 'Email Google (login persetujuan)', v: p.email, req: 1, type: 'email', hint: 'Harus sama dengan akun Approver di menu Pengguna' }, { k: 'mulai', label: 'Mulai menjabat', type: 'date', v: p.mulai }, { k: 'selesai', label: 'Selesai menjabat', type: 'date', v: p.selesai, hint: 'Kosongkan bila masih menjabat' }, statusSel(p.status)],
        extra: p.id ? '<div class="panel" style="margin:18px 0 0"><div class="panel-in" style="gap:10px"><b>Spesimen tanda tangan</b><span class="hint">PNG latar transparan disarankan. Ditempel otomatis pada {{TTD}} saat surat disetujui. PIN: ' + (p.pin ? '✓ sudah dibuat pejabat' : 'belum dibuat') + '</span><div id="spPrev" class="hint">' + (p.spesimen ? 'Spesimen tersedia.' : 'Belum ada spesimen.') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap">' + (p.spesimen ? '<button type="button" class="btn sm line" data-sp-lihat>' + ic('visibility') + 'Lihat</button>' : '') + (sa ? '<button type="button" class="btn sm" data-sp-unggah>' + ic('upload') + 'Unggah spesimen</button>' : '') + '</div></div></div>' : '',
        setelah: function (m) {
          var bl = $('[data-sp-lihat]', m.el), bu = $('[data-sp-unggah]', m.el);
          if (bl) bl.onclick = function () { U.sibuk(bl, async function () { var r = await U.api('master.gambar', { jenis: 'spesimen', id: p.id }); if (!r.success) return U.toast(r.message, 'err'); $('#spPrev', m.el).innerHTML = '<img alt="Spesimen" style="max-height:90px;background:#fff;border-radius:8px;padding:6px" src="data:' + r.data.mime + ';base64,' + r.data.b64 + '">'; }); };
          if (bu) bu.onclick = async function () { var b = await U.pilihBerkas({ accept: 'image/png,image/jpeg', asli: true, maksMB: 2 }); if (!b) return; U.sibuk(bu, async function () { var r = await U.api('master.unggah', { jenis: 'spesimen', id: p.id, berkas: b }); if (!r.success) return U.toast(r.message, 'err'); S.master = Object.assign(S.master, r.data.master); App.simpanBoot(); $('#spPrev', m.el).textContent = 'Spesimen baru tersimpan ✓'; U.toast(r.message, 'ok'); }); };
        }
      });
    };
    tabelMaster(el, { judul: 'Pejabat Penanda Tangan', eyebrow: d.length + ' pejabat · tanda tangan surat lama tetap atas nama pejabat saat itu (snapshot)', kolom: ['Nama & jabatan', 'Unit', 'Masa jabatan', 'Spesimen / PIN', 'Status'], baris: d.map(function (p, i) { return '<tr data-i="' + i + '"><td class="c-main"><div class="person">' + U.avatar(p.nama) + '<div><b>' + esc(p.nama) + '</b><div class="hint">' + esc(p.jabatan) + (p.nip ? ' · NIP ' + esc(p.nip) : '') + '</div></div></div></td><td data-l="Unit">' + esc(namaUnit(p.unit)) + '</td><td data-l="Masa jabatan" class="when">' + U.tgl(p.mulai) + '<small>s.d. ' + (p.selesai ? U.tgl(p.selesai) : 'sekarang') + '</small></td><td data-l="Spesimen / PIN">' + (p.spesimen ? '✓' : '—') + ' / ' + (p.pin ? '✓' : '—') + '</td><td data-l="Status">' + (p.berlaku ? '<span class="badge b-ok">Berlaku</span>' : '<span class="badge b-draft">Tidak berlaku</span>') + '</td></tr>'; }), tambah: sa ? function () { form(); } : null, klik: function (i) { form(d[i]); } });
  }
  function mKlas(el, sa) {
    var d = M().klasifikasi;
    var form = function (k) { k = k || {}; formMaster({ title: k.kode ? 'Ubah Klasifikasi' : 'Tambah Klasifikasi Arsip', jenis: 'klasifikasi', id: k.kode, ro: !sa, fields: [{ k: 'kode', label: 'Kode klasifikasi', v: k.kode, req: 1, ro: !!k.kode, ph: 'OT.01' }, { k: 'uraian', label: 'Uraian', v: k.uraian, req: 1 }, { k: 'retensi', label: 'Masa retensi aktif (tahun)', type: 'number', v: k.retensi === undefined ? 5 : k.retensi }, { k: 'nasib', label: 'Nasib akhir', type: 'select', opsi: ['Musnah', 'Permanen'], v: k.nasib }] }); };
    tabelMaster(el, { judul: 'Klasifikasi Arsip', eyebrow: 'Dasar perhitungan jadwal retensi', kolom: ['Kode', 'Uraian', 'Retensi aktif', 'Nasib akhir'], baris: d.map(function (k, i) { return '<tr data-i="' + i + '"><td data-l="Kode"><b>' + esc(k.kode) + '</b></td><td class="c-main">' + esc(k.uraian) + '</td><td data-l="Retensi">' + k.retensi + ' tahun</td><td data-l="Nasib">' + esc(k.nasib) + '</td></tr>'; }), tambah: sa ? function () { form(); } : null, klik: function (i) { form(d[i]); } });
  }
  function mJenis(el, sa) {
    var d = M().jenis;
    var form = function (j) { j = j || {}; formMaster({ title: j.id ? 'Ubah Jenis Surat' : 'Tambah Jenis Surat', jenis: 'jenis', id: j.id, ro: !sa, fields: [{ k: 'nama', label: 'Nama jenis', v: j.nama, req: 1 }, { k: 'kode', label: 'Kode jenis (untuk nomor)', v: j.kode, req: 1, ph: 'ND' }, { k: 'klasDefault', label: 'Kode klasifikasi bawaan', type: 'select', opsi: M().klasifikasi.map(function (k) { return [k.kode, k.kode + ' — ' + k.uraian]; }), v: j.klasDefault }, { k: 'tte', label: 'Perlu TTE tersertifikasi (Fase 2)', type: 'select', opsi: ['Tidak', 'Ya'], v: j.tte }, statusSel(j.status)] }); };
    tabelMaster(el, { judul: 'Jenis Surat', eyebrow: d.length + ' jenis', kolom: ['Nama', 'Kode', 'Klasifikasi bawaan', 'TTE', 'Status'], baris: d.map(function (j, i) { return '<tr data-i="' + i + '"><td class="c-main"><b>' + esc(j.nama) + '</b></td><td data-l="Kode">' + esc(j.kode) + '</td><td data-l="Klasifikasi">' + esc(j.klasDefault) + '</td><td data-l="TTE">' + (j.tte === 'Ya' ? '<span class="badge b-sent">Tersertifikasi</span>' : '<span class="badge b-ok">Internal</span>') + '</td><td data-l="Status">' + esc(j.status) + '</td></tr>'; }), tambah: sa ? function () { form(); } : null, klik: function (i) { form(d[i]); } });
  }
  function mKop(el, sa) {
    var d = M().kop;
    if (!sa) { el.innerHTML = U.kosong('Kop surat hanya dapat dikelola Superadmin.', 'image'); return; }
    var form = function (k) { k = k || {}; formMaster({ title: k.id ? 'Ubah Kop' : 'Tambah Kop Surat', jenis: 'kop', id: k.id, fields: [{ k: 'nama', label: 'Nama kop', v: k.nama, req: 1, full: 1 }], extra: k.id ? '<div style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="btn sm" data-up>' + ic('upload') + 'Unggah gambar kop</button><span class="hint" id="kopInfo">' + (k.adaFile ? 'Gambar tersedia.' : 'Belum ada gambar.') + ' Pakai penanda {{KOP}} di template.</span></div>' : '<p class="hint">Simpan dulu, lalu buka kembali untuk mengunggah gambar.</p>', setelah: function (m) { var b = $('[data-up]', m.el); if (b) b.onclick = async function () { var f = await U.pilihBerkas({ accept: 'image/png,image/jpeg', asli: true, maksMB: 3 }); if (!f) return; U.sibuk(b, async function () { var r = await U.api('master.unggah', { jenis: 'kop', id: k.id, berkas: f }); if (!r.success) return U.toast(r.message, 'err'); S.master = Object.assign(S.master, r.data.master); App.simpanBoot(); $('#kopInfo', m.el).textContent = 'Gambar tersimpan ✓'; }); }; } }); };
    tabelMaster(el, { judul: 'Kop Surat', eyebrow: 'Gambar kop per unit (opsional)', kolom: ['Nama', 'Gambar'], baris: d.map(function (k, i) { return '<tr data-i="' + i + '"><td class="c-main"><b>' + esc(k.nama) + '</b></td><td data-l="Gambar">' + (k.adaFile ? '✓ tersedia' : '—') + '</td></tr>'; }), tambah: function () { form(); }, klik: function (i) { form(d[i]); } });
  }
  function mPengguna(el, sa) {
    var d = M().pengguna;
    var form = function (u) { u = u || {}; formMaster({ title: u.email ? 'Ubah Pengguna' : 'Tambah Pengguna', jenis: 'pengguna', id: u.email, ro: !sa, fields: [{ k: 'email', label: 'Email Google', v: u.email, req: 1, ro: !!u.email, type: 'email' }, { k: 'nama', label: 'Nama', v: u.nama, req: 1 }, { k: 'peran', label: 'Peran', type: 'select', opsi: [['pemohon', 'Pemohon (Staf / Kepala Divisi)'], ['approver', 'Approver (Pimpinan / Penanda Tangan)'], ['superadmin', 'Superadmin (Sekretaris / TU)']], v: u.peran || 'pemohon' }, { k: 'unit', label: 'Unit', type: 'select', opsi: unitOpsi(), v: u.unit }, statusSel(u.status)], extra: '<p class="hint" style="margin-top:12px">Pengguna masuk dengan akun Google ini. Menonaktifkan / mengubah peran langsung mengakhiri sesinya. Approver juga harus terdaftar di Master → Pejabat dengan email yang sama.</p>' }); };
    tabelMaster(el, { judul: 'Pengguna & Peran', eyebrow: d.length + ' akun · whitelist login', kolom: ['Nama', 'Peran', 'Unit', 'Status'], baris: d.map(function (u, i) { return '<tr data-i="' + i + '"><td class="c-main"><div class="person">' + U.avatar(u.nama) + '<div><b>' + esc(u.nama) + '</b><div class="hint">' + esc(u.email) + '</div></div></div></td><td data-l="Peran"><span class="badge plain ' + (u.peran === 'superadmin' ? 'b-sent' : u.peran === 'approver' ? 'b-ok' : 'b-draft') + '">' + esc(u.peran) + '</span></td><td data-l="Unit">' + esc(namaUnit(u.unit)) + '</td><td data-l="Status">' + (u.status === 'Aktif' ? '<span class="badge b-ok">Aktif</span>' : '<span class="badge b-bad">Nonaktif</span>') + '</td></tr>'; }), tambah: sa ? function () { form(); } : null, klik: function (i) { form(d[i]); } });
  }
  function mNomor(el, sa) {
    el.innerHTML = U.skel(3);
    U.Data.ambil('penomoran.list', {}, { maxAge: 30000, onData: function (d) {
      var form = function (r) { formMaster({ title: 'Format nomor: ' + r.namaJenis + ' / ' + r.kodeUnit, jenis: 'penomoran', id: r.id, ro: !sa, fields: [{ k: 'format', label: 'Format', v: r.format, full: 1, hint: 'Token: {no} {kode_jenis} {kode_unit} {bulan_romawi} {bulan} {tahun} {singkat}' }, { k: 'terakhir', label: 'Nomor terakhir', type: 'number', v: r.terakhir, hint: 'Nomor ganda tetap dicegah oleh Registri' }, { k: 'tahun', label: 'Tahun berjalan', type: 'number', v: r.tahun, hint: 'Urutan otomatis kembali ke 1 saat tahun berganti' }] }); };
      tabelMaster(el, { judul: 'Konfigurasi Penomoran', eyebrow: 'Baris dibuat otomatis saat nomor pertama per jenis & unit diterbitkan', aksiExtra: '<button class="btn line" data-reg>' + ic('list_alt') + 'Registri Nomor</button>', kolom: ['Jenis / unit', 'Format', 'Terakhir', 'Nomor berikutnya'], baris: d.map(function (r, i) { return '<tr data-i="' + i + '"><td class="c-main"><b>' + esc(r.namaJenis) + '</b><div class="hint">' + esc(r.kodeUnit) + '</div></td><td data-l="Format"><code>' + esc(r.format) + '</code></td><td data-l="Terakhir" class="num">' + r.terakhir + ' <span class="hint">(' + r.tahun + ')</span></td><td data-l="Berikutnya" class="num"><b>' + esc(r.contoh) + '</b></td></tr>'; }), klik: function (i) { form(d[i]); } });
      $('[data-reg]', el).onclick = bukaRegistri;
    } }).catch(function (e) { gagal(el, e, function () { mNomor(el, sa); }); });
  }
  async function bukaRegistri() {
    var m = U.modal({ wide: true, title: 'Registri Nomor ' + new Date().getFullYear(), sub: 'Setiap nomor tercatat sekali. Nomor batal tidak pernah dipakai ulang.', body: U.skel(4) });
    var r = await U.api('registri.list', { tahun: new Date().getFullYear() });
    $('.modal-b', m.el).innerHTML = !r.success ? '<div class="callout bad">' + esc(r.message) + '</div>' : '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Status</th><th>Waktu</th><th>Alasan batal</th></tr></thead><tbody>' + (r.data.length ? r.data.map(function (x) { return '<tr><td class="num"><b>' + esc(x.nomor) + '</b></td><td>' + U.badge(x.status) + '</td><td class="when">' + U.tgl(x.waktu) + '<small>' + U.jam(x.waktu) + '</small></td><td>' + esc(x.alasan || '') + '</td></tr>'; }).join('') : '<tr><td colspan="4">' + U.kosong('Belum ada nomor tahun ini.') + '</td></tr>') + '</tbody></table></div>';
  }
  function mTemplate(el, sa) {
    var d = M().template;
    var tambah = function () {
      var m = U.modal({ title: 'Daftarkan Template Google Docs', wide: true, body: '<div style="display:grid;gap:14px"><div class="callout info">' + ic('lightbulb') + '<div>Buat surat di Google Docs dengan penanda seperti <code>{{PERIHAL}}</code>, <code>{{TUJUAN}}</code>, <code>{{ISI}}</code>, <code>{{NOMOR}}</code>, <code>{{TANGGAL}}</code>, <code>{{NAMA_PEJABAT}}</code>, <code>{{JABATAN}}</code>, <code>{{TTD}}</code>, <code>{{QR}}</code>. Kolom kustom (mis. <code>{{TGL_ACARA}}</code>) otomatis menjadi isian form. Template disalin ke folder Master Template aplikasi.</div></div>' +
        '<div class="field"><label>URL Google Docs <span class="req">*</span></label><input class="input" id="tUrl" placeholder="https://docs.google.com/document/d/…/edit"></div><div class="grid2"><div class="field"><label>Nama template <span class="req">*</span></label><input class="input" id="tNama"></div><div class="field"><label>Jenis surat</label><select class="select" id="tJenis">' + M().jenis.map(function (j) { return '<option value="' + esc(j.id) + '">' + esc(j.nama) + '</option>'; }).join('') + '</select></div></div></div>',
        foot: '<button class="btn" data-x>Batal</button><button class="btn pri" data-ok>' + ic('document_scanner') + 'Simpan & Pindai Placeholder</button>' });
      $('[data-x]', m.el).onclick = function () { m.close(); };
      $('[data-ok]', m.el).onclick = function () { var b = this; U.sibuk(b, async function () { var r = await U.api('template.simpan', { url: $('#tUrl', m.el).value, nama: $('#tNama', m.el).value, idJenis: $('#tJenis', m.el).value }, { timeout: 120000 }); if (!r.success) return U.toast(r.message, 'err'); U.toast('Template terdaftar: ' + r.data.skema.bidang.length + ' kolom isian.', 'ok'); m.close(); await App.muatUlangBoot(); detailTpl(r.data.id); }); };
    };
    tabelMaster(el, { judul: 'Template Surat', eyebrow: d.length + ' template · Google Docs ber-placeholder {{…}}', aksiExtra: sa ? '<button class="btn line" data-contoh>' + ic('auto_awesome') + 'Buat template contoh</button>' : '', kolom: ['Nama template', 'Jenis', 'Kolom isian', 'Versi', 'Status'], baris: d.map(function (t, i) { return '<tr data-i="' + i + '"><td class="c-main"><div class="doc"><span class="doc-ic k">' + ic('draft') + '</span><b>' + esc(t.nama) + '</b></div></td><td data-l="Jenis">' + esc(namaJenis(t.idJenis)) + '</td><td data-l="Kolom">' + t.bidang + '</td><td data-l="Versi">v' + t.versi + '</td><td data-l="Status">' + (t.aktif ? '<span class="badge b-ok">Aktif</span>' : '<span class="badge b-draft">Nonaktif</span>') + '</td></tr>'; }), tambah: sa ? tambah : null, klik: function (i) { detailTpl(d[i].id); } });
    var bc = $('[data-contoh]', el); if (bc) bc.onclick = function () { U.sibuk(bc, async function () { var r = await U.api('template.contoh', {}, { timeout: 180000 }); U.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { await App.muatUlangBoot(); R.jalan(); } }); };
  }
  async function detailTpl(id) {
    var sa = S.me.role === 'superadmin';
    var m = U.modal({ wide: true, title: 'Template', body: U.skel(4) });
    var r = await U.api('template.get', { id: id }); if (!r.success) { $('.modal-b', m.el).innerHTML = '<div class="callout bad">' + esc(r.message) + '</div>'; return; }
    var t = r.data; U.Data.simpan('template.get', { id: id }, t);
    $('h2', m.el).textContent = t.nama;
    var TIPE = ['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan', 'daftar', 'gambar'];
    $('.modal-b', m.el).innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><span class="badge b-sent plain">' + esc(namaJenis(t.idJenis)) + '</span><span class="badge b-draft plain">versi ' + t.versi + '</span>' + (t.aktif ? '<span class="badge b-ok">Aktif</span>' : '<span class="badge b-draft">Nonaktif</span>') + '<span style="flex:1"></span>' + (t.urlDoc ? '<a class="btn sm line" target="_blank" rel="noopener" href="' + esc(t.urlDoc) + '">' + ic('open_in_new') + 'Edit di Google Docs</a>' : '') + (sa ? '<button class="btn sm" data-pindai>' + ic('document_scanner') + 'Pindai ulang</button><button class="btn sm" data-aktif>' + (t.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button>' : '') + '</div>' +
      '<div class="eyebrow" style="margin-bottom:8px">Atur kolom isian (dari placeholder)</div><div class="tbl-wrap"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Penanda</th><th>Label di form</th><th>Tipe</th><th>Wajib</th><th>Opsi (untuk pilihan, pisah koma)</th></tr></thead><tbody>' +
      (t.skema.bidang.length ? t.skema.bidang.map(function (b) { return '<tr data-k="' + esc(b.kunci) + '" style="cursor:default"><td><code>{{' + esc(b.kunci) + '}}</code></td><td><input class="input" data-f="label" value="' + esc(b.label) + '"' + (sa ? '' : ' disabled') + '></td><td><select class="select" data-f="tipe"' + (sa ? '' : ' disabled') + '>' + TIPE.map(function (x) { return '<option' + (x === b.tipe ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td><td><input type="checkbox" data-f="wajib"' + (b.wajib ? ' checked' : '') + (sa ? '' : ' disabled') + '></td><td><input class="input" data-f="opsi" value="' + esc((b.opsi || []).join(', ')) + '"' + (sa ? '' : ' disabled') + '></td></tr>'; }).join('') : '<tr><td colspan="5">' + U.kosong('Tidak ada kolom kustom.') + '</td></tr>') + '</tbody></table></div></div>' +
      '<p class="hint" style="margin-top:10px">Penanda otomatis (tidak muncul di form): ' + (t.skema.sistem || []).map(function (x) { return '<code>{{' + esc(x) + '}}</code>'; }).join(' ') + (t.skema.slot && t.skema.slot.length ? ' · slot tanda tangan: ' + t.skema.slot.map(function (s) { return s.penanda.join('/'); }).join(', ') : '') + '</p>' +
      (t.skema.hilang && t.skema.hilang.length ? '<div class="callout rev">' + ic('warning') + 'Kolom tidak lagi ada di template: ' + esc(t.skema.hilang.join(', ')) + '</div>' : '');
    var f = $('.modal-f', m.el); if (!f) { f = document.createElement('div'); f.className = 'modal-f'; $('.modal-box', m.el).appendChild(f); }
    f.innerHTML = '<a class="btn" href="#/buat?tpl=' + esc(t.id) + '">' + ic('edit_document') + 'Pakai template</a>' + (sa ? '<button class="btn pri" data-simpan>' + ic('save') + 'Simpan pengaturan kolom</button>' : '');
    var sim = function (extra) { return U.api('template.simpan', Object.assign({ id: t.id, nama: t.nama, idJenis: t.idJenis, aktif: t.aktif }, extra), { timeout: 120000 }); };
    var bS = $('[data-simpan]', m.el); if (bS) bS.onclick = function () { var bidang = $$('tr[data-k]', m.el).map(function (tr) { return { kunci: tr.dataset.k, label: $('[data-f=label]', tr).value, tipe: $('[data-f=tipe]', tr).value, wajib: $('[data-f=wajib]', tr).checked, opsi: $('[data-f=opsi]', tr).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }; }); U.sibuk(bS, async function () { var x = await sim({ bidang: bidang }); if (!x.success) return U.toast(x.message, 'err'); U.Data.simpan('template.get', { id: t.id }, x.data); U.toast('Pengaturan kolom tersimpan.', 'ok'); await App.muatUlangBoot(); }); };
    var bP = $('[data-pindai]', m.el); if (bP) bP.onclick = function () { U.sibuk(bP, async function () { var x = await U.api('template.pindai', { id: t.id }, { timeout: 120000 }); if (!x.success) return U.toast(x.message, 'err'); U.toast(x.message, 'ok'); m.close(); await App.muatUlangBoot(); detailTpl(t.id); }); };
    var bA = $('[data-aktif]', m.el); if (bA) bA.onclick = function () { U.sibuk(bA, async function () { var x = await sim({ aktif: !t.aktif }); if (!x.success) return U.toast(x.message, 'err'); m.close(); await App.muatUlangBoot(); R.jalan(); }); };
  }

  // ============================================================ Audit Log
  R.add('audit', {
    title: 'Audit Log', roles: ['superadmin', 'approver'],
    render: function (view) {
      view.innerHTML = U.judul({ title: 'Audit Log', icon: 'history', sub: 'Jejak tambah-saja seluruh aksi penting. Tidak dapat diubah atau dihapus dari aplikasi.', aksi: '<button class="btn line" id="xlsAudit">' + ic('table_view') + 'Unduh Excel</button>' }) +
        '<div class="toolbar"><span class="pill-sel"><label>Aksi</label><select id="auAksi"><option value="">Semua</option></select></span><span class="pill-sel"><label>Tampilkan</label><select id="auN"><option>500</option><option>1000</option><option>2000</option></select></span><label class="pill-search grow">' + ic('search') + '<input id="auCari" placeholder="Cari email, ID, detail…"></label></div><div id="auList">' + U.skel(6, 44) + '</div>';
      var data = [], hal = 1;
      function gambar() {
        var a = $('#auAksi', view).value, f = $('#auCari', view).value.toLowerCase();
        var list = data.filter(function (x) { return (!a || x.aksi === a) && (!f || (x.email + ' ' + x.id + ' ' + x.detail + ' ' + x.aksi).toLowerCase().indexOf(f) >= 0); });
        var pg = U.paginasi(list, hal, 25, function (h) { hal = h; gambar(); });
        $('#auList', view).innerHTML = '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Terkait</th><th>Detail</th></tr></thead><tbody>' + (pg.list.length ? pg.list.map(function (x) { return '<tr style="cursor:default"><td data-l="Waktu" class="when">' + U.tgl(x.waktu) + '<small>' + U.jam(x.waktu) + '</small></td><td data-l="Pengguna">' + esc(x.email) + '</td><td data-l="Aksi"><span class="badge plain ' + (/GAGAL|DITOLAK|BATAL/.test(x.aksi) ? 'b-bad' : /RAHASIA/.test(x.aksi) ? 'b-rev' : 'b-sent') + '">' + esc(x.aksi) + '</span></td><td data-l="Terkait" style="max-width:180px;overflow-wrap:anywhere">' + esc(x.id) + '</td><td data-l="Detail" class="c-main" style="max-width:360px;overflow-wrap:anywhere;color:var(--muted)">' + esc(x.detail) + '</td></tr>'; }).join('') : '<tr><td colspan="5">' + U.kosong('Tidak ada entri.', 'history') + '</td></tr>') + '</tbody></table></div>' + pg.html + '</div>';
        pg.ikat(view);
      }
      function muat() {
        U.Data.ambil('audit.list', { limit: Number($('#auN', view).value) }, { maxAge: 15000, onData: function (d) {
          data = d; var aksi = {}; d.forEach(function (x) { aksi[x.aksi] = 1; }); var sel = $('#auAksi', view), cur = sel.value;
          sel.innerHTML = '<option value="">Semua</option>' + Object.keys(aksi).sort().map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); gambar();
        } }).catch(function (e) { gagal($('#auList', view), e, muat); });
      }
      $('#auAksi', view).onchange = function () { hal = 1; gambar(); }; $('#auCari', view).oninput = U.debounce(function () { hal = 1; gambar(); }, 150); $('#auN', view).onchange = muat;
      $('#xlsAudit', view).onclick = function () { var b = this; U.sibuk(b, function () { return U.eksporExcel('Audit-Log', [{ label: 'Waktu', key: 'waktu', w: 20 }, { label: 'Email', key: 'email', w: 28 }, { label: 'Aksi', key: 'aksi', w: 24 }, { label: 'ID terkait', key: 'id', w: 24 }, { label: 'Detail', key: 'detail', w: 60 }], data); }); };
      muat();
    }
  });

  // ============================================================ Pengaturan
  R.add('pengaturan', {
    title: 'Pengaturan',
    render: function (view, arg) {
      var sa = S.me.role === 'superadmin', ap = S.me.role === 'approver';
      var tabs = [['profil', 'Profil & Sesi']].concat(ap ? [['pin', 'PIN Persetujuan']] : []).concat(sa ? [['instansi', 'Identitas Instansi'], ['keamanan', 'Login & Keamanan'], ['sistem', 'Sistem & Kinerja'], ['migrasi', 'Migrasi Data']] : []);
      var tab = tabs.some(function (t) { return t[0] === arg[0]; }) ? arg[0] : 'profil';
      view.innerHTML = U.judul({ title: 'Pengaturan', icon: 'settings' }) + '<div class="toolbar"><div class="tabs">' + tabs.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div><div id="pBody" style="max-width:920px"></div>';
      $$('.toolbar .tabs button', view).forEach(function (b) { b.onclick = function () { location.hash = '#/pengaturan/' + b.dataset.t; }; });
      ({ profil: pProfil, pin: pPin, instansi: pInstansi, keamanan: pKeamanan, sistem: pSistem, migrasi: pMigrasi })[tab]($('#pBody', view));
    }
  });
  function pProfil(el) {
    var me = S.me;
    el.innerHTML = '<div class="card"><div class="person" style="gap:14px">' + U.avatar(me.nama, 'lg') + '<div><h3>' + esc(me.nama) + '</h3><div class="sub">' + esc(me.email) + ' · ' + esc(me.labelPeran) + '</div></div></div>' +
      '<dl class="kv" style="margin-top:18px"><dt>Unit</dt><dd>' + esc(namaUnit(me.unit)) + '</dd>' + (me.pejabat ? '<dt>Pejabat</dt><dd>' + esc(me.pejabat.jabatan) + ' · PIN ' + (me.pejabat.pinAda ? '✓' : 'belum dibuat') + '</dd>' : '') + '<dt>Tema</dt><dd><button class="btn sm" id="pTema">' + ic('contrast') + 'Ganti terang / gelap</button></dd></dl>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="btn" id="pKeluar">' + ic('logout') + 'Keluar</button><button class="btn danger" id="pKeluarSemua">' + ic('devices') + 'Keluar dari semua perangkat</button></div></div>' +
      '<div class="card flat" style="margin-top:16px"><h3>Pasang di HP</h3><p class="sub">Android (Chrome): menu ⋮ → <b>Instal aplikasi</b>. iPhone (Safari): <b>Bagikan</b> → <b>Tambahkan ke Layar Utama</b>. Aplikasi terbuka layar penuh seperti aplikasi biasa.</p></div>';
    $('#pTema', el).onclick = App.gantiTema; $('#pKeluar', el).onclick = function () { App.keluar(); };
    $('#pKeluarSemua', el).onclick = async function () { if (await U.konfirmasi({ title: 'Keluar dari semua perangkat?', msg: 'Semua sesi akun Anda (HP, laptop lain) akan diakhiri.', danger: true, okText: 'Keluar semua' })) { await U.api('auth.keluarSemua', {}); App.keluar(true); } };
  }
  function pPin(el) {
    var pj = S.me.pejabat;
    el.innerHTML = '<div class="card"><h3>PIN Persetujuan</h3><p class="sub">PIN 6 angka dipakai setiap kali Anda menyetujui surat. Disimpan sebagai hash bersalt di server (Script Properties), tidak pernah tersimpan di perangkat. 5× salah → terkunci 15 menit.</p>' +
      (pj ? '<div class="callout ' + (pj.pinAda ? 'ok' : 'rev') + '" style="margin:14px 0">' + ic(pj.pinAda ? 'verified_user' : 'warning') + '<div>' + (pj.pinAda ? 'PIN sudah aktif untuk ' + esc(pj.jabatan) + '.' : 'Anda belum membuat PIN — wajib sebelum menyetujui surat.') + '</div></div><button class="btn pri" id="bPin">' + ic('password') + (pj.pinAda ? 'Ganti PIN' : 'Buat PIN') + '</button>' : '<div class="callout bad" style="margin-top:14px">' + ic('error') + '<div>Akun Anda belum terdaftar sebagai pejabat aktif. Minta Admin menambahkan email Anda di Master Data → Pejabat.</div></div>') + '</div>';
    var b = $('#bPin', el); if (b) b.onclick = function () { App.aturPin(function () { R.jalan(); }); };
  }
  function pInstansi(el) {
    el.innerHTML = U.skel(6, 60);
    U.api('pengaturan.get', {}).then(function (r) {
      if (!r.success) return gagal(el, new Error(r.message), function () { pInstansi(el); });
      el.innerHTML = '<div class="card"><h3>Identitas Instansi & Aturan</h3><p class="sub">Dipakai pada kop template ({{INSTITUSI_NAMA}}, dst.), email, halaman verifikasi, dan penomoran.</p><form id="fCfg" style="display:grid;gap:14px;margin-top:16px">' +
        r.data.pengaturan.map(function (p) { return '<div class="field"><label>' + esc(p.kunci) + '</label>' + (p.kunci === 'NOMOR_SAAT' ? '<select class="select" name="' + p.kunci + '"><option value="setujui"' + (p.nilai === 'setujui' ? ' selected' : '') + '>setujui — nomor dibuat saat pejabat menyetujui (disarankan)</option><option value="ajukan"' + (p.nilai === 'ajukan' ? ' selected' : '') + '>ajukan — nomor dibuat saat surat diajukan</option></select>' : p.kunci === 'NOTIF_EMAIL_AKTIF' ? '<select class="select" name="' + p.kunci + '"><option' + (p.nilai === 'ya' ? ' selected' : '') + '>ya</option><option' + (p.nilai === 'tidak' ? ' selected' : '') + '>tidak</option></select>' : '<input class="input" name="' + p.kunci + '" value="' + esc(p.nilai) + '">') + '<span class="hint">' + esc(p.ket) + '</span></div>'; }).join('') +
        '<button class="btn pri" type="button" id="bCfg" style="justify-self:start">' + ic('save') + 'Simpan pengaturan</button></form></div>';
      $('#bCfg', el).onclick = function () { var b = this, nilai = {}; $$('[name]', el).forEach(function (i) { nilai[i.name] = i.value.trim(); }); U.sibuk(b, async function () { var x = await U.api('pengaturan.simpan', { nilai: nilai }); if (!x.success) return U.toast(x.message, 'err'); S.cfg = x.data.cfg; App.simpanBoot(); U.toast(x.message, 'ok'); }); };
    });
  }
  function pKeamanan(el) {
    el.innerHTML = U.skel(3, 80);
    U.api('pengaturan.get', {}).then(function (r) {
      if (!r.success) return gagal(el, new Error(r.message), function () { pKeamanan(el); });
      var k = r.data.keamanan;
      el.innerHTML = '<div class="card"><h3>Login Google (OAuth Client ID)</h3><p class="sub">Disimpan di Script Properties dan hanya ditampilkan tersamar. Tambahkan alamat aplikasi ini (<code>' + esc(location.origin) + '</code>) di <b>Authorized JavaScript origins</b>.</p><div class="field" style="margin-top:14px"><label>Client ID</label><input class="input" id="kCid" type="password" autocomplete="off" placeholder="' + esc(k.clientIdAda ? k.clientId : '1234567890-abc….apps.googleusercontent.com') + '"><span class="hint">Status: ' + (k.clientIdAda ? '✓ terpasang (' + esc(k.clientId) + ')' : 'belum diisi — pengguna belum bisa login Google') + '</span></div><button class="btn pri" id="bCid" style="margin-top:12px">' + ic('save') + 'Simpan Client ID</button></div>' +
        '<div class="card" style="margin-top:16px"><h3>Akses Darurat</h3><p class="sub">Akun <code>' + esc(k.daruratUser) + '</code> untuk masuk saat login Google belum siap. Halaman masuknya: <code>' + esc(location.origin + location.pathname) + '#/darurat</code> (tidak ditautkan di mana pun). Ganti sandi awal dari log setup.</p><div class="grid2" style="margin-top:14px">' + (S.me.darurat ? '<div class="field"><label>Sandi lama</label><input class="input" type="password" id="dLama" autocomplete="current-password"></div>' : '') + '<div class="field"><label>Sandi baru (≥12 karakter, huruf + angka)</label><input class="input" type="password" id="dBaru" autocomplete="new-password"></div></div><button class="btn danger" id="bDar" style="margin-top:12px">' + ic('key') + 'Ganti sandi darurat</button></div>';
      $('#bCid', el).onclick = function () { var b = this; U.sibuk(b, async function () { var x = await U.api('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('#kCid', el).value }); if (!x.success) return U.toast(x.message, 'err'); $('#kCid', el).value = ''; try { localStorage.removeItem('sk_authcfg'); } catch (e) { } U.toast('Client ID tersimpan (' + x.data.samar + ').', 'ok'); pKeamanan(el); }); };
      $('#bDar', el).onclick = function () { var b = this; U.sibuk(b, async function () { var x = await U.api('darurat.ganti', { sandiLama: ($('#dLama', el) || {}).value, sandiBaru: $('#dBaru', el).value }); if (!x.success) return U.toast(x.message, 'err'); U.toast(x.message, 'ok'); if (S.me.darurat) App.keluar(true); else pKeamanan(el); }); };
    });
  }
  function pSistem(el) {
    el.innerHTML = U.skel(4, 70);
    U.api('sistem.status', {}).then(function (r) {
      if (!r.success) return gagal(el, new Error(r.message), function () { pSistem(el); });
      var d = r.data;
      el.innerHTML = '<div class="card"><h3>Status Sistem</h3><dl class="kv" style="margin-top:14px"><dt>Versi backend</dt><dd>' + esc(d.versi) + '</dd><dt>Trigger aktif</dt><dd>' + esc(d.trigger.join(', ') || '—') + '</dd><dt>Keep-warm</dt><dd>' + (d.keepWarm ? 'menyala (tiap 1 menit)' : 'dimatikan (sengaja)') + '</dd><dt>Antrean email</dt><dd>' + d.antreanEmail + ' menunggu · sisa kuota hari ini ' + d.kuotaEmail + '</dd>' +
        '<dt>Cache server</dt><dd>' + d.cache.map(function (c) { return esc(c.sheet) + ': ' + (c.hangat ? '<b style="color:var(--green)">hangat</b>' : 'dingin'); }).join(' · ') + '</dd><dt>Warmup terakhir</dt><dd>' + esc(d.warmTerakhir ? d.warmTerakhir.at + ' (' + d.warmTerakhir.scope + ')' : '—') + '</dd><dt>Script Properties</dt><dd>' + Math.round(d.scriptPropsByte / 1024) + ' KB / 500 KB</dd><dt>Backup terakhir</dt><dd>' + esc(d.backupTerakhir || 'belum ada') + '</dd></dl>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn pri" id="bBackup">' + ic('backup') + 'Backup sekarang</button><a class="btn line" target="_blank" rel="noopener" href="' + esc(d.spreadsheet) + '">' + ic('table') + 'Buka Spreadsheet</a><a class="btn line" target="_blank" rel="noopener" href="' + esc(d.folder) + '">' + ic('folder') + 'Buka Folder Drive</a><button class="btn" id="bPerf">' + ic('speed') + 'Ringkasan kinerja (console)</button></div></div>' +
        '<div class="card flat" style="margin-top:16px"><h3>Catatan kinerja</h3><p class="sub">Data tampil seketika dari cache perangkat lalu diperbarui di latar. Perubahan yang Anda lakukan langsung di Google Sheets bisa tampil sampai ±10 menit kemudian — gunakan tombol muat ulang/ganti menu untuk menyegarkan. Kuota trigger akun Gmail ±90 menit/hari; keep-warm memakai ±10–20 menit. Matikan dengan fungsi <code>matikanKeepWarm</code> di editor bila perlu.</p></div>';
      $('#bBackup', el).onclick = function () { var b = this; U.sibuk(b, async function () { var x = await U.api('sistem.backup', {}, { timeout: 120000 }); U.toast(x.message, x.success ? 'ok' : 'err'); }); };
      $('#bPerf', el).onclick = function () { Perf.summary(); U.toast('Ringkasan dicetak di Console (F12).'); };
    });
  }
  function pMigrasi(el) {
    var SH = [['Klasifikasi_Arsip', 'Klasifikasi arsip'], ['Unit_Kerja', 'Unit kerja'], ['Jenis_Surat', 'Jenis surat'], ['Pejabat', 'Pejabat'], ['Pengguna', 'Pengguna'], ['Konfigurasi_Penomoran', 'Konfigurasi penomoran'], ['Registri_Nomor', 'Registri nomor'], ['Surat_Keluar', 'Surat keluar'], ['Surat_Masuk', 'Surat masuk'], ['Disposisi', 'Disposisi'], ['Ekspedisi', 'Ekspedisi'], ['Log_Audit', 'Log audit (lama)']];
    el.innerHTML = '<div class="card"><h3>Import Data dari Aplikasi Lama</h3><p class="sub">Spreadsheet lama <b>hanya dibaca</b>. Kolom dicocokkan berdasarkan nama (mis. "No Surat", "Tgl Surat", "Hal", "Kepada", "Sifat" dikenali otomatis). Aman diulang: data yang sudah ada tidak digandakan. Gunakan akun Google yang sama agar ID file PDF/scan lama tetap terbaca.</p>' +
      '<div class="field" style="margin-top:14px"><label>URL / ID spreadsheet lama</label><input class="input" id="mgSrc" placeholder="https://docs.google.com/spreadsheets/d/…/edit"></div>' +
      '<div class="field" style="margin-top:12px"><label>Data yang diimpor</label><div class="grid3">' + SH.map(function (s) { return '<label class="check"><input type="checkbox" value="' + s[0] + '"' + (s[0] === 'Log_Audit' ? '' : ' checked') + '>' + esc(s[1]) + '</label>'; }).join('') + '</div></div>' +
      '<label class="check" style="margin-top:6px"><input type="checkbox" id="mgTimpa">Timpa data yang sudah ada (bawaan: tidak — keputusan di aplikasi baru dipertahankan)</label>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn" id="mgScan">' + ic('search') + 'Pindai (dry-run)</button><button class="btn pri" id="mgRun">' + ic('cloud_sync') + 'Jalankan Import</button></div><div id="mgHasil" style="margin-top:16px"></div></div>' +
      '<div class="card flat" style="margin-top:16px"><h3>Langkah cutover</h3><ol class="sub" style="line-height:1.8"><li>Pindai → periksa jumlah Ditambah/Diperbarui/Dilewati.</li><li>Jalankan Import → cek Buku Agenda, Pengguna, Pejabat.</li><li>Tepat sebelum pindah: jalankan Import sekali lagi (delta sync).</li><li>Sesuaikan "Nomor terakhir" di Master → Penomoran bila perlu.</li><li>Umumkan alamat aplikasi baru. Sesi lama tidak ikut pindah — pengguna cukup login ulang.</li></ol></div>';
    function jalan(dry, btn) {
      var src = $('#mgSrc', el).value.trim(); if (!src) return U.toast('Tempel URL spreadsheet lama.', 'err');
      var sheets = $$('.grid3 input:checked', el).map(function (i) { return i.value; });
      U.sibuk(btn, async function () {
        if (!dry && !(await U.konfirmasi({ title: 'Jalankan import?', msg: 'Data dari spreadsheet lama akan ditulis ke database aplikasi ini.', okText: 'Jalankan' }))) return;
        var r = await U.api('migrasi.jalankan', { sumber: src, sheets: sheets, dryRun: dry, timpa: $('#mgTimpa', el).checked }, { timeout: 330000 });
        if (!r.success) return U.toast(r.message, 'err');
        var d = r.data;
        $('#mgHasil', el).innerHTML = '<div class="callout ' + (dry ? 'info' : 'ok') + '">' + ic(dry ? 'search' : 'check_circle') + '<div><b>' + esc(r.message) + '</b> Sumber: ' + esc(d.sumber.nama) + '</div></div>' +
          '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Data</th><th>Di app lama</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + Object.keys(d.laporan).map(function (k) { var x = d.laporan[k]; return '<tr style="cursor:default"><td><b>' + esc(k) + '</b>' + (x.sheetSumber ? '<div class="hint">dari "' + esc(x.sheetSumber) + '"</div>' : x.catatan ? '<div class="hint">' + esc(x.catatan) + '</div>' : '') + '</td><td class="num">' + x.sumber + '</td><td class="num"><b>' + x.ditambah + '</b></td><td class="num">' + x.diperbarui + '</td><td class="num">' + x.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          (d.peringatan.length ? '<div class="callout rev" style="margin-top:12px">' + ic('warning') + '<ul style="margin:0;padding-left:18px">' + d.peringatan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' : '');
        if (!dry) { U.Data.basi(['agenda.list', 'surat.list', 'masuk.list', 'dash.data', 'retensi.list']); await App.muatUlangBoot(); }
      });
    }
    $('#mgScan', el).onclick = function () { jalan(true, this); }; $('#mgRun', el).onclick = function () { jalan(false, this); };
  }
})();
