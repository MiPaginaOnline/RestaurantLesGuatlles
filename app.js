/* Restaurant Les Guatlles — interacciones */
(function () {
  'use strict';
  var root = document.documentElement;
  var T = window.LG_TEXTOS || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Idiomas (castellano, català, English) ---------- */
  var lang = root.getAttribute('data-lang') || 'es';
  function tr(key) { return T[key] ? (T[key][lang] || T[key].es) : ''; }

  function applyLang(l, save) {
    lang = T.nav_carta && T.nav_carta[l] ? l : 'es';
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    if (save) { try { localStorage.setItem('lg-lang', lang); } catch (e) { /* sin almacenamiento */ } }
    $$('[data-i18n]').forEach(function (el) { var v = tr(el.getAttribute('data-i18n')); if (v) el.textContent = v; });
    $$('[data-i18n-ph]').forEach(function (el) { var v = tr(el.getAttribute('data-i18n-ph')); if (v) el.placeholder = v; });
    $$('[data-i18n-alt]').forEach(function (el) { var v = tr(el.getAttribute('data-i18n-alt')); if (v) el.alt = v; });
    $$('[data-i18n-aria]').forEach(function (el) { var v = tr(el.getAttribute('data-i18n-aria')); if (v) el.setAttribute('aria-label', v); });
    $$('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === lang ? 'true' : 'false'); });
    updateStatus();
    indexSearch();
  }
  $$('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-set-lang'), true); });
  });

  /* ---------- Abierto / cerrado (hora de Madrid) ---------- */
  function madridNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return { day: o.weekday.toLowerCase().slice(0, 3), mins: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var d = new Date();
      return { day: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()], mins: d.getHours() * 60 + d.getMinutes() };
    }
  }
  var OPEN = 13 * 60 + 30, CLOSE = 17 * 60;

  function updateStatus() {
    var now = madridNow();
    var weekend = now.day === 'sat' || now.day === 'sun';
    var key;
    if (weekend && now.mins >= OPEN && now.mins < CLOSE) key = 'st_open';
    else if (weekend && now.mins < OPEN) key = 'st_today';
    else if (now.day === 'fri' || (now.day === 'sat' && now.mins >= CLOSE)) key = 'st_tomorrow';
    else if (now.day === 'sun' && now.mins >= CLOSE) key = 'st_saturday';
    else key = 'st_saturday';
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', key === 'st_open');
      var txt = $('.status__text', el);
      txt.removeAttribute('data-i18n');
      txt.textContent = tr(key);
    });
    $$('.hours tr').forEach(function (r) {
      var today = r.getAttribute('data-day') === now.day;
      r.classList.toggle('is-today', today);
      if (today) r.querySelector('th').setAttribute('data-today', { es: 'hoy', ca: 'avui', en: 'today' }[lang]);
    });
  }

  /* ---------- Transición entre páginas ---------- */
  var wipe = $('.wipe');
  function startIntro() {
    if (root.classList.contains('is-ready')) return;
    var go = function () { requestAnimationFrame(function () { root.classList.add('is-ready'); }); };
    var done = false, once = function () { if (!done) { done = true; go(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(once);
    setTimeout(once, 600);
  }
  function reveal() {
    if (root.classList.contains('is-entering') && wipe) {
      wipe.classList.add('is-out');
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('is-entering'); }); });
      setTimeout(startIntro, 300);
      setTimeout(function () { wipe.classList.remove('is-out'); }, 1000);
    } else startIntro();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || !wipe || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(tel|mailto):/i.test(href)) return;
    if (a.origin !== location.origin && location.protocol !== 'file:') return;
    if (a.pathname === location.pathname) return;
    e.preventDefault();
    try { sessionStorage.setItem('lg-wipe', '1'); } catch (err) { /* nada */ }
    closeMenu();
    wipe.classList.add('is-in');
    setTimeout(function () { location.href = a.href; }, 620);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && wipe) { wipe.classList.remove('is-in'); root.classList.remove('is-entering'); root.classList.add('is-ready'); }
  });

  /* ---------- Cabecera ---------- */
  var header = $('.site-header');
  var lastY = scrollY, ticking = false;
  function onScroll() {
    var y = scrollY;
    header.classList.toggle('is-solid', y > 40);
    var hide = !root.classList.contains('menu-open') && y > 500 && y > lastY + 4;
    if (hide) { header.classList.add('is-hidden'); root.classList.add('header-hidden'); }
    if (y < lastY - 4) { header.classList.remove('is-hidden'); root.classList.remove('header-hidden'); }
    lastY = y; ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var menuBtn = $('.menu-btn'), mobileMenu = $('.mobile-menu');
  function setMenuLabel() { $('.visually-hidden', menuBtn).textContent = root.classList.contains('menu-open') ? ({ es: 'Cerrar menú', ca: 'Tancar menú', en: 'Close menu' })[lang] : tr('menu'); }
  function openMenu() { root.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); mobileMenu.removeAttribute('inert'); setMenuLabel(); }
  function closeMenu() {
    if (!menuBtn || !root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); mobileMenu.setAttribute('inert', ''); setMenuLabel();
  }
  if (menuBtn && mobileMenu) {
    mobileMenu.setAttribute('inert', '');
    menuBtn.addEventListener('click', function () { root.classList.contains('menu-open') ? closeMenu() : openMenu(); });
    $$('a', mobileMenu).forEach(function (a) { a.addEventListener('click', function () { if ((a.getAttribute('href') || '').indexOf('#') !== -1) closeMenu(); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', function () { if (innerWidth > 920) closeMenu(); });
  }

  /* ---------- Carta: pestañas y buscador ---------- */
  var tabs = $$('.tabs a');
  if (tabs.length && 'IntersectionObserver' in window) {
    var secs = tabs.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tabs.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    secs.forEach(function (s) { if (s) io.observe(s); });
  }
  tabs.forEach(function (a) {
    a.addEventListener('click', function () {
      var input = $('.search input');
      if (input && input.value) { input.value = ''; filter(''); }
    });
  });

  var input = $('.search input');
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function indexSearch() {
    // el buscador encuentra el plato en los tres idiomas, pongas el que pongas
    $$('.dish').forEach(function (d) { d.setAttribute('data-norm', norm(d.getAttribute('data-search') + ' ' + d.textContent)); });
  }
  function filter(q) {
    q = norm(q.trim());
    var any = false;
    $$('.menu-sec').forEach(function (sec) {
      var shown = 0;
      $$('.dish', sec).forEach(function (d) { var ok = !q || d.getAttribute('data-norm').indexOf(q) !== -1; d.classList.toggle('is-hidden', !ok); if (ok) shown++; });
      sec.classList.toggle('is-hidden', shown === 0);
      if (shown) any = true;
    });
    var empty = $('.menu-empty'); if (empty) empty.hidden = any;
  }
  if (input) input.addEventListener('input', function () { filter(input.value); });

  /* ---------- Año ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Arranque ---------- */
  applyLang(lang, false);
  reveal();
  setInterval(updateStatus, 60000);
})();
