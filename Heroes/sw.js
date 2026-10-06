// v24: видео замков поехало оригиналами вместо пережатых. Адрес у них тот же
// (/web/castles/<имя>.mp4), а ветка медиа в этом воркере — cache-first: без
// смены имени кэша тот, кто уже открывал сайт, до конца жизни браузера получал
// бы старый пережатый файл.
// v25: artIconB перестала суффиксить уже-«_b»-иконки (bmedal5_b.png →
// bmedal5_b_b.png, которого нет на CDN). Бандл пересобран, но ставится он
// только со сменой имени кэша — иначе воркер до конца жизни браузера отдаёт
// старый artIconB, и каждая вкладка артефактов висит на сетевых фоллбэках
// изображений. И до этого меняли имя по той же причине (v24: кастл-видео).
// v27: иконки объектов карты (web/images/statics/*.png) рисуются из боевых
// атласов скриптом scripts/gen_statics_icons.mjs, а карточка существа берёт их
// вместо прозрачного портрета-заглушки. Картинки ветка кэша ниже подхватывает
// сама, а вот пересобранный бандл ставится только со сменой имени кэша.
// v26: иконка маны в книге магии заводится через прокси (/api/img) вместо
// хотлинка на dcdn, который тянулся в обход кэша и офлайн-стор. Менять имя
// приходится ради того, кто успел поставить v25 из незавершённой серии правок
// — иначе воркер до конца жизни браузера отдаёт старый слой хотлинков.
var CACHE = 'heroeswm-v28';

// Статический режим (GitHub Pages): подменять ручки API файлами из репозитория.
// Флаг и таблица путей лежат отдельными файлами — см. static-mode.js.
importScripts('./static-mode.js', './static-assets.js');

// Корень сайта относительно домена: '/' у обычного сервера, '/<репозиторий>/'
// на project-страницах GitHub. Всё ниже считается ОТНОСИТЕЛЬНО него, иначе на
// Pages воркер искал бы файлы в корне домена, где ничего нет.
var SCOPE_PATH = new URL('./', self.location.href).pathname;

// Только то, что на диске ЕСТЬ: `cache.addAll` — операция «всё или ничего»,
// один 404 роняет установку, и новый обработчик не встаёт вовсе. Раньше здесь
// значился `/styles.css`, которого в проекте нет; спасал только SPA-фолбэк
// сервера, отдававший на него index.html.
// Пути относительные (не '/js/konva.js', а './js/konva.js') по той же причине,
// что и SCOPE_PATH: абсолютный путь на project-странице уводит в корень домена.
var ASSETS = [
  './',
  './sw-register.js',
  './offline.html',
  './static-mode.js',
  './static-assets.js',
  './js/konva.js',
  './enginep.js',
  './anim_effects.js',
  './show_info.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  // Production build
  './dist/bundle.js',
  './dist/index.html',
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/**
 * Что отдавать, когда сети нет и в кэше пусто.
 *
 * Страница-заглушка годится ТОЛЬКО для навигации. Раньше её получали все —
 * включая скрипты: браузер начинал разбирать HTML как JS, падал на
 * «Unexpected token '<'», и вместо честной офлайн-страницы пользователь
 * получал полуживую оболочку — тёмную, потому что тема применяется бандлом,
 * а он не выполнился. Для всего остального честнее пустой 504.
 */
function offlineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match(new URL('./offline.html', self.location.href).href).then(function(r) {
      return r || new Response('', { status: 504, statusText: 'Offline' });
    });
  }
  return Promise.resolve(new Response('', { status: 504, statusText: 'Offline' }));
}

// ── Статический режим: ручки API → файлы репозитория ───────────────────────

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Первый существующий файл из списка кандидатов; найденный оседает в кэше. */
function firstExisting(paths, index) {
  index = index || 0;
  if (index >= paths.length) return Promise.resolve(null);
  var href = new URL(paths[index], self.location.href).href;
  return caches.match(href).then(function(hit) {
    if (hit) return hit;
    return fetch(href).then(function(resp) {
      if (!resp.ok) return firstExisting(paths, index + 1);
      var copy = resp.clone();
      caches.open(CACHE).then(function(cache) { cache.put(href, copy); });
      return resp;
    }).catch(function() { return firstExisting(paths, index + 1); });
  });
}

/** `/api/artifact-desc?key=` — сервер отдаёт одно описание, статика хранит все. */
function staticArtifactDesc(search) {
  var m = /(?:^|[?&])key=([^&]*)/.exec(search || '');
  var key = m ? decodeURIComponent(m[1]).trim().toLowerCase() : '';
  if (!key) return Promise.resolve(jsonResponse({ error: 'no key' }, 400));
  return firstExisting(['data/artifact_desc.json']).then(function(resp) {
    if (!resp) return jsonResponse({ error: 'description not published' }, 404);
    return resp.json().then(function(map) {
      var desc = map && map[key];
      return desc ? jsonResponse({ desc: desc })
                  : jsonResponse({ error: 'description not published' }, 404);
    }).catch(function() { return jsonResponse({ error: 'bad dump' }, 500); });
  });
}

function staticApiResponse(rel, search) {
  var synth = self.HWMStaticAssets.synthetic(rel);
  if (synth) return Promise.resolve(jsonResponse(synth));
  if (rel === '/api/artifact-desc') return staticArtifactDesc(search);
  var candidates = self.HWMStaticAssets.resolve(rel, search);
  if (!candidates.length) {
    // Бой, реплеи, сохранение сборок — всё, что считает Python. На статике
    // такого нет и быть не может: честный 404 вместо молчаливого зависания.
    return Promise.resolve(jsonResponse({ error: 'Недоступно в статической версии сайта' }, 404));
  }
  return firstExisting(candidates).then(function(resp) {
    return resp || jsonResponse({ error: 'not found' }, 404);
  });
}

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  // Путь относительно корня сайта: на project-странице GitHub это '/<репо>/…',
  // и без снятия префикса ни одна ветка ниже не узнала бы свои адреса.
  var rel = url.pathname.indexOf(SCOPE_PATH) === 0
    ? url.pathname.slice(SCOPE_PATH.length - 1)
    : url.pathname;

  if (self.HWM_STATIC && url.origin === self.location.origin
      && rel.indexOf('/api/') === 0) {
    e.respondWith(staticApiResponse(rel, url.search));
    return;
  }

  var bypassPatterns = ['/sw.js', '/sw-register.js', '/index.html', '/api/img', '/api/cache/i'];
  var isBypass = bypassPatterns.some(function(b) { return e.request.url.indexOf(b) !== -1; });

  if (isBypass) {
    e.respondWith(fetch(e.request).catch(function() { return offlineFallback(e.request); }));
    return;
  }

  // Данные API кэшировать нельзя: они меняются, и ветка cache-first ниже
  // однажды сохранит ответ навсегда. Так и вышло с отметками «проверено
  // вручную»: галочка сохранялась на сервере, а страница после перезагрузки
  // показывала пустой список — читателю она врала о собственном состоянии.
  // Исключение — прокси картинок (/api/img, /api/cache/i): они выше, в
  // bypassPatterns, и там кэш как раз нужен.
  if (url.origin === self.location.origin && rel.indexOf('/api/') === 0) {
    // Только сеть, без подмены из кэша даже при отказе: устаревшее состояние
    // хуже честной ошибки — вызывающий код умеет её показать.
    e.respondWith(fetch(e.request));
    return;
  }

  // Navigations (SPA routes like /battle), styles.css and ALL same-origin scripts must be
  // network-first: cache-first pinned users to stale code forever whenever the reference
  // wasn't (or was incorrectly) cache-busted — the enginep.js?v=6 incident, where engine
  // fixes silently never reached the browser until the ?v= was bumped by hand. The build
  // now content-hashes script URLs too (web/build.mjs), but network-first here protects the
  // dev flow (unhashed web/index.html) and any future unhashed reference as well. Cache is
  // only a fallback for offline; the local/API server makes the extra roundtrip negligible.
  var isNavigate = e.request.mode === 'navigate';
  // ВСЕ same-origin стили, не только styles.css: battle.css из cache-first однажды
  // залип на старой версии — правки арены не доезжали до браузера.
  var isStyles = e.request.url.indexOf(self.location.origin) === 0 && /\.css(\?|$)/.test(e.request.url);
  var isLocalScript = e.request.url.indexOf(self.location.origin) === 0 && /\.js(\?|$)/.test(e.request.url);
  if (isNavigate || isStyles || isLocalScript) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp.ok && e.request.url.startsWith(self.location.origin)) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(r) { return r || offlineFallback(e.request); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(resp) {
        if (resp.ok && resp.status !== 206 && e.request.url.startsWith(self.location.origin)) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
        }
        return resp;
      }).catch(function() { return offlineFallback(e.request); });
    })
  );
});
