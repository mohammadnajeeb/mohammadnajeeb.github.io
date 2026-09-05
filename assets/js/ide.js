/* VS Code workbench behaviour for mohammadnajeeb.github.io
   No dependencies. Everything degrades: without JS the CSS unwraps the
   chrome into a plain scrolling document. */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var vsc      = $('#vsc');
  var body     = document.body;
  var DEPTH    = parseInt(body.getAttribute('data-depth') || '0', 10);
  var UP       = body.getAttribute('data-up') || (DEPTH ? '../' : '');
  var tabbar   = $('#tabbar');
  var docbody  = $('#docbody');
  var gutter   = $('#gutter');
  var crumbEl  = $('#breadcrumb');
  var scroller = $('#main');

  var THEMES = [
    ['dark-plus',       'Dark+ (default dark)'],
    ['light-plus',      'Light+ (default light)'],
    ['monokai',         'Monokai'],
    ['dracula',         'Dracula'],
    ['solarized-light', 'Solarized Light'],
    ['github-dark',     'GitHub Dark Dimmed']
  ];

  var docs = {};
  $$('.doc').forEach(function (el) { docs[el.getAttribute('data-doc')] = el; });

  /* ------------------------------------------------------- breakpoint
     Below this width the sidebar is an overlay drawer and the activity bar
     docks at the bottom. The drawer must never be left open across the
     boundary, so the state is synced on every crossing, not just at boot. */
  var DRAWER = window.matchMedia('(max-width: 820px)');
  function isNarrow() { return DRAWER.matches; }

  /* ------------------------------------------------------------ toast */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ------------------------------------------- easter egg (lazy load)
     The game is ~30 KB that a normal page view never needs, so it lives in
     its own file and is fetched on first activation. Three guards: the
     global is already there, a load is in flight, or the egg is already on
     screen. A failed load drops its own tag so a second click retries. */
  var eggState = 0;                       /* 0 idle — 1 in flight — 2 ready */

  function openEgg(pt) {
    var p = pt || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (window.__GLASS) {
      if (!window.__GLASS.isOpen()) window.__GLASS.open(p);
      return;
    }
    if (eggState === 1) return;
    eggState = 1;
    var s = document.createElement('script');
    s.src = UP + 'assets/js/egg-breakglass.js';
    s.onload = function () {
      if (window.__GLASS) { eggState = 2; window.__GLASS.open(p); }
      else { eggState = 0; toast('Something broke — just not the way it was meant to.'); }
    };
    s.onerror = function () {
      eggState = 0;
      if (s.parentNode) s.parentNode.removeChild(s);
      toast('Could not load that. The glass holds.');
    };
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------ tabs */
  function tabIcon(file) {
    var ext = file.indexOf('.') > -1 ? file.split('.').pop().toLowerCase() : 'md';
    var m = { md: ['#519aba', 'M'], json: ['#cbcb41', '{}'], py: ['#3572a5', 'PY'],
      tsx: ['#3178c6', 'TS'], ts: ['#3178c6', 'TS'], js: ['#f1e05a', 'JS'],
      ipynb: ['#f37726', 'IPY'], bib: ['#a074c4', 'BIB'], sh: ['#89e051', '$'],
      ino: ['#00979d', 'INO'], fig: ['#f24e1e', 'FIG'], pdf: ['#e2574c', 'PDF'] };
    return m[ext] || ['#8f8f8f', '•'];
  }

  function ensureTab(id) {
    var existing = tabbar.querySelector('[data-tab="' + CSS.escape(id) + '"]');
    if (existing) return existing;
    var d = docs[id];
    if (!d) return null;
    var file = d.getAttribute('data-file');
    var ic = tabIcon(file);
    var b = document.createElement('button');
    b.className = 'tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('data-tab', id);
    b.setAttribute('aria-selected', 'false');
    b.innerHTML = '<span class="tab__icon" style="color:' + ic[0] + '">' + ic[1] + '</span>' +
      '<span class="tab__name"></span>' +
      '<span class="tab__close" data-close="' + id + '" role="presentation">✕</span>';
    b.querySelector('.tab__name').textContent = file;
    tabbar.appendChild(b);
    return b;
  }

  function activate(id, push) {
    var d = docs[id];
    if (!d) return false;
    $$('.doc').forEach(function (x) { x.classList.toggle('is-active', x === d); });
    ensureTab(id);
    $$('.tab', tabbar).forEach(function (t) {
      t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === id));
    });
    var active = tabbar.querySelector('[aria-selected="true"]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    crumbEl.innerHTML = '';
    var parts = (d.getAttribute('data-path') || '').split('/').filter(Boolean);
    var frag = ['portfolio'].concat(parts);
    frag.forEach(function (p, i) {
      if (i) {
        var s = document.createElement('span');
        s.className = 'breadcrumb__sep'; s.textContent = '›';
        crumbEl.appendChild(s);
      }
      var t = document.createElement('span'); t.textContent = p; crumbEl.appendChild(t);
    });

    var langs = { md: 'Markdown', json: 'JSON', py: 'Python', python: 'Python',
      tsx: 'TypeScript React', ts: 'TypeScript', js: 'JavaScript', javascript: 'JavaScript',
      ipynb: 'Jupyter', bib: 'BibTeX', sh: 'Shell', cpp: 'C++', c: 'C' };
    var lang = $('#stLang');
    if (lang) lang.textContent = langs[d.getAttribute('data-lang')] || 'Plain Text';

    document.title = d.getAttribute('data-title') + ' — Mohammad Najeeb';
    if (push !== false && !DEPTH) {
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
    }
    scroller.scrollTop = 0;
    render();
    return true;
  }

  function closeTab(id) {
    var t = tabbar.querySelector('[data-tab="' + CSS.escape(id) + '"]');
    if (!t) return;
    var wasActive = t.getAttribute('aria-selected') === 'true';
    var sibling = t.nextElementSibling || t.previousElementSibling;
    t.remove();
    if (wasActive) {
      if (sibling) activate(sibling.getAttribute('data-tab'));
      else if (docs.welcome) activate('welcome');
      else { $$('.doc').forEach(function (x) { x.classList.remove('is-active'); }); }
    }
  }

  tabbar.addEventListener('click', function (ev) {
    var close = ev.target.closest('[data-close]');
    if (close) { ev.stopPropagation(); closeTab(close.getAttribute('data-close')); return; }
    var tab = ev.target.closest('.tab');
    if (tab) activate(tab.getAttribute('data-tab'));
  });

  /* ------------------------------------------------ gutter + minimap */
  function render() {
    var d = $('.doc.is-active');
    if (!d) return;
    var lineH = 20;
    var lines = Math.max(12, Math.ceil(d.offsetHeight / lineH));
    if (gutter) {
      var out = '';
      for (var i = 1; i <= lines; i++) out += '<span>' + i + '</span>';
      gutter.innerHTML = out;
    }
    var inner = $('#minimapInner');
    if (inner) {
      var blocks = $$('h1,h2,h3,p,li,pre,tr,.card,.entry__hl', d).slice(0, 220);
      inner.innerHTML = blocks.map(function (b) {
        var t = b.tagName;
        var cls = /^H[1-3]$/.test(t) ? 'is-head' : (t === 'PRE' ? 'is-code' : '');
        var w = Math.min(100, Math.max(18, (b.textContent || '').length / 1.7));
        return '<span class="minimap__line ' + cls + '" style="width:' + w + '%"></span>';
      }).join('');
    }
    syncMinimapView();
  }

  function syncMinimapView() {
    var v = $('#minimapView'), mm = $('#minimap');
    if (!v || !mm || !scroller) return;
    var ratio = scroller.clientHeight / Math.max(scroller.scrollHeight, 1);
    var top = scroller.scrollTop / Math.max(scroller.scrollHeight, 1);
    v.style.height = Math.min(100, ratio * 100) + '%';
    v.style.top = (top * 100) + '%';
  }

  var stPos = $('#stPos');
  scroller.addEventListener('scroll', function () {
    syncMinimapView();
    if (stPos) {
      var ln = Math.floor(scroller.scrollTop / 20) + 1;
      stPos.textContent = 'Ln ' + ln + ', Col 1';
    }
  }, { passive: true });

  var mm = $('#minimap');
  if (mm) mm.addEventListener('click', function (ev) {
    var r = mm.getBoundingClientRect();
    var p = (ev.clientY - r.top) / r.height;
    scroller.scrollTop = p * scroller.scrollHeight - scroller.clientHeight / 2;
  });

  var renderRAF = 0;
  function renderSoon() {
    if (renderRAF) return;
    renderRAF = requestAnimationFrame(function () {
      renderRAF = 0;
      syncLayout();
      render();
    });
  }
  window.addEventListener('resize', renderSoon);

  /* ------------------------------------------------------------ tree */
  document.addEventListener('click', function (ev) {
    var folder = ev.target.closest('[data-folder]');
    if (folder) {
      var g = folder.closest('.tree__group');
      var collapsed = g.getAttribute('data-collapsed') === 'true';
      g.setAttribute('data-collapsed', String(!collapsed));
      folder.setAttribute('aria-expanded', String(collapsed));
      return;
    }
    var row = ev.target.closest('a.tree__row, a.scm__msg, a.ext__card, a.card, a.welcome__link');
    if (!row) return;
    var href = row.getAttribute('href') || '';
    if (href.charAt(0) === '#' && href.length > 1) {
      var id = decodeURIComponent(href.slice(1));
      if (docs[id]) {
        ev.preventDefault();
        activate(id);
        markOpen(id);
        if (isNarrow()) vsc.classList.add('is-sidebar-hidden');
      }
    }
  });

  function markOpen(id) {
    var d = docs[id];
    if (!d) return;
    var file = d.getAttribute('data-file');
    $$('.tree__row').forEach(function (r) {
      r.classList.toggle('is-open', r.getAttribute('data-file') === file);
    });
  }

  /* keyboard navigation through the explorer */
  var treeEl = $('.tree');
  if (treeEl) treeEl.addEventListener('keydown', function (ev) {
    var rows = $$('.tree__row', treeEl).filter(function (r) { return r.offsetParent !== null; });
    var i = rows.indexOf(document.activeElement);
    if (i < 0) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); (rows[i + 1] || rows[0]).focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); (rows[i - 1] || rows[rows.length - 1]).focus(); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      var f = document.activeElement.closest('[data-folder]');
      if (f) { ev.preventDefault(); f.click(); }
    }
  });
  $$('.tree__row').forEach(function (r) { r.setAttribute('tabindex', '0'); });

  /* ------------------------------------------------- activity + views */
  function showView(v) {
    $$('.sidebar__view').forEach(function (s) {
      s.classList.toggle('is-active', s.getAttribute('data-view') === v);
    });
    $$('.activity__btn[data-view]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-view') === v));
    });
    vsc.classList.remove('is-sidebar-hidden');
    if (v === 'search') setTimeout(function () { var i = $('#searchInput'); if (i) i.focus(); }, 30);
    if (v === 'ext') loadExtensions();
  }

  $$('.activity__btn[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-view');
      if (b.getAttribute('aria-selected') === 'true' && !vsc.classList.contains('is-sidebar-hidden')) {
        vsc.classList.add('is-sidebar-hidden');
      } else { showView(v); }
    });
  });

  /* ------------------------------------- extensions (skills) view */
  var extLoaded = false;
  function loadExtensions() {
    if (extLoaded) return;
    var host = $('#extView');
    if (!host) return;
    extLoaded = true;
    fetch(UP + 'data/skills.json')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        host.innerHTML = j.categories.map(function (cat) {
          return '<div class="ext__group">' + escapeHtml(cat.name) + '</div>' +
            cat.items.map(function (s) {
              var stars = '\u2605'.repeat(s.level) + '\u2606'.repeat(5 - s.level);
              var icon = s.icon
                ? '<img src="' + UP + 'assets/img/skills/' + escapeHtml(s.icon) + '.svg" alt="" width="18" height="18">'
                : escapeHtml(s.name.charAt(0));
              return '<a class="ext__card" href="' + (DEPTH ? UP + 'index.html#skills' : '#skills') + '">' +
                '<span class="ext__icon" style="background:' + escapeHtml(s.color) + '">' +
                icon + '</span><span>' +
                '<span class="ext__name">' + escapeHtml(s.name) + '</span>' +
                '<span class="ext__desc">' + escapeHtml(s.desc) + '</span>' +
                '<span class="ext__foot"><span class="ext__stars">' + stars + '</span>' +
                '<span class="ext__pub">' + escapeHtml(s.publisher) + '</span></span>' +
                '</span></a>';
            }).join('');
        }).join('');
      })
      .catch(function () {
        host.innerHTML = '<div class="ext__group">Skills unavailable — ' +
          '<a href="#skills">open skills.json</a> instead.</div>';
        extLoaded = false;
      });
  }

  /* ------------------------------------------------------------ panel */
  $$('.panel__tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var p = t.getAttribute('data-pane');
      $$('.panel__tab').forEach(function (x) {
        x.setAttribute('aria-selected', String(x === t));
      });
      $$('.panel__pane').forEach(function (x) {
        x.classList.toggle('is-active', x.getAttribute('data-pane') === p);
      });
      if (p === 'terminal') { var i = $('#termIn'); if (i) i.focus(); }
    });
  });

  var panelEl = $('#panel'), resizer = $('#panelResize');
  if (resizer) {
    var dragging = false;
    resizer.addEventListener('mousedown', function (ev) { dragging = true; ev.preventDefault(); });
    window.addEventListener('mousemove', function (ev) {
      if (!dragging) return;
      var h = Math.min(Math.max(window.innerHeight - ev.clientY - 22, 90), window.innerHeight * 0.7);
      panelEl.style.height = h + 'px';
    });
    window.addEventListener('mouseup', function () { dragging = false; });
  }

  /* ------------------------------------------------------------ theme */
  function setTheme(id) {
    document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem('theme', id); } catch (e) {}
    var name = (THEMES.filter(function (t) { return t[0] === id; })[0] || [])[1];
    if (name) toast('Colour theme: ' + name);
    setTimeout(render, 30);
  }
  function cycleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark-plus';
    var i = 0;
    THEMES.forEach(function (t, n) { if (t[0] === cur) i = n; });
    setTheme(THEMES[(i + 1) % THEMES.length][0]);
  }

  /* -------------------------------------------------- command palette */
  var overlay = $('#overlay'), pInput = $('#paletteInput'), pList = $('#paletteList');
  var pMode = 'files', pItems = [], pIndex = 0;

  function fileItems() {
    var out = Object.keys(docs).map(function (id) {
      var d = docs[id];
      return { label: d.getAttribute('data-file'), desc: d.getAttribute('data-path'),
               icon: tabIcon(d.getAttribute('data-file')), run: function () { activate(id); markOpen(id); } };
    });
    (window.__POSTS || []).forEach(function (p) {
      out.push({ label: p.file, desc: p.path, icon: tabIcon('x.md'),
                 run: function () { location.href = UP + p.href; } });
    });
    return out;
  }

  function commandItems() {
    var cmds = [
      ['Go to File…', function () { openPalette('files'); }],
      ['View: Toggle Primary Side Bar', function () { vsc.classList.toggle('is-sidebar-hidden'); }],
      ['View: Toggle Panel', function () { vsc.classList.toggle('is-panel-hidden'); }],
      ['View: Toggle Minimap', function () { vsc.classList.toggle('is-minimap-hidden'); }],
      ['View: Show Explorer', function () { showView('explorer'); }],
      ['View: Show Search', function () { showView('search'); }],
      ['View: Show Source Control', function () { showView('scm'); }],
      ['View: Show Extensions (Skills)', function () { showView('ext'); }],
      ['Preferences: Colour Theme — next', cycleTheme]
    ];
    THEMES.forEach(function (t) {
      cmds.push(['Preferences: Colour Theme — ' + t[1], function () { setTheme(t[0]); }]);
    });
    cmds.push(['Download résumé (PDF)', function () { window.open(UP + 'assets/Najeeb_Resume.pdf', '_blank'); }]);
    cmds.push(['Copy email address', copyEmail]);
    cmds.push(['Open GitHub profile', function () { window.open('https://github.com/mohammadnajeeb', '_blank'); }]);
    cmds.push(['Open LinkedIn profile', function () { window.open('https://www.linkedin.com/in/mohammadnajeeb/', '_blank'); }]);
    cmds.push(['Terminal: Focus', function () { vsc.classList.remove('is-panel-hidden'); var i = $('#termIn'); if (i) i.focus(); }]);
    cmds.push(['Developer: Break Glass…', function () { openEgg(null); }]);
    return cmds.map(function (c) {
      return { label: c[0], desc: '', icon: ['#8f8f8f', '›'], run: c[1] };
    });
  }

  function fuzzy(needle, hay) {
    needle = needle.toLowerCase(); hay = hay.toLowerCase();
    if (!needle) return { ok: true, score: 0 };
    var i = 0, score = 0, last = -1;
    for (var j = 0; j < hay.length && i < needle.length; j++) {
      if (hay[j] === needle[i]) {
        score += (last === j - 1) ? 3 : 1;
        last = j; i++;
      }
    }
    return { ok: i === needle.length, score: score };
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    var out = '', qi = 0, lq = q.toLowerCase();
    for (var i = 0; i < text.length; i++) {
      var ch = escapeHtml(text[i]);
      if (qi < lq.length && text[i].toLowerCase() === lq[qi]) { out += '<mark>' + ch + '</mark>'; qi++; }
      else out += ch;
    }
    return out;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openPalette(mode) {
    pMode = mode;
    pItems = mode === 'files' ? fileItems() : commandItems();
    overlay.classList.add('is-open');
    pInput.value = mode === 'commands' ? '>' : '';
    pInput.placeholder = mode === 'commands' ? 'Type a command' : 'Search files by name';
    pInput.focus();
    if (mode === 'commands') pInput.setSelectionRange(1, 1);
    filterPalette();
  }
  function closePalette() { overlay.classList.remove('is-open'); }

  function filterPalette() {
    var q = pInput.value;
    if (q.charAt(0) === '>') {
      if (pMode !== 'commands') { pMode = 'commands'; pItems = commandItems(); }
      q = q.slice(1).trim();
    } else if (pMode === 'commands' && pInput.value.charAt(0) !== '>') {
      pMode = 'files'; pItems = fileItems();
    }
    var scored = [];
    pItems.forEach(function (it) {
      var r = fuzzy(q, it.label);
      if (r.ok) scored.push({ it: it, score: r.score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var shown = scored.slice(0, 40);
    pIndex = 0;
    if (!shown.length) {
      pList.innerHTML = '<p class="palette__empty">No matching results.</p>';
      return;
    }
    pList.innerHTML = shown.map(function (s, i) {
      return '<button class="palette__item" role="option" data-i="' + i + '" aria-selected="' +
        (i === 0) + '"><span class="palette__icon" style="color:' + s.it.icon[0] + '">' +
        s.it.icon[1] + '</span><span>' + highlight(s.it.label, q) + '</span>' +
        (s.it.desc ? '<span class="palette__desc">' + escapeHtml(s.it.desc) + '</span>' : '') +
        '</button>';
    }).join('');
    pList.__items = shown.map(function (s) { return s.it; });
  }

  function movePalette(dir) {
    var els = $$('.palette__item', pList);
    if (!els.length) return;
    pIndex = (pIndex + dir + els.length) % els.length;
    els.forEach(function (el, i) { el.setAttribute('aria-selected', String(i === pIndex)); });
    els[pIndex].scrollIntoView({ block: 'nearest' });
  }

  function runPalette() {
    var items = pList.__items || [];
    var it = items[pIndex];
    closePalette();
    if (it) it.run();
  }

  if (pInput) {
    pInput.addEventListener('input', filterPalette);
    pInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); movePalette(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); movePalette(-1); }
      else if (ev.key === 'Enter') { ev.preventDefault(); runPalette(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); closePalette(); }
    });
  }
  if (pList) pList.addEventListener('click', function (ev) {
    var b = ev.target.closest('.palette__item');
    if (b) { pIndex = parseInt(b.getAttribute('data-i'), 10); runPalette(); }
  });
  if (overlay) overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) closePalette();
  });

  /* ----------------------------------------------------------- search */
  var searchData = null, searchLoading = false;
  function loadSearch(cb) {
    if (searchData) return cb(searchData);
    if (searchLoading) return;
    searchLoading = true;
    fetch(UP + 'data/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { searchData = j; searchLoading = false; cb(j); })
      .catch(function () {
        searchLoading = false;
        $('#searchResults').innerHTML = '<p class="search-summary">Search index unavailable offline.</p>';
      });
  }

  var searchInput = $('#searchInput'), searchOut = $('#searchResults'), searchT;
  if (searchInput) searchInput.addEventListener('input', function () {
    clearTimeout(searchT);
    searchT = setTimeout(function () { runSearch(searchInput.value.trim()); }, 130);
  });

  function runSearch(q) {
    if (!q || q.length < 2) { searchOut.innerHTML = ''; return; }
    loadSearch(function (data) {
      var rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      var files = 0, hits = 0, html = '';
      data.forEach(function (entry) {
        var matches = [], m, guard = 0;
        rx.lastIndex = 0;
        while ((m = rx.exec(entry.text)) !== null && matches.length < 5 && guard++ < 400) {
          var s = Math.max(0, m.index - 34);
          matches.push(entry.text.slice(s, m.index + q.length + 46));
          rx.lastIndex = m.index + q.length;
        }
        if (!matches.length) return;
        files++; hits += matches.length;
        html += '<div class="search-file"><div class="search-file__name">' +
          '<span class="tree__icon" style="color:#519aba">M</span>' + escapeHtml(entry.file) +
          '<span class="search-file__count">' + matches.length + '</span></div>' +
          matches.map(function (t) {
            return '<button class="search-hit" data-href="' + escapeHtml(entry.href) + '">' +
              escapeHtml(t).replace(rx, function (x) { return '<mark>' + x + '</mark>'; }) +
              '</button>';
          }).join('') + '</div>';
      });
      searchOut.innerHTML = files
        ? '<p class="search-summary">' + hits + ' result' + (hits === 1 ? '' : 's') +
          ' in ' + files + ' file' + (files === 1 ? '' : 's') + '</p>' + html
        : '<p class="search-summary">No results found.</p>';
    });
  }

  if (searchOut) searchOut.addEventListener('click', function (ev) {
    var b = ev.target.closest('.search-hit');
    if (!b) return;
    var href = b.getAttribute('data-href');
    if (href.charAt(0) === '#' && docs[href.slice(1)]) { activate(href.slice(1)); markOpen(href.slice(1)); }
    else location.href = UP + href;
  });

  /* --------------------------------------------------------- terminal */
  var termOut = $('#termOut'), termIn = $('#termIn'), history_ = [], hIndex = -1;

  function echo(text, cls) {
    var d = document.createElement('div');
    d.className = 'term__line' + (cls ? ' ' + cls : '');
    d.innerHTML = text;
    termOut.appendChild(d);
    var pb = termOut.closest('.panel__body');
    if (pb) pb.scrollTop = pb.scrollHeight;
  }

  var FILES = {};
  Object.keys(docs).forEach(function (id) {
    FILES[docs[id].getAttribute('data-file')] = id;
  });

  var COMMANDS = {
    help: function () {
      echo('<span class="term__key">Available commands</span>');
      [['whoami', 'who is behind this site'],
       ['ls [dir]', 'list files in the workspace'],
       ['cat &lt;file&gt;', 'open a file in the editor'],
       ['open &lt;target&gt;', 'github · linkedin · x · resume · site'],
       ['skills', 'top skills and languages'],
       ['exp', 'current and past roles'],
       ['email', 'copy my email address'],
       ['theme [name]', 'switch colour theme'],
       ['neofetch', 'system information'],
       ['sudo', 'try it'],
       ['clear', 'clear the terminal']
      ].forEach(function (c) {
        echo('  <span class="term__key">' + c[0] + '</span>' +
             '<span class="term__dim">' + Array(Math.max(2, 18 - c[0].length)).join(' ') +
             c[1] + '</span>');
      });
    },
    whoami: function () {
      echo('Mohammad Najeeb');
      echo('<span class="term__dim">AI Engineer · ignite AI GmbH (Aug 2026 –)</span>');
      echo('<span class="term__dim">Lead developer · EduTech UdS, Saarland University</span>');
      echo('<span class="term__dim">M.Sc. Computer Science, Saarbrücken · Germany</span>');
    },
    ls: function (arg) {
      var names = Object.keys(FILES);
      if (arg) names = names.filter(function (n) { return n.indexOf(arg.replace(/\/$/, '')) === 0 ||
        (docs[FILES[n]].getAttribute('data-path') || '').indexOf(arg.replace(/\/$/, '')) === 0; });
      if (!names.length) { echo('ls: ' + escapeHtml(arg) + ': no such directory', 'term__err'); return; }
      echo(names.map(function (n) { return '<span class="term__key">' + escapeHtml(n) + '</span>'; }).join('   '));
    },
    cat: function (arg) {
      if (!arg) { echo('usage: cat &lt;file&gt;', 'term__err'); return; }
      var id = FILES[arg] || FILES[arg.replace(/^\.?\//, '')];
      if (!id) {
        var hit = Object.keys(FILES).filter(function (n) { return n.indexOf(arg) === 0; })[0];
        id = hit && FILES[hit];
      }
      if (!id) { echo('cat: ' + escapeHtml(arg) + ': no such file', 'term__err'); return; }
      activate(id); markOpen(id);
      echo('opened <span class="term__key">' + escapeHtml(docs[id].getAttribute('data-file')) +
           '</span> in the editor', 'term__ok');
    },
    open: function (arg) {
      var map = { github: 'https://github.com/mohammadnajeeb',
        linkedin: 'https://www.linkedin.com/in/mohammadnajeeb/',
        x: 'https://x.com/md__najeeb', twitter: 'https://x.com/md__najeeb',
        kaggle: 'https://kaggle.com/mohammadnajeeb',
        medium: 'https://medium.com/@mdnajeeb',
        resume: UP + 'assets/Najeeb_Resume.pdf', cv: UP + 'assets/Najeeb_Resume.pdf',
        demo: 'https://ncbi-gene-mcp-client.vercel.app',
        site: 'https://mohammadnajeeb.github.io' };
      var u = map[(arg || '').toLowerCase()];
      if (!u) { echo('open: unknown target. try: ' + Object.keys(map).join(', '), 'term__err'); return; }
      window.open(u, '_blank', 'noopener');
      echo('opening <span class="term__key">' + escapeHtml(u) + '</span>', 'term__ok');
    },
    skills: function () {
      echo('<span class="term__key">top</span>       Sovereign AI · AI Security · Multi-agent Systems');
      echo('<span class="term__key">languages</span> Python · TypeScript · JavaScript · SQL · C++');
      echo('<span class="term__key">ai/ml</span>     RAG · LLM integration · agentic workflows · pgvector · LangChain');
      echo('<span class="term__key">backend</span>   FastAPI · Node/Express · WebSockets · PostgreSQL');
      echo('<span class="term__dim">see skills.json for all 36 — try: cat skills.json</span>');
    },
    exp: function () {
      [['Aug 2026 –', 'AI Engineer, ignite AI GmbH'],
       ['Apr 2026 –', 'Student Assistant (lead dev), EduTech UdS'],
       ['Aug 2018 –', 'Co-founder & advisor, Olympia Academia'],
       ['2024–2025',  'Graduate Research Assistant, CIX Saarland'],
       ['2022–2023',  'Web Developer, Orion Solutions'],
       ['2021–2022',  'Research Intern, Taibah University']
      ].forEach(function (r) {
        echo('<span class="term__dim">' + r[0] + '</span>  <span class="term__key">' + r[1] + '</span>');
      });
    },
    email: function () { copyEmail(); },
    theme: function (arg) {
      if (!arg) {
        echo('themes: ' + THEMES.map(function (t) { return '<span class="term__key">' + t[0] + '</span>'; }).join(', '));
        return;
      }
      var found = THEMES.filter(function (t) { return t[0].indexOf(arg.toLowerCase()) === 0; })[0];
      if (!found) { echo('theme: unknown theme "' + escapeHtml(arg) + '"', 'term__err'); return; }
      setTheme(found[0]);
      echo('theme set to <span class="term__key">' + found[0] + '</span>', 'term__ok');
    },
    neofetch: function () {
      var art = ['   ███╗   ███╗███╗   ██╗', '   ████╗ ████║████╗  ██║',
                 '   ██╔████╔██║██╔██╗ ██║', '   ██║╚██╔╝██║██║╚██╗██║',
                 '   ██║ ╚═╝ ██║██║ ╚████║', '   ╚═╝     ╚═╝╚═╝  ╚═══╝'];
      var info = ['najeeb@portfolio', '─────────────────',
        'Role     AI Engineer', 'Company  ignite AI GmbH',
        'Study    M.Sc. CS, Saarland University', 'Location Saarbrücken, Germany',
        'Stack    Python · TypeScript · PostgreSQL',
        'Focus    RAG · agentic systems · sovereign LLMs',
        'Projects ' + Object.keys(docs).filter(function (k) { return k.indexOf('projects/') === 0; }).length,
        'Theme    ' + (document.documentElement.getAttribute('data-theme') || 'dark-plus')];
      for (var i = 0; i < Math.max(art.length, info.length); i++) {
        echo('<span class="term__ascii">' + escapeHtml(art[i] || '                         ') +
             '</span>  <span class="term__dim">' + escapeHtml(info[i] || '') + '</span>');
      }
    },
    sudo: function () {
      echo('najeeb is not in the sudoers file. This incident will be reported.', 'term__err');
      echo('<span class="term__dim">(it will not be reported)</span>');
    },
    breakglass: function () {
      echo('breaking the screen…', 'term__ok');
      openEgg(null);
    },
    clear: function () { termOut.innerHTML = ''; },
    pwd: function () { echo('/home/najeeb/portfolio'); },
    date: function () { echo(new Date().toString()); },
    echo: function (a) { echo(escapeHtml(a || '')); }
  };

  function copyEmail() {
    var addr = 'mdnajeeb.cs@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(function () {
        toast('Copied ' + addr);
        if (termOut) echo('copied <span class="term__key">' + addr + '</span> to clipboard', 'term__ok');
      }).catch(function () { window.location.href = 'mailto:' + addr; });
    } else { window.location.href = 'mailto:' + addr; }
  }

  function runCommand(raw) {
    var line = raw.trim();
    echo('<span class="term__prompt-user">najeeb@portfolio</span> ' +
         '<span class="term__prompt-path">~</span> ' +
         '<span class="term__prompt-mark">%</span> ' + escapeHtml(line));
    if (!line) return;
    history_.push(line); hIndex = history_.length;
    var parts = line.split(/\s+/);
    var cmd = parts.shift().toLowerCase();
    var arg = parts.join(' ');
    if (COMMANDS[cmd]) COMMANDS[cmd](arg);
    else echo('command not found: ' + escapeHtml(cmd) +
              ' — type <span class="term__key">help</span>', 'term__err');
  }

  if (termIn) {
    termIn.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { runCommand(termIn.value); termIn.value = ''; }
      else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (hIndex > 0) { hIndex--; termIn.value = history_[hIndex]; }
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (hIndex < history_.length - 1) { hIndex++; termIn.value = history_[hIndex]; }
        else { hIndex = history_.length; termIn.value = ''; }
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        var v = termIn.value.trim();
        var pool = v.indexOf(' ') > -1 ? Object.keys(FILES) : Object.keys(COMMANDS);
        var stem = v.indexOf(' ') > -1 ? v.slice(v.lastIndexOf(' ') + 1) : v;
        var hit = pool.filter(function (n) { return n.indexOf(stem) === 0; });
        if (hit.length === 1) {
          termIn.value = v.indexOf(' ') > -1 ? v.slice(0, v.lastIndexOf(' ') + 1) + hit[0] : hit[0];
        } else if (hit.length > 1) { echo(hit.join('   '), 'term__dim'); }
      }
    });
    var termPane = $('.panel__pane[data-pane="terminal"]');
    if (termPane) termPane.addEventListener('click', function (ev) {
      if (!ev.target.closest('a') && window.getSelection().isCollapsed) termIn.focus();
    });
  }

  /* ------------------------------------------------------- menu bar */
  function closeMenus() {
    $$('.menu-pop').forEach(function (m) { m.hidden = true; });
    $$('.menubar__item').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  $$('.menubar__item').forEach(function (b) {
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var name = b.getAttribute('data-menu');
      var pop = document.querySelector('[data-menu-for="' + name + '"]');
      var isOpen = !pop.hidden;
      closeMenus();
      if (!isOpen) {
        pop.hidden = false;
        pop.style.left = b.getBoundingClientRect().left + 'px';
        b.setAttribute('aria-expanded', 'true');
      }
    });
    b.addEventListener('mouseenter', function () {
      if ($$('.menu-pop').some(function (m) { return !m.hidden; })) b.click();
    });
  });
  document.addEventListener('click', closeMenus);

  /* ------------------------------------------------------- commands */
  function doCommand(cmd, pt) {
    if (!cmd) return;
    if (cmd.indexOf('url:') === 0) { window.open(cmd.slice(4), '_blank', 'noopener'); return; }
    if (cmd.indexOf('go:') === 0) {
      var id = cmd.slice(3);
      if (docs[id]) { activate(id); markOpen(id); }
      else if (id === 'blog') location.href = UP + 'blog/index.html';
      return;
    }
    if (cmd.indexOf('term:') === 0) {
      vsc.classList.remove('is-panel-hidden');
      runCommand(cmd.slice(5));
      return;
    }
    switch (cmd) {
      case 'palette': openPalette('commands'); break;
      case 'quickopen': openPalette('files'); break;
      case 'search': showView('search'); break;
      case 'scm': showView('scm'); break;
      case 'problems':
        vsc.classList.remove('is-panel-hidden');
        var pt = $('.panel__tab[data-pane="problems"]'); if (pt) pt.click();
        break;
      case 'toggle-sidebar': vsc.classList.toggle('is-sidebar-hidden'); break;
      case 'toggle-panel': vsc.classList.toggle('is-panel-hidden'); render(); break;
      case 'toggle-minimap': vsc.classList.toggle('is-minimap-hidden'); render(); break;
      case 'theme': cycleTheme(); break;
      case 'copy-email': copyEmail(); break;
      case 'resume': window.open(UP + 'assets/Najeeb_Resume.pdf', '_blank'); break;
      case 'open-site': window.open('https://mohammadnajeeb.github.io', '_blank'); break;
      case 'open-about': if (docs.about) { activate('about'); markOpen('about'); } break;
      case 'shortcuts':
        vsc.classList.remove('is-panel-hidden');
        runCommand('help');
        break;
      case 'clear-term': if (termOut) termOut.innerHTML = ''; break;
      case 'zen':
        vsc.classList.toggle('is-sidebar-hidden');
        vsc.classList.toggle('is-panel-hidden');
        render();
        break;
      case 'break-glass':
        closeMenus();
        closePalette();
        openEgg(pt);
        break;
      case 'close':
        toast('Nice try — you can close the browser tab instead.');
        break;
    }
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-cmd]');
    if (!el) return;
    ev.preventDefault();
    var pt;
    if (ev.clientX || ev.clientY) pt = { x: ev.clientX, y: ev.clientY };
    else {
      /* Chrome fires keyboard-activated clicks with clientX === 0, which would
         shatter from the screen corner. Fall back to the button itself. */
      var r = el.getBoundingClientRect();
      pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    doCommand(el.getAttribute('data-cmd'), pt);
  });

  /* ------------------------------------------------------ shortcuts */
  document.addEventListener('keydown', function (ev) {
    var mod = ev.metaKey || ev.ctrlKey;
    var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

    if (ev.key === 'Escape') {
      if (overlay.classList.contains('is-open')) { closePalette(); return; }
      closeMenus();
      if (isNarrow()) vsc.classList.add('is-sidebar-hidden');
      return;
    }
    if (mod && ev.shiftKey && (ev.key === 'P' || ev.key === 'p')) {
      ev.preventDefault(); openPalette('commands'); return;
    }
    if (mod && (ev.key === 'p' || ev.key === 'P')) { ev.preventDefault(); openPalette('files'); return; }
    if (mod && (ev.key === 'b' || ev.key === 'B')) { ev.preventDefault(); doCommand('toggle-sidebar'); return; }
    if (mod && (ev.key === 'j' || ev.key === 'J')) { ev.preventDefault(); doCommand('toggle-panel'); return; }
    if (mod && ev.shiftKey && (ev.key === 'F' || ev.key === 'f')) {
      ev.preventDefault(); showView('search'); return;
    }
    if (ev.ctrlKey && ev.key === '`') {
      ev.preventDefault();
      vsc.classList.remove('is-panel-hidden');
      var i = $('#termIn'); if (i) i.focus();
      return;
    }
    if (mod && (ev.key === 'w' || ev.key === 'W') && !typing) {
      var cur = tabbar.querySelector('[aria-selected="true"]');
      if (cur) { ev.preventDefault(); closeTab(cur.getAttribute('data-tab')); }
      return;
    }
    if (mod && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      var once = function (e2) {
        document.removeEventListener('keydown', once, true);
        if (e2.key === 't' || e2.key === 'T') { e2.preventDefault(); cycleTheme(); }
        else if (e2.key === 'b' || e2.key === 'B') { e2.preventDefault(); openEgg(null); }
      };
      document.addEventListener('keydown', once, true);
      return;
    }
  });

  /* ---------------------------------------------------------- clock */
  var clock = $('#stClock');
  function tick() {
    if (!clock) return;
    var d = new Date();
    clock.textContent = String(d.getHours()).padStart(2, '0') + ':' +
                        String(d.getMinutes()).padStart(2, '0');
  }
  tick(); setInterval(tick, 20000);

  /* --------------------------------------------- drawer scrim + sync */
  var scrim = document.createElement('div');
  scrim.className = 'sidebar-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  var vscBody = $('.vsc__body');
  if (vscBody) vscBody.appendChild(scrim);
  scrim.addEventListener('click', function () { vsc.classList.add('is-sidebar-hidden'); });

  /* Remember how the workbench was arranged on the wide layout so that
     collapsing to the drawer and back restores it instead of stranding the
     visitor with a hidden sidebar or an open drawer over the document. */
  var wideState = null;
  var lastNarrow = null;

  /* Only act on an actual crossing. Driven from both the resize handler and
     the media-query listener: 'change' alone is not dependable in every
     embedding, and resize alone would fight the remembered wide state. */
  function syncLayout() {
    var narrow = isNarrow();
    if (narrow === lastNarrow) return;
    lastNarrow = narrow;
    applyBreakpoint(narrow);
  }

  function applyBreakpoint(narrow) {
    if (narrow) {
      if (!wideState) wideState = {
        sidebar: vsc.classList.contains('is-sidebar-hidden'),
        panel:   vsc.classList.contains('is-panel-hidden')
      };
      vsc.classList.add('is-sidebar-hidden', 'is-panel-hidden');
    } else if (wideState) {
      vsc.classList.toggle('is-sidebar-hidden', wideState.sidebar);
      vsc.classList.toggle('is-panel-hidden', wideState.panel);
      wideState = null;
    }
    render();
  }
  if (DRAWER.addEventListener) DRAWER.addEventListener('change', syncLayout);
  else DRAWER.addListener(syncLayout);

  /* ----------------------------------------------------------- boot */
  function boot() {
    var start = (location.hash || '').replace(/^#/, '');
    start = decodeURIComponent(start);
    if (start && docs[start]) { activate(start, false); markOpen(start); }
    else { activate(body.getAttribute('data-active') || 'welcome', false); }
    syncLayout();
    render();
    loadSearch(function (data) {
      window.__POSTS = data.filter(function (d) { return d.id.indexOf('blog/') === 0; });
    });
  }

  window.addEventListener('hashchange', function () {
    var id = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (id && docs[id]) { activate(id, false); markOpen(id); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
