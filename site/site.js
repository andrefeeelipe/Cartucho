(function () {
  'use strict';

  var REPO = 'andrefeeelipe/cartucho';
  var LATEST_PAGE = 'https://github.com/' + REPO + '/releases/latest';
  var SOURCES = [
    'https://api.github.com/repos/' + REPO + '/releases/latest',
    'release.json' // reserva, no mesmo formato da API, ao lado deste arquivo
  ];
  var CACHE_KEY = 'cartucho-release-v1';
  var CACHE_TTL = 10 * 60 * 1000;

  // Cada arquivo é reconhecido pelo fim do nome. Os demais (loja.json, loja.tsv, cores-incluidos.txt...) são ignorados.
  var KINDS = [
    { id: 'android-arm64', end: 'arm64-v8a.apk' },
    { id: 'android-universal', end: 'universal.apk' },
    { id: 'android-32', end: 'armeabi-v7a.apk' },
    { id: 'android-x86', end: 'x86_64.apk' },
    { id: 'win-setup', end: 'windows-instalador.exe' },
    { id: 'win-zip', end: 'windows-x64.zip' },
    { id: 'sha-android', end: 'SHA256SUMS.txt' },
    { id: 'sha-windows', end: 'SHA256SUMS-windows.txt' }
  ];

  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // ---------- Aparelho de quem visita ----------
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isWindows = !isAndroid && /Windows/i.test(ua);
  var grid = document.getElementById('dl-grid');
  if (grid) {
    if (isAndroid) {
      var a = grid.querySelector('.dl-android');
      if (a) a.classList.add('is-yours');
    } else if (isWindows) {
      var w = grid.querySelector('.dl-win');
      if (w) w.classList.add('is-yours');
      grid.classList.add('windows-first');
    }
  }

  // ---------- Formatação ----------
  var nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  function formatSize(bytes) {
    if (typeof bytes !== 'number' || !isFinite(bytes)) return '';
    var mb = bytes / (1024 * 1024);
    if (mb >= 1000) return nf1.format(mb / 1024) + ' GB';
    if (mb >= 10) return Math.round(mb) + ' MB';
    return nf1.format(mb) + ' MB';
  }
  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---------- Cache (sessionStorage, 10 minutos) ----------
  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (c && Date.now() - c.t < CACHE_TTL && c.d) return c.d;
    } catch (e) { /* armazenamento indisponível */ }
    return null;
  }
  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* ignora */ }
  }

  // Guarda só o necessário da resposta.
  function slim(json) {
    if (!json || typeof json.tag_name !== 'string' || !Array.isArray(json.assets)) throw new Error('formato inesperado');
    return {
      tag_name: json.tag_name,
      published_at: json.published_at,
      assets: json.assets.map(function (x) {
        return { name: x.name, size: x.size, browser_download_url: x.browser_download_url };
      })
    };
  }

  function fetchFrom(i) {
    if (i >= SOURCES.length) return Promise.reject(new Error('sem fonte'));
    return fetch(SOURCES[i], { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(slim)
      .catch(function () { return fetchFrom(i + 1); });
  }

  // ---------- Aplicar na página ----------
  function classify(assets) {
    var found = {};
    assets.forEach(function (asset) {
      if (!asset || typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string') return;
      if (asset.browser_download_url.indexOf('https://') !== 0) return;
      for (var k = 0; k < KINDS.length; k++) {
        var name = asset.name;
        if (name.slice(-KINDS[k].end.length) === KINDS[k].end && !found[KINDS[k].id]) {
          found[KINDS[k].id] = asset;
          break;
        }
      }
    });
    return found;
  }

  function apply(rel) {
    var version = rel.tag_name.replace(/^v/i, '');
    var files = classify(rel.assets);

    $all('[data-asset]').forEach(function (el) {
      var f = files[el.getAttribute('data-asset')];
      el.setAttribute('href', f ? f.browser_download_url : LATEST_PAGE);
    });
    $all('[data-size]').forEach(function (el) {
      var f = files[el.getAttribute('data-size')];
      el.textContent = f ? formatSize(f.size) : '';
    });
    $all('[data-row]').forEach(function (el) {
      el.hidden = !files[el.getAttribute('data-row')];
    });

    var metaAndroid = document.querySelector('[data-meta="android"]');
    if (metaAndroid) {
      var fa = files['android-arm64'];
      metaAndroid.textContent = ['Versão ' + version, fa ? formatSize(fa.size) : '', 'Android 5.0+']
        .filter(Boolean).join(' · ');
    }
    var metaWin = document.querySelector('[data-meta="windows"]');
    if (metaWin) {
      var fw = files['win-setup'];
      metaWin.textContent = ['Versão ' + version, fw ? formatSize(fw.size) : '', 'Windows 10 ou 11, 64 bits']
        .filter(Boolean).join(' · ');
    }

    var line = document.querySelector('[data-release-line]');
    if (line) {
      var date = formatDate(rel.published_at);
      line.textContent = 'Versão ' + version + (date ? ', publicada em ' + date + '.' : '.');
    }
  }

  function showError() {
    var msg = 'Não deu para carregar a versão agora. ';
    ['android', 'windows'].forEach(function (k) {
      var el = document.querySelector('[data-meta="' + k + '"]');
      if (!el) return;
      el.textContent = msg;
      var link = document.createElement('a');
      link.href = LATEST_PAGE;
      link.textContent = 'Ver no GitHub';
      el.appendChild(link);
    });
    var line = document.querySelector('[data-release-line]');
    if (line) {
      line.textContent = msg;
      var l2 = document.createElement('a');
      l2.href = LATEST_PAGE;
      l2.className = 'inline';
      l2.textContent = 'Ver no GitHub';
      line.appendChild(l2);
    }
    $all('[data-size]').forEach(function (el) { el.textContent = ''; });
  }

  var cached = readCache();
  if (cached) {
    apply(cached);
  } else {
    fetchFrom(0).then(function (rel) {
      writeCache(rel);
      apply(rel);
    }).catch(showError);
  }
})();
