/**
 * Статический режим: адрес ручки API → путь файла в опубликованном сайте.
 *
 * На GitHub Pages сервера нет, а весь контент уже лежит в репозитории — просто
 * под другими именами: `/api/cache/i/zombieani.png` физически хранится как
 * `images/cache/creatures/zombie/zombieani.png`. Раскладку задают
 * `handle_cache` (api/handlers/battle.py) и `resolve_cache_path`
 * (api/image_service.py); здесь она повторена ОДИН В ОДИН.
 *
 * Расхождение с сервером означает битую картинку на опубликованном сайте и
 * ничего больше — ошибка тихая. Поэтому паритет проверяется тестом
 * tests/test_static_asset_mapping.py: он гоняет обе реализации на реальных
 * путях, выдранных из исходников SPA, и падает при первом различии.
 *
 * Модуль намеренно без импортов и без ESM: его подключает service worker через
 * importScripts, а jest — через require.
 */
(function (root) {
  'use strict';

  // Санитайзер имени файла. Питон использует `\w` в юникод-режиме, JS — только
  // ASCII; на именах ассетов CDN (латиница, цифры, подчёркивания) разницы нет.
  var UNSAFE_CHARS = /[^\w.\-]/g;

  var UI_PATH_RE = /^i\/combat\/[\w\-/]+\.(?:png|jpg|jpeg|gif|webp)$/;
  var SND_PATH_RE = /^snd\/[\w\-]+(?:\/[\w\-]+)*\.mp3$/;
  var PORTRAIT_RE = /^[A-Za-z0-9_-]+$/;

  /**
   * Имя существа из имени файла анимации: 'zombieani.png' → 'zombie'.
   * Копия `_guess_creature_name` из api/handlers/battle.py вместе с финальной
   * проверкой символов — без неё stem вида '..ani' увёл бы путь из creatures/.
   */
  function guessCreatureName(filename) {
    var stem = filename.indexOf('.') !== -1
      ? filename.slice(0, filename.lastIndexOf('.'))
      : filename;
    stem = stem.replace(/_\d+\..+$/, '');
    if (/^[bfg]\d+[_.]/.test(stem) || stem === 'b0' || stem === 'f0' || stem === 'g0') {
      return null;
    }
    var creature;
    var m = /^(.+?)ani\d*$/.exec(stem);
    if (m) {
      creature = m[1];
    } else {
      m = /^(.+?)(?:_\w{1,4})$/.exec(stem);
      if (m && m[1].length > 2) {
        creature = m[1];
      } else {
        return null;
      }
    }
    return /^[A-Za-z0-9_-]+$/.test(creature) ? creature : null;
  }

  /** Путь кэша для `/api/cache/<fullPath>`; null — такой ассет не отдаётся. */
  function cachePath(fullPath) {
    if (!fullPath || fullPath.indexOf('..') !== -1) return null;

    // Звуки и картинки боевого интерфейса зеркалят структуру каталогов CDN как
    // есть: у них имена совпадают между подкаталогами (snd/attack/arrow.mp3 и
    // snd/run/arrow.mp3), и плющить их до basename нельзя.
    if (fullPath.indexOf('snd/') === 0) {
      return SND_PATH_RE.test(fullPath) ? 'images/cache/' + fullPath : null;
    }
    if (UI_PATH_RE.test(fullPath)) {
      return 'images/cache/' + fullPath.slice(2); // без ведущего 'i/'
    }

    var queryAt = fullPath.indexOf('?');
    var pathPart = queryAt === -1 ? fullPath : fullPath.slice(0, queryAt);
    var query = queryAt === -1 ? '' : fullPath.slice(queryAt + 1);

    var verSuffix = '';
    var verMatch = /(?:^|&)(?:ver|v)=([^&]*)/.exec(query);
    if (verMatch && verMatch[1]) verSuffix = '_' + decodeURIComponent(verMatch[1]);

    var originalFilename = pathPart.slice(pathPart.lastIndexOf('/') + 1) || 'file';
    var dot = originalFilename.lastIndexOf('.');
    var name = dot === -1 ? originalFilename : originalFilename.slice(0, dot);
    var ext = dot === -1 ? '' : originalFilename.slice(dot + 1);
    var readable = ext ? name + verSuffix + '.' + ext : name + verSuffix;
    readable = readable.replace(UNSAFE_CHARS, '_');

    var creature = guessCreatureName(originalFilename);
    var dir = creature ? 'creatures/' + creature : 'anims';
    if (pathPart.indexOf('i/effects/') === 0) {
      var effectDir = pathPart.slice('i/'.length, pathPart.lastIndexOf('/'))
        .split('/').map(function(part) { return part.replace(UNSAFE_CHARS, '_'); }).join('/');
      return 'images/cache/' + effectDir + '/' + readable;
    }
    return 'images/cache/' + dir + '/' + readable;
  }

  /** Подкаталог прокси-кэша по пути CDN — копия ветвления в `_proxy_image`. */
  function proxySubfolder(urlPath) {
    if (urlPath.indexOf('/stats-new/') !== -1 || urlPath.indexOf('/attr_') !== -1) return 'stats';
    if (urlPath.indexOf('/artifacts/') !== -1) return 'artifacts';
    if (urlPath.indexOf('/f/') !== -1 && /\/f\/r?\d+/.test(urlPath)) return 'factions';
    if (urlPath.indexOf('/portraits/') !== -1) return 'portraits';
    if (urlPath.indexOf('/fractions/') !== -1) return 'factions';
    return 'misc';
  }

  /**
   * Путь кэша для `/api/img?url=<CDN URL>`.
   *
   * Сервер на именах без ровно одной точки уходит в md5 от URL. Повторить это в
   * воркере нечем (SubtleCrypto не знает md5), но такие имена среди ассетов SPA
   * не встречаются: возвращаем null, картинка честно уходит в onerror-заглушку.
   */
  function imgPath(cdnUrl) {
    if (!cdnUrl) return null;
    var urlPath;
    try {
      urlPath = new URL(cdnUrl).pathname;
    } catch (e) {
      return null;
    }
    var originalFilename = urlPath.slice(urlPath.lastIndexOf('/') + 1).split('?')[0] || 'img';
    var safeName = originalFilename.replace(UNSAFE_CHARS, '_');
    if (!safeName || safeName.split('.').length - 1 !== 1) return null;
    return 'images/cache/' + proxySubfolder(urlPath) + '/' + safeName;
  }

  /**
   * Портрет существа: сначала комплектный p60, затем осевший в кэше p30 —
   * тот же порядок, что в `api.routers.media.portrait`.
   */
  function portraitPaths(pic) {
    if (!PORTRAIT_RE.test(pic || '')) return [];
    return ['images/portraits/' + pic + 'anip60.png',
            'images/cache/portraits/' + pic + 'anip30.png'];
  }

  // Дампы данных, которые кладёт scripts/build_static_data.py. Ключ — путь
  // ручки, значение — файл рядом с сайтом.
  var DATA_ROUTES = {
    '/api/units': 'data/units.json',
    '/api/factions': 'data/factions.json',
    '/api/artifacts': 'data/artifacts.json',
    '/api/abilities': 'data/abilities.json',
    '/api/magics': 'data/magics.json',
  };

  /**
   * Кандидаты статических файлов для адреса ручки.
   *
   * @param {string} pathname путь без базового префикса сайта, с ведущим '/'
   * @param {string} search   строка запроса вместе с '?' (или '')
   * @returns {string[]} пути относительно корня сайта; пусто — не наш адрес
   */
  function resolve(pathname, search) {
    search = search || '';
    if (pathname.indexOf('/api/cache/') === 0) {
      var full = pathname.slice('/api/cache/'.length) + search;
      var p = cachePath(full);
      return p ? [p] : [];
    }
    if (pathname === '/api/img') {
      var m = /(?:^|[?&])url=([^&]*)/.exec(search);
      var img = m ? imgPath(decodeURIComponent(m[1])) : null;
      return img ? [img] : [];
    }
    if (pathname.indexOf('/api/portrait/') === 0) {
      return portraitPaths(pathname.slice('/api/portrait/'.length));
    }
    if (DATA_ROUTES[pathname]) return [DATA_ROUTES[pathname]];
    if (pathname === '/api/artifact-desc') return ['data/artifact_desc.json'];
    return [];
  }

  /**
   * Ответ, который на статике синтезируется без файла.
   *
   * `/api/nano/load` — правки анимации существа: на сервере их хранит
   * `data/nano/` (в репозиторий не попадает), а отсутствие записи он и сам
   * отдаёт нулями. Возвращаем ровно это, чтобы карточка существа не спотыкалась
   * о 404 там, где сервер ответил бы успехом.
   */
  function synthetic(pathname) {
    if (pathname === '/api/nano/load') return { atk: 0, def: 0, ini: 0 };
    return null;
  }

  var api = {
    resolve: resolve,
    synthetic: synthetic,
    cachePath: cachePath,
    imgPath: imgPath,
    portraitPaths: portraitPaths,
    guessCreatureName: guessCreatureName,
    proxySubfolder: proxySubfolder,
  };

  root.HWMStaticAssets = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
