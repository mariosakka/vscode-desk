(function () {
  const vscode = acquireVsCodeApi();
  let currentData = null;
  let activeTabId = null;

  // Theme — restore saved preference
  const root = document.documentElement;
  if (localStorage.getItem('ddd-theme') === 'light') {
    root.classList.add('light');
    updateToggleLabel(true);
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isLight = root.classList.toggle('light');
    localStorage.setItem('ddd-theme', isLight ? 'light' : 'dark');
    updateToggleLabel(isLight);
  });

  function updateToggleLabel(isLight) {
    const btn = document.getElementById('theme-toggle');
    btn.innerHTML = isLight
      ? '☀️ <span class="tl">LIGHT</span>'
      : '🌙 <span class="tl">DARK</span>';
  }

  // ── Rendering ──────────────────────────────────

  function render(data) {
    if (!data || !data.tabs || data.tabs.length === 0) {
      document.getElementById('tabs-bar').innerHTML = '';
      document.getElementById('bookmarks-grid').innerHTML =
        '<p class="empty">No tabs yet. Use the command palette (Ctrl+Shift+P) and run "Portal: Add Tab".</p>';
      return;
    }

    if (!activeTabId || !data.tabs.find(t => t.id === activeTabId)) {
      activeTabId = data.tabs[0].id;
    }

    renderTabs(data.tabs);
    const activeTab = data.tabs.find(t => t.id === activeTabId);
    renderBookmarks(activeTab ? activeTab.bookmarks : [], activeTabId);
  }

  function renderTabs(tabs) {
    const bar = document.getElementById('tabs-bar');
    bar.innerHTML = tabs.map(t =>
      '<button class="portal-tab' + (t.id === activeTabId ? ' active' : '') + '" data-tab-id="' + esc(t.id) + '">' + escHtml(t.name) + '</button>'
    ).join('');

    bar.querySelectorAll('.portal-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTabId = btn.dataset.tabId;
        render(currentData);
      });
    });
  }

  function renderBookmarks(bookmarks, tabId) {
    const grid = document.getElementById('bookmarks-grid');
    if (bookmarks.length === 0) {
      grid.innerHTML = '<p class="empty">No bookmarks yet. Run "Portal: Add Bookmark" to add one.</p>';
      return;
    }

    grid.innerHTML = bookmarks.map(b =>
      '<div class="bookmark-card" data-url="' + esc(b.url) + '" data-tab-id="' + esc(tabId) + '" data-bm-id="' + esc(b.id) + '">' +
        '<div class="bm-icon">' + renderIcon(b.icon) + '</div>' +
        '<div class="bm-body">' +
          '<div class="bm-title">' + escHtml(b.title) + '</div>' +
          '<div class="bm-desc">' + escHtml(b.description) + '</div>' +
        '</div>' +
        '<span class="bm-arrow">↗</span>' +
        '<button class="bm-remove" data-tab-id="' + esc(tabId) + '" data-bm-id="' + esc(b.id) + '" title="Remove">×</button>' +
      '</div>'
    ).join('');

    grid.querySelectorAll('.bookmark-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.classList.contains('bm-remove')) return;
        vscode.postMessage({ type: 'openUrl', url: card.dataset.url });
      });
    });

    grid.querySelectorAll('.bm-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        vscode.postMessage({ type: 'removeBookmark', tabId: btn.dataset.tabId, bookmarkId: btn.dataset.bmId });
      });
    });
  }

  // ── Helpers ────────────────────────────────────

  function renderIcon(icon) {
    if (icon && (icon.startsWith('data:') || icon.startsWith('http'))) {
      return '<img src="' + esc(icon) + '" alt="" />';
    }
    return escHtml(icon || '🌐');
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  // ── Message bus ────────────────────────────────

  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'update') {
      currentData = msg.data;
      render(currentData);
    }
  });

  // Signal readiness so extension sends initial data
  vscode.postMessage({ type: 'ready' });
}());
