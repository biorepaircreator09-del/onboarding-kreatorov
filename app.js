/* Онбординг креатора: всё содержание приходит из content/, здесь только движок.
   Страницы описаны в content/site.json, тексты — Markdown, тест — content/quiz.json. */
(function () {
  'use strict';

  var CONTENT = 'content/';
  var STORE = 'onb:';
  var site = null;
  var cache = {};

  var CALLOUTS = {
    'ПРИМЕР': { cls: 'example', label: 'Пример' },
    'ЗАДАНИЕ': { cls: 'task', label: 'Задание' },
    'САМОПРОВЕРКА': { cls: 'check', label: 'Самопроверка' },
    'ПРЕДПОЛОЖЕНИЕ': { cls: 'guess', label: 'Предположение: не подтверждено брендом' },
    'ВАЖНО': { cls: 'important', label: 'Важно' },
    'МОЖНО': { cls: 'yes', label: 'Можно' },
    'НЕЛЬЗЯ': { cls: 'no', label: 'Нельзя' },
    'ОБЯЗАТЕЛЬНО': { cls: 'must', label: 'Обязательно' },
    'ИСТОЧНИК': { cls: 'source', label: 'Источник' }
  };

  function load(key) {
    try { return JSON.parse(localStorage.getItem(STORE + key)); } catch (e) { return null; }
  }
  function save(key, val) {
    try { localStorage.setItem(STORE + key, JSON.stringify(val)); } catch (e) { /* приватное окно */ }
  }

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

  /* ---------- навигация и прогресс ---------- */

  function routePages() {
    return site.pages.filter(function (p) { return p.step; });
  }

  function doneSet() { return load('done') || {}; }

  function doneCount() {
    var d = doneSet();
    return routePages().filter(function (p) { return d[p.id]; }).length;
  }

  // Следующий непройденный шаг; если всё пройдено – null
  function nextStep() {
    var d = doneSet();
    return routePages().find(function (p) { return !d[p.id]; }) || null;
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
      '<span class="nav-home-ico" aria-hidden="true">⌂</span>Главная</a>';

    html += '<p class="nav-group">Онбординг <span class="nav-count">' + doneCount() + ' из ' + steps.length + '</span></p>';
    var stage = 0;
    html += '<ol class="nav-steps">';
    steps.forEach(function (p, i) {
      if (p.stage !== stage) {
        stage = p.stage;
        html += '<li class="nav-stage">' + esc(stage + '. ' + stageName(stage)) + '</li>';
      }
      var state = d[p.id] ? 'done' : (nxt && nxt.id === p.id ? 'next' : '');
      html += '<li class="nav-step ' + state + '">' + navLink(p, activeId,
        '<span class="num" aria-hidden="true">' + (d[p.id] ? '✓' : (i + 1)) + '</span>' +
        '<span class="t">' + esc(p.title) + (d[p.id] ? '<span class="sr"> (пройден)</span>' : '') + '</span>') + '</li>';
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
      html += '<li>' + navLink(p, activeId, esc(p.title)) + '</li>';
    });
    if (group !== null) html += '</ul>';
    nav.innerHTML = html;
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

  function enhance(root, page) {
    // Блок ```socials belukha``` превращается в карточки соцсетей
    root.querySelectorAll('pre > code.language-socials').forEach(function (code) {
      var holder = document.createElement('div');
      code.parentElement.replaceWith(holder);
      renderSocials(holder, code.textContent.trim());
    });

    // Врезки: > [!ЗАДАНИЕ] Заголовок
    root.querySelectorAll('blockquote').forEach(function (bq) {
      var first = bq.firstElementChild;
      if (!first) return;
      var m = first.innerHTML.match(/^\s*\[!([А-ЯЁA-Z]+)\]\s*([^\n<]*)(?:<br>)?\n?/);
      if (!m || !CALLOUTS[m[1]]) return;
      var c = CALLOUTS[m[1]];
      first.innerHTML = first.innerHTML.slice(m[0].length);
      if (!first.textContent.trim() && !first.querySelector('img')) first.remove();
      var box = document.createElement('aside');
      box.className = 'callout ' + c.cls;
      box.innerHTML = '<p class="callout-title">' + esc(c.label) + (m[2].trim() ? ': ' + esc(m[2].trim()) : '') + '</p>';
      while (bq.firstChild) box.appendChild(bq.firstChild);
      bq.replaceWith(box);
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

    // Блоки кода — шаблоны с кнопкой «Скопировать»
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

    // Внешние ссылки — в новой вкладке
    root.querySelectorAll('a[href^="http"]').forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  function countChecks(root) {
    var vis = function (sel) {
      return Array.prototype.filter.call(root.querySelectorAll(sel), function (x) { return !x.closest('[hidden]'); });
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
    return '<div class="step-head"><p class="step-kicker"><b>Этап ' + page.stage + ' · ' + esc(stageName(page.stage)) + '</b>' +
      '<span>Шаг ' + n + ' из ' + total + (page.time ? ' · ' + esc(page.time) : '') + '</span></p>' +
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
      '</div>';
  }

  function markDone(id) {
    var d = doneSet();
    d[id] = true;
    save('done', d);
  }

  function bindStep(root, page) {
    if (!page.step) return;
    var btn = root.querySelector('.go-next');
    var go = function () {
      markDone(page.id);
      location.hash = '#/' + btn.dataset.next;
    };
    btn.addEventListener('click', go);
    // Нижняя панель на телефоне: следующий шаг всегда под пальцем
    var bar = document.querySelector('.mobile-step');
    var next = routePages()[stepNo(page)];
    bar.hidden = false;
    bar.querySelector('.ms-pos').textContent = 'Шаг ' + stepNo(page) + ' из ' + routePages().length;
    var b = bar.querySelector('.ms-next');
    b.textContent = next ? 'Дальше →' : 'Завершить →';
    b.onclick = go;
  }

  /* ---------- главная ---------- */

  function tool(id, ico, name, text) {
    return '<a class="tool-card" href="#/' + id + '"><span class="tc-ico" aria-hidden="true">' + ico + '</span>' +
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

    var title = !nxt ? 'Онбординг пройден. Время первого ролика'
      : n ? 'С возвращением! Продолжим с шага ' + stepNo(nxt)
      : 'От знакомства с брендами до первого ролика';
    var cta = !nxt
      ? '<a class="btn big" href="#/test">Открыть итоговое задание</a><a class="btn ghost" href="#/proverka">Проверить свой текст</a>'
      : '<a class="btn big" href="#/' + nxt.id + '">' + (n ? 'Продолжить' : 'Начать онбординг') + ' →</a>' +
        '<span class="cta-note">' + (n ? 'Шаг ' + stepNo(nxt) + ': ' + esc(nxt.title) : 'Первый шаг займёт 5 минут') + '</span>';

    var hero = '<section class="home-hero">' +
      '<p class="eyebrow">Онбординг креатора · Предгорья Белухи и Biorepair®</p>' +
      '<h1>' + esc(title) + '</h1>' +
      '<p class="lead">' + steps.length + ' коротких шагов, около ' + (Math.round(total / 10) * 10) + ' минут. В каждом – немного теории, пример и маленькое задание. Прогресс сохраняется в этом браузере.</p>' +
      '<div class="hero-cta">' + cta + '</div>' +
      '<div class="hero-progress"><div class="progress-bar big" role="progressbar" aria-label="Прогресс онбординга" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<span>' + n + ' из ' + steps.length + ' шагов</span></div>' +
      '</section>';

    var stages = (site.stages || []).map(function (name, si) {
      var list = steps.filter(function (p) { return p.stage === si + 1; });
      var sd = list.filter(function (p) { return d[p.id]; }).length;
      var complete = sd === list.length;
      return '<li class="stage' + (complete ? ' complete' : '') + '">' +
        '<div class="stage-head"><span class="stage-no" aria-hidden="true">' + (complete ? '✓' : si + 1) + '</span>' +
        '<div><h3>' + esc(name) + '</h3><p>' + (complete ? 'пройден' : sd + ' из ' + list.length) + '</p></div></div>' +
        '<ol>' + list.map(function (p) {
          var cls = d[p.id] ? 'done' : (nxt && nxt.id === p.id ? 'next' : '');
          return '<li class="' + cls + '"><a href="#/' + p.id + '"><span class="dot" aria-hidden="true"></span>' +
            '<span class="t">' + esc(p.title) + (cls === 'next' ? '<em>сейчас</em>' : '') + '</span>' +
            '<span class="time">' + esc(p.time || '') + '</span></a></li>';
        }).join('') + '</ol></li>';
    }).join('');

    var brands = '<section class="home-sec"><h2>Два бренда – два голоса</h2><div class="brand-cards">' +
      '<a class="brand-card" data-brand="belukha" href="#/belukha"><span class="bc-kicker">Чай, иван-чай, мёд · Алтай</span>' +
      '<span class="bc-name">Предгорья Белухи / Smart Bee</span>' +
      '<span class="bc-text">Уют, семья и красивое чаепитие. От креатора ждут охваты. Главное табу: «чай лечит».</span>' +
      '<span class="bc-more">Про бренд →</span></a>' +
      '<a class="brand-card" data-brand="biorepair" href="#/biorepair"><span class="bc-kicker">Зубные пасты · Италия</span>' +
      '<span class="bc-name">Biorepair®</span>' +
      '<span class="bc-text">Наука простыми словами и спокойный тон. Самые строгие правила: одна ошибка в кадре – и материал на пересборку.</span>' +
      '<span class="bc-more">Про бренд →</span></a>' +
      '</div></section>';

    var tools = '<section class="home-sec"><h2>Под рукой в работе</h2><div class="tool-cards">' +
      tool('katalog-belukha', '🍵', 'Каталог Белухи', '91 позиция: вкус, состав, заварка, идеи роликов') +
      tool('katalog-biorepair', '🦷', 'Каталог Biorepair®', '33 позиции: чем отличается и как говорить') +
      tool('proverka', '✓', 'Проверка текста', 'Вставьте подпись – подсветим стоп-слова') +
      tool('shablony', '✎', 'Шаблоны', 'Сценарий, бриф и памятка блогеру') +
      tool('biblioteka', '⧉', 'Библиотека и соцсети', 'Брендбуки, логотипы, аккаунты брендов') +
      '</div></section>';

    root.innerHTML = hero +
      '<section class="home-sec"><h2>Маршрут: 4 этапа</h2><ol class="stages">' + stages + '</ol></section>' +
      brands + tools;
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
      return '<button type="button" data-to="sec-' + i + '">' + esc(h.textContent.replace(/^\d+\.\s*/, '')) + '</button>';
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

  // Переключатель «Мой бренд»: разделы с названием бренда в заголовке показываются по выбору
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
    if (!sections.length) return;
    var bar = document.createElement('div');
    bar.className = 'brand-switch';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Показать правила бренда');
    bar.innerHTML = '<span>Мой бренд:</span>' +
      [['all', 'Оба'], ['belukha', 'Белуха'], ['biorepair', 'Biorepair®']].map(function (o) {
        return '<button type="button" data-b="' + o[0] + '">' + o[1] + '</button>';
      }).join('');
    sections[0].before(bar);
    function apply(v) {
      save('brandPref', v);
      bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.b === v ? 'true' : 'false'); });
      sections.forEach(function (s) { s.hidden = !(s.dataset.brand === 'all' || v === 'all' || s.dataset.brand === v); });
      countChecks(root);
    }
    bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) apply(b.dataset.b); });
    apply(load('brandPref') || 'all');
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
    if (data.task) html += '<div class="md">' + marked.parse(data.task) + '</div>';
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
      if (right >= pass) { markDone(page.id); renderNav(page.id); }
      res.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    form.addEventListener('reset', function () {
      form.querySelectorAll('.opt').forEach(function (l) { l.classList.remove('right', 'wrong'); });
      form.querySelectorAll('.explain').forEach(function (p) { p.hidden = true; });
      form.querySelector('.quiz-result').textContent = '';
    });
  }

  /* ---------- проверка текста ---------- */

  function compileRules(rules) {
    return rules.map(function (r) {
      try { return Object.assign({}, r, { re: new RegExp(r.pattern, r.flags || 'giu') }); }
      catch (e) { console.warn('Правило с ошибкой, пропущено:', r.pattern); return null; }
    }).filter(Boolean);
  }

  function scanText(text, rules, brand) {
    var hits = [];
    rules.forEach(function (r) {
      if (r.brand !== 'all' && brand !== 'all' && r.brand !== brand) return;
      r.re.lastIndex = 0;
      var m;
      while ((m = r.re.exec(text)) !== null) {
        if (!m[0]) { r.re.lastIndex++; continue; }
        hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], rule: r });
      }
    });
    hits.sort(function (a, b) { return a.start - b.start || (a.rule.level === 'stop' ? -1 : 1); });
    return hits;
  }

  function highlight(text, hits) {
    var out = '', pos = 0;
    hits.forEach(function (h) {
      if (h.start < pos) return; // перекрытие: первое совпадение важнее
      out += esc(text.slice(pos, h.start)) +
        '<mark class="' + h.rule.level + '" title="' + esc(h.rule.say) + '">' + esc(h.text) + '</mark>';
      pos = h.end;
    });
    return out + esc(text.slice(pos));
  }

  function renderChecker(root, page, data) {
    var rules = compileRules(data.rules);
    var draft = load('checker:draft') || '';
    root.innerHTML = '<h1>' + esc(page.title) + '</h1>' +
      '<div class="md"><p>' + esc(data.intro) + '</p></div>' +
      '<div class="checker">' +
      '<div class="checker-brand" role="radiogroup" aria-label="Бренд">' +
      '<label><input type="radio" name="cb" value="all" checked><span>Оба бренда</span></label>' +
      '<label data-brand="belukha"><input type="radio" name="cb" value="belukha"><span>Белуха</span></label>' +
      '<label data-brand="biorepair"><input type="radio" name="cb" value="biorepair"><span>Biorepair®</span></label>' +
      '</div>' +
      '<textarea class="checker-input" rows="8" placeholder="Например: Эта отбеливающая паста убивает бактерии. Успейте купить!"></textarea>' +
      '<div class="checker-summary" role="status"></div>' +
      '<div class="checker-preview" hidden></div>' +
      '<ul class="checker-list"></ul>' +
      '</div>';
    var ta = root.querySelector('.checker-input');
    ta.value = draft;

    function run() {
      var text = ta.value;
      save('checker:draft', text);
      var brand = root.querySelector('input[name=cb]:checked').value;
      var sum = root.querySelector('.checker-summary');
      var prev = root.querySelector('.checker-preview');
      var list = root.querySelector('.checker-list');
      if (!text.trim()) { sum.textContent = ''; sum.className = 'checker-summary'; prev.hidden = true; list.innerHTML = ''; return; }
      var hits = scanText(text, rules, brand);
      var stops = hits.filter(function (h) { return h.rule.level === 'stop'; }).length;
      var warns = hits.length - stops;
      sum.className = 'checker-summary ' + (stops ? 'bad' : warns ? 'mid' : 'ok');
      sum.textContent = stops ? 'Стоп-слов: ' + stops + (warns ? ', замечаний: ' + warns : '') + '. В таком виде текст не публикуем.'
        : warns ? 'Стоп-слов нет, замечаний: ' + warns + '. Проверьте их перед отправкой.'
        : 'Проверка ничего не нашла. Теперь пройдите чек-лист глазами.';
      prev.hidden = false;
      prev.innerHTML = highlight(text, hits);
      var seen = {};
      list.innerHTML = hits.filter(function (h) {
        var k = h.rule.pattern + '|' + h.text.toLowerCase();
        if (seen[k]) return false;
        return (seen[k] = true);
      }).map(function (h) {
        return '<li class="' + h.rule.level + '"><span class="chip">' + (h.rule.level === 'stop' ? 'Стоп' : 'Замечание') + '</span>' +
          '<b>«' + esc(h.text) + '»</b> <span class="grp">' + esc(h.rule.group) + '</span><br>' + esc(h.rule.say) + '</li>';
      }).join('');
    }
    var t;
    ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 150); });
    root.querySelectorAll('input[name=cb]').forEach(function (r) { r.addEventListener('change', run); });
    run();
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
          return '<li><b>' + esc(c.name) + '</b>' + (c.role ? ' – ' + esc(c.role) : '') + '</li>';
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
    var sub = parts[1] || '';
    var page = site.pages.find(function (p) { return p.id === id; }) || site.pages[0];
    var root = document.getElementById('main');
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
      } else if (page.type === 'checker') {
        renderChecker(root, page, JSON.parse(text));
      } else if (page.type === 'catalog') {
        renderCatalog(root, page, JSON.parse(text), sub);
      } else {
        root.innerHTML = stepHeader(page) + '<article class="md">' + marked.parse(stripFrontMatter(text)) + '</article>' + stepFooter(page);
        var art = root.querySelector('.md');
        enhance(art, page);
        if (page.tabs === 'brand') brandTabs(art);
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
  menuBtn.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---------- старт ---------- */

  marked.setOptions({ gfm: true, breaks: false });

  fetchText('site.json').then(function (t) {
    site = JSON.parse(t);
    if (site.updated) document.querySelector('.updated').textContent = 'Обновлено: ' + site.updated;
    window.addEventListener('hashchange', show);
    show();
  }).catch(function (err) {
    document.getElementById('main').innerHTML = '<p class="error">Не удалось загрузить content/site.json: ' + esc(err.message) + '</p>';
  });
})();
