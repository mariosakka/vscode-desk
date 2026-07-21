(function () {
  window.scrollTo(0, 0);
  const vscode = acquireVsCodeApi();

  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    const deskPage = a.getAttribute('data-desk-page');
    if (deskPage) {
      vscode.postMessage({ type: 'navigate', filename: deskPage });
      return;
    }
    const href = a.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (href.startsWith('http://') || href.startsWith('https://')) {
      vscode.postMessage({ type: 'openUrl', url: href });
      return;
    }
    const filename = href.startsWith('desk-page:') ? href.slice('desk-page:'.length) : href;
    vscode.postMessage({ type: 'navigate', filename });
  }, true);

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomLabel = document.getElementById('zoom-label');

  function getCurrentZoom() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--zoom').trim();
    return parseFloat(v) || 1.0;
  }

  function applyZoom(level) {
    const clamped = Math.round(Math.max(0.5, Math.min(3.0, level)) * 10) / 10;
    document.documentElement.style.setProperty('--zoom', String(clamped));
    if (zoomLabel) zoomLabel.textContent = Math.round(clamped * 100) + '%';
    vscode.postMessage({ type: 'setZoom', level: clamped });
  }

  if (zoomInBtn) zoomInBtn.addEventListener('click', function () { applyZoom(getCurrentZoom() + 0.1); });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { applyZoom(getCurrentZoom() - 0.1); });

  document.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    applyZoom(getCurrentZoom() + (e.deltaY < 0 ? 0.1 : -0.1));
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    if (e.key === '=' || e.key === '+') { e.preventDefault(); applyZoom(getCurrentZoom() + 0.1); }
    else if (e.key === '-') { e.preventDefault(); applyZoom(getCurrentZoom() - 0.1); }
    else if (e.key === '0') { e.preventDefault(); applyZoom(1.0); vscode.postMessage({ type: 'setZoom', level: 1.0 }); }
  });

  window.addEventListener('message', function (e) {
    const msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'setZoom') {
      const level = typeof msg.level === 'number' ? msg.level : 1.0;
      document.documentElement.style.setProperty('--zoom', String(level));
      if (zoomLabel) zoomLabel.textContent = Math.round(level * 100) + '%';
    }

    if (msg.type === 'toggleToc') {
      var panel = document.getElementById('book-nav') || document.getElementById('page-toc');
      var toggle = document.getElementById('toc-toggle');
      if (panel && toggle) {
        var nowCollapsed = panel.classList.toggle('collapsed');
        toggle.textContent = nowCollapsed ? '≡' : '←';
        document.body.classList.toggle('toc-open', !nowCollapsed);
      }
    }
  });

  if (zoomLabel) {
    const initial = getCurrentZoom();
    zoomLabel.textContent = Math.round(initial * 100) + '%';
  }

  (function buildPageToc() {
    var headings = Array.from(
      document.querySelectorAll('.page-content h2[id], .page-content h3[id]')
    );
    if (headings.length === 0) return;

    var bookNav = document.getElementById('book-nav');
    var listHtml = headings.map(function(h) {
      var cls = h.tagName === 'H3' ? ' class="page-toc-h3"' : '';
      return '<li' + cls + '><a href="#' + h.id + '">' + h.textContent.trim() + '</a></li>';
    }).join('');

    if (bookNav) {
      bookNav.insertAdjacentHTML('beforeend',
        '<hr class="page-toc-divider">' +
        '<span class="page-toc-label">On this page</span>' +
        '<ul class="page-toc-list">' + listHtml + '</ul>'
      );
    } else {
      var nav = document.createElement('nav');
      nav.id = 'page-toc';
      nav.className = 'toc-panel collapsed';
      nav.innerHTML =
        '<span class="page-toc-label">On this page</span>' +
        '<ul class="page-toc-list">' + listHtml + '</ul>';
      var content = document.querySelector('.page-content');
      document.body.insertBefore(nav, content);
    }
  }());

  var tocToggle = document.getElementById('toc-toggle');
  var tocPanel = document.getElementById('book-nav') || document.getElementById('page-toc');
  if (tocToggle && tocPanel) {
    var collapsed = tocPanel.classList.contains('collapsed');
    tocToggle.textContent = collapsed ? '≡' : '←';
    if (!collapsed) { document.body.classList.add('toc-open'); }
    tocToggle.addEventListener('click', function() {
      var isNowCollapsed = tocPanel.classList.toggle('collapsed');
      tocToggle.textContent = isNowCollapsed ? '≡' : '←';
      document.body.classList.toggle('toc-open', !isNowCollapsed);
    });
  } else if (tocToggle) {
    tocToggle.style.display = 'none';
  }
}());
