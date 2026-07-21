# Section Content API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add surgical section/list editing MCP tools and a section type registry so agents can modify individual sections and list items without replacing entire page bodies.

**Architecture:** Pure helper functions added to `pageFormat.ts` parse and mutate the HTML produced by `assembleSections`. A new `sectionTypes.ts` file holds 9 built-in renderers plus a mini template engine for user-defined types. `SectionTypeService` persists custom types to `~/.desk/global/section-types.json`. All 12 new MCP tools delegate to these helpers; `McpServer` gets one new constructor parameter.

**Tech Stack:** TypeScript, Node.js fs, Jest (unit tests)

## Global Constraints

- All VS Code webview CSS must use only `var(--bg/surface/surface2/border/text/muted/accent/accent2/radius)` — never hex values
- No hardcoded URLs or org-specific content
- No comments unless the why is non-obvious
- Three files always change together for MCP tools: `src/mcp/toolSchemas.ts`, `src/mcp/server/server.ts`, `src/mcp/server/server.test.ts`
- Run `npm test` after every task; all existing tests must continue to pass
- Commits use Conventional Commits

---

## File Map

```
Modified:
  src/pages/pageFormat.ts                         Add 7 helper functions + 2 interfaces
  src/mcp/toolSchemas.ts                          Add 12 tool schemas
  src/mcp/server/server.ts                        Add 12 tool cases + sectionTypeService param
  src/mcp/server/server.test.ts                   Add round-trip tests for all 12 tools
  src/extension.ts                                Instantiate SectionTypeService, pass to McpServer

Created:
  src/pages/pageFormat.test.ts                    Unit tests for the 7 helpers
  src/pages/sectionTypes.ts                       9 built-in renderers + renderSectionType + renderTemplate
  src/pages/sectionTypes.test.ts                  Unit tests for renderers and template engine
  src/services/sectionTypeService/
    sectionTypeService.ts                         Custom type CRUD (~/.desk/global/section-types.json)
    sectionTypeService.test.ts                    Unit tests
```

---

## Background: `assembleSections` HTML structure

The HTML produced by the existing `assembleSections` function (in `pageFormat.ts`) that these helpers must parse:

```html
<nav id="sidebar">...</nav>
<main>
<section class="page-intro">...</section>
<hr/>
<div class="section" id="sec-0">
  <h2 class="section-title">First Section</h2>
  <!-- content — may contain nested divs such as .card-grid, .compare-grid -->
</div>
<div class="section" id="sec-1">
  <h2 class="section-title">Second Section</h2>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
  </ul>
</div>
</main>
```

---

## Task 1: pageFormat.ts helpers + pageFormat.test.ts

**Files:**
- Modify: `src/pages/pageFormat.ts`
- Create: `src/pages/pageFormat.test.ts`

**Interfaces:**
- Produces: `SectionMeta`, `ListData`, `parseSections`, `getSectionHtml`, `replaceSectionHtml`, `removeSection`, `insertSection`, `parseListItems`, `rebuildList` — consumed by Tasks 4 and (later) the book plan

---

- [ ] **Step 1: Add the two new interfaces and private helpers to `src/pages/pageFormat.ts`**

Append after the existing `assembleSections` function (keep all existing exports unchanged):

```typescript
export interface SectionMeta {
  id: string;
  heading: string;
}

export interface ListData {
  type: 'ul' | 'ol' | null;
  items: string[];
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 2: Add the 7 exported helper functions**

Continue appending to `src/pages/pageFormat.ts`:

```typescript
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
```

- [ ] **Step 3: Create `src/pages/pageFormat.test.ts` with failing tests**

```typescript
import {
  parseSections, getSectionHtml, replaceSectionHtml, removeSection,
  insertSection, parseListItems, rebuildList, assembleSections,
} from './pageFormat';

const HTML_TWO_SECTIONS = assembleSections({
  title: 'Test',
  sections: [
    { id: 'sec-a', heading: 'Alpha', content: '<p>First</p>' },
    { id: 'sec-b', heading: 'Beta', content: '<ul><li>Item one</li><li>Item two</li></ul>' },
  ],
});

describe('parseSections', () => {
  it('returns metadata for every section', () => {
    const sections = parseSections(HTML_TWO_SECTIONS);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({ id: 'sec-a', heading: 'Alpha' });
    expect(sections[1]).toEqual({ id: 'sec-b', heading: 'Beta' });
  });

  it('returns empty array when body has no sections', () => {
    expect(parseSections('<p>plain</p>')).toEqual([]);
  });
});

describe('getSectionHtml', () => {
  it('returns the full section div including content', () => {
    const html = getSectionHtml(HTML_TWO_SECTIONS, 'sec-a');
    expect(html).toContain('id="sec-a"');
    expect(html).toContain('<p>First</p>');
  });

  it('throws with clear message for missing id', () => {
    expect(() => getSectionHtml(HTML_TWO_SECTIONS, 'missing')).toThrow('section "missing" not found');
  });
});

describe('replaceSectionHtml', () => {
  it('replaces only the targeted section leaving sibling intact', () => {
    const newSection = '<div class="section" id="sec-a"><h2 class="section-title">Alpha</h2><p>Updated</p></div>';
    const result = replaceSectionHtml(HTML_TWO_SECTIONS, 'sec-a', newSection);
    expect(result).toContain('<p>Updated</p>');
    expect(result).toContain('id="sec-b"');
    expect(result).not.toContain('<p>First</p>');
  });

  it('throws for missing id', () => {
    expect(() => replaceSectionHtml(HTML_TWO_SECTIONS, 'nope', '')).toThrow('section "nope" not found');
  });
});

describe('removeSection', () => {
  it('removes the section and leaves the sibling', () => {
    const result = removeSection(HTML_TWO_SECTIONS, 'sec-a');
    expect(result).not.toContain('id="sec-a"');
    expect(result).toContain('id="sec-b"');
  });

  it('throws for missing id', () => {
    expect(() => removeSection(HTML_TWO_SECTIONS, 'nope')).toThrow();
  });
});

describe('insertSection', () => {
  it('appends section before </main>', () => {
    const newSection = '<div class="section" id="sec-c"><h2 class="section-title">Gamma</h2></div>';
    const result = insertSection(HTML_TWO_SECTIONS, newSection);
    expect(result.indexOf('sec-c')).toBeGreaterThan(result.indexOf('sec-b'));
    expect(result).toContain('</main>');
  });

  it('appends to end when no </main> tag present', () => {
    const result = insertSection('<p>no main</p>', '<div id="s"></div>');
    expect(result).toContain('<div id="s"></div>');
  });
});

describe('parseListItems', () => {
  it('extracts ul items from section html', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-b');
    const result = parseListItems(sectionHtml);
    expect(result.type).toBe('ul');
    expect(result.items).toEqual(['Item one', 'Item two']);
  });

  it('returns null type and empty items when no list exists', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-a');
    expect(parseListItems(sectionHtml)).toEqual({ type: null, items: [] });
  });
});

describe('rebuildList', () => {
  it('replaces existing list with new items', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-b');
    const result = rebuildList(sectionHtml, 'ol', ['First', 'Second', 'Third']);
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>First</li>');
    expect(result).not.toContain('<ul>');
  });

  it('inserts a new list when no list exists', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-a');
    const result = rebuildList(sectionHtml, 'ul', ['Added']);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Added</li>');
  });
});
```

- [ ] **Step 4: Run tests — expect failures until implementation is in place**

```bash
npm test -- --testPathPattern=pageFormat
```

Expected: tests for the new helpers fail with "is not a function".

- [ ] **Step 5: Run tests again to verify they pass**

```bash
npm test -- --testPathPattern=pageFormat
```

Expected: all pageFormat tests pass (including pre-existing parse/serialize tests).

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all 164+ tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/pageFormat.ts src/pages/pageFormat.test.ts
git commit -m "feat: add section/list parse+mutate helpers to pageFormat"
```

---

## Task 2: sectionTypes.ts built-in renderers + tests

**Files:**
- Create: `src/pages/sectionTypes.ts`
- Create: `src/pages/sectionTypes.test.ts`

**Interfaces:**
- Produces: `CustomSectionType`, `BUILT_IN_TYPES`, `renderSectionType` — consumed by Task 3 (SectionTypeService) and Task 4 (McpServer)

---

- [ ] **Step 1: Create `src/pages/sectionTypes.ts`**

```typescript
export interface CustomSectionType {
  name: string;
  description: string;
  template: string;
}

interface BuiltInType {
  name: string;
  description: string;
  render(data: unknown): string;
}

export const BUILT_IN_TYPES: BuiltInType[] = [
  {
    name: 'steps',
    description: 'Numbered step flow. data: { items: { label: string, body: string }[] }',
    render(data: any): string {
      return [
        '<div class="steps">',
        ...data.items.map((item: any, i: number) =>
          `  <div class="step"><div class="step-num">${i + 1}</div><div class="step-body"><strong>${item.label}</strong> — ${item.body}</div></div>`
        ),
        '</div>',
      ].join('\n');
    },
  },
  {
    name: 'cards',
    description: 'Card grid. data: { items: { title: string, description: string }[] }',
    render(data: any): string {
      return [
        '<div class="card-grid">',
        ...data.items.map((c: any) => `  <div class="card"><h4>${c.title}</h4><p>${c.description}</p></div>`),
        '</div>',
      ].join('\n');
    },
  },
  {
    name: 'compare',
    description: 'Side-by-side compare. data: { left: { label, content }, right: { label, content } }',
    render(data: any): string {
      return [
        '<div class="compare-grid">',
        `  <div class="compare-col"><div class="compare-label">${data.left.label}</div>${data.left.content}</div>`,
        `  <div class="compare-col"><div class="compare-label">${data.right.label}</div>${data.right.content}</div>`,
        '</div>',
      ].join('\n');
    },
  },
  {
    name: 'callout',
    description: 'Callout box. data: { body: string, variant?: "info"|"warning"|"tip"|"danger", title?: string }',
    render(data: any): string {
      const v = data.variant ? ` callout-${data.variant}` : '';
      const t = data.title ? `<strong>${data.title}</strong> ` : '';
      return `<div class="callout${v}">${t}${data.body}</div>`;
    },
  },
  {
    name: 'lead',
    description: 'Section lead box. data: { body: string }',
    render(data: any): string {
      return `<div class="lead">${data.body}</div>`;
    },
  },
  {
    name: 'flow',
    description: 'Flow block sequence. data: { items: { label: string, body: string }[] }',
    render(data: any): string {
      return data.items.map((item: any) =>
        `<div class="flow-block">\n  <div class="flow-label">${item.label}</div>\n  <p>${item.body}</p>\n</div>`
      ).join('\n');
    },
  },
  {
    name: 'table',
    description: 'Formatted table. data: { headers: string[], rows: string[][] }',
    render(data: any): string {
      return [
        '<table>',
        '  <thead><tr>' + data.headers.map((h: string) => `<th>${h}</th>`).join('') + '</tr></thead>',
        '  <tbody>',
        ...data.rows.map((row: string[]) => '    <tr>' + row.map((c: string) => `<td>${c}</td>`).join('') + '</tr>'),
        '  </tbody>',
        '</table>',
      ].join('\n');
    },
  },
  {
    name: 'code',
    description: 'Code block. data: { code: string, language?: string }',
    render(data: any): string {
      const cls = data.language ? ` class="language-${data.language}"` : '';
      return `<pre><code${cls}>${data.code}</code></pre>`;
    },
  },
  {
    name: 'list',
    description: 'Unordered or ordered list. data: { items: string[], type?: "ul"|"ol" }',
    render(data: any): string {
      const tag = data.type ?? 'ul';
      return `<${tag}>\n${data.items.map((i: string) => `  <li>${i}</li>`).join('\n')}\n</${tag}>`;
    },
  },
];

export function renderSectionType(name: string, data: unknown, customTypes: CustomSectionType[]): string {
  const custom = customTypes.find(t => t.name === name);
  if (custom) return renderTemplate(custom.template, data);
  const builtin = BUILT_IN_TYPES.find(t => t.name === name);
  if (!builtin) throw new Error(`Unknown section type: "${name}"`);
  return builtin.render(data);
}

function renderTemplate(template: string, data: unknown): string {
  const d = data as Record<string, unknown>;
  let result = template;
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key, body) => {
    const arr = Array.isArray(d[key]) ? (d[key] as unknown[]) : [];
    return arr.map(item => body.replace(/\{\{item\}\}/g, String(item))).join('');
  });
  result = result.replace(/\{\{(\w+)\}\}/g, (_m, key) => String(d[key] ?? ''));
  return result;
}
```

- [ ] **Step 2: Create `src/pages/sectionTypes.test.ts`**

```typescript
import { renderSectionType, BUILT_IN_TYPES, CustomSectionType } from './sectionTypes';

const NO_CUSTOM: CustomSectionType[] = [];

describe('built-in renderers', () => {
  it('steps renders numbered divs', () => {
    const html = renderSectionType('steps', { items: [{ label: 'Do A', body: 'first step' }] }, NO_CUSTOM);
    expect(html).toContain('class="steps"');
    expect(html).toContain('step-num">1');
    expect(html).toContain('Do A');
  });

  it('cards renders card-grid', () => {
    const html = renderSectionType('cards', { items: [{ title: 'Card', description: 'Desc' }] }, NO_CUSTOM);
    expect(html).toContain('class="card-grid"');
    expect(html).toContain('<h4>Card</h4>');
  });

  it('compare renders compare-grid with labels', () => {
    const html = renderSectionType('compare', {
      left: { label: 'Before', content: '<p>old</p>' },
      right: { label: 'After', content: '<p>new</p>' },
    }, NO_CUSTOM);
    expect(html).toContain('compare-grid');
    expect(html).toContain('Before');
    expect(html).toContain('After');
  });

  it('callout renders with variant class', () => {
    const html = renderSectionType('callout', { body: 'Watch out', variant: 'warning', title: 'Note' }, NO_CUSTOM);
    expect(html).toContain('callout-warning');
    expect(html).toContain('<strong>Note</strong>');
    expect(html).toContain('Watch out');
  });

  it('callout renders without variant when not provided', () => {
    const html = renderSectionType('callout', { body: 'Info text' }, NO_CUSTOM);
    expect(html).toContain('class="callout"');
    expect(html).not.toContain('callout-');
  });

  it('lead renders lead div', () => {
    const html = renderSectionType('lead', { body: 'Summary here' }, NO_CUSTOM);
    expect(html).toContain('class="lead"');
    expect(html).toContain('Summary here');
  });

  it('flow renders flow-blocks', () => {
    const html = renderSectionType('flow', { items: [{ label: 'A → B', body: 'Connection' }] }, NO_CUSTOM);
    expect(html).toContain('flow-block');
    expect(html).toContain('A → B');
  });

  it('table renders table with headers and rows', () => {
    const html = renderSectionType('table', {
      headers: ['Col A', 'Col B'],
      rows: [['R1A', 'R1B']],
    }, NO_CUSTOM);
    expect(html).toContain('<th>Col A</th>');
    expect(html).toContain('<td>R1A</td>');
  });

  it('code renders pre/code block', () => {
    const html = renderSectionType('code', { code: 'const x = 1;', language: 'typescript' }, NO_CUSTOM);
    expect(html).toContain('language-typescript');
    expect(html).toContain('const x = 1;');
  });

  it('list renders ul by default', () => {
    const html = renderSectionType('list', { items: ['Alpha', 'Beta'] }, NO_CUSTOM);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Alpha</li>');
  });

  it('list renders ol when type is ol', () => {
    const html = renderSectionType('list', { items: ['One'], type: 'ol' }, NO_CUSTOM);
    expect(html).toContain('<ol>');
  });
});

describe('renderSectionType unknown name', () => {
  it('throws for unknown built-in with no custom match', () => {
    expect(() => renderSectionType('does-not-exist', {}, NO_CUSTOM)).toThrow('Unknown section type: "does-not-exist"');
  });
});

describe('custom type template', () => {
  it('renders scalar substitution', () => {
    const custom: CustomSectionType[] = [{ name: 'hero', description: '', template: '<h1>{{title}}</h1>' }];
    expect(renderSectionType('hero', { title: 'Hello' }, custom)).toBe('<h1>Hello</h1>');
  });

  it('renders array iteration with {{item}}', () => {
    const custom: CustomSectionType[] = [{
      name: 'chips',
      description: '',
      template: '<div>{{#tags}}<span>{{item}}</span>{{/tags}}</div>',
    }];
    const html = renderSectionType('chips', { tags: ['a', 'b'] }, custom);
    expect(html).toBe('<div><span>a</span><span>b</span></div>');
  });

  it('custom type overrides built-in with same name', () => {
    const custom: CustomSectionType[] = [{ name: 'lead', description: '', template: '<div class="custom">{{body}}</div>' }];
    const html = renderSectionType('lead', { body: 'Hi' }, custom);
    expect(html).toContain('class="custom"');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --testPathPattern=sectionTypes
```

Expected: all sectionTypes tests pass.

- [ ] **Step 4: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/sectionTypes.ts src/pages/sectionTypes.test.ts
git commit -m "feat: add built-in section type renderers"
```

---

## Task 3: SectionTypeService + tests

**Files:**
- Create: `src/services/sectionTypeService/sectionTypeService.ts`
- Create: `src/services/sectionTypeService/sectionTypeService.test.ts`

**Interfaces:**
- Consumes: `CustomSectionType`, `BUILT_IN_TYPES` from `../../pages/sectionTypes`
- Produces: `SectionTypeService` class with `listAll()`, `getCustomTypes()`, `register()`, `remove()` — consumed by Task 4

---

- [ ] **Step 1: Create `src/services/sectionTypeService/sectionTypeService.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { CustomSectionType, BUILT_IN_TYPES } from '../../pages/sectionTypes';

export class SectionTypeService {
  private readonly filePath: string;

  constructor(private readonly dir: string) {
    this.filePath = path.join(dir, 'section-types.json');
  }

  private readAll(): CustomSectionType[] {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private writeAll(types: CustomSectionType[]): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(types, null, 2), 'utf-8');
  }

  listAll(): Array<{ name: string; description: string; builtin: boolean }> {
    const custom = this.readAll();
    const customNames = new Set(custom.map(t => t.name));
    return [
      ...BUILT_IN_TYPES
        .filter(t => !customNames.has(t.name))
        .map(t => ({ name: t.name, description: t.description, builtin: true })),
      ...custom.map(t => ({ name: t.name, description: t.description, builtin: false })),
    ];
  }

  getCustomTypes(): CustomSectionType[] {
    return this.readAll();
  }

  register(name: string, description: string, template: string): void {
    const types = this.readAll();
    const idx = types.findIndex(t => t.name === name);
    if (idx >= 0) {
      types[idx] = { name, description, template };
    } else {
      types.push({ name, description, template });
    }
    this.writeAll(types);
  }

  remove(name: string): void {
    if (BUILT_IN_TYPES.some(t => t.name === name)) {
      throw new Error(`Cannot remove built-in type "${name}"`);
    }
    this.writeAll(this.readAll().filter(t => t.name !== name));
  }
}
```

- [ ] **Step 2: Create `src/services/sectionTypeService/sectionTypeService.test.ts`**

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SectionTypeService } from './sectionTypeService';
import { BUILT_IN_TYPES } from '../../pages/sectionTypes';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'desk-sts-'));
}

describe('SectionTypeService', () => {
  let dir: string;
  let svc: SectionTypeService;

  beforeEach(() => {
    dir = makeTmpDir();
    svc = new SectionTypeService(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('listAll includes all built-in types with builtin:true', () => {
    const all = svc.listAll();
    const names = all.map(t => t.name);
    expect(names).toContain('steps');
    expect(names).toContain('cards');
    expect(names).toContain('callout');
    all.filter(t => BUILT_IN_TYPES.some(b => b.name === t.name)).forEach(t => {
      expect(t.builtin).toBe(true);
    });
  });

  it('register adds a new custom type', () => {
    svc.register('my-type', 'A type', '<div>{{body}}</div>');
    const all = svc.listAll();
    const custom = all.find(t => t.name === 'my-type');
    expect(custom).toBeDefined();
    expect(custom!.builtin).toBe(false);
  });

  it('register overwrites existing custom type', () => {
    svc.register('my-type', 'Old', '<p>old</p>');
    svc.register('my-type', 'New', '<p>new</p>');
    const customs = svc.getCustomTypes();
    expect(customs.filter(t => t.name === 'my-type')).toHaveLength(1);
    expect(customs.find(t => t.name === 'my-type')!.description).toBe('New');
  });

  it('remove deletes custom type', () => {
    svc.register('bye', 'Bye', '<p>bye</p>');
    svc.remove('bye');
    expect(svc.getCustomTypes().find(t => t.name === 'bye')).toBeUndefined();
  });

  it('remove throws for built-in type', () => {
    expect(() => svc.remove('steps')).toThrow('Cannot remove built-in type "steps"');
  });

  it('custom type with same name as built-in shadows the built-in in listAll', () => {
    svc.register('lead', 'Override', '<div>{{body}}</div>');
    const all = svc.listAll();
    const leads = all.filter(t => t.name === 'lead');
    expect(leads).toHaveLength(1);
    expect(leads[0].builtin).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --testPathPattern=sectionTypeService
```

Expected: all 6 tests pass.

- [ ] **Step 4: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/sectionTypeService/
git commit -m "feat: add SectionTypeService"
```

---

## Task 4: 12 MCP tools + extension.ts wiring

**Files:**
- Modify: `src/mcp/toolSchemas.ts`
- Modify: `src/mcp/server/server.ts`
- Modify: `src/mcp/server/server.test.ts`
- Modify: `src/extension.ts`

**Interfaces:**
- Consumes: `parseSections`, `getSectionHtml`, `replaceSectionHtml`, `removeSection`, `insertSection`, `parseListItems`, `rebuildList` from `../../pages/pageFormat`; `renderSectionType` from `../../pages/sectionTypes`; `SectionTypeService` from services
- Produces: 12 new callable MCP tools

---

- [ ] **Step 1: Add 12 tool schemas to `src/mcp/toolSchemas.ts`**

Append inside the `TOOLS` array, after the existing `list_libraries` / `remove_library` entries:

```typescript
  // ── Section tools ─────────────────────────────────────────────────────────
  {
    name: 'list_sections',
    description: 'Lists all sections in a .desk page. Returns { id, heading }[].',
    inputSchema: {
      type: 'object',
      required: ['filename'],
      properties: { filename: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'add_section',
    description: 'Appends a new section to a .desk page. Provide raw content HTML or type+data (type wins).',
    inputSchema: {
      type: 'object',
      required: ['filename', 'heading'],
      properties: {
        filename: { type: 'string' },
        heading: { type: 'string' },
        content: { type: 'string', description: 'Raw HTML for the section body' },
        id: { type: 'string', description: 'Section id attribute. Defaults to sec-<timestamp>.' },
        icon: { type: 'string', description: 'Emoji/icon shown before heading' },
        type: { type: 'string', description: 'Section type name (e.g. steps, cards). Wins over content.' },
        data: { type: 'object', description: 'Data for the section type renderer', additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_section',
    description: 'Updates heading, icon, or content of an existing section. type+data wins over content.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
        heading: { type: 'string' },
        icon: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_section',
    description: 'Removes a section from a .desk page.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },

  // ── List tools ────────────────────────────────────────────────────────────
  {
    name: 'list_items',
    description: 'Returns { type: "ul"|"ol"|null, items: string[] } for the first list in the section.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'add_list_item',
    description: 'Appends a list item to the first list in the section. Creates a ul if no list exists (or use list_type to specify).',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id', 'text'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
        text: { type: 'string' },
        list_type: { type: 'string', enum: ['ul', 'ol'], description: 'Required when no list exists yet' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_list_item',
    description: 'Removes the list item at 1-based index from the first list in the section.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id', 'index'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
        index: { type: 'number', description: '1-based position' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_list_item',
    description: 'Replaces the text of the list item at 1-based index.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id', 'index', 'text'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
        index: { type: 'number' },
        text: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'set_list_type',
    description: 'Changes the list tag (ul ↔ ol) without modifying the items.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'section_id', 'type'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
        type: { type: 'string', enum: ['ul', 'ol'] },
      },
      additionalProperties: false,
    },
  },

  // ── Section type registry tools ───────────────────────────────────────────
  {
    name: 'list_section_types',
    description: 'Returns all section types (built-in + custom) with name, description, and builtin flag.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'register_section_type',
    description: 'Creates or replaces a custom section type. template uses {{var}} and {{#arr}}...{{/arr}} syntax.',
    inputSchema: {
      type: 'object',
      required: ['name', 'description', 'template'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        template: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_section_type',
    description: 'Removes a custom section type. Built-in types cannot be removed.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    },
  },
```

- [ ] **Step 2: Update `src/mcp/server/server.ts` — imports and constructor**

Add imports at the top:

```typescript
import {
  parseSections, getSectionHtml, replaceSectionHtml, removeSection,
  insertSection, parseListItems, rebuildList,
} from '../../pages/pageFormat';
import { renderSectionType } from '../../pages/sectionTypes';
import { SectionTypeService } from '../../services/sectionTypeService/sectionTypeService';
```

Add to the `McpServer` constructor as the final parameter (after `libraryService`):

```typescript
private readonly sectionTypeService: SectionTypeService | null = null,
```

Add this private helper method inside `McpServer`:

```typescript
private _buildSectionHtml(heading: string, content: string, id?: string, icon?: string): string {
  const sectionId = id ?? `sec-${Date.now()}`;
  const iconHtml = icon ? `<span class="icon">${icon}</span> ` : '';
  return `<div class="section" id="${sectionId}">\n  <h2 class="section-title">${iconHtml}${heading}</h2>\n${content}\n</div>`;
}
```

- [ ] **Step 3: Add 12 cases to `callTool()` in `server.ts`**

Add after the existing `remove_library` case:

```typescript
      // ── Section tools ──────────────────────────────────────────────────────
      case 'list_sections': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        return { content: [{ type: 'text', text: JSON.stringify(parseSections(page.bodyHtml)) }] };
      }
      case 'add_section': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        let content: string = args.content ?? '';
        if (args.type && this.sectionTypeService) {
          content = renderSectionType(args.type, args.data ?? {}, this.sectionTypeService.getCustomTypes());
        }
        const sectionHtml = this._buildSectionHtml(args.heading, content, args.id, args.icon);
        pageReader.write(args.filename, page.title, insertSection(page.bodyHtml, sectionHtml), page.customStyles);
        return { content: [{ type: 'text', text: 'section added' }] };
      }
      case 'update_section': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        let sectionHtml = getSectionHtml(page.bodyHtml, args.section_id);
        if (args.heading !== undefined) {
          sectionHtml = sectionHtml.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, `<h2 class="section-title">${args.heading}</h2>`);
        }
        if (args.type && this.sectionTypeService) {
          const rendered = renderSectionType(args.type, args.data ?? {}, this.sectionTypeService.getCustomTypes());
          const h2Match = sectionHtml.match(/<h2[^>]*>[\s\S]*?<\/h2>/);
          const h2 = h2Match ? h2Match[0] : '';
          sectionHtml = sectionHtml.replace(/<div[^>]*>/, m => m).replace(/<\/div>$/, '');
          const openTag = sectionHtml.match(/^<div[^>]*>/)?.[0] ?? '';
          sectionHtml = `${openTag}\n  ${h2}\n${rendered}\n</div>`;
        } else if (args.content !== undefined) {
          const h2Match = sectionHtml.match(/<h2[^>]*>[\s\S]*?<\/h2>/);
          const h2 = h2Match ? h2Match[0] : '';
          const openTag = sectionHtml.match(/^<div[^>]*>/)?.[0] ?? '';
          sectionHtml = `${openTag}\n  ${h2}\n${args.content}\n</div>`;
        }
        pageReader.write(args.filename, page.title, replaceSectionHtml(page.bodyHtml, args.section_id, sectionHtml), page.customStyles);
        return { content: [{ type: 'text', text: 'section updated' }] };
      }
      case 'remove_section': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        pageReader.write(args.filename, page.title, removeSection(page.bodyHtml, args.section_id), page.customStyles);
        return { content: [{ type: 'text', text: 'section removed' }] };
      }

      // ── List tools ─────────────────────────────────────────────────────────
      case 'list_items': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        const sHtml = getSectionHtml(page.bodyHtml, args.section_id);
        return { content: [{ type: 'text', text: JSON.stringify(parseListItems(sHtml)) }] };
      }
      case 'add_list_item': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        const sHtml = getSectionHtml(page.bodyHtml, args.section_id);
        const { type, items } = parseListItems(sHtml);
        const listType = (type ?? args.list_type ?? 'ul') as 'ul' | 'ol';
        const newItems = [...items, args.text];
        const newSHtml = rebuildList(sHtml, listType, newItems);
        pageReader.write(args.filename, page.title, replaceSectionHtml(page.bodyHtml, args.section_id, newSHtml), page.customStyles);
        return { content: [{ type: 'text', text: 'item added' }] };
      }
      case 'remove_list_item': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        const sHtml = getSectionHtml(page.bodyHtml, args.section_id);
        const { type, items } = parseListItems(sHtml);
        const idx = (args.index as number) - 1;
        if (idx < 0 || idx >= items.length) throw new Error(`index ${args.index} out of range (list has ${items.length} items)`);
        items.splice(idx, 1);
        const newSHtml = rebuildList(sHtml, type ?? 'ul', items);
        pageReader.write(args.filename, page.title, replaceSectionHtml(page.bodyHtml, args.section_id, newSHtml), page.customStyles);
        return { content: [{ type: 'text', text: 'item removed' }] };
      }
      case 'update_list_item': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        const sHtml = getSectionHtml(page.bodyHtml, args.section_id);
        const { type, items } = parseListItems(sHtml);
        const idx = (args.index as number) - 1;
        if (idx < 0 || idx >= items.length) throw new Error(`index ${args.index} out of range (list has ${items.length} items)`);
        items[idx] = args.text;
        const newSHtml = rebuildList(sHtml, type ?? 'ul', items);
        pageReader.write(args.filename, page.title, replaceSectionHtml(page.bodyHtml, args.section_id, newSHtml), page.customStyles);
        return { content: [{ type: 'text', text: 'item updated' }] };
      }
      case 'set_list_type': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const page = pageReader.read(args.filename);
        const sHtml = getSectionHtml(page.bodyHtml, args.section_id);
        const { items } = parseListItems(sHtml);
        const newSHtml = rebuildList(sHtml, args.type as 'ul' | 'ol', items);
        pageReader.write(args.filename, page.title, replaceSectionHtml(page.bodyHtml, args.section_id, newSHtml), page.customStyles);
        return { content: [{ type: 'text', text: 'list type updated' }] };
      }

      // ── Section type registry tools ────────────────────────────────────────
      case 'list_section_types': {
        if (!this.sectionTypeService) throw new Error('SectionTypeService not initialized');
        return { content: [{ type: 'text', text: JSON.stringify(this.sectionTypeService.listAll()) }] };
      }
      case 'register_section_type': {
        if (!this.sectionTypeService) throw new Error('SectionTypeService not initialized');
        this.sectionTypeService.register(args.name, args.description, args.template);
        return { content: [{ type: 'text', text: `section type "${args.name}" registered` }] };
      }
      case 'remove_section_type': {
        if (!this.sectionTypeService) throw new Error('SectionTypeService not initialized');
        this.sectionTypeService.remove(args.name);
        return { content: [{ type: 'text', text: `section type "${args.name}" removed` }] };
      }
```

- [ ] **Step 4: Add round-trip tests in `src/mcp/server/server.test.ts`**

Locate the existing test helpers at the top of `server.test.ts`. The test file constructs `McpServer` with `null` for unused services. You will need to pass `null` for the new `sectionTypeService` param in all existing tests that don't exercise these tools.

First, find every `new McpServer(` call in the test file that does not already pass a `sectionTypeService` and add `null` as the last argument. Then add these new describe blocks:

```typescript
// At the top of the test file, add these imports:
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PageReader } from '../../pages/pageReader';
import { assembleSections } from '../../pages/pageFormat';
import { SectionTypeService } from '../../services/sectionTypeService/sectionTypeService';

// Helper that creates a temp PageReader with one page for section tests
function makePageReaderWithPage(dir: string, filename: string, body: string): PageReader {
  const pr = new PageReader(dir);
  pr.write(filename, 'Test Page', body);
  return pr;
}

// Build a page body with two sections using assembleSections
function twoSectionBody(): string {
  return assembleSections({
    title: 'Test',
    sections: [
      { id: 'sec-a', heading: 'Alpha', content: '<p>First</p>' },
      { id: 'sec-b', heading: 'Beta', content: '<ul><li>Item one</li><li>Item two</li></ul>' },
    ],
  });
}

describe('section tools', () => {
  let tmpDir: string;
  let pageReader: PageReader;
  let server: McpServer; // use the call() helper from the existing test setup

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-srv-sec-'));
    pageReader = makePageReaderWithPage(tmpDir, 'test.desk', twoSectionBody());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Use the existing call() helper pattern from the test file.
  // Below assumes the test file exports or the describe scope has access to a
  // makeCall(server) helper. Adapt to the existing test pattern.

  it('list_sections returns section metadata', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    const res = await call(srv, 'list_sections', { filename: 'test.desk' });
    const sections = JSON.parse(res.content[0].text);
    expect(sections).toHaveLength(2);
    expect(sections[0].id).toBe('sec-a');
    expect(sections[1].heading).toBe('Beta');
  });

  it('add_section appends a new section', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await call(srv, 'add_section', { filename: 'test.desk', heading: 'New', content: '<p>Added</p>', id: 'sec-new' });
    const page = pageReader.read('test.desk');
    expect(page.bodyHtml).toContain('id="sec-new"');
    expect(page.bodyHtml).toContain('<p>Added</p>');
  });

  it('remove_section removes the targeted section', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await call(srv, 'remove_section', { filename: 'test.desk', section_id: 'sec-a' });
    const page = pageReader.read('test.desk');
    expect(page.bodyHtml).not.toContain('id="sec-a"');
    expect(page.bodyHtml).toContain('id="sec-b"');
  });

  it('remove_section throws for missing section id', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await expect(call(srv, 'remove_section', { filename: 'test.desk', section_id: 'nope' }))
      .rejects.toThrow('section "nope" not found');
  });
});

describe('list tools', () => {
  let tmpDir: string;
  let pageReader: PageReader;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-srv-list-'));
    pageReader = makePageReaderWithPage(tmpDir, 'test.desk', twoSectionBody());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('list_items returns items from section with list', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    const res = await call(srv, 'list_items', { filename: 'test.desk', section_id: 'sec-b' });
    const data = JSON.parse(res.content[0].text);
    expect(data.type).toBe('ul');
    expect(data.items).toEqual(['Item one', 'Item two']);
  });

  it('add_list_item appends item to existing list', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await call(srv, 'add_list_item', { filename: 'test.desk', section_id: 'sec-b', text: 'Item three' });
    const page = pageReader.read('test.desk');
    expect(page.bodyHtml).toContain('<li>Item three</li>');
  });

  it('remove_list_item removes item at 1-based index', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await call(srv, 'remove_list_item', { filename: 'test.desk', section_id: 'sec-b', index: 1 });
    const page = pageReader.read('test.desk');
    expect(page.bodyHtml).not.toContain('Item one');
    expect(page.bodyHtml).toContain('Item two');
  });

  it('remove_list_item throws for out-of-range index', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await expect(call(srv, 'remove_list_item', { filename: 'test.desk', section_id: 'sec-b', index: 99 }))
      .rejects.toThrow('index 99 out of range');
  });

  it('update_list_item replaces item text', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await call(srv, 'update_list_item', { filename: 'test.desk', section_id: 'sec-b', index: 1, text: 'Updated one' });
    const page = pageReader.read('test.desk');
    expect(page.bodyHtml).toContain('Updated one');
    expect(page.bodyHtml).not.toContain('Item one');
  });

  it('set_list_type changes ul to ol', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, pageReader, null, null,
      provider, faviconService, [], null, null, null, null, null, null,
    );
    await call(srv, 'set_list_type', { filename: 'test.desk', section_id: 'sec-b', type: 'ol' });
    const page = pageReader.read('test.desk');
    expect(page.bodyHtml).toContain('<ol>');
    expect(page.bodyHtml).not.toContain('<ul>');
  });
});

describe('section type registry tools', () => {
  let tmpDir: string;
  let sectionTypeService: SectionTypeService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-srv-sts-'));
    sectionTypeService = new SectionTypeService(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('list_section_types returns built-in types', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, null, null, null,
      provider, faviconService, [], null, null, null, null, null, sectionTypeService,
    );
    const res = await call(srv, 'list_section_types', {});
    const types = JSON.parse(res.content[0].text);
    expect(types.some((t: any) => t.name === 'steps')).toBe(true);
    expect(types.some((t: any) => t.name === 'cards')).toBe(true);
  });

  it('register_section_type and then list shows new type', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, null, null, null,
      provider, faviconService, [], null, null, null, null, null, sectionTypeService,
    );
    await call(srv, 'register_section_type', { name: 'my-type', description: 'Test', template: '<p>{{body}}</p>' });
    const res = await call(srv, 'list_section_types', {});
    const types = JSON.parse(res.content[0].text);
    expect(types.some((t: any) => t.name === 'my-type')).toBe(true);
  });

  it('remove_section_type removes custom type', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, null, null, null,
      provider, faviconService, [], null, null, null, null, null, sectionTypeService,
    );
    await call(srv, 'register_section_type', { name: 'bye-type', description: '', template: '' });
    await call(srv, 'remove_section_type', { name: 'bye-type' });
    const res = await call(srv, 'list_section_types', {});
    const types = JSON.parse(res.content[0].text);
    expect(types.some((t: any) => t.name === 'bye-type')).toBe(false);
  });

  it('remove_section_type throws for built-in', async () => {
    const srv = new McpServer(
      globalDataService, null, null, null,
      null, null, null, null,
      provider, faviconService, [], null, null, null, null, null, sectionTypeService,
    );
    await expect(call(srv, 'remove_section_type', { name: 'steps' }))
      .rejects.toThrow('Cannot remove built-in type "steps"');
  });
});
```

- [ ] **Step 5: Wire `SectionTypeService` into `src/extension.ts`**

Add import:
```typescript
import { SectionTypeService } from './services/sectionTypeService/sectionTypeService';
```

After `const globalDataService = new DataService(gDir, defaultTemplatePath);` add:
```typescript
const sectionTypeService = new SectionTypeService(gDir);
```

Pass it as the final argument to `new McpServer(...)`:
```typescript
  sectionTypeService,  // add after libraryService
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. Fix any TypeScript compilation errors from the new constructor parameter (update existing `new McpServer(` in tests to pass `null` as the final argument).

- [ ] **Step 7: Commit**

```bash
git add src/mcp/toolSchemas.ts src/mcp/server/server.ts src/mcp/server/server.test.ts src/extension.ts
git commit -m "feat: add section, list, and section-type MCP tools"
```
