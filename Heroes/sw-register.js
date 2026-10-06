(function() {
  // ── Спасательный круг от отравленного кэша ───────────────────────────────
  // Кэш мог однажды запомнить HTML под адресом скрипта или стиля: SPA-фолбэк
  // сервера отдавал index.html на любой ненайденный путь, а офлайн-ветка
  // service worker'а — страницу-заглушку. Оба места исправлены, но у тех, кто
  // успел это поймать, отравленная запись живёт дальше и обычная перезагрузка
  // ничего не меняет: отдаётся то же самое. Признаков два — не выполнился
  // бандл или не применились стили; в обоих случаях один раз за вкладку чистим
  // всё и перезагружаемся. Один раз — иначе получился бы цикл.
  function appLooksBroken() {
    // Бандл не выполнился: страница осталась оболочкой без приложения.
    if (!window.__appBooted) return true;
    // Стили не применились: `--bg` объявлена в base.css на :root, и пустая
    // строка означает, что лист не доехал (или под его URL лежит не CSS).
    // Симптом ровно такой: data-theme стоит, кнопка темы показывает солнце —
    // а страница тёмная, потому что правил светлой темы в CSSOM просто нет.
    try {
      var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg');
      if (!bg || !bg.trim()) return true;
    } catch (e) { /* нечего проверить — считаем, что всё в порядке */ }
    return false;
  }

  window.addEventListener('load', function() {
    setTimeout(function() {
      if (!appLooksBroken()) return;
      try {
        if (sessionStorage.getItem('hwm-sw-selfheal')) return;
        sessionStorage.setItem('hwm-sw-selfheal', '1');
      } catch (e) { return; }
      console.warn('Приложение или стили не загрузились — чистим кэш и перезагружаемся');
      var done = function() { window.location.reload(); };
      var jobs = [];
      if ('serviceWorker' in navigator) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs) {
          return Promise.all(rs.map(function(r) { return r.unregister(); }));
        }));
      }
      if (window.caches) {
        jobs.push(caches.keys().then(function(ks) {
          return Promise.all(ks.map(function(k) { return caches.delete(k); }));
        }));
      }
      Promise.all(jobs).then(done, done);
    }, 4000);
  });

  if ('serviceWorker' in navigator) {
    var refreshing = false;
    // Контроллер на момент загрузки страницы. `controllerchange` прилетает при
    // ЛЮБОМ захвате страницы воркером, включая ПЕРВУЮ установку: только что
    // зарегистрированный воркер активируется и делает `clients.claim()`, и
    // страница, которая и так загрузилась нормально, молча перезагружается.
    // Перезагружать имеет смысл только когда воркер сменился ПОД открытой
    // страницей (значит, на диске новая сборка и в памяти старый бандл) —
    // тогда `controller` до события не пустой, и это наш случай. При первой
    // установке `controller === null` и мы не трогаем страницу: незачем рвать
    // её на середине (в e2e это давало «Execution context was destroyed»).
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (!hadController) {
        console.log('SW took control (первая установка) — перезагрузка не нужна');
        return;
      }
      if (!refreshing) {
        refreshing = true;
        console.log('New SW activated, reloading...');
        window.location.reload();
      }
    });

    window.addEventListener('load', function() {
      // Адрес относительный: на project-странице GitHub воркер лежит не в корне
      // домена, а рядом с index.html — и область его видимости должна быть той же.
      navigator.serviceWorker.register('./sw.js').then(function(reg) {
        console.log('SW registered, scope:', reg.scope);
        // Check for updates immediately
        if (reg.active) {
          reg.update().then(function() {
            console.log('SW update check complete');
          }).catch(function(err) {
            console.warn('SW update check failed:', err);
          });
        }
      }).catch(function(err) {
        console.warn('SW registration failed:', err);
      });
    });
  } else {
    console.log('Service Worker not supported');
  }
})();
