/* Smart Beauty Hub: всё содержание приходит из content/, здесь только движок.
   Страницы описаны в content/site.json, тексты в Markdown, тест в content/quiz.json. */
(function () {
  'use strict';

  var CONTENT = 'content/';
  var GSTORE = 'onb:';
  var STORE = GSTORE;   // после входа: onb:u:<id>: — у каждого пользователя свой прогресс
  var mem = {};         // запасное хранилище, если браузер закрыл localStorage (приватное окно)
  var user = null;
  var site = null;
  var cache = {};

  var CALLOUTS = {
    'ПРИМЕР': { cls: 'example', label: 'Пример', icon: 'lightbulb' },
    'ЗАДАНИЕ': { cls: 'task', label: 'Задание', icon: 'pencil' },
    'САМОПРОВЕРКА': { cls: 'check', label: 'Самопроверка', icon: 'list-checks' },
    'ПРЕДПОЛОЖЕНИЕ': { cls: 'guess', label: 'Предположение: не подтверждено брендом', icon: 'info' },
    'ВАЖНО': { cls: 'important', label: 'Важно', icon: 'triangle-alert' },
    'МОЖНО': { cls: 'yes', label: 'Можно', icon: 'check' },
    'НЕЛЬЗЯ': { cls: 'no', label: 'Нельзя', icon: 'ban' },
    'ОБЯЗАТЕЛЬНО': { cls: 'must', label: 'Обязательно', icon: 'target' },
    'ИСТОЧНИК': { cls: 'source', label: 'Источник', icon: 'book-open' },
    'ПЕРВОИСТОЧНИК': { cls: 'origin', label: 'Где читать в первоисточнике', icon: 'book-open' },
    'ПАМЯТКА': { cls: 'memo', label: 'Памятка в работу', icon: 'pin' },
    'ТАК': { cls: 'so', label: 'Так', icon: 'check' },
    'НЕ ТАК': { cls: 'notso', label: 'Не так', icon: 'x' },
    'УТОЧНЯЕТСЯ': { cls: 'tbd', label: 'Уточняется у бренда', icon: 'clock' },
    'ЗАЧЕМ': { cls: 'why', label: 'Зачем этот модуль', icon: 'target' }
  };

  // Иконки: Lucide (ISC) и Tabler «dental» (MIT), линейные 24×24
  var ICONS = {
      "circle-play": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"m10 8 6 4-6 4z\"/>",
      "compass": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z\"/>",
      "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/> <circle cx=\"9\" cy=\"7\" r=\"4\"/> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>",
      "package": "<path d=\"m7.5 4.27 9 5.15\"/> <path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\"/> <path d=\"m3.3 7 8.7 5 8.7-5\"/> <path d=\"M12 22V12\"/>",
      "message-circle": "<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>",
      "camera": "<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\"/> <circle cx=\"12\" cy=\"13\" r=\"3\"/>",
      "trending-up": "<path d=\"M22 7 13.5 15.5 8.5 10.5 2 17\"/> <path d=\"M16 7h6v6\"/>",
      "clapperboard": "<path d=\"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z\"/> <path d=\"m6.2 5.3 3.1 3.9\"/> <path d=\"m12.4 3.4 3.1 4\"/> <path d=\"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z\"/>",
      "graduation-cap": "<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"/> <path d=\"M22 10v6\"/> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"/>",
      "send": "<path d=\"m22 2-7 20-4-9-9-4Z\"/> <path d=\"M22 2 11 13\"/>",
      "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/> <path d=\"m16 17 5-5-5-5\"/> <path d=\"M21 12H9\"/>",
      "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\"/> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
      "zap": "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"/>",
      "flag": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/> <path d=\"M4 22v-7\"/>",
      "arrow-right": "<path d=\"M5 12h14\"/> <path d=\"m12 5 7 7-7 7\"/>",
      "menu": "<path d=\"M4 6h16\"/> <path d=\"M4 12h16\"/> <path d=\"M4 18h16\"/>",
      "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M4.929 4.929 19.07 19.071\"/>",
      "book-open": "<path d=\"M12 5v16\"/> <path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\"/>",
      "check": "<path d=\"M20 6 9 17l-5-5\"/>",
      "circle-help": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/> <path d=\"M12 17h.01\"/>",
      "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 6v6l4 2\"/>",
      "coffee": "<path d=\"M10 2v2\"/> <path d=\"M14 2v2\"/> <path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\"/> <path d=\"M6 2v2\"/>",
      "file-pen-line": "<path d=\"M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z\"/> <path d=\"M14.487 7.858A1 1 0 0 1 14 7V2\"/> <path d=\"M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516\"/> <path d=\"M8 18h1\"/>",
      "folder-open": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>",
      "house": "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>",
      "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 16v-4\"/> <path d=\"M12 8h.01\"/>",
      "leaf": "<path d=\"M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20\"/> <path d=\"M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13\"/>",
      "lightbulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/> <path d=\"M9 18h6\"/> <path d=\"M10 22h4\"/>",
      "list-checks": "<path d=\"M13 5h8\"/> <path d=\"M13 12h8\"/> <path d=\"M13 19h8\"/> <path d=\"m3 17 2 2 4-4\"/> <path d=\"m3 7 2 2 4-4\"/>",
      "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/> <path d=\"m15 5 4 4\"/>",
      "pin": "<path d=\"M12 17v5\"/> <path d=\"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z\"/>",
      "sparkles": "<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\"/> <path d=\"M20 2v4\"/> <path d=\"M22 4h-4\"/> <circle cx=\"4\" cy=\"20\" r=\"2\"/>",
      "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <circle cx=\"12\" cy=\"12\" r=\"6\"/> <circle cx=\"12\" cy=\"12\" r=\"2\"/>",
      "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/> <path d=\"M12 9v4\"/> <path d=\"M12 17h.01\"/>",
      "x": "<path d=\"M18 6 6 18\"/> <path d=\"m6 6 12 12\"/>",
      "cup": "<path d=\"M5 11h14v-3h-14l0 3\"/> <path d=\"M17.5 11l-1.5 10h-8l-1.5 -10\"/> <path d=\"M6 8v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1\"/> <path d=\"M15 5v-2\"/>",
      "dental": "<path d=\"M12 5.5c-1.074 -.586 -2.583 -1.5 -4 -1.5c-2.1 0 -4 1.247 -4 5c0 4.899 1.056 8.41 2.671 10.537c.573 .756 1.97 .521 2.567 -.236c.398 -.505 .819 -1.439 1.262 -2.801c.292 -.771 .892 -1.504 1.5 -1.5c.602 0 1.21 .737 1.5 1.5c.443 1.362 .864 2.295 1.262 2.8c.597 .759 2 .993 2.567 .237c1.615 -2.127 2.671 -5.637 2.671 -10.537c0 -3.74 -1.908 -5 -4 -5c-1.423 0 -2.92 .911 -4 1.5\"/> <path d=\"M12 5.5l3 1.5\"/>"
  };

  function icon(name, cls) {
    if (!ICONS[name]) return '';
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function rawGet(k) {
    try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* приватное окно */ }
    return k in mem ? mem[k] : null;
  }
  function rawSet(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* приватное окно */ } }
  function rawDel(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* приватное окно */ } }
  function allKeys() {
    var ks = Object.keys(mem);
    try { ks = ks.concat(Object.keys(localStorage)); } catch (e) { /* приватное окно */ }
    return ks;
  }
  function load(key) { try { return JSON.parse(rawGet(STORE + key)); } catch (e) { return null; } }
  function save(key, val) { rawSet(STORE + key, JSON.stringify(val)); }
  function gload(key) { try { return JSON.parse(rawGet(GSTORE + key)); } catch (e) { return null; } }
  function gsave(key, val) { rawSet(GSTORE + key, JSON.stringify(val)); }

  function fetchText(file) {
    if (cache[file]) return Promise.resolve(cache[file]);
    return fetch(CONTENT + file, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Не найден файл ' + file);
      return r.text();
    }).then(function (t) { cache[file] = t; return t; });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- вход и личный кабинет ---------- */
  // Тестовый вход без пароля: имя становится ключом личного раздела в хранилище браузера.
  // Пароли и общий сервер появятся позже; формат users/current менять тогда же.

  var COUNTRY_OPTS = [['ru', 'Россия'], ['kz', 'Казахстан'], ['all', 'Обе страны']];
  function countryLabel(c) {
    var o = COUNTRY_OPTS.find(function (x) { return x[0] === c; });
    return o ? o[1] : 'Обе страны';
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  }

  var BRAND_OPTS = [
    ['belukha', 'Предгорья Белухи', 'чай, иван-чай, мёд'],
    ['biorepair', 'Biorepair®', 'зубные пасты и уход'],
    ['all', 'Оба бренда', 'работаю с обоими']
  ];

  function userList() { return gload('users') || []; }
  function userId(name) {
    return name.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, '-').replace(/[^a-zа-я0-9-]/g, '').slice(0, 40) || 'user';
  }
  function firstName(u) { return (u && u.name || '').split(/\s+/)[0]; }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function brandLabel(b) {
    var o = BRAND_OPTS.find(function (x) { return x[0] === b; });
    return o ? o[1] : 'Оба бренда';
  }

  function setUser(u) {
    user = u;
    STORE = u ? GSTORE + 'u:' + u.id + ':' : GSTORE;
    document.body.classList.toggle('auth', !u);
    renderUserMenu();
  }

  // Прогресс, накопленный до появления входа, достаётся первому вошедшему
  function adoptLegacy(id) {
    var pre = GSTORE + 'u:' + id + ':';
    allKeys().forEach(function (k) {
      if (k.indexOf(GSTORE) !== 0 || k.indexOf(GSTORE + 'u:') === 0) return;
      var rest = k.slice(GSTORE.length);
      if (rest === 'done' || rest === 'quiz' || rest === 'finished' || rest === 'brandPref' || rest.indexOf('checks:') === 0) {
        if (rawGet(pre + rest) === null) rawSet(pre + rest, rawGet(k));
        rawDel(k);
      }
    });
  }

  function login(name, brand, country) {
    var list = userList();
    var id = userId(name);
    var u = list.find(function (x) { return x.id === id; });
    if (!u) {
      if (!list.length) adoptLegacy(id);
      u = { id: id, name: name, brand: brand || 'all', country: country || 'all', created: Date.now() };
      list.push(u);
    } else {
      if (brand) u.brand = brand;
      if (country) u.country = country;
    }
    u.last = Date.now();
    gsave('users', list);
    gsave('current', u.id);
    setUser(u);
    if (brand) save('brandPref', brand);
    if (country) save('countryPref', country);
  }

  function logout() {
    gsave('current', null);
    setUser(null);
    show();
  }

  function restoreUser() {
    var id = gload('current');
    var u = id && userList().find(function (x) { return x.id === id; });
    setUser(u || null);
  }

  var menuCloser = null;
  function renderUserMenu() {
    var box = document.querySelector('.user-menu');
    if (!box) return;
    if (!user) { box.innerHTML = ''; return; }
    box.innerHTML = '<button type="button" class="um-btn" aria-expanded="false" aria-haspopup="true">' +
      '<span class="avatar" aria-hidden="true">' + esc(initials(user.name)) + '</span>' +
      '<span class="um-name">' + esc(firstName(user)) + '</span></button>' +
      '<div class="um-pop" hidden><p class="um-who"><b>' + esc(user.name) + '</b><span>' + esc(brandLabel(user.brand)) + '</span></p>' +
      '<div class="um-brand"><span>Мой бренд</span><div>' + BRAND_OPTS.map(function (o) {
        return '<button type="button" data-b="' + o[0] + '" aria-pressed="' + ((load('brandPref') || user.brand || 'all') === o[0]) + '">' + esc(o[0] === 'all' ? 'Оба' : o[1]) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="um-brand um-country"><span>Моя страна</span><div>' + COUNTRY_OPTS.map(function (o) {
        return '<button type="button" data-c="' + o[0] + '" aria-pressed="' + ((load('countryPref') || user.country || 'all') === o[0]) + '">' + esc(o[0] === 'all' ? 'Обе' : o[1]) + '</button>';
      }).join('') + '</div></div>' +
      '<a class="um-item" href="#/home">' + icon('house') + 'Личный кабинет</a>' +
      '<button type="button" class="um-item um-out">' + icon('log-out') + 'Сменить пользователя</button>' +
      '<p class="um-note">' + icon('lock') + '<span>Тестовый вход без пароля. Прогресс хранится в этом браузере.</span></p></div>';
    var btn = box.querySelector('.um-btn');
    var pop = box.querySelector('.um-pop');
    var close = function () { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      btn.setAttribute('aria-expanded', String(!pop.hidden));
    });
    pop.addEventListener('click', function (e) { e.stopPropagation(); if (e.target.closest('a')) close(); });
    box.querySelector('.um-out').addEventListener('click', function () { close(); logout(); });
    box.querySelectorAll('.um-brand button').forEach(function (b) {
      b.addEventListener('click', function () {
        var list = userList();
        var u = list.find(function (x) { return x.id === user.id; });
        var key = b.dataset.c ? 'country' : 'brand';
        var val = b.dataset.c || b.dataset.b;
        if (u) { u[key] = val; gsave('users', list); user = u; }
        save(key + 'Pref', val);
        close();
        renderUserMenu();
        show();
      });
    });
    if (menuCloser) document.removeEventListener('click', menuCloser);
    menuCloser = close;
    document.addEventListener('click', menuCloser);
  }

  function renderLogin(root) {
    var known = userList().slice().sort(function (a, b) { return (b.last || 0) - (a.last || 0); }).slice(0, 4);
    var posters = (site.loginPosters || []).map(function (src) {
      return '<img src="' + esc(src) + '" alt="">';
    }).join('');
    root.innerHTML = '<section class="login">' +
      '<div class="login-art" aria-hidden="true"><div class="login-reels">' + posters + posters + '</div>' +
      '<div class="login-art-cap"><b>Восемь роликов брендов, которые обогнали обычный результат в 4–368 раз.</b> Посмотрите их на первом шаге.</div></div>' +
      '<div class="login-card">' +
      '<div class="login-brand-row"><span class="logo-mark big"></span><span>Smart Beauty Hub</span></div>' +
      '<h1>Добро пожаловать в команду креаторов</h1>' +
      '<p class="lead">' + site.pages.filter(function (p) { return p.step; }).length + ' коротких шагов: бренды, их правила и то, как мы работаем.</p>' +
      '<form class="login-form" novalidate>' +
      '<label class="lf-label" for="lg-name">Как к вам обращаться</label>' +
      '<input id="lg-name" class="lf-input" name="name" autocomplete="name" placeholder="Например, Анна Смирнова" maxlength="40" required>' +
      '<p class="lf-err" role="alert" hidden></p>' +
      '<fieldset class="lf-brands"><legend class="lf-label">С каким брендом работаете</legend>' +
      BRAND_OPTS.map(function (o, i) {
        return '<label class="lf-brand" data-b="' + o[0] + '"><input type="radio" name="brand" value="' + o[0] + '"' + (i === 2 ? ' checked' : '') + '>' +
          '<span class="lfb-name">' + esc(o[1]) + '</span><span class="lfb-sub">' + esc(o[2]) + '</span></label>';
      }).join('') + '</fieldset>' +
      '<fieldset class="lf-brands lf-countries"><legend class="lf-label">Для какой страны снимаете</legend>' +
      COUNTRY_OPTS.map(function (o, i) {
        return '<label class="lf-brand" data-c="' + o[0] + '"><input type="radio" name="country" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '>' +
          '<span class="lfb-name">' + esc(o[1]) + '</span></label>';
      }).join('') + '</fieldset>' +
      '<button class="btn big login-go" type="submit">Начать ' + icon('arrow-right') + '</button>' +
      '</form>' +
      (known.length ? '<div class="login-known"><p class="lf-label">Уже были здесь</p><div class="lk-list">' + known.map(function (u) {
        return '<button type="button" class="lk" data-id="' + esc(u.id) + '"><span class="avatar" aria-hidden="true">' + esc(initials(u.name)) + '</span>' +
          '<span class="lk-t"><b>' + esc(u.name) + '</b><small>' + esc(brandLabel(u.brand)) + '</small></span></button>';
      }).join('') + '</div></div>' : '') +
      '<p class="login-note">' + icon('lock') + '<span>Тестовый вход без пароля: прогресс хранится в этом браузере. На другом устройстве или после очистки браузера путь начнётся заново. Вход по паролю появится позже.</span></p>' +
      '</div></section>';

    var form = root.querySelector('.login-form');
    var input = form.querySelector('#lg-name');
    var err = form.querySelector('.lf-err');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = input.value.replace(/\s+/g, ' ').trim();
      if (name.length < 2 || !/[a-zа-яё]/i.test(name)) {
        err.textContent = 'Напишите имя, хотя бы две буквы: под ним сохранится ваш прогресс.';
        err.hidden = false;
        input.focus();
        return;
      }
      var b = form.querySelector('input[name=brand]:checked');
      var c = form.querySelector('input[name=country]:checked');
      login(name, b ? b.value : 'all', c ? c.value : 'all');
      show();
    });
    input.addEventListener('input', function () { err.hidden = true; });
    root.querySelectorAll('.lk').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = userList().find(function (x) { return x.id === b.dataset.id; });
        if (u) { login(u.name, null, null); show(); }
      });
    });
    setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
  }

  /* ---------- навигация и прогресс ---------- */

  function routePages() {
    return site.pages.filter(function (p) { return p.step; });
  }

  function doneSet() { return load('done') || {}; }

  function doneCount() {
    var d = doneSet();
    return routePages().filter(function (p) { return d[p.id]; }).length;
  }

  // Следующий непройденный шаг; если всё пройдено, null
  function nextStep() {
    var d = doneSet();
    return routePages().find(function (p) { return !d[p.id]; }) || null;
  }

  // Сброс прогресса: пройденные шаги, тест, галочки. Выбор бренда остаётся
  // Первое нажатие просит подтвердить, второе сбрасывает (без системного окна: его может блокировать браузер)
  function resetProgress(btn) {
    if (btn && !btn.dataset.armed) {
      btn.dataset.armed = '1';
      btn.dataset.label = btn.textContent;
      btn.textContent = 'Точно сбросить? Нажмите ещё раз';
      btn.classList.add('armed');
      setTimeout(function () {
        if (!btn.isConnected) return;
        delete btn.dataset.armed;
        btn.textContent = btn.dataset.label;
        btn.classList.remove('armed');
      }, 5000);
      return;
    }
    allKeys().forEach(function (k) {
      if (k === STORE + 'done' || k === STORE + 'quiz' || k === STORE + 'finished' || k.indexOf(STORE + 'checks:') === 0) rawDel(k);
    });
    location.hash = '#/home';
    show();
  }

  function stepNo(page) {
    return routePages().findIndex(function (p) { return p.id === page.id; }) + 1;
  }

  function stageName(n) { return (site.stages || [])[n - 1] || ''; }

  function navLink(p, activeId, inner) {
    return '<a href="#/' + p.id + '"' + (p.id === activeId ? ' aria-current="page"' : '') +
      (p.brand ? ' data-brand="' + p.brand + '"' : '') + '>' + inner + '</a>';
  }

  function renderNav(activeId) {
    var nav = document.getElementById('nav');
    var d = doneSet();
    var nxt = nextStep();
    var steps = routePages();
    var html = '<a class="nav-home" href="#/home"' + (activeId === 'home' ? ' aria-current="page"' : '') + '>' +
      '<span class="nav-home-ico" aria-hidden="true">' + icon('house') + '</span>Главная</a>';

    html += '<p class="nav-group">Онбординг <span class="nav-count">' + doneCount() + ' из ' + steps.length +
      (doneCount() ? ' · <button type="button" class="nav-reset">сбросить</button>' : '') + '</span></p>';
    var stage = 0;
    html += '<ol class="nav-steps">';
    steps.forEach(function (p, i) {
      if (p.stage !== stage) {
        stage = p.stage;
        html += '<li class="nav-stage">' + esc(stage + '. ' + stageName(stage)) + '</li>';
      }
      var state = d[p.id] === 'skip' ? 'skipped' : d[p.id] ? 'done' : (nxt && nxt.id === p.id ? 'next' : '');
      html += '<li class="nav-step ' + state + '">' + navLink(p, activeId,
        '<span class="num" aria-hidden="true">' + (state === 'skipped' ? '!' : d[p.id] ? '✓' : (i + 1)) + '</span>' +
        '<span class="t">' + esc(p.title) + (state === 'skipped' ? '<span class="sr"> (пропущен)</span>' : d[p.id] ? '<span class="sr"> (пройден)</span>' : '') + '</span>') + '</li>';
    });
    html += '</ol>';

    var group = null;
    site.pages.forEach(function (p) {
      if (p.step || p.hidden || p.type === 'home' || !p.group) return;
      if (p.group !== group) {
        if (group !== null) html += '</ul>';
        group = p.group;
        html += '<p class="nav-group">' + esc(group) + '</p><ul class="nav-list">';
      }
      html += '<li>' + navLink(p, activeId, icon(p.icon, 'nav-ico') + esc(p.title)) + '</li>';
    });
    if (group !== null) html += '</ul>';
    nav.innerHTML = html;
    var rb = nav.querySelector('.nav-reset');
    if (rb) rb.addEventListener('click', function () { resetProgress(rb); });
    updateProgress();
  }

  function updateProgress() {
    var steps = routePages();
    var n = doneCount();
    var pct = steps.length ? Math.round(n / steps.length * 100) : 0;
    document.querySelector('.topbar .progress-bar i').style.width = pct + '%';
    document.querySelector('.topbar .progress-bar').setAttribute('aria-valuenow', pct);
    document.querySelector('.progress-label').textContent = n === steps.length ? 'Онбординг пройден' : 'Пройдено ' + n + ' из ' + steps.length;
    var nxt = nextStep();
    var cont = document.querySelector('.continue');
    cont.hidden = !nxt;
    if (nxt) { cont.href = '#/' + nxt.id; cont.textContent = n ? 'Продолжить →' : 'Начать →'; }
  }

  /* ---------- Markdown и доработки после рендера ---------- */

  function stripFrontMatter(md) {
    return md.replace(/^---\n[\s\S]*?\n---\n/, '');
  }

  /* ---------- соцсети брендов ---------- */

  var NETS = {
    instagram: { name: 'Instagram', icon: '<rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.3" fill="#fff"/>' },
    youtube: { name: 'YouTube', icon: '<rect x="2" y="5" width="20" height="14" rx="4.5" fill="#fff"/><path d="M10 9l5.2 3L10 15z" fill="#f00"/>' },
    telegram: { name: 'Telegram', icon: '<path d="M3.5 11.4l15.8-6.2c.8-.3 1.5.2 1.2 1.4l-2.7 12.6c-.2.9-.8 1.1-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.8.4l.3-4.2 7.6-6.9c.3-.3-.1-.5-.5-.2L7.4 13.8 3.4 12.6c-.9-.3-.9-.9.1-1.2z" fill="#fff"/>' },
    vk: { name: 'ВКонтакте', icon: '<path d="M12.8 17.5C6.9 17.5 3.5 13.4 3.4 6.6h3c.1 5 2.3 7.1 4 7.5V6.6h2.8v4.3c1.7-.2 3.5-2.2 4.1-4.3h2.8c-.5 2.7-2.4 4.6-3.8 5.4 1.4.7 3.6 2.4 4.4 5.5h-3.1c-.7-2.1-2.3-3.7-4.4-3.9v3.9z" fill="#fff"/>' },
    tiktok: { name: 'TikTok', icon: '<path d="M14.5 3h2.6c.3 2.1 1.6 3.5 3.6 3.7v2.7c-1.4 0-2.6-.4-3.6-1.1v6.3c0 3.3-2.5 5.4-5.4 5.4-3 0-5.3-2.3-5.3-5.2 0-3.2 2.8-5.6 6.1-5.1v2.8c-1.5-.4-3.3.6-3.3 2.3 0 1.4 1.1 2.4 2.5 2.4 1.5 0 2.7-1 2.7-2.9z" fill="#fff"/>' },
    max: { name: 'MAX', icon: '<text x="12" y="15.6" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-weight="800" font-size="8.6" fill="#fff">MAX</text>' },
    threads: { name: 'Threads', icon: '<text x="12" y="17.2" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-weight="700" font-size="16" fill="#fff">@</text>' }
  };

  function renderSocials(holder, brand) {
    fetchText('socials.json').then(function (t) {
      var data = JSON.parse(t);
      var list = brand === 'main'
        ? ['belukha', 'biorepair'].map(function (b) {
            var m = (data[b] || []).find(function (x) { return x.main; });
            return m ? Object.assign({}, m, { main: false, brandId: b }) : null;
          }).filter(Boolean)
        : data[brand] || [];
      holder.className = 'socials';
      if (brand === 'belukha' || brand === 'biorepair') {
        var v = brand === 'belukha' ? 'belukha' : 'bio';
        holder.style.setProperty('--accent', 'var(--' + v + ')');
        holder.style.setProperty('--accent-soft', 'var(--' + v + '-soft)');
      }
      holder.innerHTML = list.map(function (s) {
        var n = NETS[s.platform] || { name: s.platform, icon: '' };
        return '<a class="soc' + (s.main ? ' main' : '') + '"' + (s.brandId ? ' data-b="' + s.brandId + '"' : '') + ' data-net="' + esc(s.platform) + '" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
          '<span class="soc-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' + n.icon + '</svg></span>' +
          '<span class="soc-body"><span class="soc-net">' + esc(s.brandId ? brandName(s.brandId) + ' · ' + n.name : n.name) + (s.main ? ' · главная' : '') + '</span>' +
          '<span class="soc-handle">' + esc(s.handle) + '</span>' +
          (s.note ? '<span class="soc-note">' + esc(s.note) + '</span>' : '') + '</span>' +
          (s.followers ? '<span class="soc-num"><b>' + esc(s.followers) + '</b><small>подписчиков</small></span>' : '<span class="soc-num"><small>открыть</small></span>') +
          '</a>';
      }).join('') + (data.asof ? '<p class="soc-asof">Подписчики на ' + esc(data.asof) + '</p>' : '');
    }).catch(function () { holder.textContent = 'Не удалось загрузить content/socials.json'; });
  }

  /* ---------- учебные блоки внутри Markdown ---------- */

  // ```persona: карточка героини: строки «ключ: значение», списки через « ; »
  function renderPersona(code) {
    var rows = [];
    var meta = {};
    code.textContent.split('\n').forEach(function (line) {
      var m = line.match(/^\s*([^:]+?)\s*:\s*(.+)$/);
      if (!m) return;
      var k = m[1].trim();
      var v = m[2].trim();
      var key = k.toLowerCase();
      if (['бренд', 'имя', 'про', 'цитата', 'статус', 'фото', 'страна'].indexOf(key) >= 0) meta[key] = v;
      else rows.push([k, v]);
    });
    var box = document.createElement('article');
    box.className = 'persona';
    if (meta['бренд']) box.dataset.brand = meta['бренд'];
    if (meta['страна']) box.dataset.country = meta['страна'];
    var initials = (meta['имя'] || '?').trim().charAt(0);
    var flag = meta['страна'] === 'ru' ? '<span class="p-country">Россия</span>' : meta['страна'] === 'kz' ? '<span class="p-country">Казахстан</span>' : '';
    box.innerHTML =
      '<header class="p-head"><span class="p-ava" aria-hidden="true">' + esc(initials) + '</span>' +
      '<div><h3 class="p-name">' + esc(meta['имя'] || '') + flag + '</h3>' +
      (meta['про'] ? '<p class="p-about">' + esc(meta['про']) + '</p>' : '') + '</div></header>' +
      (meta['цитата'] ? '<blockquote class="p-quote">' + esc(meta['цитата']) + '</blockquote>' : '') +
      '<dl class="p-rows">' + rows.map(function (r) {
        var parts = r[1].split(/\s+;\s+/);
        var val = parts.length > 1
          ? '<ul>' + parts.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>'
          : inline(r[1]);
        return '<div class="p-row"><dt>' + esc(r[0]) + '</dt><dd>' + val + '</dd></div>';
      }).join('') + '</dl>' +
      (meta['статус'] ? '<p class="p-status">' + inline(meta['статус']) + '</p>' : '');
    code.parentElement.replaceWith(box);
  }

  // Короткая строка Markdown без абзаца: **жирный**, ссылки, «ёлочки»
  function inline(s) {
    return marked.parseInline ? marked.parseInline(s) : esc(s);
  }

  // ```вопрос: упражнение с мгновенной проверкой.
  // Первые строки: вопрос, «- вариант» (звёздочка * в конце у верного), «= объяснение».
  var qCounter = 0;
  function renderQuestion(code, idx, page) {
    var q = [], opts = [], explain = '';
    code.textContent.split('\n').forEach(function (line) {
      var t = line.trim();
      if (!t) return;
      if (/^-\s+/.test(t)) {
        var right = /\*\s*$/.test(t);
        opts.push({ text: t.replace(/^-\s+/, '').replace(/\s*\*\s*$/, ''), right: right });
      } else if (/^=\s*/.test(t)) {
        explain += (explain ? ' ' : '') + t.replace(/^=\s*/, '');
      } else {
        q.push(t);
      }
    });
    var id = 'iq' + (++qCounter);
    var box = document.createElement('fieldset');
    box.className = 'iq';
    box.innerHTML = '<legend><span class="iq-kicker">' + icon('list-checks') + 'Проверьте себя</span>' + inline(q.join(' ')) + '</legend>' +
      '<div class="iq-opts">' + opts.map(function (o, i) {
        return '<button type="button" class="iq-opt" data-i="' + i + '">' + inline(o.text) + '</button>';
      }).join('') + '</div><p class="iq-explain" role="status" aria-live="polite" hidden></p>';
    var key = page ? 'answers:' + page.id : null;
    box.dataset.qi = idx;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.iq-opt');
      if (!b) return;
      var i = +b.dataset.i;
      box.classList.add('answered');
      box.classList.remove('need');
      if (key) { var a = load(key) || {}; a[idx] = i; save(key, a); }
      box.dispatchEvent(new CustomEvent('answered', { bubbles: true }));
      box.querySelectorAll('.iq-opt').forEach(function (x, j) {
        x.classList.toggle('right', opts[j].right && (j === i || opts[i].right));
        x.classList.toggle('wrong', j === i && !opts[j].right);
        if (opts[j].right) x.classList.add('was-right');
      });
      var ex = box.querySelector('.iq-explain');
      ex.hidden = false;
      ex.className = 'iq-explain ' + (opts[i].right ? 'ok' : 'bad');
      ex.innerHTML = '<b>' + (opts[i].right ? 'Верно.' : 'Не совсем.') + '</b> ' + inline(explain);
    });
    box.id = id;
    code.parentElement.replaceWith(box);
    var prev = key ? (load(key) || {})[idx] : undefined;
    if (prev !== undefined && box.querySelector('.iq-opt[data-i="' + prev + '"]')) box.querySelector('.iq-opt[data-i="' + prev + '"]').click();
  }

  // ```выбор-бренда: большие карточки выбора, сохраняются для всего курса
  function renderBrandPicker(code) {
    var box = document.createElement('div');
    box.className = 'picker';
    var opts = [
      ['belukha', 'Предгорья Белухи / Smart Bee', 'Чай, иван-чай, мёд'],
      ['biorepair', 'Biorepair®', 'Зубные пасты и уход'],
      ['all', 'Оба бренда', 'Буду работать с обоими']
    ];
    function draw() {
      var cur = load('brandPref');
      box.innerHTML = '<p class="picker-q">С каким брендом вы будете работать?</p><div class="picker-opts">' +
        opts.map(function (o) {
          return '<button type="button" class="pick" data-b="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' +
            '<span class="pick-name">' + esc(o[1]) + '</span><span class="pick-sub">' + esc(o[2]) + '</span></button>';
        }).join('') + '</div>' +
        '<p class="picker-note">' + (cur ? 'Готово. Дальше в каждом модуле первым будет ваш бренд, второй свёрнут, его можно открыть. Сменить выбор можно здесь в любой момент.' : 'Выбор можно поменять в любой момент.') + '</p>';
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.pick');
      if (!b) return;
      save('brandPref', b.dataset.b);
      draw();
    });
    draw();
    code.parentElement.replaceWith(box);
  }

  // ```выбор-страны: Россия / Казахстан / обе. Прячет карточки и блоки с data-country другой страны
  var COUNTRIES = [['ru', 'Россия', 'русские имена и города'], ['kz', 'Казахстан', 'казахские имена и города'], ['all', 'Обе страны', 'показать всех героинь']];
  function applyCountry(root, v) {
    root.querySelectorAll('[data-country]').forEach(function (el) {
      if (el.classList.contains('country-pick')) return;
      el.hidden = v !== 'all' && el.dataset.country !== v;
    });
  }
  function renderCountryPicker(code, root) {
    var box = document.createElement('div');
    box.className = 'brand-switch country-switch';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Моя страна');
    box.innerHTML = '<span>Моя страна:</span>' + COUNTRIES.map(function (o) {
      return '<button type="button" data-c="' + o[0] + '" title="' + esc(o[2]) + '">' + esc(o[1]) + '</button>';
    }).join('');
    var set = function (v) {
      save('countryPref', v);
      box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === v)); });
      applyCountry(root, v);
    };
    box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) set(b.dataset.c); });
    code.parentElement.replaceWith(box);
    // карточки рисуются раньше переключателя, поэтому применяем выбор после всей разметки
    setTimeout(function () { set(load('countryPref') || 'all'); }, 0);
  }

  // Две врезки подряд «так / не так» (или «можно / нельзя») встают рядом
  function pairCallouts(root) {
    root.querySelectorAll('.callout').forEach(function (c) {
      var n = c.nextElementSibling;
      var pair = (c.classList.contains('so') && n && n.classList.contains('notso')) ||
        (c.classList.contains('yes') && n && n.classList.contains('no'));
      if (!pair || c.parentElement.classList.contains('pair')) return;
      var w = document.createElement('div');
      w.className = 'pair';
      c.before(w);
      w.appendChild(c);
      w.appendChild(n);
    });
  }

  function enhance(root, page) {
    // Блок ```socials belukha``` превращается в карточки соцсетей
    root.querySelectorAll('pre > code.language-persona').forEach(renderPersona);
    root.querySelectorAll('pre > code.language-вопрос').forEach(function (c, i) { renderQuestion(c, i, page); });
    // Ролики: какие уже смотрели (нужно для шага «Какие ролики мы снимаем?»)
    var seen = load('watched:' + page.id) || {};
    root.querySelectorAll('.reel video').forEach(function (v) {
      var src = v.getAttribute('src');
      if (seen[src]) v.closest('.reel').classList.add('seen');
      v.addEventListener('play', function () {
        seen[src] = true;
        save('watched:' + page.id, seen);
        v.closest('.reel').classList.add('seen');
        root.dispatchEvent(new CustomEvent('answered', { bubbles: true }));
      });
    });
    root.querySelectorAll('pre > code.language-выбор-бренда').forEach(renderBrandPicker);
    root.querySelectorAll('pre > code.language-выбор-страны').forEach(function (c) { c.parentElement.remove(); });
    setTimeout(function () { applyCountry(root, load('countryPref') || (user && user.country) || 'all'); }, 0);
    root.querySelectorAll('pre > code.language-socials').forEach(function (code) {
      var holder = document.createElement('div');
      code.parentElement.replaceWith(holder);
      renderSocials(holder, code.textContent.trim());
    });

    // Врезки: > [!ЗАДАНИЕ] Заголовок
    root.querySelectorAll('blockquote').forEach(function (bq) {
      var first = bq.firstElementChild;
      if (!first) return;
      var m = first.innerHTML.match(/^\s*\[!([А-ЯЁA-Z][А-ЯЁA-Z ]*?)\][ \t]*([^\n<]*)(?:<br>)?\n?/);
      if (!m || !CALLOUTS[m[1]]) return;
      var c = CALLOUTS[m[1]];
      first.innerHTML = first.innerHTML.slice(m[0].length);
      if (!first.textContent.trim() && !first.querySelector('img')) first.remove();
      var box = document.createElement('aside');
      box.className = 'callout ' + c.cls;
      box.innerHTML = '<p class="callout-title">' + icon(c.icon) + esc(c.label) + (m[2].trim() ? ': ' + esc(m[2].trim()) : '') + '</p>';
      while (bq.firstChild) box.appendChild(bq.firstChild);
      bq.replaceWith(box);
    });

    pairCallouts(root);

    // Памятка из конца страницы встаёт наверх: сначала суть, потом подробности
    var memo = root.querySelector('.callout.memo');
    var h1 = root.querySelector('h1');
    if (memo && h1) {
      memo.querySelector('.callout-title').innerHTML = icon('zap') + 'Коротко: главное за 30 секунд';
      var lead = h1.nextElementSibling && h1.nextElementSibling.tagName === 'P' ? h1.nextElementSibling : h1;
      lead.after(memo);
    }
    // Первоисточники — компактной строкой ссылок на виду, в своём разделе.
    // Пересказ из «Подробнее» никто не читает, а ссылка на брендбук нужна под рукой.
    root.querySelectorAll('.callout.origin, .callout.source').forEach(function (box) {
      var chips = [];
      var seen = {};
      box.querySelectorAll('li, p').forEach(function (item) {
        if (item.classList.contains('callout-title') || (item.tagName === 'P' && item.closest('li'))) return;
        var links = item.querySelectorAll('a[href]');
        if (!links.length) return;
        // Короткая подпись: документ, если он назван («Брендбук «Предгорья Белухи», стр. 5»), иначе тема («Анализ ЦА»)
        var clone = item.cloneNode(true);
        clone.querySelectorAll('a, ul, code').forEach(function (x) { x.remove(); });
        var text = clone.textContent.replace(/\s+/g, ' ').replace(/\(\s*(файл\s+)?в?\s*\)/g, '').trim();
        var m = text.match(/^(.*?)(?::\s|\s[—–]\s)(.*)$/);
        var topic = (m ? m[1] : text).replace(/\s*\([^)]*\)/g, '').replace(/^[-•\s]+/, '').trim();
        var rest = m ? m[2] : '';
        var page = (rest.match(/стр\.\s*[\d–-]+/) || [''])[0];
        var doc = rest.split(/,|\(|\sстр\.|\sв\s|:/)[0].replace(/^файл\s+/i, '').replace(/[\s.—–-]+$/, '').trim();
        topic = topic.replace(/[\s:·,.—–-]+$/, '');
        doc = doc.replace(/\s+в$/, '');
        var isDoc = /брендбук|регламент|промпт|бриф|презентац|гайд|таблиц|концепц|портрет|днк|сайт|«/i.test(doc);
        var base = isDoc && doc.length >= 4 ? doc.charAt(0).toUpperCase() + doc.slice(1) + (page ? ', ' + page : '') : (topic || doc);
        var generic = /^(открыть|скачать|смотреть|ещё|папка|папке.*|google.*|\d+)$/i;
        links.forEach(function (a, i) {
          var href = a.getAttribute('href');
          if (seen[href]) return;
          seen[href] = true;
          var txt = a.textContent.trim();
          var name = links.length > 1 ? (generic.test(txt) ? topic + ' ' + (i + 1) : txt.charAt(0).toUpperCase() + txt.slice(1)) : (base || txt);
          if (name.length > 52) name = name.slice(0, 50).replace(/\s+\S*$/, '') + '…';
          chips.push('<a class="src-chip" href="' + esc(href) + '" title="' + esc(item.textContent.replace(/\s+/g, ' ').trim()) + '">' + esc(name) + '</a>');
        });
      });
      if (!chips.length) { box.remove(); return; }
      var row = document.createElement('div');
      row.className = 'sources';
      row.innerHTML = '<span class="src-label">' + icon('book-open') + 'Первоисточники</span>' + chips.join('');
      var fold = box.closest('details.more');
      if (fold) { fold.after(row); box.remove(); } else box.replaceWith(row);
    });

    // Чек-листы: галочки запоминаются в браузере
    var checks = load('checks:' + page.id) || {};
    root.querySelectorAll('li > input[type=checkbox]').forEach(function (cb, i) {
      cb.disabled = false;
      cb.checked = !!checks[i];
      var li = cb.parentElement;
      li.classList.add('task-item');
      if (cb.checked) li.classList.add('ticked');
      li.addEventListener('click', function (e) {
        if (e.target !== cb && !e.target.closest('a')) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
      });
      cb.addEventListener('change', function () {
        checks[i] = cb.checked;
        li.classList.toggle('ticked', cb.checked);
        save('checks:' + page.id, checks);
        countChecks(root);
      });
    });
    if (root.querySelector('.task-item')) {
      var bar = document.createElement('div');
      bar.className = 'check-bar';
      bar.innerHTML = '<span class="check-count"></span><button type="button" class="btn ghost small">Сбросить</button>';
      bar.querySelector('button').addEventListener('click', function () {
        save('checks:' + page.id, {});
        root.querySelectorAll('.task-item input').forEach(function (cb) {
          cb.checked = false; cb.parentElement.classList.remove('ticked');
        });
        countChecks(root);
      });
      root.appendChild(bar);
      countChecks(root);
    }

    // Таблицы прокручиваются внутри себя на телефоне
    root.querySelectorAll('table').forEach(function (t) {
      var w = document.createElement('div');
      w.className = 'table-wrap';
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });

    // Блоки кода: шаблоны с кнопкой «Скопировать»
    root.querySelectorAll('pre').forEach(function (pre) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'copy-btn';
      b.textContent = 'Скопировать';
      b.addEventListener('click', function () {
        var text = pre.querySelector('code') ? pre.querySelector('code').textContent : pre.textContent;
        navigator.clipboard.writeText(text).then(function () {
          b.textContent = 'Скопировано ✓';
          setTimeout(function () { b.textContent = 'Скопировать'; }, 1800);
        }, function () { b.textContent = 'Выделите и скопируйте вручную'; });
      });
      var wrap = document.createElement('div');
      wrap.className = 'pre-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(b);
      wrap.appendChild(pre);
    });

    // Внешние ссылки открываются в новой вкладке
    root.querySelectorAll('a[href^="http"]').forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  function countChecks(root) {
    var vis = function (sel) {
      return Array.prototype.filter.call(root.querySelectorAll(sel), function (x) { return !x.closest('[hidden]') && !x.closest('.brand-sec.other:not(.open)'); });
    };
    var all = vis('.task-item input');
    var on = vis('.task-item input:checked');
    var el = root.querySelector('.check-count');
    if (el) el.textContent = 'Отмечено ' + on.length + ' из ' + all.length + (all.length && on.length === all.length ? '. Можно отправлять куратору' : '');
  }

  /* ---------- шаги маршрута ---------- */

  function stepHeader(page) {
    if (!page.step) return '';
    var total = routePages().length;
    var n = stepNo(page);
    var d = doneSet();
    var dots = routePages().map(function (p, i) {
      var cls = p.id === page.id ? 'cur' : (d[p.id] ? 'done' : '');
      return '<a href="#/' + p.id + '" class="' + cls + '" title="' + esc(p.title) + '" aria-label="Шаг ' + (i + 1) + ': ' + esc(p.title) + '"></a>';
    }).join('');
    return '<div class="step-head"><div class="step-id">' + (page.icon ? '<span class="step-ico" aria-hidden="true">' + icon(page.icon) + '</span>' : '') +
      '<p class="step-kicker"><b>Этап ' + page.stage + ' · ' + esc(stageName(page.stage)) + '</b>' +
      '<span>Шаг ' + n + ' из ' + total + (page.time ? ' · ' + esc(page.time) : '') + '</span></p></div>' +
      '<nav class="step-dots" aria-label="Шаги онбординга">' + dots + '</nav></div>';
  }

  function stepFooter(page) {
    if (!page.step) return '';
    var steps = routePages();
    var idx = stepNo(page) - 1;
    var next = steps[idx + 1];
    var prev = steps[idx - 1];
    return '<div class="step-foot">' +
      '<div class="sf-next"><span class="sf-label">' + (next ? 'Следующий шаг' : 'Это последний шаг') + '</span>' +
      '<button type="button" class="btn big go-next" data-next="' + (next ? next.id : 'home') + '">' +
      (next ? 'Готово, дальше: ' + esc(next.title) : 'Завершить онбординг') + ' →</button></div>' +
      (prev ? '<a class="btn ghost" href="#/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '') +
      (doneSet()[page.id] ? '<button type="button" class="undo-step">Шаг пройден ✓ · отметить как непройденный</button>' : '') +
      '</div>';
  }

  function markDone(id) {
    var d = doneSet();
    d[id] = true;
    save('done', d);
  }
  // Пропущенный шаг считается пройденным для маршрута, но помечается: к нему стоит вернуться
  function markSkipped(id) {
    var d = doneSet();
    if (d[id] !== true) d[id] = 'skip';
    save('done', d);
  }

  // Что ещё не сделано на шаге: обязательные вопросы (кроме свёрнутых «Подробнее»), ролики, тест
  function pending(root, page) {
    if (page.type === 'quiz') {
      return load('quiz') ? null : { text: 'Сначала пройдите тест: ответьте на вопросы и нажмите «Проверить».', target: root.querySelector('.quiz .q') };
    }
    var reels = root.querySelectorAll('.reel video');
    if (reels.length) {
      var seen = root.querySelectorAll('.reel.seen').length;
      var need = Math.min(2, reels.length);
      if (seen < need) return { text: 'Сначала посмотрите хотя бы ' + (need === 2 ? 'два ролика' : 'один ролик') + ' — так будет понятно, о чём следующие шаги. Просмотрено: ' + seen + ' из ' + need + '.', target: root.querySelector('.reel:not(.seen)') };
    }
    var qs = Array.prototype.filter.call(root.querySelectorAll('.iq'), function (q) { return !q.closest('details.more') && !q.closest('.brand-sec.other:not(.open)'); });
    var left = qs.filter(function (q) { return !q.classList.contains('answered'); });
    if (left.length) return { text: 'Сначала ответьте на ' + (qs.length === 1 ? 'вопрос' : 'вопросы') + ' на этой странице: осталось ' + left.length + ' из ' + qs.length + '.', target: left[0] };
    return null;
  }

  function bindStep(root, page) {
    if (!page.step) return;
    var btn = root.querySelector('.go-next');
    var msg = document.createElement('p');
    msg.className = 'gate-msg';
    msg.setAttribute('role', 'alert');
    msg.hidden = true;
    btn.closest('.sf-next').appendChild(msg);
    var stage = 0;            // 0 — ещё не пытались, 1 — показали красное, 2 — показали жёлтое
    var label = btn.innerHTML;
    var bar = document.querySelector('.mobile-step');
    var mb = bar.querySelector('.ms-next');
    var next = routePages()[stepNo(page)];
    var mbLabel = next ? 'Дальше →' : 'Завершить →';
    var reset = function () {
      stage = 0; msg.hidden = true; msg.className = 'gate-msg';
      btn.innerHTML = label; btn.classList.remove('warn');
      mb.textContent = mbLabel; bar.classList.remove('warn', 'red');
    };
    var showTarget = function (el) {
      if (!el) return;
      el.classList.remove('need');
      void el.offsetWidth;
      el.classList.add('need');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { el.classList.remove('need'); }, 2400);
    };
    var go = function (e) {
      var fromBar = e && e.currentTarget === mb;
      var p = doneSet()[page.id] === true ? null : pending(root, page);
      if (p && stage === 0) {
        stage = 1;
        msg.className = 'gate-msg red';
        msg.innerHTML = icon('triangle-alert') + '<span>' + esc(p.text) + (p.target ? ' <button type="button" class="gate-show">Показать ↑</button>' : '') + '</span>';
        msg.hidden = false;
        var sb = msg.querySelector('.gate-show');
        if (sb) sb.addEventListener('click', function () { showTarget(pending(root, page) && pending(root, page).target); });
        bar.classList.add('red');
        mb.textContent = 'Ответьте выше ↑';
        if (p.target) p.target.classList.add('need');
        setTimeout(function () { if (p.target) p.target.classList.remove('need'); }, 2400);
        if (fromBar) showTarget(p.target);
        return;
      }
      if (p && stage === 1) {
        stage = 2;
        msg.className = 'gate-msg warn';
        msg.innerHTML = icon('circle-help') + '<span><b>Точно пропустить и пройти дальше?</b> Шаг отметится как пропущенный: в меню он будет оранжевым, к нему можно вернуться. Нажмите ещё раз, чтобы перейти.</span>';
        btn.innerHTML = 'Да, пропустить и перейти ' + icon('arrow-right');
        btn.classList.add('warn');
        bar.classList.remove('red'); bar.classList.add('warn');
        mb.textContent = 'Да, пропустить →';
        if (fromBar) msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (p) markSkipped(page.id); else markDone(page.id);
      location.hash = '#/' + btn.dataset.next;
    };
    btn.addEventListener('click', go);
    // Сделали интерактивную часть — предупреждения больше не нужны
    root.addEventListener('answered', function () { if (stage && !pending(root, page)) reset(); });
    var qform = root.querySelector('form.quiz');
    if (qform) qform.addEventListener('submit', function () { setTimeout(function () { if (stage && !pending(root, page)) reset(); }, 0); });
    var undo = root.querySelector('.undo-step');
    if (undo) undo.addEventListener('click', function () {
      var d = doneSet();
      delete d[page.id];
      save('done', d);
      show();
    });
    // Нижняя панель на телефоне: следующий шаг всегда под пальцем
    bar.hidden = false;
    bar.querySelector('.ms-pos').textContent = 'Шаг ' + stepNo(page) + ' из ' + routePages().length;
    reset();
    mb.onclick = go;
  }

  function readProgress() {
    var bar = document.querySelector('.read-bar i');
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (document.body.dataset.page === 'text' && h > 200 ? Math.min(100, Math.round(window.scrollY / h * 100)) : 0) + '%';
  }

  /* ---------- главная ---------- */

  function tool(id, ico, name, text) {
    return '<a class="tool-card" href="#/' + id + '"><span class="tc-ico" aria-hidden="true">' + icon(ico) + '</span>' +
      '<span class="tc-name">' + esc(name) + '</span><span class="tc-text">' + esc(text) + '</span></a>';
  }

  function renderHome(root) {
    var steps = routePages();
    var d = doneSet();
    var n = doneCount();
    var nxt = nextStep();
    var total = 0;
    steps.forEach(function (p) { total += parseInt(p.time, 10) || 0; });
    var pct = Math.round(n / steps.length * 100);

    var hour = new Date().getHours();
    var hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    var left = 0;
    steps.forEach(function (p) { if (!d[p.id]) left += parseInt(p.time, 10) || 0; });
    var quiz = load('quiz');
    var skipped = steps.filter(function (p) { return d[p.id] === 'skip'; }).length;
    var status = !nxt ? 'Маршрут пройден. Осталось главное: снять первый ролик и сдать его на проверку.'
      : n ? 'Вы прошли ' + n + ' из ' + steps.length + ' шагов. Осталось около ' + (Math.round(left / 5) * 5) + ' минут.'
      : steps.length + ' коротких шагов, около ' + (Math.round(total / 5) * 5) + ' минут. Первый шаг — восемь лучших роликов брендов: посмотрите их, и станет ясно, что мы снимаем.';
    var R = 52, C = 2 * Math.PI * R;
    var ring = '<div class="cab-ring" role="img" aria-label="Пройдено ' + pct + '%">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="' + R + '" class="rb"/>' +
      '<circle cx="60" cy="60" r="' + R + '" class="rf" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg>' +
      '<span><b>' + pct + '%</b><small>' + n + ' из ' + steps.length + '</small></span></div>';

    var hero = '<section class="home-hero cabinet"><div class="cab-main">' +
      '<p class="eyebrow">Личный кабинет · ' + esc(brandLabel(user && user.brand)) + '</p>' +
      '<h1>' + esc(hello + ', ' + firstName(user) + '!') + '</h1>' +
      '<p class="lead">' + esc(status) + '</p>' +
      (nxt ? '<a class="hero-go" href="#/' + nxt.id + '">' +
        '<span class="hg-ico" aria-hidden="true">' + icon(n ? 'arrow-right' : 'circle-play') + '</span>' +
        '<span class="hg-t"><b>' + (n ? 'Продолжить обучение' : 'Начать обучение') + '</b>' +
        '<small>Шаг ' + stepNo(nxt) + ' из ' + steps.length + ': ' + esc(nxt.title) + (nxt.time ? ' · ' + esc(nxt.time) : '') + '</small></span>' +
        '<span class="hg-arrow" aria-hidden="true">' + icon('arrow-right') + '</span></a>' : '') +
      ((!nxt || n) ? '<div class="hero-cta">' + (nxt ? ''
        : '<a class="btn big" href="#/test">Материалы для работы ' + icon('arrow-right') + '</a><a class="btn ghost" href="#/proizvodstvo">Как мы работаем</a>') +
      (n ? '<button type="button" class="hero-reset">Сбросить прогресс</button>' : '') + '</div>' : '') + '</div>' + ring + '</section>';

    var nextCard = nxt ? '<a class="next-card" href="#/' + nxt.id + '">' +
      '<span class="nc-ico" aria-hidden="true">' + icon(nxt.icon || 'flag') + '</span>' +
      '<span class="nc-t"><small>' + (n ? 'Следующий шаг' : 'Первый шаг') + ' · этап ' + nxt.stage + ', ' + esc(stageName(nxt.stage)) + '</small>' +
      '<b>' + esc(nxt.title) + '</b><em>' + icon('clock') + esc(nxt.time || '') + '</em></span>' +
      '<span class="nc-go" aria-hidden="true">' + icon('arrow-right') + '</span></a>' : '';

    var stats = '<div class="stats">' +
      '<div class="stat"><span class="st-ico">' + icon('flag') + '</span><b>' + n + ' / ' + steps.length + '</b><small>шагов пройдено' + (skipped ? ', ' + skipped + ' пропущено' : '') + '</small></div>' +
      '<div class="stat"><span class="st-ico">' + icon('clock') + '</span><b>' + (left ? '≈ ' + (Math.round(left / 5) * 5) + ' мин' : 'готово') + '</b><small>до конца маршрута</small></div>' +
      '<div class="stat"><span class="st-ico">' + icon('graduation-cap') + '</span><b>' + (quiz ? quiz.right + ' из ' + quiz.total : 'впереди') + '</b><small>итоговый тест</small></div>' +
      '</div>';

    var stages = (site.stages || []).map(function (name, si) {
      var list = steps.filter(function (p) { return p.stage === si + 1; });
      var sd = list.filter(function (p) { return d[p.id]; }).length;
      var complete = sd === list.length;
      return '<li class="stage' + (complete ? ' complete' : '') + '">' +
        '<div class="stage-head"><span class="stage-no" aria-hidden="true">' + (complete ? '✓' : si + 1) + '</span>' +
        '<div><h3>' + esc(name) + '</h3><p>' + (complete ? 'пройден' : sd + ' из ' + list.length) + '</p></div></div>' +
        '<ol>' + list.map(function (p) {
          var cls = d[p.id] === 'skip' ? 'skipped' : d[p.id] ? 'done' : (nxt && nxt.id === p.id ? 'next' : '');
          return '<li class="' + cls + '"><a href="#/' + p.id + '"><span class="dot" aria-hidden="true">' + (cls === 'skipped' ? icon('triangle-alert') : d[p.id] ? icon('check') : icon(p.icon || 'flag')) + '</span>' +
            '<span class="t">' + esc(p.title) + (cls === 'next' ? '<em>сейчас</em>' : '') + '</span>' +
            '<span class="time">' + esc(p.time || '') + '</span></a></li>';
        }).join('') + '</ol></li>';
    }).join('');

    var brands = '<section class="home-sec"><h2>Два бренда — два голоса</h2><div class="brand-cards">' +
      '<a class="brand-card" data-brand="belukha" href="#/katalog-belukha"><span class="bc-ico">' + icon('leaf') + '</span><span class="bc-kicker">Чай, иван-чай, мёд · Алтай</span>' +
      '<span class="bc-name">Предгорья Белухи / Smart Bee</span>' +
      '<span class="bc-text">Уют, семья и красивое чаепитие. От креатора ждут охваты. Главное табу — «чай лечит».</span>' +
      '<span class="bc-more">Смотреть продукты →</span></a>' +
      '<a class="brand-card" data-brand="biorepair" href="#/katalog-biorepair"><span class="bc-ico">' + icon('dental') + '</span><span class="bc-kicker">Зубные пасты · Италия</span>' +
      '<span class="bc-name">Biorepair®</span>' +
      '<span class="bc-text">Наука простыми словами и спокойный тон. Самые строгие правила: одна ошибка в кадре — и материал на пересборку.</span>' +
      '<span class="bc-more">Смотреть продукты →</span></a>' +
      '</div></section>';

    var tools = '<section class="home-sec"><h2>Под рукой в работе</h2><div class="tool-cards">' +
      tool('katalog-belukha', 'leaf', 'Каталог «Предгорий Белухи»', '91 позиция: вкус, состав, заварка, идеи роликов') +
      tool('katalog-biorepair', 'dental', 'Каталог Biorepair®', '33 позиции: чем отличается и как говорить') +
      tool('pravila', 'list-checks', 'Можно и нельзя', 'Все правила обоих брендов на одной странице') +
      tool('materialy', 'folder-open', 'Рабочие материалы', 'Таблицы, шаблоны, брендбуки, соцсети') +
      tool('faq', 'circle-help', 'Вопросы и контакты', 'Процесс, сдача, правки и к кому обращаться') +
      '</div></section>';

    root.innerHTML = hero + stats +
      '<section class="home-sec"><h2>Маршрут: ' + (site.stages || []).length + ' ' + plural((site.stages || []).length, 'этап', 'этапа', 'этапов') + '</h2><ol class="stages">' + stages + '</ol></section>' +
      brands + tools;
    var hr = root.querySelector('.hero-reset');
    if (hr) hr.addEventListener('click', function () { resetProgress(hr); });
  }

  /* ---------- удобства длинных страниц ---------- */

  // Оглавление «На странице» для длинных текстов
  function addToc(root) {
    var hs = root.querySelectorAll('h2');
    if (hs.length < 4) return;
    var nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'На этой странице');
    nav.innerHTML = '<span>На странице:</span>' + Array.prototype.map.call(hs, function (h, i) {
      h.id = 'sec-' + i;
      var t = Array.prototype.filter.call(h.childNodes, function (n) {
        return !(n.classList && n.classList.contains('other-toggle'));
      }).map(function (n) { return n.textContent; }).join('');
      return '<button type="button" data-to="sec-' + i + '">' + esc(t.replace(/^\d+\.\s*/, '')) + '</button>';
    }).join('');
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) document.getElementById(b.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var anchor = root.querySelector('.brand-hero') || root.querySelector('h1 + p') || root.querySelector('h1');
    anchor.after(nav);
  }

  // Шапка страницы бренда: цветной блок с названием и вводной строкой
  function brandHero(root, page) {
    if (!page.brand) return;
    var h1 = root.querySelector('h1');
    if (!h1) return;
    var hero = document.createElement('header');
    hero.className = 'brand-hero';
    hero.dataset.brand = page.brand;
    var lead = h1.nextElementSibling && h1.nextElementSibling.tagName === 'P' ? h1.nextElementSibling : null;
    h1.before(hero);
    hero.appendChild(h1);
    if (lead) hero.appendChild(lead);
  }

  // Переключатель «Мой бренд»: разделы с названием бренда в заголовке h2.
  // Свой бренд открыт, чужой свёрнут до заголовка, его можно раскрыть.
  function brandTabs(root) {
    var sections = [];
    var cur = null;
    Array.prototype.slice.call(root.children).forEach(function (el) {
      if (el.tagName === 'H2') {
        var t = el.textContent;
        cur = document.createElement('section');
        cur.className = 'brand-sec';
        cur.dataset.brand = /Белух/i.test(t) ? 'belukha' : /Biorepair/i.test(t) ? 'biorepair' : 'all';
        el.before(cur);
        sections.push(cur);
      }
      if (cur && el !== cur && !el.classList.contains('check-bar')) cur.appendChild(el);
    });
    var branded = sections.filter(function (x) { return x.dataset.brand !== 'all'; });
    if (!branded.length) return;
    branded.forEach(function (sec) {
      var h = sec.querySelector('h2');
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'other-toggle';
      h.appendChild(t);
      t.addEventListener('click', function () { sec.classList.toggle('open'); });
    });
    function apply(v) {
      branded.forEach(function (sec) {
        var other = v !== 'all' && sec.dataset.brand !== v;
        sec.classList.toggle('other', other);
        sec.classList.remove('open');
        sec.querySelector('.other-toggle').textContent = 'Как у другого бренда';
      });
      countChecks(root);
    }
    apply(load('brandPref') || (user && user.brand) || 'all');
  }

  /* ---------- тест ---------- */

  function renderQuiz(root, page, data) {
    var html = stepHeader(page) + '<h1>' + esc(page.title) + '</h1>';
    if (data.intro) html += '<div class="md">' + marked.parse(data.intro) + '</div>';
    html += '<form class="quiz">';
    data.questions.forEach(function (q, i) {
      html += '<fieldset class="q" data-i="' + i + '"><legend><span class="q-num">' + (i + 1) + '</span>' +
        (q.brand ? '<span class="tag" data-brand="' + esc(q.brand) + '">' + esc(brandName(q.brand)) + '</span>' : '') +
        esc(q.q) + '</legend>';
      q.options.forEach(function (o, j) {
        html += '<label class="opt"><input type="radio" name="q' + i + '" value="' + j + '"><span>' + esc(o) + '</span></label>';
      });
      html += '<p class="explain" hidden></p></fieldset>';
    });
    html += '<div class="quiz-foot"><button class="btn" type="submit">Проверить</button><button class="btn ghost" type="reset">Начать заново</button></div>';
    html += '<p class="quiz-result" role="status"></p></form>';
    if (data.task) html += '<div class="md quiz-after"' + (load('quiz') ? '' : ' hidden') + '>' + marked.parse(data.task) + '</div>';
    root.innerHTML = html + stepFooter(page);
    enhance(root, page);
    bindStep(root, page);

    var form = root.querySelector('form.quiz');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var right = 0, answered = 0;
      data.questions.forEach(function (q, i) {
        var fs = form.querySelector('fieldset[data-i="' + i + '"]');
        var pick = form.querySelector('input[name="q' + i + '"]:checked');
        fs.querySelectorAll('.opt').forEach(function (l, j) {
          l.classList.toggle('right', j === q.answer);
          l.classList.toggle('wrong', !!pick && +pick.value === j && j !== q.answer);
        });
        var ex = fs.querySelector('.explain');
        ex.hidden = false;
        if (pick) answered++;
        if (pick && +pick.value === q.answer) right++;
        ex.textContent = (pick ? (+pick.value === q.answer ? 'Верно. ' : 'Неверно. ') : 'Нет ответа. ') + (q.explain || '');
      });
      var total = data.questions.length;
      var pass = data.pass || Math.ceil(total * 0.8);
      var res = form.querySelector('.quiz-result');
      res.className = 'quiz-result ' + (right >= pass ? 'ok' : 'bad');
      res.textContent = 'Верно ' + right + ' из ' + total + '. ' + (right >= pass
        ? 'Тест пройден. Осталось практическое задание ниже.'
        : 'Нужно не меньше ' + pass + '. Перечитайте разделы, где ошиблись, и пройдите ещё раз.');
      save('quiz', { right: right, total: total, at: Date.now() });
      var after = root.querySelector('.quiz-after');
      if (after) after.hidden = false;
      if (right >= pass) { markDone(page.id); renderNav(page.id); }
      res.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    form.addEventListener('reset', function () {
      form.querySelectorAll('.opt').forEach(function (l) { l.classList.remove('right', 'wrong'); });
      form.querySelectorAll('.explain').forEach(function (p) { p.hidden = true; });
      form.querySelector('.quiz-result').textContent = '';
    });
  }

  /* ---------- каталог продукции ---------- */

  // Какие поля показывать в карточке и как их подписать. Поле без данных не выводится.
  var FIELDS = [
    ['properties', 'Главное', 'list'],
    ['taste', 'Вкус и аромат'],
    ['color', 'Цвет настоя'],
    ['composition', 'Состав'],
    ['components', 'Компоненты', 'components'],
    ['free_from', 'Без'],
    ['moment', 'Когда пить, кому подарить'],
    ['brewing', 'Как заваривать'],
    ['how_to_use', 'Как применять'],
    ['for_whom', 'Для кого'],
    ['say', 'Как говорить', 'list', 'yes'],
    ['avoid', 'Как нельзя', 'list', 'no'],
    ['content_ideas', 'Идеи роликов', 'list', 'idea']
  ];
  var META = ['line', 'type', 'age', 'volume', 'weight', 'caffeine'];

  function asList(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

  function productText(p) {
    return [p.name, p.name_ru, p.line, p.type, p.tagline, p.task, p.taste, p.composition]
      .concat(asList(p.properties)).join(' ').toLowerCase();
  }

  function renderCatalog(root, page, items, sub) {
    var state = load('cat:' + page.id) || { line: 'all', q: '', focus: false };
    var lines = [];
    items.forEach(function (p) { if (p.line && lines.indexOf(p.line) < 0) lines.push(p.line); });
    var hasFocus = items.some(function (p) { return p.focus; });
    var hasNew = items.some(function (p) { return p.new; });

    root.innerHTML = '<div class="md cat-head"><header class="brand-hero"' + (page.brand ? ' data-brand="' + esc(page.brand) + '"' : '') + '><h1>' + esc(page.title) + '</h1>' +
      (page.intro ? '<p>' + esc(page.intro) + '</p>' : '') + '</header></div>' +
      '<div class="cat-tools">' +
      '<input class="cat-search" type="search" placeholder="Поиск: название, вкус, свойство" aria-label="Поиск по каталогу">' +
      '<div class="cat-chips" role="toolbar" aria-label="Линейки">' +
      '<button type="button" data-line="all">Все · ' + items.length + '</button>' +
      lines.map(function (l) {
        var n = items.filter(function (p) { return p.line === l; }).length;
        return '<button type="button" data-line="' + esc(l) + '">' + esc(l) + ' · ' + n + '</button>';
      }).join('') +
      (hasFocus ? '<button type="button" class="flag" data-flag="focus">★ Топ продаж</button>' : '') +
      (hasNew ? '<button type="button" class="flag" data-flag="new">Новинки</button>' : '') +
      '</div></div>' +
      '<p class="cat-count" role="status"></p>' +
      '<div class="cat-grid"></div>' +
      '<dialog class="cat-modal" aria-label="Карточка продукта"></dialog>';

    var grid = root.querySelector('.cat-grid');
    var search = root.querySelector('.cat-search');
    var modal = root.querySelector('.cat-modal');
    search.value = state.q || '';
    var shown = [];

    function visible() {
      var q = (state.q || '').trim().toLowerCase();
      return items.filter(function (p) {
        if (state.line !== 'all' && p.line !== state.line) return false;
        if (state.focus && !p.focus) return false;
        if (state.isNew && !p.new) return false;
        return !q || productText(p).indexOf(q) >= 0;
      });
    }

    function draw() {
      save('cat:' + page.id, state);
      root.querySelectorAll('.cat-chips [data-line]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.line === state.line ? 'true' : 'false');
      });
      var f = root.querySelector('[data-flag="focus"]'); if (f) f.setAttribute('aria-pressed', state.focus ? 'true' : 'false');
      var n = root.querySelector('[data-flag="new"]'); if (n) n.setAttribute('aria-pressed', state.isNew ? 'true' : 'false');
      shown = visible();
      root.querySelector('.cat-count').textContent = shown.length ? 'Показано ' + shown.length + ' из ' + items.length : 'Ничего не нашлось. Сбросьте фильтр или поиск.';
      grid.innerHTML = shown.map(function (p) {
        var img = asList(p.images)[0];
        return '<button type="button" class="cat-card" data-id="' + esc(p.id) + '">' +
          '<span class="cat-img">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<span class="noimg">Фото<br>появится позже</span>') +
          (p.focus ? '<span class="badge">★ Топ</span>' : '') + (p.new ? '<span class="badge new">Новинка</span>' : '') + '</span>' +
          '<span class="cat-body"><span class="cat-line">' + esc(p.line || '') + '</span>' +
          '<span class="cat-name">' + esc(p.name_ru || p.name) + '</span>' +
          (p.tagline ? '<span class="cat-tag">' + esc(p.tagline) + '</span>' : '') + '</span></button>';
      }).join('');
    }

    function field(p, f) {
      var v = p[f[0]];
      if (!v || (Array.isArray(v) && !v.length)) return '';
      var body;
      if (f[2] === 'components') {
        body = '<ul class="comp">' + asList(v).map(function (c) {
          return '<li><b>' + esc(c.name) + '</b>' + (c.role ? ': ' + esc(c.role) : '') + '</li>';
        }).join('') + '</ul>';
      } else if (f[2] === 'list') {
        body = '<ul>' + asList(v).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      } else {
        body = '<p>' + esc(v).replace(/\n/g, '<br>') + '</p>';
      }
      return '<section class="pf ' + (f[3] || '') + '"><h3>' + esc(f[1]) + '</h3>' + body + '</section>';
    }

    function open(id, push) {
      var list = shown.length ? shown : items;
      var i = list.findIndex(function (p) { return p.id === id; });
      if (i < 0) { list = items; i = items.findIndex(function (p) { return p.id === id; }); }
      if (i < 0) return;
      var p = list[i];
      var imgs = asList(p.images);
      var meta = META.map(function (k) { return p[k] ? '<span>' + esc(p[k]) + '</span>' : ''; }).join('');
      modal.innerHTML =
        '<div class="pm-bar"><span class="pm-pos">' + (i + 1) + ' из ' + list.length + '</span>' +
        '<button type="button" class="pm-nav" data-go="-1" aria-label="Предыдущий">←</button>' +
        '<button type="button" class="pm-nav" data-go="1" aria-label="Следующий">→</button>' +
        '<button type="button" class="pm-close" aria-label="Закрыть">✕</button></div>' +
        '<div class="pm-grid"><div class="pm-media">' +
        (imgs.length ? '<img class="pm-main" src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '">' : '<div class="noimg big">Фото пока нет</div>') +
        (imgs.length > 1 ? '<div class="pm-thumbs">' + imgs.map(function (s, k) {
          return '<button type="button" data-src="' + esc(s) + '"' + (k ? '' : ' aria-current="true"') + '><img src="' + esc(s) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>' : '') +
        '</div><div class="pm-info">' +
        '<p class="cat-line">' + esc(p.line || '') + (p.focus ? ' · ★ Топ продаж' : '') + (p.new ? ' · Новинка' : '') + '</p>' +
        '<h2>' + esc(p.name_ru || p.name) + '</h2>' +
        (p.name_ru && p.name && p.name !== p.name_ru ? '<p class="pm-official">' + esc(p.name) + '</p>' : '') +
        (p.tagline ? '<p class="pm-tagline">' + esc(p.tagline) + '</p>' : '') +
        (meta ? '<div class="pm-meta">' + meta + '</div>' : '') +
        FIELDS.map(function (f) { return field(p, f); }).join('') +
        (p.source ? '<p class="pm-source">Источник: ' + esc(p.source) + '</p>' : '') +
        '</div></div>';
      modal.dataset.idx = i;
      modal._list = list;
      if (!modal.open) modal.showModal();
      modal.scrollTop = 0;
      if (push !== false) history.replaceState(null, '', '#/' + page.id + '/' + p.id);
    }

    function close() {
      if (modal.open) modal.close();
      history.replaceState(null, '', '#/' + page.id);
    }

    function go(d) {
      var list = modal._list || items;
      var i = (+modal.dataset.idx + d + list.length) % list.length;
      open(list[i].id);
    }

    root.querySelector('.cat-chips').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.line) state.line = b.dataset.line;
      if (b.dataset.flag === 'focus') state.focus = !state.focus;
      if (b.dataset.flag === 'new') state.isNew = !state.isNew;
      draw();
    });
    var t;
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value; draw(); }, 120); });
    grid.addEventListener('click', function (e) {
      var c = e.target.closest('.cat-card');
      if (c) open(c.dataset.id);
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('.pm-close')) return close();
      var nav = e.target.closest('.pm-nav');
      if (nav) return go(+nav.dataset.go);
      var th = e.target.closest('.pm-thumbs button');
      if (th) {
        modal.querySelector('.pm-main').src = th.dataset.src;
        modal.querySelectorAll('.pm-thumbs button').forEach(function (b) { b.removeAttribute('aria-current'); });
        th.setAttribute('aria-current', 'true');
      }
    });
    modal.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    var sx = null;
    modal.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    modal.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1);
    });

    draw();
    if (sub) open(sub, false);
  }

  function brandName(id) {
    var b = (site.brands || []).find(function (x) { return x.id === id; });
    return b ? b.name : id;
  }

  /* ---------- роутер ---------- */

  function show() {
    var parts = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    var id = parts[0] || 'home';
    // Старые адреса страниц, слитых в v3 (12.10.2026), ведут на новые.
    if (site.aliases && site.aliases[id]) { location.replace('#/' + site.aliases[id]); return; }
    var sub = parts[1] || '';
    var page = site.pages.find(function (p) { return p.id === id; }) || site.pages[0];
    var root = document.getElementById('main');
    if (!user && page.id !== 'obnovlenie') {
      document.body.dataset.brand = '';
      document.body.dataset.page = 'login';
      document.title = 'Вход · ' + site.title;
      document.querySelector('.mobile-step').hidden = true;
      closeMenu();
      renderLogin(root);
      window.scrollTo(0, 0);
      return;
    }
    document.body.dataset.brand = page.brand || '';
    document.body.dataset.page = page.type || 'text';
    document.title = (page.type === 'home' ? '' : page.title + ' · ') + site.title;
    document.querySelector('.mobile-step').hidden = true;
    document.body.classList.toggle('has-step', !!page.step);
    renderNav(page.id);
    closeMenu();

    var done = function () {
      window.scrollTo(0, 0);
      root.focus({ preventScroll: true });
    };

    if (page.type === 'home') { renderHome(root); done(); return; }

    fetchText(page.file).then(function (text) {
      if (page.type === 'quiz') {
        renderQuiz(root, page, JSON.parse(text));
      } else if (page.type === 'catalog') {
        renderCatalog(root, page, JSON.parse(text), sub);
      } else {
        root.innerHTML = stepHeader(page) + '<article class="md">' + marked.parse(stripFrontMatter(text)) + '</article>' + stepFooter(page);
        var art = root.querySelector('.md');
        enhance(art, page);
        brandTabs(art);
        brandHero(art, page);
        addToc(art);
        bindStep(root, page);
      }
      done();
    }).catch(function (err) {
      root.innerHTML = '<p class="error">' + esc(err.message) + '. Проверьте имя файла в content/site.json.</p>';
    });
  }

  /* ---------- меню на телефоне ---------- */

  var menuBtn = document.querySelector('.menu-btn');
  function closeMenu() {
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('menu-open') && !e.target.closest('#nav')) closeMenu();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- старт ---------- */

  marked.setOptions({ gfm: true, breaks: false });

  fetchText('site.json').then(function (t) {
    site = JSON.parse(t);
    var upd = document.querySelector('.updated');
    if (site.updated && upd) upd.textContent = 'Обновлено: ' + site.updated;
    restoreUser();
    window.addEventListener('hashchange', show);
    window.addEventListener('scroll', readProgress, { passive: true });
    show();
  }).catch(function (err) {
    document.getElementById('main').innerHTML = '<p class="error">Не удалось загрузить content/site.json: ' + esc(err.message) + '</p>';
  });
})();
