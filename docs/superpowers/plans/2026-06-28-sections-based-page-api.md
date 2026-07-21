# Sections-Based Page API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-form `content` + `customStyles` fields in `create_page` and `update_page` MCP tools with a structured `sections` array so LLMs are forced to insert content into the enforced template rather than writing arbitrary HTML.

**Architecture:** `pageFormat.ts` gets two new exported functions — `extractStyleFromTemplate` (pulls CSS rules from the template's `<style>` block) and `assembleSections` (turns structured section args into the page body HTML). The MCP server reads those functions in `create_page` and `update_page`, fetches the current template via `globalDataService.getPageTemplate()`, and assembles the final `.desk` file using the existing `pageReader.write()` call. No new files are needed.

**Tech Stack:** TypeScript, Node.js, Jest (ts-jest). No new dependencies.

## Global Constraints

- All tests pass: `npm test` must exit 0.
- Conventional Commits required: `feat:` for the schema change (triggers minor bump), `test:` for test-only commits.
- No hex colors or hardcoded URLs in source.
- No new files unless strictly necessary — extend existing ones.
- `pageReader.write(filename, title, bodyHtml, customStyles)` is the only way to write `.desk` files.
- `globalDataService.getPageTemplate()` returns `string | null`. When null, treat as empty styles (`''`).
- The `scope` property on both tools stays unchanged — do not remove it.

---

## File Map

| File | Change |
|------|--------|
| `src/pages/pageFormat.ts` | Add `PageSection`, `AssembleArgs` interfaces + `extractStyleFromTemplate()` + `assembleSections()` |
| `src/mcp/toolSchemas.ts` | Replace `content`/`customStyles` with `eyebrow?`/`subtitle?`/`sections` in `create_page` and `update_page` |
| `src/mcp/server/server.ts` | Rewrite `create_page` and `update_page` cases to assemble from template + sections |
| `src/mcp/server/server.test.ts` | Add describe block for page tool round-trips |
| `src/mcp/resources.ts` | Update desk-page-format guide to document the new API |

---

## Task 1: `pageFormat.ts` — assembly helpers

**Files:**
- Modify: `src/pages/pageFormat.ts`

**Interfaces produced (used by Task 2 and Task 3):**

```typescript
export interface PageSection {
  id?: string;        // anchor id, e.g. "sec-0"; auto-assigned if omitted
  heading: string;    // section heading text (plain text, no HTML)
  icon?: string;      // single emoji, e.g. "🔧"
  content: string;    // inner HTML for the section body (no <style> tags)
}

export interface AssembleArgs {
  title: string;
  eyebrow?: string;   // "Category · Subcategory" label above h1
  subtitle?: string;  // one-sentence summary below h1
  sections: PageSection[];
}

// Returns the CSS rules (without <style> tags) found in a template .desk file.
// Returns '' if the template has no <style> block.
export function extractStyleFromTemplate(templateRaw: string): string

// Returns the HTML body string (no <style> block) for use as the bodyHtml
// argument of pageReader.write().
export function assembleSections(args: AssembleArgs): string
```

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `src/pages/pageFormat.ts` a separate test file. Create `src/pages/pageFormat.sections.test.ts`:

```typescript
import { extractStyleFromTemplate, assembleSections } from './pageFormat';

describe('extractStyleFromTemplate', () => {
  it('returns CSS rules from a template with a style block', () => {
    const template = '<desk-page title="T"><style>\n  h1 { color: red; }\n</style>\n<h1>hi</h1>\n</desk-page>';
    expect(extractStyleFromTemplate(template)).toBe('\n  h1 { color: red; }\n');
  });

  it('returns empty string when template has no style block', () => {
    const template = '<desk-page title="T"><h1>hi</h1></desk-page>';
    expect(extractStyleFromTemplate(template)).toBe('');
  });
});

describe('assembleSections', () => {
  it('produces page-intro header with eyebrow and subtitle', () => {
    const html = assembleSections({
      title: 'My Page',
      eyebrow: 'Cat · Sub',
      subtitle: 'A summary.',
      sections: [],
    });
    expect(html).toContain('<section class="page-intro">');
    expect(html).toContain('<div class="eyebrow">Cat · Sub</div>');
    expect(html).toContain('<h1>My Page</h1>');
    expect(html).toContain('<p style="color:var(--muted)">A summary.</p>');
    expect(html).toContain('<hr/>');
  });

  it('omits eyebrow div when eyebrow is not provided', () => {
    const html = assembleSections({ title: 'T', sections: [] });
    expect(html).not.toContain('eyebrow');
  });

  it('omits subtitle p when subtitle is not provided', () => {
    const html = assembleSections({ title: 'T', sections: [] });
    expect(html).not.toContain('var(--muted)');
  });

  it('renders sections with explicit id', () => {
    const html = assembleSections({
      title: 'T',
      sections: [{ id: 'custom-id', heading: 'Section A', content: '<p>body</p>' }],
    });
    expect(html).toContain('id="custom-id"');
    expect(html).toContain('Section A');
    expect(html).toContain('<p>body</p>');
  });

  it('auto-assigns sec-N ids when id is omitted', () => {
    const html = assembleSections({
      title: 'T',
      sections: [
        { heading: 'First', content: '<p>1</p>' },
        { heading: 'Second', content: '<p>2</p>' },
      ],
    });
    expect(html).toContain('id="sec-0"');
    expect(html).toContain('id="sec-1"');
  });

  it('renders section icon in h2 when provided', () => {
    const html = assembleSections({
      title: 'T',
      sections: [{ heading: 'S', icon: '🔧', content: '' }],
    });
    expect(html).toContain('<span class="icon">🔧</span>');
  });

  it('omits icon span when icon is not provided', () => {
    const html = assembleSections({
      title: 'T',
      sections: [{ heading: 'S', content: '' }],
    });
    expect(html).not.toContain('class="icon"');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/mmswflow/Documents/work/vscode-portal
npx jest src/pages/pageFormat.sections.test.ts --no-coverage
```

Expected: FAIL — `extractStyleFromTemplate` and `assembleSections` are not exported from `pageFormat`.

- [ ] **Step 3: Implement the two functions**

Append to `src/pages/pageFormat.ts` (after the existing `stem` function):

```typescript
// ── Section-based assembly ─────────────────────────────────────────────────

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

export function assembleSections(args: AssembleArgs): string {
  const { title, eyebrow, subtitle, sections } = args;

  const headerLines: string[] = [
    '<section class="page-intro">',
    ...(eyebrow ? [`  <div class="eyebrow">${eyebrow}</div>`] : []),
    `  <h1>${title}</h1>`,
    ...(subtitle ? [`  <p style="color:var(--muted)">${subtitle}</p>`] : []),
    '</section>',
    '',
    '<hr/>',
  ];

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

  return [...headerLines, '', ...sectionBlocks].join('\n');
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/pages/pageFormat.sections.test.ts --no-coverage
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Run the full test suite to check nothing broke**

```bash
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/pageFormat.ts src/pages/pageFormat.sections.test.ts
git commit -m "feat: add extractStyleFromTemplate and assembleSections to pageFormat"
```

---

## Task 2: Update `toolSchemas.ts` — new `create_page` and `update_page` schemas

**Files:**
- Modify: `src/mcp/toolSchemas.ts`

**Context:** `TOOLS` is an array of `{ name, description, inputSchema }` objects. `SCOPE_PROPERTY` is a reusable schema fragment already defined in the file. The goal is to replace the `content` / `customStyles` fields with `eyebrow`, `subtitle`, and `sections`.

- [ ] **Step 1: Replace the `create_page` entry**

Find the `create_page` object in `src/mcp/toolSchemas.ts` (currently at lines ~86–100). Replace it entirely with:

```typescript
  {
    name: 'create_page',
    description: 'Creates a new .desk page assembled from the active page template. Provide structured sections — do not include raw <style> blocks; styles come from the template automatically.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'title', 'sections'],
      properties: {
        filename: { type: 'string', description: 'File name including .desk extension, e.g. "auth-flow.desk"' },
        title: { type: 'string' },
        eyebrow: { type: 'string', description: 'Small label above the title, e.g. "Reference · Backend"' },
        subtitle: { type: 'string', description: 'One-sentence summary shown below the title' },
        sections: {
          type: 'array',
          description: 'Content sections. Each section becomes an <h2> + body block.',
          items: {
            type: 'object',
            required: ['heading', 'content'],
            properties: {
              id: { type: 'string', description: 'Anchor id for scroll-to links, e.g. "sec-0". Auto-assigned if omitted.' },
              heading: { type: 'string', description: 'Section heading text (plain text, no HTML)' },
              icon: { type: 'string', description: 'Single emoji shown before the heading, e.g. "🔧"' },
              content: { type: 'string', description: 'Inner HTML for this section. No <style> tags.' },
            },
            additionalProperties: false,
          },
        },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
```

- [ ] **Step 2: Replace the `update_page` entry**

Find the `update_page` object (currently at lines ~101–116). Replace it entirely with:

```typescript
  {
    name: 'update_page',
    description: 'Updates an existing .desk page. Providing sections rebuilds the entire body from the template; omitting sections keeps the existing body. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      required: ['filename'],
      properties: {
        filename: { type: 'string' },
        title: { type: 'string' },
        eyebrow: { type: 'string' },
        subtitle: { type: 'string' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['heading', 'content'],
            properties: {
              id: { type: 'string' },
              heading: { type: 'string' },
              icon: { type: 'string' },
              content: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. The schema change alone does not break any test since no existing test exercises `create_page`/`update_page` round-trips.

- [ ] **Step 4: Commit**

```bash
git add src/mcp/toolSchemas.ts
git commit -m "feat: change create_page and update_page to sections-based schema"
```

---

## Task 3: Update `server.ts` — implement sections-based assembly

**Files:**
- Modify: `src/mcp/server/server.ts`

**Context:**
- `extractStyleFromTemplate` and `assembleSections` are now exported from `src/pages/pageFormat.ts` (Task 1).
- `PageSection` and `AssembleArgs` are exported from `src/pages/pageFormat.ts`.
- `this.globalDataService.getPageTemplate()` returns `string | null`.
- `pageReader.write(filename, title, bodyHtml, customStyles)` writes the file. `customStyles` is raw CSS rules (no `<style>` tags).
- `this._resolveScope(args)` returns `{ dataService, pageReader }`.

- [ ] **Step 1: Add the import for the new functions**

At the top of `src/mcp/server/server.ts`, the existing import from `pageFormat` does not exist yet. Add it alongside the existing `PageReader` import:

```typescript
import { PageReader } from '../../pages/pageReader';
import { extractStyleFromTemplate, assembleSections, PageSection } from '../../pages/pageFormat';
```

- [ ] **Step 2: Replace the `create_page` case**

Find the current `create_page` case:

```typescript
      case 'create_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        pageReader.write(args.filename, args.title, args.content, args.customStyles ?? '');
        return { content: [{ type: 'text', text: `created ${args.filename}` }] };
      }
```

Replace with:

```typescript
      case 'create_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const templateRaw = this.globalDataService.getPageTemplate() ?? '';
        const customStyles = extractStyleFromTemplate(templateRaw);
        const bodyHtml = assembleSections({
          title: args.title,
          eyebrow: args.eyebrow,
          subtitle: args.subtitle,
          sections: (args.sections as PageSection[]) ?? [],
        });
        pageReader.write(args.filename, args.title, bodyHtml, customStyles);
        return { content: [{ type: 'text', text: `created ${args.filename}` }] };
      }
```

- [ ] **Step 3: Replace the `update_page` case**

Find the current `update_page` case:

```typescript
      case 'update_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const existing = pageReader.read(args.filename);
        pageReader.write(
          args.filename,
          args.title ?? existing.title,
          args.content ?? existing.bodyHtml,
          args.customStyles ?? existing.customStyles,
        );
        return { content: [{ type: 'text', text: `updated ${args.filename}` }] };
      }
```

Replace with:

```typescript
      case 'update_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const existing = pageReader.read(args.filename);
        const newTitle = args.title ?? existing.title;
        let newBodyHtml: string;
        let newCustomStyles: string;
        if (args.sections !== undefined) {
          const templateRaw = this.globalDataService.getPageTemplate() ?? '';
          newCustomStyles = extractStyleFromTemplate(templateRaw);
          newBodyHtml = assembleSections({
            title: newTitle,
            eyebrow: args.eyebrow,
            subtitle: args.subtitle,
            sections: args.sections as PageSection[],
          });
        } else {
          newBodyHtml = existing.bodyHtml;
          newCustomStyles = existing.customStyles;
        }
        pageReader.write(args.filename, newTitle, newBodyHtml, newCustomStyles);
        return { content: [{ type: 'text', text: `updated ${args.filename}` }] };
      }
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: all 164 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/mcp/server/server.ts
git commit -m "feat: assemble create_page and update_page from template + sections"
```

---

## Task 4: Add round-trip tests in `server.test.ts`

**Files:**
- Modify: `src/mcp/server/server.test.ts`

**Context:**
- `mockPageReader` needs `write`, `read`, `list`, `delete` mock functions.
- The existing test file has `mockDataService` which already has `getPageTemplate: jest.fn().mockReturnValue(null)`.
- Add a new `describe` block using port `13338` (ports `13335`, `13336`, `13337` are already taken by existing describe blocks — verify with `grep 'PORT = ' src/mcp/server/server.test.ts` before picking).
- The `McpServer` constructor signature (in order): `globalDataService, globalPageStore, globalWorkflowService, globalSkillRegistry, workspaceDataService, workspacePageReader, workspaceWorkflowService, workspaceSkillRegistry, provider, faviconService, adapters, onConfigSubmitted, onSkillSubmitted, workspaceName, workspacePath, libraryService`.
- To exercise page tools, pass a mock `workspacePageReader` as the 6th argument.

- [ ] **Step 1: Check which ports are in use**

```bash
grep 'PORT = ' src/mcp/server/server.test.ts
```

Pick the next unused port. These instructions assume `13338` is free — adjust if needed.

- [ ] **Step 2: Write the failing tests**

Append this describe block at the end of `src/mcp/server/server.test.ts`:

```typescript
describe('McpServer — page tools (sections-based)', () => {
  let server: McpServer;
  const PORT = 13338;

  const mockPageReader = {
    list: jest.fn().mockReturnValue([]),
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    dir: jest.fn().mockReturnValue('/tmp/desk-pages-test'),
    filePath: jest.fn((f: string) => `/tmp/desk-pages-test/${f}`),
  };

  const localDataService = {
    ...mockDataService,
    getPageTemplate: jest.fn().mockReturnValue(
      '<desk-page title="T"><style>\n  h1 { color: red; }\n</style>\n<h1>hi</h1>\n</desk-page>'
    ),
  };

  beforeEach(done => {
    jest.clearAllMocks();
    localDataService.getPageTemplate.mockReturnValue(
      '<desk-page title="T"><style>\n  h1 { color: red; }\n</style>\n<h1>hi</h1>\n</desk-page>'
    );
    server = new McpServer(
      localDataService as any,
      null, null, null, null,
      mockPageReader as any,
      null, null,
      mockProvider as any,
      mockFaviconService as any,
    );
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('create_page assembles body from sections and passes template styles to pageReader.write', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: {
          filename: 'test.desk',
          title: 'Test Page',
          eyebrow: 'Ref · Test',
          subtitle: 'A test page.',
          sections: [
            { id: 'sec-0', heading: 'Intro', icon: '🔧', content: '<p>hello</p>' },
          ],
        },
      },
      id: 1,
    });

    expect(res.result).toBeDefined();
    expect(mockPageReader.write).toHaveBeenCalledTimes(1);
    const [filename, title, bodyHtml, customStyles] = mockPageReader.write.mock.calls[0];
    expect(filename).toBe('test.desk');
    expect(title).toBe('Test Page');
    expect(bodyHtml).toContain('<div class="eyebrow">Ref · Test</div>');
    expect(bodyHtml).toContain('<h1>Test Page</h1>');
    expect(bodyHtml).toContain('<p style="color:var(--muted)">A test page.</p>');
    expect(bodyHtml).toContain('id="sec-0"');
    expect(bodyHtml).toContain('class="section-title"');
    expect(bodyHtml).toContain('<span class="icon">🔧</span>');
    expect(bodyHtml).toContain('<p>hello</p>');
    expect(customStyles).toContain('h1 { color: red; }');
  });

  it('create_page uses empty styles when template returns null', async () => {
    localDataService.getPageTemplate.mockReturnValue(null);
    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: { filename: 'no-tmpl.desk', title: 'X', sections: [{ heading: 'H', content: '<p>c</p>' }] },
      },
      id: 2,
    });
    const [, , , customStyles] = mockPageReader.write.mock.calls[0];
    expect(customStyles).toBe('');
  });

  it('update_page with sections rebuilds body and updates title', async () => {
    mockPageReader.read.mockReturnValue({
      filename: 'existing.desk',
      title: 'Old Title',
      customStyles: 'old { }',
      bodyHtml: '<p>old body</p>',
      pageScripts: [],
    });

    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'update_page',
        arguments: {
          filename: 'existing.desk',
          title: 'New Title',
          sections: [{ heading: 'New Section', content: '<p>new</p>' }],
        },
      },
      id: 3,
    });

    expect(res.result).toBeDefined();
    const [filename, title, bodyHtml, customStyles] = mockPageReader.write.mock.calls[0];
    expect(filename).toBe('existing.desk');
    expect(title).toBe('New Title');
    expect(bodyHtml).toContain('New Section');
    expect(bodyHtml).toContain('<p>new</p>');
    expect(customStyles).toContain('h1 { color: red; }');
  });

  it('update_page without sections keeps existing body and styles', async () => {
    mockPageReader.read.mockReturnValue({
      filename: 'existing.desk',
      title: 'Old Title',
      customStyles: 'old { }',
      bodyHtml: '<p>old body</p>',
      pageScripts: [],
    });

    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'update_page',
        arguments: { filename: 'existing.desk', title: 'Updated Title' },
      },
      id: 4,
    });

    const [, title, bodyHtml, customStyles] = mockPageReader.write.mock.calls[0];
    expect(title).toBe('Updated Title');
    expect(bodyHtml).toBe('<p>old body</p>');
    expect(customStyles).toBe('old { }');
  });
});
```

- [ ] **Step 3: Run the new tests to confirm they fail**

```bash
npx jest src/mcp/server/server.test.ts --no-coverage -t 'page tools'
```

Expected: FAIL — the page tool cases still use old `args.content` logic, so assertions won't match.

- [ ] **Step 4: Run the full test suite to confirm all tests pass now** (Task 3 already implemented the logic)

```bash
npm test
```

Expected: all tests pass including the 4 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/mcp/server/server.test.ts
git commit -m "test: add round-trip tests for sections-based create_page and update_page"
```

---

## Task 5: Update `resources.ts` — desk-page-format guide

**Files:**
- Modify: `src/mcp/resources.ts`

**Context:** `RESOURCE_CONTENT['desk://guide/desk-page-format']` is the markdown guide agents read before creating pages. It currently describes a free-form `content` parameter. Update it to describe the new sections API and reinforce that styles come from the template automatically.

- [ ] **Step 1: Replace the "File structure" section in the desk-page-format guide**

In `src/mcp/resources.ts`, find the section under `'desk://guide/desk-page-format'` that starts with:

```
## Before creating a page
```

Replace the entire guide string with:

````typescript
  'desk://guide/desk-page-format': `# Desk Page Format (.desk)

Pages are XML files stored in \`<workspace>/desk-pages/\`. You never write raw XML — always use \`create_page\` or \`update_page\` with structured sections.

## Before creating a page

Call \`get_page_template\` first to check what template is active. You do NOT need to copy the template — the server injects it automatically. Just read it to understand which CSS classes and patterns are available.

## Creating a page

\`create_page\` assembles the page from structured sections. The template's \`<style>\` block is injected automatically — **do not include any \`<style>\` tags in your sections**. You cannot override layout or typography this way; if styles are wrong, update the template via \`set_page_template\`.

Required: \`filename\`, \`title\`, \`sections[]\`
Optional: \`eyebrow\`, \`subtitle\`

\`\`\`json
{
  "filename": "auth-flow.desk",
  "title": "Auth Flow",
  "eyebrow": "Reference · Backend",
  "subtitle": "How JWT tokens are issued and validated across all services.",
  "sections": [
    {
      "id": "sec-0",
      "heading": "Overview",
      "icon": "🔐",
      "content": "<p>Body HTML for this section. Use classes defined in the template.</p>"
    },
    {
      "id": "sec-1",
      "heading": "Token Format",
      "content": "<table><thead><tr><th>Claim</th><th>Value</th></tr></thead><tbody><tr><td><code>sub</code></td><td>user ID string</td></tr></tbody></table>"
    }
  ]
}
\`\`\`

Each section becomes a \`<div class="section" id="...">\` with an \`<h2 class="section-title">\` heading. If \`id\` is omitted it is auto-assigned as \`sec-0\`, \`sec-1\`, etc.

## Updating a page

- **With \`sections\`**: body is fully rebuilt from the template + new sections (also updates title/eyebrow/subtitle if provided).
- **Without \`sections\`**: only \`title\` is updated; body and styles are kept as-is.

\`\`\`json
{ "filename": "auth-flow.desk", "title": "New Title" }
\`\`\`

## Theme CSS variables

These are defined by the template. Use them in section \`content\` via inline styles or the template's pre-defined classes.

| Variable | Usage |
|----------|-------|
| \`--bg\` | Page background |
| \`--surface\` | Cards, code blocks |
| \`--surface2\` | Hover states, table headers |
| \`--border\` | Borders, dividers |
| \`--text\` | Body text |
| \`--muted\` | Secondary / hint text |
| \`--accent\` | Primary highlight |
| \`--accent2\` | Links, inline code, tips |
| \`--radius\` | Border radius (10px) |

## Built-in element styles (no extra CSS needed)

These render correctly using template styles: \`h1\`–\`h3\`, \`p\` \`ul\` \`ol\`, \`a\`, \`code\`, \`pre code\`, \`table\` th/td, \`blockquote\`, \`hr\`, \`strong\`, \`em\`.

## Rules

- **No \`<style>\` in content** — template styles are injected automatically; extra style blocks are stripped.
- **\`#hash\` links** scroll to the named anchor natively.
- **\`<script>\`** blocks run after DOM is ready (re-injected at bottom of body).
- **Inline handlers** (\`onclick="..."\`) also work.
- **\`.desk\` links** navigate inside the viewer; **\`https://\` links** open in the browser.
- **CDN scripts are blocked by CSP** — use installed page libraries instead.

## Page libraries (highlight.js, tocbot)

Installed libraries are auto-injected. Use \`typeof\` guards in section \`content\`:

\`\`\`html
<pre><code class="language-python">def hello(): return "world"</code></pre>
<script>
  if (typeof hljs !== 'undefined') hljs.highlightAll();
</script>
\`\`\`

Call \`list_libraries\` to see what is installed.
`,
````

- [ ] **Step 2: Update the quick-start guide tool table**

In the same file, find the `## All 19 tools` table in `'desk://guide/quick-start'`. Update the `create_page` and `update_page` rows:

Old:
```
| create_page | | ✓ | filename, title, content |
| update_page | | ✓ | filename (+ any fields) |
```

New:
```
| create_page | | ✓ | filename, title, sections[] |
| update_page | | ✓ | filename (+ title or sections[]) |
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (resources.ts changes are not covered by tests, but nothing should break).

- [ ] **Step 4: Commit**

```bash
git add src/mcp/resources.ts
git commit -m "docs: update desk-page-format MCP guide for sections-based page API"
```

---

## Self-Review

### Spec coverage

| Requirement | Covered by |
|-------------|------------|
| `create_page` takes structured sections | Task 2 (schema) + Task 3 (server) |
| `update_page` enforces sections-only | Task 2 (schema) + Task 3 (server) |
| Template styles auto-injected | Task 3 — `extractStyleFromTemplate` called on every create/update-with-sections |
| No template → empty styles (not error) | Task 3 — `getPageTemplate() ?? ''` |
| Update without sections keeps existing body | Task 3 — `existing.bodyHtml` branch |
| Round-trip tests | Task 4 |
| MCP guide updated | Task 5 |

### Placeholder scan

None — all steps contain exact code.

### Type consistency

- `PageSection` and `AssembleArgs` defined in Task 1, imported in Task 3 — names match.
- `extractStyleFromTemplate(templateRaw: string): string` — used in Task 3 as `extractStyleFromTemplate(templateRaw)` — matches.
- `assembleSections(args: AssembleArgs): string` — used in Task 3 with `{ title, eyebrow, subtitle, sections }` — matches.
- `pageReader.write(filename, title, bodyHtml, customStyles)` — 4-arg signature confirmed from `pageReader.ts:45`.
- `mockPageReader.write.mock.calls[0]` destructured as `[filename, title, bodyHtml, customStyles]` — matches 4-arg signature.
