(function () {
  window.scrollTo(0, 0);
  const vscode = acquireVsCodeApi();

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    vscode.postMessage({ type: 'back' });
  });

  // Intercept all link clicks
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    e.preventDefault();

    if (href.endsWith('.desk')) {
      vscode.postMessage({ type: 'navigate', filename: href });
    } else {
      vscode.postMessage({ type: 'openUrl', url: href });
    }
  });
}());
