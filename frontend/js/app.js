/*
 * app.js — rangka halaman selepas log masuk: kawalan sesi, menu ikut peranan, dialog.
 * Bergantung pada config.js, api.js dan ui.js.
 */
(function () {
  'use strict';
  var el = UI.el;
  var ICON = 'assets/icons.svg#';

  function icon(name, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('class', 'icon');
    if (size) s.setAttribute('style', 'width:' + size + 'px;height:' + size + 'px');
    s.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS(ns, 'use');
    u.setAttribute('href', ICON + name);
    s.appendChild(u);
    return s;
  }

  var LABEL_ROLE = { guru: 'Guru', pentadbir: 'Pentadbir', superadmin: 'Superadmin' };

  /** Ke mana selepas log masuk. Notis privasi dahulu, kemudian tukar kata laluan. */
  function nextPage(sesi) {
    if (sesi.perlu_persetujuan_pdpa) return 'privasi.html';
    if (sesi.wajib_tukar_password) return 'tukar-password.html';
    return 'utama.html';
  }

  /**
   * Pastikan ada sesi sah sebelum paparkan halaman.
   * opt: { roles: [...], pendingPage: true jika halaman ini sebahagian langkah wajib }
   * Pulangkan objek sesi, atau null (dan alihkan halaman).
   */
  function guard(opt) {
    opt = opt || {};
    var s = Api.getSession();
    if (!s || !s.token || !s.sesi || Date.parse(s.expiry) <= Date.now()) {
      Api.clearSession();
      location.replace('index.html' + (s ? '?tamat=1' : ''));
      return null;
    }
    var pending = s.sesi.perlu_persetujuan_pdpa || s.sesi.wajib_tukar_password;
    if (pending && !opt.pendingPage) { location.replace(nextPage(s.sesi)); return null; }
    if (opt.roles && opt.roles.indexOf(s.sesi.role) === -1) { location.replace('utama.html'); return null; }
    // Sahkan dengan server di latar (token mungkin dibatalkan) dan dapatkan tarikh luput terkini.
    if (!opt.pendingPage) Api.call('SESI_SAYA').then(updateSesi).catch(function () {});
    return s.sesi;
  }

  /** Simpan ringkasan sesi baharu (selepas SETUJU_PDPA / TUKAR_PASSWORD). */
  function updateSesi(sesi) {
    var s = Api.getSession();
    if (s) {
      if (sesi.expiry) { s.expiry = sesi.expiry; delete sesi.expiry; }
      s.sesi = sesi; Api.setSession(s);
    }
  }

  function logout() {
    Api.call('LOGOUT').catch(function () { /* tetap keluar walaupun pelayan gagal */ })
      .then(function () { Api.clearSession(); location.replace('index.html'); });
  }

  function navItems(role, sistem) {
    var admin = role === 'pentadbir' || role === 'superadmin';
    var items = [
      { label: 'Utama' },
      { key: 'utama', href: 'utama.html', text: 'Laman utama', icon: 'i-dashboard' }
    ];
    // Akaun sistem (contoh ADMIN01) bukan guru: tiada profil, kurikulum, koku atau HEM sendiri
    if (!sistem) items = items.concat([
      { key: 'profil', href: 'profil.html', text: 'Profil saya', icon: 'i-users' },
      { label: 'Bahagian' },
      { key: 'kuri', href: 'kurikulum.html', text: 'Kurikulum', icon: 'i-book' },
      { key: 'koku', href: 'koku.html', text: 'Kokurikulum', icon: 'i-trophy' },
      { key: 'hem', href: 'hem.html', text: 'HEM', icon: 'i-heart' }
    ]);
    if (admin) {
      items.push({ label: 'Pentadbiran' });
      items.push({ key: 'dashboard', href: 'dashboard.html', text: 'Dashboard sekolah', icon: 'i-dashboard' });
      items.push({ key: 'guru', href: 'guru.html', text: 'Senarai guru', icon: 'i-clipboard' });
      items.push({ key: 'ganti', href: 'slot-kosong.html', text: 'Cari guru ganti', icon: 'i-search' });
      items.push({ key: 'koku-urus', href: 'koku-urus.html', text: 'Urus kokurikulum', icon: 'i-trophy' });
      items.push({ key: 'hem-urus', href: 'hem-urus.html', text: 'Urus HEM', icon: 'i-heart' });
      items.push({ key: 'import-jadual', href: 'import-jadual.html', text: 'Import jadual (aSc)', icon: 'i-download' });
      items.push({ key: 'import-tugasan', href: 'import-tugasan.html', text: 'Import tugasan', icon: 'i-download' });
      items.push({ key: 'akaun', href: 'akaun.html', text: 'Urus akaun', icon: 'i-shield' });
      if (role === 'superadmin') items.push({ key: 'rujukan', href: 'rujukan.html', text: 'Data rujukan', icon: 'i-sliders' });
    }
    items.push({ label: 'Akaun saya' });
    items.push({ key: 'password', href: 'tukar-password.html', text: 'Tukar kata laluan', icon: 'i-shield' });
    return items;
  }

  /** Bina sidebar + topbar. Pulangkan elemen kandungan untuk diisi oleh halaman. */
  function mount(opt) {
    var sesi = opt.sesi;
    var nav = el('nav', { class: 'nav' });
    navItems(sesi.role, sesi.akaun_sistem).forEach(function (it) {
      if (it.label) { nav.appendChild(el('div', { class: 'nav-label' }, it.label)); return; }
      var a = el('a', { href: it.href || '#' }, [icon(it.icon), it.text]);
      if (it.soon) { a.className = 'soon'; a.setAttribute('aria-disabled', 'true'); a.appendChild(el('span', { class: 'chip' }, it.soon)); }
      if (it.key === opt.active) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    var initials = (sesi.nama_penuh || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
    var logo = el('img', { src: 'assets/logo-96.png', alt: 'Logo SMIAAG', width: '44', height: '44' });
    var sidebar = el('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': 'Menu utama' }, [
      el('div', { class: 'brand' }, [logo, el('div', {}, [el('b', {}, 'Profil Guru'), el('span', {}, 'SMI Al-Amin Gombak')])]),
      nav,
      el('div', { class: 'userbox' }, [
        el('div', { class: 'avatar', 'aria-hidden': 'true' }, initials),
        el('div', {}, [el('b', {}, sesi.nama_penuh), el('span', {}, sesi.guru_kod + ' · ' + LABEL_ROLE[sesi.role])])
      ])
    ]);
    var menuBtn = el('button', { class: 'menu-btn', 'aria-label': 'Buka menu', 'aria-controls': 'sidebar' }, icon('i-menu'));
    var outBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, [icon('i-logout', 16), 'Log keluar']);
    var content = el('div', { class: 'content' });
    var shell = el('div', { class: 'shell' }, [
      sidebar,
      el('div', { class: 'scrim', id: 'scrim' }),
      el('div', { class: 'main' }, [
        el('header', { class: 'topbar' }, [menuBtn, el('h1', {}, opt.title), el('span', { class: 'spacer' }), outBtn]),
        el('main', {}, content)
      ])
    ]);
    document.body.appendChild(shell);
    menuBtn.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    shell.querySelector('#scrim').addEventListener('click', function () { document.body.classList.remove('nav-open'); });
    outBtn.addEventListener('click', logout);
    return content;
  }

  /**
   * Dialog ringkas. opt: { title, body: [nodes], actions: [{text, kind, value}] }
   * Pulangkan Promise dengan `value` butang yang ditekan (atau null jika ditutup).
   */
  function dialog(opt) {
    return new Promise(function (resolve) {
      var foot = el('div', { class: 'modal-foot' });
      var d = el('dialog', { class: 'modal', 'aria-labelledby': 'dlg-title' }, [
        el('div', { class: 'modal-head' }, el('h2', { id: 'dlg-title' }, opt.title)),
        el('div', { class: 'modal-body' }, opt.body || []),
        foot
      ]);
      (opt.actions || [{ text: 'Tutup', kind: 'btn-secondary', value: null }]).forEach(function (a) {
        var b = el('button', { class: 'btn ' + (a.kind || ''), type: 'button' }, a.text);
        b.addEventListener('click', function () {
          if (a.onClick) {
            var r = a.onClick(b);
            if (r === false) return;
            if (r && r.then) { r.then(function (v) { if (v !== false) { d.close(); resolve(a.value); } }); return; }
          }
          d.close(); resolve(a.value);
        });
        foot.appendChild(b);
      });
      d.addEventListener('cancel', function () { resolve(null); });
      d.addEventListener('close', function () { setTimeout(function () { d.remove(); }, 0); });
      document.body.appendChild(d);
      d.showModal();
    });
  }

  function confirmDialog(title, message, okText, danger) {
    return dialog({
      title: title,
      body: [el('p', {}, message)],
      actions: [
        { text: 'Batal', kind: 'btn-secondary', value: false },
        { text: okText || 'Teruskan', kind: danger ? 'btn-danger' : '', value: true }
      ]
    });
  }

  /**
   * Borang dalam dialog.
   * opt: { title, submitText, fields: [{ name, label, type, options, value, required, hint, placeholder, attrs }],
   *        onSubmit: function (values) -> Promise }
   * type: text | number | date | select | textarea | checkbox. options: [{ kod, label }] atau [{ value, label }].
   * Ralat daripada onSubmit dipaparkan dalam dialog; dialog kekal terbuka.
   */
  function formDialog(opt) {
    var inputs = {};
    var alertText = el('span');
    var alertBox = el('div', { class: 'notice notice-error', role: 'alert' }, alertText);
    alertBox.hidden = true;
    var body = [alertBox];
    opt.fields.forEach(function (f, i) {
      var id = 'fd-' + f.name + '-' + i;
      var input;
      if (f.type === 'select') {
        input = el('select', { class: 'select', id: id, style: 'min-height:46px' });
        if (!f.required) input.appendChild(el('option', { value: '' }, f.placeholder || '— Pilih —'));
        (f.options || []).forEach(function (o) {
          var v = o.kod !== undefined ? o.kod : (o.value !== undefined ? o.value : o.id);
          var op = el('option', { value: v }, o.label || o.nama);
          if (String(v) === String(f.value == null ? '' : f.value)) op.selected = true;
          input.appendChild(op);
        });
      } else if (f.type === 'textarea') {
        input = el('textarea', { class: 'input', id: id, maxlength: '1000' });
        input.value = f.value || '';
      } else if (f.type === 'multicheck') {
        var box = el('div', { class: 'multicheck', role: 'group', 'aria-label': f.label });
        var chosen = (f.value || []).map(String);
        var checks = (f.options || []).map(function (o) {
          var v = String(o.value !== undefined ? o.value : (o.id !== undefined ? o.id : o.kod));
          var cb = el('input', { type: 'checkbox', value: v });
          cb.checked = chosen.indexOf(v) !== -1;
          box.appendChild(el('label', {}, [cb, o.label || o.nama]));
          return cb;
        });
        if (!checks.length) box.appendChild(el('span', { class: 'muted', style: 'font-size:.875rem' }, f.emptyText || 'Tiada pilihan.'));
        inputs[f.name] = { multi: checks, focus: function () { if (checks[0]) checks[0].focus(); } };
        var mparts = [el('span', { class: 'field-label' }, f.label + (f.required ? '' : ' (pilihan)')), box];
        if (f.hint) mparts.push(el('span', { class: 'hint' }, f.hint));
        body.push(el('div', { class: 'field' }, mparts));
        return;
      } else if (f.type === 'checkbox') {
        input = el('input', { type: 'checkbox', id: id });
        input.checked = !!f.value;
        body.push(el('label', { class: 'check-inline', for: id }, [input, f.label]));
        inputs[f.name] = input;
        return;
      } else {
        input = el('input', { class: 'input', id: id, type: f.type || 'text' });
        if (f.value !== undefined && f.value !== null) input.value = f.value;
      }
      if (f.placeholder && f.type !== 'select') input.setAttribute('placeholder', f.placeholder);
      Object.keys(f.attrs || {}).forEach(function (k) { input.setAttribute(k, f.attrs[k]); });
      inputs[f.name] = input;
      var parts = [el('label', { for: id }, f.label + (f.required ? '' : ' (pilihan)')), input];
      if (f.hint) parts.push(el('span', { class: 'hint' }, f.hint));
      body.push(el('div', { class: 'field' }, parts));
    });
    var result;
    var p = dialog({
      title: opt.title,
      body: body,
      actions: [
        { text: 'Batal', kind: 'btn-secondary', value: null },
        { text: opt.submitText || 'Simpan', value: 'ok', onClick: function (b) {
          alertBox.hidden = true;
          var values = {};
          var missing = null;
          opt.fields.forEach(function (f) {
            var inp = inputs[f.name];
            var v;
            if (f.type === 'multicheck') {
              v = inp.multi.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
              if (f.required && !v.length && !missing) missing = f;
              values[f.name] = v;
              return;
            }
            v = f.type === 'checkbox' ? inp.checked : inp.value.trim();
            if (f.type === 'number' && v !== '') v = Number(v);
            if (v === '') v = null;
            if (f.required && v === null && !missing) missing = f;
            values[f.name] = v;
          });
          if (missing) { alertText.textContent = missing.label + ' wajib diisi.'; alertBox.hidden = false; inputs[missing.name].focus(); return false; }
          if (opt.validate) {
            var vm = opt.validate(values);
            if (vm) { alertText.textContent = vm; alertBox.hidden = false; return false; }
          }
          b.disabled = true; b.textContent = 'Menyimpan...';
          return Promise.resolve(opt.onSubmit(values)).then(function (r) { result = r; return true; }, function (e) {
            alertText.textContent = e.message; alertBox.hidden = false;
            b.disabled = false; b.textContent = opt.submitText || 'Simpan';
            return false;
          });
        } }
      ]
    }).then(function (v) { return v === 'ok' ? result : null; });
    setTimeout(function () { var first = inputs[opt.fields[0].name]; if (first && first.focus) first.focus(); }, 50);
    return p;
  }

  /** Rangka (skeleton) semasa data dimuatkan: beberapa kad dengan garisan berkilau. */
  function rangka(bil) {
    var box = el('div', { class: 'rangka', 'aria-hidden': 'true' });
    for (var i = 0; i < (bil || 3); i++) {
      box.appendChild(el('div', { class: 'card rangka-kad' }, [el('i', { style: 'width:40%' }), el('i', { style: 'width:90%' }), el('i', { style: 'width:75%' }), el('i', { style: 'width:60%' })]));
    }
    return box;
  }

  /** Pilihan tahun akademik: 10 tahun ke hadapan hingga 10 tahun ke belakang (terbaru di atas). */
  var JULAT_TAHUN = 10;
  function senaraiTahun() {
    var y = new Date().getFullYear(), out = [];
    for (var t = y + JULAT_TAHUN; t >= y - JULAT_TAHUN; t--) out.push(t);
    return out;
  }

  var HARI_PENDEK = { isnin: 'ISN', selasa: 'SEL', rabu: 'RAB', khamis: 'KHA', jumaat: 'JUM', sabtu: 'SAB', ahad: 'AHD' };

  /** Status beban -> { kelas lencana, teks } */
  function bebanBadge(st) {
    return st === 'lebih' ? { kind: 'over', text: 'Melebihi had' } : st === 'hampir' ? { kind: 'near', text: 'Hampir had' } : { kind: 'ok', text: 'Dalam had' };
  }

  function labelOf(list, kod) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].kod === kod) return list[i].label;
    return kod || '';
  }

  /** 2026-11-06T18:30:00+08:00 -> 06/11/2026, 6:30 ptg */
  function fmtDateTime(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
    if (!m) return '';
    var h = +m[4], ampm = h < 12 ? 'pg' : (h < 19 ? 'ptg' : 'mlm');
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return m[3] + '/' + m[2] + '/' + m[1] + ', ' + h12 + ':' + m[5] + ' ' + ampm;
  }

  window.App = {
    icon: icon, nextPage: nextPage, guard: guard, updateSesi: updateSesi, logout: logout, mount: mount,
    dialog: dialog, confirm: confirmDialog, formDialog: formDialog, labelOf: labelOf, senaraiTahun: senaraiTahun, rangka: rangka, bebanBadge: bebanBadge, HARI_PENDEK: HARI_PENDEK, fmtDateTime: fmtDateTime, LABEL_ROLE: LABEL_ROLE
  };
})();
