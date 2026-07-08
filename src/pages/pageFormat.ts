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

export interface PageSection {
  id?: string;
  heading: string;
  icon?: string;
  content: string;
}

export interface AssembleArgs {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  sections: PageSection[];
}

export function extractStyleFromTemplate(templateRaw: string): string {
  const m = templateRaw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1] : '';
}

export function extractScriptFromTemplate(templateRaw: string): string {
  const m = templateRaw.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return m ? m[1] : '';
}

export function assembleSections(args: AssembleArgs): string {
  const { title, eyebrow, subtitle, sections } = args;
  const sectionBlocks = sections.map((s, i) => {
    const id = s.id ?? `sec-${i}`;
    const iconHtml = s.icon ? `<span class="icon">${s.icon}</span> ` : '';
    return [
      `<div class="section" id="${id}">`,
      `  <h2 class="section-title">${iconHtml}${s.heading}</h2>`,
      s.content,
      '</div>',
    ].join('\n');
  });

  const sidebar = [
    '<nav id="sidebar">',
    '  <div class="sidebar-top">',
    `    <span class="sidebar-logo">${eyebrow ?? title}</span>`,
    '  </div>',
    '  <div id="toc-links"></div>',
    '</nav>',
  ].join('\n');

  const mainContent = [
    '<main>',
    '<section class="page-intro">',
    ...(eyebrow ? [`  <div class="eyebrow">${eyebrow}</div>`] : []),
    `  <h1>${title}</h1>`,
    ...(subtitle ? [`  <p>${subtitle}</p>`] : []),
    '</section>',
    '',
    '<hr/>',
    '',
    ...sectionBlocks,
    '</main>',
  ].join('\n');

  return [sidebar, mainContent].join('\n');
}

export interface SectionMeta {
  id: string;
  heading: string;
}

export interface ListData {
  type: 'ul' | 'ol' | null;
  items: string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSectionBounds(bodyHtml: string, sectionId: string): { start: number; end: number } | null {
  const openRe = new RegExp(`<div[^>]*\\bid="${escapeRegex(sectionId)}"[^>]*>`);
  const openMatch = openRe.exec(bodyHtml);
  if (!openMatch) return null;
  const start = openMatch.index;
  let pos = start + openMatch[0].length;
  let depth = 1;
  while (pos < bodyHtml.length) {
    const nextOpen = bodyHtml.indexOf('<div', pos);
    const nextClose = bodyHtml.indexOf('</div>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      pos = nextClose + 6;
      if (depth === 0) return { start, end: pos };
    }
  }
  return null;
}

export function parseSections(bodyHtml: string): SectionMeta[] {
  const results: SectionMeta[] = [];
  const idRe = /<div[^>]*\bclass="section"[^>]*\bid="([^"]+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(bodyHtml)) !== null) {
    const id = m[1];
    const headingMatch = bodyHtml.slice(m.index).match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const heading = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : id;
    results.push({ id, heading });
  }
  return results;
}

export function getSectionHtml(bodyHtml: string, sectionId: string): string {
  const bounds = findSectionBounds(bodyHtml, sectionId);
  if (!bounds) throw new Error(`section "${sectionId}" not found`);
  return bodyHtml.slice(bounds.start, bounds.end);
}

export function replaceSectionHtml(bodyHtml: string, sectionId: string, newSectionHtml: string): string {
  const bounds = findSectionBounds(bodyHtml, sectionId);
  if (!bounds) throw new Error(`section "${sectionId}" not found`);
  return bodyHtml.slice(0, bounds.start) + newSectionHtml + bodyHtml.slice(bounds.end);
}

export function removeSection(bodyHtml: string, sectionId: string): string {
  const bounds = findSectionBounds(bodyHtml, sectionId);
  if (!bounds) throw new Error(`section "${sectionId}" not found`);
  return bodyHtml.slice(0, bounds.start) + bodyHtml.slice(bounds.end);
}

export function insertSection(bodyHtml: string, sectionHtml: string): string {
  const mainCloseIdx = bodyHtml.lastIndexOf('</main>');
  if (mainCloseIdx === -1) return bodyHtml + '\n' + sectionHtml;
  return bodyHtml.slice(0, mainCloseIdx) + sectionHtml + '\n' + bodyHtml.slice(mainCloseIdx);
}

export function parseListItems(sectionHtml: string): ListData {
  const listMatch = sectionHtml.match(/<(ul|ol)>([\s\S]*?)<\/\1>/);
  if (!listMatch) return { type: null, items: [] };
  const type = listMatch[1] as 'ul' | 'ol';
  const items: string[] = [];
  const liRe = /<li>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(listMatch[2])) !== null) items.push(m[1]);
  return { type, items };
}

export function rebuildList(sectionHtml: string, type: 'ul' | 'ol', items: string[]): string {
  const listHtml = `<${type}>\n${items.map(i => `  <li>${i}</li>`).join('\n')}\n</${type}>`;
  const existingMatch = sectionHtml.match(/<(?:ul|ol)>[\s\S]*?<\/(?:ul|ol)>/);
  if (existingMatch) return sectionHtml.replace(existingMatch[0], listHtml);
  const lastDiv = sectionHtml.lastIndexOf('</div>');
  return sectionHtml.slice(0, lastDiv) + listHtml + '\n' + sectionHtml.slice(lastDiv);
}
