export interface PageMeta {
  filename: string;
  title: string;
}

export interface PageContent extends PageMeta {
  customStyles: string;
  bodyHtml: string;
  pageScripts: string[];
}

// ── Parsing ────────────────────────────────────────────────────────────────

export function extractTitle(raw: string): string | null {
  const m = raw.match(/<desk-page[^>]*\stitle="([^"]*)"/i);
  return m ? m[1] : null;
}

export function parse(filename: string, raw: string): PageContent {
  const title = extractTitle(raw) ?? stem(filename);

  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const customStyles = styleMatch ? styleMatch[1] : '';

  const bodyMatch = raw.match(/<desk-page[^>]*>([\s\S]*)<\/desk-page>/i);
  let body = bodyMatch ? bodyMatch[1] : raw;

  const pageScripts: string[] = [];
  body = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, content) => { pageScripts.push(content); return ''; })
    .trim();

  return { filename, title, customStyles, bodyHtml: body, pageScripts };
}

// ── Serialisation ──────────────────────────────────────────────────────────

export function serialize(title: string, bodyHtml: string, customStyles: string): string {
  const styleBlock = customStyles.trim()
    ? `  <style>\n${customStyles.trim().split('\n').map(l => `    ${l}`).join('\n')}\n  </style>\n\n`
    : '';
  return `<desk-page title="${escAttr(title)}">\n${styleBlock}${bodyHtml}\n</desk-page>\n`;
}

export function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function stem(filename: string): string {
  return filename.replace(/\.desk$/, '');
}
