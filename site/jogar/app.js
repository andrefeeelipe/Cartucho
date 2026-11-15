// Cartucho Web — biblioteca guardada no próprio navegador (IndexedDB) e consoles por extensão.
// Os jogos nunca saem do aparelho: ficam salvos no Safari/Chrome de quem joga.
(function () {
  'use strict';

  // Consoles que rodam no navegador do celular (sistema do EmulatorJS, nome, sigla, extensões, pasta de capas do libretro).
  var SYSTEMS = [
    { id: 'nes', name: 'NES / Famicom', short: 'NES', ext: ['nes', 'fds', 'unf', 'unif'], thumbs: 'Nintendo - Nintendo Entertainment System' },
    { id: 'snes', name: 'Super Nintendo', short: 'SNES', ext: ['sfc', 'smc', 'fig', 'swc'], thumbs: 'Nintendo - Super Nintendo Entertainment System' },
    { id: 'gb', name: 'Game Boy', short: 'GB', ext: ['gb', 'dmg'], thumbs: 'Nintendo - Game Boy' },
    { id: 'gb', name: 'Game Boy Color', short: 'GBC', ext: ['gbc', 'cgb'], thumbs: 'Nintendo - Game Boy Color', key: 'gbc' },
    { id: 'gba', name: 'Game Boy Advance', short: 'GBA', ext: ['gba', 'agb'], thumbs: 'Nintendo - Game Boy Advance' },
    { id: 'n64', name: 'Nintendo 64', short: 'N64', ext: ['n64', 'z64', 'v64'], thumbs: 'Nintendo - Nintendo 64' },
    { id: 'nds', name: 'Nintendo DS', short: 'NDS', ext: ['nds'], thumbs: 'Nintendo - Nintendo DS' },
    { id: 'vb', name: 'Virtual Boy', short: 'VB', ext: ['vb', 'vboy'], thumbs: 'Nintendo - Virtual Boy' },
    { id: 'psx', name: 'PlayStation', short: 'PS1', ext: ['pbp', 'chd', 'iso', 'img', 'bin'], thumbs: 'Sony - PlayStation' },
    { id: 'segaMD', name: 'Mega Drive', short: 'MD', ext: ['md', 'gen', 'smd'], thumbs: 'Sega - Mega Drive - Genesis' },
    { id: 'segaMS', name: 'Master System', short: 'SMS', ext: ['sms'], thumbs: 'Sega - Master System - Mark III' },
    { id: 'segaGG', name: 'Game Gear', short: 'GG', ext: ['gg'], thumbs: 'Sega - Game Gear' },
    { id: 'sega32x', name: 'Sega 32X', short: '32X', ext: ['32x'], thumbs: 'Sega - 32X' },
    { id: 'pce', name: 'PC Engine', short: 'PCE', ext: ['pce', 'sgx'], thumbs: 'NEC - PC Engine - TurboGrafx 16' },
    { id: 'ngp', name: 'Neo Geo Pocket', short: 'NGP', ext: ['ngp', 'ngc'], thumbs: 'SNK - Neo Geo Pocket Color' },
    { id: 'ws', name: 'WonderSwan', short: 'WS', ext: ['ws', 'wsc'], thumbs: 'Bandai - WonderSwan Color' },
    { id: 'atari2600', name: 'Atari 2600', short: '2600', ext: ['a26'], thumbs: 'Atari - 2600' },
    { id: 'atari7800', name: 'Atari 7800', short: '7800', ext: ['a78'], thumbs: 'Atari - 7800' },
    { id: 'lynx', name: 'Atari Lynx', short: 'LYNX', ext: ['lnx'], thumbs: 'Atari - Lynx' },
    { id: 'coleco', name: 'ColecoVision', short: 'CV', ext: ['col', 'cv'], thumbs: 'Coleco - ColecoVision' },
    { id: 'arcade', name: 'Arcade (FinalBurn Neo)', short: 'ARC', ext: [], thumbs: 'FBNeo - Arcade Games' }
  ];

  function systemByKey(key) {
    for (var i = 0; i < SYSTEMS.length; i++) if ((SYSTEMS[i].key || SYSTEMS[i].id) === key) return SYSTEMS[i];
    return null;
  }
  function keyOf(s) { return s.key || s.id; }

  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }
  // Console pelo nome do arquivo. .zip e .7z são abertos pelo emulador, mas o console precisa ser escolhido.
  function guessSystem(name) {
    var ext = extOf(name);
    if (!ext || ext === 'zip' || ext === '7z') return null;
    for (var i = 0; i < SYSTEMS.length; i++) if (SYSTEMS[i].ext.indexOf(ext) >= 0) return keyOf(SYSTEMS[i]);
    return null;
  }

  // Nome bonito: sem extensão, sem (região) [tags], sem sublinhados.
  function titleOf(name) {
    var t = (name || '').replace(/\.[a-z0-9]+$/i, '');
    t = t.replace(/[\(\[][^\)\]]*[\)\]]/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return t || name;
  }
  function stemOf(name) { return (name || '').replace(/\.[a-z0-9]+$/i, ''); }

  // Capa do projeto libretro-thumbnails pelo nome do arquivo (nomes no padrão No-Intro / Redump).
  function coverUrls(game) {
    var s = systemByKey(game.system);
    if (!s || !s.thumbs) return [];
    var clean = function (x) { return x.replace(/[&*\/:`<>?\\|"]/g, '_'); };
    var base = 'https://thumbnails.libretro.com/' + encodeURIComponent(s.thumbs) + '/Named_Boxarts/';
    var stem = stemOf(game.name);
    var out = [base + encodeURIComponent(clean(stem)) + '.png'];
    var noTags = stem.replace(/\s*\[[^\]]*\]/g, '').trim();
    if (noTags !== stem) out.push(base + encodeURIComponent(clean(noTags)) + '.png');
    return out;
  }

  // ------------------------------------------------------------ IndexedDB
  var DB_NAME = 'cartucho-web', STORE = 'games';
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var result;
        Promise.resolve(fn(store, function (r) { result = r; })).catch(reject);
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('abortado')); };
      });
    });
  }
  function listGames() {
    return tx('readonly', function (store, done) {
      var out = [];
      var req = store.openCursor();
      req.onsuccess = function () {
        var c = req.result;
        if (c) {
          var v = c.value;
          out.push({ id: v.id, name: v.name, system: v.system, size: v.size, added: v.added, lastPlayed: v.lastPlayed || 0 });
          c.continue();
        } else done(out);
      };
    });
  }
  function getGame(id) {
    return tx('readonly', function (store, done) {
      var req = store.get(id);
      req.onsuccess = function () { done(req.result || null); };
    });
  }
  function putGame(g) { return tx('readwrite', function (store) { store.put(g); }); }
  function deleteGame(id) { return tx('readwrite', function (store) { store.delete(id); }); }
  function touchGame(id) {
    return getGame(id).then(function (g) {
      if (!g) return;
      g.lastPlayed = Date.now();
      return putGame(g);
    });
  }
  function addFile(file, system) {
    var id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return putGame({ id: id, name: file.name, system: system, size: file.size, added: Date.now(), lastPlayed: 0, blob: file }).then(function () { return id; });
  }

  function formatSize(bytes) {
    var mb = bytes / (1024 * 1024);
    if (mb >= 1000) return (mb / 1024).toFixed(1).replace('.', ',') + ' GB';
    if (mb >= 10) return Math.round(mb) + ' MB';
    return mb.toFixed(1).replace('.', ',') + ' MB';
  }

  window.Cartucho = {
    SYSTEMS: SYSTEMS, systemByKey: systemByKey, keyOf: keyOf, guessSystem: guessSystem, titleOf: titleOf, stemOf: stemOf,
    coverUrls: coverUrls, listGames: listGames, getGame: getGame, putGame: putGame, deleteGame: deleteGame,
    touchGame: touchGame, addFile: addFile, formatSize: formatSize, extOf: extOf
  };
})();
