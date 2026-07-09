import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, '../../out/webview');

function read(rel: string): string {
  return fs.readFileSync(path.join(OUT, rel), 'utf-8');
}

function stripCsp(html: string): string {
  return html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/g, '');
}

// Inlined before any page scripts — acquireVsCodeApi must exist before the webview IIFE runs.
const VSCODE_MOCK_SCRIPT = `<script>
(function () {
  var msgs = [];
  var api = {
    postMessage: function (msg) { msgs.push(msg); },
    getState: function () { return window.__vsState || null; },
    setState: function (s) { window.__vsState = s; }
  };
  window.__sentMessages = msgs;
  window.acquireVsCodeApi = function () { return api; };
}());
</script>`;

/** Inline CSS and JS (with VS Code API mock), strip CSP — ready for page.setContent() */
export function buildSidebarHtml(): string {
  const html = stripCsp(read('sidebar/index.html'));
  const css = read('sidebar/index.css');
  const js = read('sidebar/index.js');

  return html
    .replace('<link rel="stylesheet" href="${cssUri}">', () => `<style>${css}</style>`)
    .replace(
      '<script nonce="${nonce}" src="${scriptUri}"></script>',
      () => `${VSCODE_MOCK_SCRIPT}\n<script>${js}</script>`,
    );
}

export interface PageViewerOpts {
  title: string;
  content: string;
  customStyles?: string;
  pageScripts?: string;
}

export function buildPageViewerHtml(opts: PageViewerOpts): string {
  const html = stripCsp(read('page/index.html'));
  const css = read('page/index.css');
  const js = read('page/index.js');

  return html
    .replace('<link rel="stylesheet" href="${cssUri}">', () => `<style>${css}</style>`)
    .replace('<style>${customStyles}</style>', () => `<style>${opts.customStyles ?? ''}</style>`)
    .replace(/<title>\$\{title\}<\/title>/, () => `<title>${opts.title}</title>`)
    .replace('${zoom}', '1')
    .replace('${libraryStyles}', '')
    .replace('${bookNavCss}', '')
    .replace('${pageScripts}', () => opts.pageScripts ?? '')
    .replace('${libraryScripts}', '')
    .replace('${content}', () => opts.content)
    .replace(
      '<script nonce="${nonce}" src="${scriptUri}"></script>',
      () => `${VSCODE_MOCK_SCRIPT}\n<script>${js}</script>`,
    );
}
