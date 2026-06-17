(function () {
  const vscode = acquireVsCodeApi();

  // Theme — mirror whatever the sidebar chose
  const savedTheme = localStorage.getItem('ddd-theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
  }

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    vscode.postMessage({ type: 'back' });
  });

  // Intercept all link clicks
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    e.preventDefault();

    if (href.endsWith('.relay')) {
      vscode.postMessage({ type: 'navigate', filename: href });
    } else {
      vscode.postMessage({ type: 'openUrl', url: href });
    }
  });
}());
