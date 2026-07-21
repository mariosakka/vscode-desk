# Codebase Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplication across services, the MCP server, extension commands, and sidebar components; consolidate types; extract shared utilities.

**Architecture:** New files `src/utils.ts`, `src/storage/jsonStore.ts`, `src/storage/pendingStore.ts` provide shared primitives. `src/models.ts` becomes the single source of truth for domain types. A `ServiceBundle` interface replaces 8 parallel constructor parameters in `McpServer` and `SidebarViewProvider`. Sidebar component duplication is resolved with a `useConfirmDelete` hook and `ScopeToggle` component.

**Tech Stack:** TypeScript, React (sidebar), Jest, CSS Modules.

## Global Constraints

- No comments unless WHY is non-obvious.
- No new dependencies.
- All `npm test` unit tests must pass after every task.
- Commit after each task.
- Do NOT change public behaviour — all refactors are internal restructuring only.

---

### Task 1: Extract `getNonce` and `escHtml` to `src/utils.ts`

`getNonce()` is duplicated in `pageViewPanel.ts` and `sidebarViewProvider.ts`. `escHtml()` is duplicated in `pageViewPanel.ts` and `extension.ts`.

**Files:**
- Create: `src/utils.ts`
- Modify: `src/pages/pageViewPanel.ts`
- Modify: `src/sidebarViewProvider.ts`
- Modify: `src/extension.ts`

**Interfaces:**
- Produces: `export function getNonce(): string`, `export function escHtml(s: string): string` in `src/utils.ts`

- [ ] **Step 1: Create `src/utils.ts`**

```typescript
import * as crypto from 'crypto';

export function getNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

Note: the current `getNonce` uses a character loop; replacing with `crypto.randomBytes` is equivalent and simpler.

- [ ] **Step 2: Update `pageViewPanel.ts`**

Add import at top:
```typescript
import { getNonce, escHtml } from '../utils';
```

Delete the local `getNonce()` function (lines 232–236) and the local `escHtml()` function (lines 239–241).

- [ ] **Step 3: Update `sidebarViewProvider.ts`**

Add import:
```typescript
import { getNonce } from './utils';
```

Delete the local `getNonce()` function (around line 317).

- [ ] **Step 4: Update `extension.ts`**

Add import:
```typescript
import { escHtml } from './utils';
```

Delete the local `escHtml()` function (around line 526).

- [ ] **Step 5: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils.ts src/pages/pageViewPanel.ts src/sidebarViewProvider.ts src/extension.ts
git commit -m "refactor: extract getNonce and escHtml to src/utils.ts"
```

---

### Task 2: Extract `readJson` / `writeJson` to `src/storage/jsonStore.ts`

Six services repeat the same read-with-fallback and mkdirSync+writeFileSync pattern.

**Files:**
- Create: `src/storage/jsonStore.ts`
- Modify: `src/services/dataService/dataService.ts`
- Modify: `src/services/workflowConfigService/workflowConfigService.ts`
- Modify: `src/services/skillRegistry/skillRegistry.ts`
- Modify: `src/services/libraryService/libraryService.ts`
- Modify: `src/services/bookService/bookService.ts`
- Modify: `src/services/sectionTypeService/sectionTypeService.ts`

**Interfaces:**
- Produces: `export function readJson<T>(filePath: string, fallback: T): T`, `export function writeJson(filePath: string, data: unknown): void`

- [ ] **Step 1: Create `src/storage/jsonStore.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';

export function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
```

- [ ] **Step 2: Update `dataService.ts`**

Add import: `import { readJson, writeJson } from '../../storage/jsonStore';`

Replace `return JSON.parse(JSON.stringify(DEFAULT_DATA))` with `return { bookmarks: [] }` (line 18).

Replace each `try { return JSON.parse(fs.readFileSync(...)) } catch { return default }` call with `readJson(path, default)`.

Replace each `fs.mkdirSync(...); fs.writeFileSync(...)` pair with `writeJson(path, data)`.

Remove any `fs` and `path` imports that are no longer needed after the replacements.

- [ ] **Step 3: Update remaining 5 services** — same pattern for each:

For `workflowConfigService.ts`, `skillRegistry.ts`, `libraryService.ts`, `bookService.ts`, `sectionTypeService.ts`:

1. Add `import { readJson, writeJson } from '../../storage/jsonStore';`
2. Replace try/catch reads with `readJson(filePath, fallback)`
3. Replace mkdirSync+writeFileSync pairs with `writeJson(filePath, data)`
4. Remove now-unused `fs`/`path` imports (keep if still used for other operations)

- [ ] **Step 4: Run unit tests**

```bash
npm test
```
Expected: all pass. The service tests mock `fs` — verify they still work correctly after the refactor.

- [ ] **Step 5: Commit**

```bash
git add src/storage/jsonStore.ts src/services/
git commit -m "refactor: extract readJson/writeJson helpers and use in all services"
```

---

### Task 3: Extract `PendingStore<T>` to `src/storage/pendingStore.ts`

`WorkflowConfigService` and `SkillRegistry` both implement an identical in-memory pending-value cycle.

**Files:**
- Create: `src/storage/pendingStore.ts`
- Modify: `src/services/workflowConfigService/workflowConfigService.ts`
- Modify: `src/services/skillRegistry/skillRegistry.ts`

**Interfaces:**
- Produces: `export class PendingStore<T>` with `set(v: T): void`, `get(): T | null`, `take(): T | null`

- [ ] **Step 1: Create `src/storage/pendingStore.ts`**

```typescript
export class PendingStore<T> {
  private value: T | null = null;
  set(v: T): void { this.value = v; }
  get(): T | null { return this.value; }
  take(): T | null { const v = this.value; this.value = null; return v; }
}
```

- [ ] **Step 2: Update `workflowConfigService.ts`**

Add import: `import { PendingStore } from '../../storage/pendingStore';`

Replace the raw `private pending*` fields with:
```typescript
private readonly _pending = new PendingStore<WorkflowConfig>();
```

Update all call sites: `this.setPending(x)` → `this._pending.set(x)`, `this.getPending()` → `this._pending.get()`, `this.clearPending()` → `this._pending.take()` (or keep a `clearPending()` wrapper if called from outside).

- [ ] **Step 3: Update `skillRegistry.ts`** — same pattern

- [ ] **Step 4: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/storage/pendingStore.ts src/services/workflowConfigService/workflowConfigService.ts src/services/skillRegistry/skillRegistry.ts
git commit -m "refactor: extract PendingStore<T> and use in WorkflowConfigService and SkillRegistry"
```

---

### Task 4: Type consolidation in `models.ts`

Move domain types out of service files. Fix inline type duplication in `sidebarViewProvider.ts` and the webview.

**Files:**
- Modify: `src/models.ts`
- Modify: `src/services/workflowConfigService/workflowConfigService.ts`
- Modify: `src/sidebarViewProvider.ts`
- Modify: `src/webview/sidebar/types.ts`
- Modify: `src/webview/sidebar/SidebarApp.tsx`
- Modify: `src/webview/sidebar/components/SkillsPanel/SkillsPanel.tsx`

**Interfaces:**
- Produces: `WorkflowChannel`, `WorkflowSetting`, `WorkflowConfig`, `BookPageMeta`, `BookChapterMeta`, `BookSummary`, `ScopedData`, `SidebarData` exported from `src/models.ts`; `type SkillSummary = Omit<Skill, 'content'>` in `models.ts`

- [ ] **Step 1: Move workflow types into `models.ts`**

Cut `WorkflowChannel`, `WorkflowSetting`, `WorkflowConfig` from `workflowConfigService.ts` and paste them into `models.ts`. Add `export` to each. In `workflowConfigService.ts`, add `import { WorkflowChannel, WorkflowSetting, WorkflowConfig } from '../models';`.

- [ ] **Step 2: Add `SkillSummary` type to `models.ts`**

After the `Skill` interface in `models.ts`, add:
```typescript
export type SkillSummary = Omit<Skill, 'content'>;
```

Update `SkillRegistry.list()` return type to `SkillSummary[]`. Remove the manual field enumeration in `list()` and replace with:
```typescript
return skills.map(({ content: _content, ...summary }) => summary);
```

Add `import { SkillSummary } from '../models';` to `skillRegistry.ts`.

- [ ] **Step 3: Move provider-local types into `models.ts`**

Find `BookPageMeta`, `BookChapterMeta`, `BookSummary`, `ScopedData`, `SidebarData` defined inline in `sidebarViewProvider.ts`. Move them to `models.ts` with `export`. In `sidebarViewProvider.ts`, import them: `import { BookPageMeta, BookChapterMeta, BookSummary, ScopedData, SidebarData } from './models';`

- [ ] **Step 4: Fix webview `types.ts` and `SidebarApp.tsx`**

In `src/webview/sidebar/components/SkillsPanel/SkillsPanel.tsx`: delete the local `interface Skill` and change the prop type to use `SkillSummary` imported from `../../types`.

In `src/webview/sidebar/SidebarApp.tsx`: delete `type Scope = 'workspace' | 'global'` (line 23) and import `Scope` from `./types`.

- [ ] **Step 5: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/models.ts src/services/ src/sidebarViewProvider.ts src/webview/sidebar/
git commit -m "refactor: consolidate domain types into models.ts and fix webview type duplication"
```

---

### Task 5: `ServiceBundle` — collapse parallel constructor parameters

`McpServer` and `SidebarViewProvider` each accept 8+ individual paired service parameters and contain identical `_resolveScope()` methods.

**Files:**
- Modify: `src/models.ts`
- Modify: `src/mcp/server/server.ts`
- Modify: `src/mcp/server/server.test.ts`
- Modify: `src/sidebarViewProvider.ts`
- Modify: `src/extension.ts`

**Interfaces:**
- Produces: `ServiceBundle` interface and `resolveScope()` function in `models.ts`; both classes take `(global: ServiceBundle, workspace: ServiceBundle | null, ...)` instead of 8 individual params

- [ ] **Step 1: Add `ServiceBundle` and `resolveScope` to `models.ts`**

```typescript
import { DataService } from './services/dataService/dataService';
import { PageReader } from './pages/pageReader';
import { WorkflowConfigService } from './services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from './services/skillRegistry/skillRegistry';

export interface ServiceBundle {
  dataService: DataService;
  pageReader: PageReader | null;
  workflowService: WorkflowConfigService | null;
  skillRegistry: SkillRegistry | null;
}

export function resolveScope(
  scope: string | undefined,
  workspace: ServiceBundle | null,
  global: ServiceBundle,
): ServiceBundle {
  if (scope === 'workspace' && workspace) return workspace;
  return global;
}
```

- [ ] **Step 2: Refactor `McpServer` constructor**

Replace the 8 individual global/workspace service parameters with:
```typescript
constructor(
  private readonly global: ServiceBundle,
  private readonly workspace: ServiceBundle | null,
  private readonly provider: SidebarViewProvider,
  private readonly faviconService: FaviconService,
  private readonly adapters: AgentAdapter[] = [],
  private readonly onConfigSubmitted: ((scope: string) => void) | null = null,
  private readonly onSkillSubmitted: ((scope: string) => void) | null = null,
  private readonly workspaceName: string | null = null,
  private readonly workspacePath: string | null = null,
  private readonly libraryService: LibraryService | null = null,
  private readonly sectionTypeService: SectionTypeService | null = null,
  private readonly bookService: BookService | null = null,
) {}
```

Delete `_resolveScope()` and replace all call sites with the imported `resolveScope(args.scope, this.workspace, this.global)`. Update all `const { dataService, pageReader, ... } = this._resolveScope(args)` destructures to use `resolveScope`.

- [ ] **Step 3: Refactor `SidebarViewProvider` constructor** — same pattern, using `ServiceBundle`.

Delete its `_resolveScope()` method and use the shared `resolveScope` function.

- [ ] **Step 4: Update `extension.ts`** — build two `ServiceBundle` objects and pass them

```typescript
const globalBundle: ServiceBundle = {
  dataService: globalDataService,
  pageReader: globalPageReader,
  workflowService: globalWorkflowService,
  skillRegistry: globalSkillRegistry,
};
const workspaceBundle: ServiceBundle | null = workspaceDataService ? {
  dataService: workspaceDataService,
  pageReader: workspacePageReader,
  workflowService: workspaceWorkflowService,
  skillRegistry: workspaceSkillRegistry,
} : null;
```

Pass `globalBundle, workspaceBundle` to both `new McpServer(...)` and `new SidebarViewProvider(...)`.

- [ ] **Step 5: Update `server.test.ts`** — update all `new McpServer(...)` instantiations to pass `ServiceBundle` objects

Every test that creates an `McpServer` passes explicit nulls for individual services today. Update them to pass:
```typescript
const globalBundle: ServiceBundle = {
  dataService: mockDataService,
  pageReader: null,
  workflowService: null,
  skillRegistry: null,
};
new McpServer(globalBundle, null, mockProvider, mockFaviconService)
```

- [ ] **Step 6: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/models.ts src/mcp/server/server.ts src/mcp/server/server.test.ts src/sidebarViewProvider.ts src/extension.ts
git commit -m "refactor: introduce ServiceBundle to collapse parallel constructor params and deduplicate resolveScope"
```

---

### Task 6: `callTool()` internal helpers

Extract repeated patterns inside the 360-line `_dispatchTool` switch.

**Files:**
- Modify: `src/mcp/server/server.ts`

**Interfaces:**
- Produces: module-level `textResult(x)`, instance methods `_requireBook()`, `_requirePageReader(args)`, `_requireSkillRegistry(args)`, `_requireLibraryService()`; instance method `_withList(args, mutate)`

- [ ] **Step 1: Add `textResult` helper** (module-level, above the class)

```typescript
function textResult(x: unknown): { content: { type: string; text: string }[] } {
  return { content: [{ type: 'text', text: typeof x === 'string' ? x : JSON.stringify(x) }] };
}
```

Replace every `return { content: [{ type: 'text', text: JSON.stringify(...) }] }` in `_dispatchTool` with `return textResult(...)`.

- [ ] **Step 2: Add `_require*` guard methods**

```typescript
private _requireBook(): BookService {
  if (!this.bookService) throw new Error('No workspace open — books unavailable');
  return this.bookService;
}
private _requirePageReader(args: Record<string, unknown>): PageReader {
  const { pageReader } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
  if (!pageReader) throw new Error('No workspace open — pages unavailable');
  return pageReader;
}
private _requireSkillRegistry(args: Record<string, unknown>): SkillRegistry {
  const { skillRegistry } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
  if (!skillRegistry) throw new Error('SkillRegistry not available');
  return skillRegistry;
}
private _requireLibraryService(): LibraryService {
  if (!this.libraryService) throw new Error('LibraryService not available');
  return this.libraryService;
}
```

Replace every inline `if (!this.bookService) throw new Error(...)` guard with `const bookSvc = this._requireBook()`, and so on. Update variable names throughout each case accordingly.

- [ ] **Step 3: Extract `_withList` for the 4 list operation cases**

```typescript
private async _withList(
  args: Record<string, unknown>,
  mutate: (items: ListItem[], section: PageSection) => ListItem[],
): Promise<{ content: { type: string; text: string }[] }> {
  const pageReader = this._requirePageReader(args);
  const page = pageReader.read(args.filename as string);
  const sections = parseSections(page.bodyHtml);
  const idx = Number(args.section_index);
  const section = sections[idx];
  if (!section) throw new Error(`Section ${idx} not found`);
  const items = parseListItems(section.content);
  const newItems = mutate(items, section);
  const newContent = rebuildList(newItems, section.listType ?? 'ul');
  const newHtml = replaceSectionHtml(page.bodyHtml, idx, newContent);
  pageReader.write(args.filename as string, page.title, newHtml, page.customStyles);
  return textResult('ok');
}
```

Replace the bodies of `add_list_item`, `remove_list_item`, `update_list_item`, `set_list_type` cases with calls to `this._withList(args, (items) => { ... })`.

- [ ] **Step 4: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/mcp/server/server.ts
git commit -m "refactor: extract textResult, _require* guards, and _withList helpers from callTool switch"
```

---

### Task 7: `extension.ts` command helpers

Repeated scope-pick and book-pick patterns across 10+ command handlers.

**Files:**
- Modify: `src/extension.ts`

**Interfaces:**
- Produces: `pickScopedService<T>`, `pickBook()`, `pickChapter(manifest)` as local async helpers inside `activate()`

- [ ] **Step 1: Extract `pickScopedService`**

Add near the top of `activate()` (after services are constructed):

```typescript
async function pickScopedService<T>(
  workspaceVal: T | null,
  globalVal: T,
): Promise<{ value: T; scope: 'workspace' | 'global' } | undefined> {
  if (!workspaceVal) return { value: globalVal, scope: 'global' };
  const scope = await vscode.window.showQuickPick(
    [{ label: 'Workspace', value: 'workspace' as const }, { label: 'Global', value: 'global' as const }],
    { placeHolder: 'Scope' },
  );
  if (!scope) return undefined;
  return { value: scope.value === 'workspace' ? workspaceVal : globalVal, scope: scope.value };
}
```

Replace all inline `pickScope()` + ternary patterns with `pickScopedService(workspaceX, globalX)`.

- [ ] **Step 2: Extract `pickBook` and `pickChapter`**

```typescript
async function pickBook(): Promise<{ slug: string; label: string } | undefined> {
  if (!bookService) { vscode.window.showErrorMessage('Desk: No workspace open'); return undefined; }
  const books = bookService.list();
  if (books.length === 0) { vscode.window.showInformationMessage('Desk: No books yet'); return undefined; }
  return vscode.window.showQuickPick(
    books.map(b => ({ label: b.title, slug: b.slug })),
    { placeHolder: 'Select book' },
  );
}

async function pickChapter(manifest: BookManifest): Promise<{ index: number; label: string } | undefined> {
  if (manifest.chapters.length === 0) {
    vscode.window.showInformationMessage('Desk: This book has no chapters');
    return undefined;
  }
  return vscode.window.showQuickPick(
    manifest.chapters.map((ch, i) => ({ label: ch.title, index: i })),
    { placeHolder: 'Select chapter' },
  );
}
```

Replace the repeated inline patterns in `addChapter`, `renameChapter`, `removeChapter`, `newBookPage`, `moveBookPage`, `deleteBook`, `openBook` command handlers.

- [ ] **Step 3: Run unit tests**

```bash
npm test
```
Expected: all pass (commands have no unit tests; rely on compile to catch errors).

- [ ] **Step 4: Compile to verify no TypeScript errors**

```bash
npm run compile:ext
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts
git commit -m "refactor: extract pickScopedService, pickBook, and pickChapter helpers in extension.ts"
```

---

### Task 8: `pageViewPanel.ts` — `parseBookFilename` helper

`filename.split('/')[0]` and `[1]` are repeated independently in `_renderBookNav` and `_renderPrevNext`.

**Files:**
- Modify: `src/pages/pageViewPanel.ts`

- [ ] **Step 1: Add `parseBookFilename` at module level** (below `escHtml` import, or after the class)

```typescript
function parseBookFilename(filename: string): { slug: string; pageFile: string } | null {
  const parts = filename.split('/');
  return parts.length === 2 ? { slug: parts[0], pageFile: parts[1] } : null;
}
```

- [ ] **Step 2: Use it in `_renderBookNav` and `_renderPrevNext`**

In `_renderBookNav`:
```typescript
const parsed = parseBookFilename(filename);
if (!parsed) return '';
const { slug, pageFile } = parsed;
```

In `_renderPrevNext`:
```typescript
const parsed = parseBookFilename(filename);
if (!parsed) return '';
const { slug } = parsed;
// use slug in svc.getFlatPageList(slug)
```
Also use `parsed.pageFile` from the prev/next link label where `split('/')[1]` was used.

- [ ] **Step 3: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/pageViewPanel.ts
git commit -m "refactor: extract parseBookFilename helper in pageViewPanel"
```

---

### Task 9: Sidebar component cleanup

Remove dead `Header.tsx`. Convert `LibrariesPanel` to use `PanelRow` + `HoverIconButton`. Extract `useConfirmDelete` hook. Extract `ScopeToggle` component.

**Files:**
- Delete: `src/webview/sidebar/components/Header/Header.tsx` (and its CSS if any)
- Modify: `src/webview/sidebar/components/LibrariesPanel/LibrariesPanel.tsx`
- Modify: `src/webview/sidebar/components/LibrariesPanel/LibrariesPanel.module.css`
- Create: `src/webview/sidebar/hooks/useConfirmDelete.ts`
- Modify: `src/webview/sidebar/components/BooksPanel/BooksPanel.tsx`
- Modify: `src/webview/sidebar/components/SkillsPanel/SkillsPanel.tsx`
- Modify: `src/webview/sidebar/components/TabBar/TabBar.tsx`
- Create: `src/webview/sidebar/components/ScopeToggle/ScopeToggle.tsx`
- Create: `src/webview/sidebar/components/ScopeToggle/ScopeToggle.module.css`
- Modify: `src/webview/sidebar/SidebarApp.tsx`

- [ ] **Step 1: Delete `Header.tsx`**

```bash
rm src/webview/sidebar/components/Header/Header.tsx
rmdir src/webview/sidebar/components/Header 2>/dev/null || true
```

Grep to confirm it's not imported anywhere:
```bash
grep -r "Header" src/webview/sidebar/ --include="*.tsx" --include="*.ts"
```
Expected: no results referencing the deleted Header component.

- [ ] **Step 2: Create `useConfirmDelete` hook**

Create `src/webview/sidebar/hooks/useConfirmDelete.ts`:
```typescript
import { useState } from 'react';

export function useConfirmDelete<T extends string = string>() {
  const [pendingId, setPendingId] = useState<T | null>(null);
  return {
    pendingId,
    setPending: (id: T) => setPendingId(id),
    clearPending: () => setPendingId(null),
  };
}
```

- [ ] **Step 3: Use `useConfirmDelete` in `BooksPanel`, `SkillsPanel`, `TabBar`**

In each component, replace `useState<string | null>(null)` for the delete-confirm state with:
```typescript
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
// ...
const { pendingId, setPending, clearPending } = useConfirmDelete();
```

Replace `pendingDelete === book.slug` with `pendingId === book.slug`, `setPendingDelete(book.slug)` with `setPending(book.slug)`, etc.

- [ ] **Step 4: Convert `LibrariesPanel` to use `PanelRow` + `HoverIconButton`**

Rewrite `LibrariesPanel.tsx`:
```tsx
import React from 'react';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { GlobeIcon, TrashIcon } from '../shared/Icons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EmptyState } from '../shared/EmptyState';
import { HoverIconButton } from '../shared/HoverIconButton';
import { PanelRow } from '../shared/PanelRow';
import { LibraryEntry } from '../../types';

interface Props {
  libraries: LibraryEntry[];
  onSync: () => void;
  onRemove: (name: string) => void;
}

export function LibrariesPanel({ libraries, onSync, onRemove }: Props) {
  return (
    <CollapsibleSection icon={<GlobeIcon size={13} />} title="Page Libraries" defaultOpen={false}>
      {libraries.length === 0 && <EmptyState message="No libraries configured." />}
      {libraries.map(lib => (
        <PanelRow
          key={lib.name}
          icon={<GlobeIcon size={13} />}
          label={lib.name}
          sublabel={lib.installed ? 'installed' : 'pending'}
          actions={
            <HoverIconButton title={`Remove ${lib.name}`} hoverColor="danger" onClick={() => onRemove(lib.name)}>
              <TrashIcon size={11} />
            </HoverIconButton>
          }
        />
      ))}
      <div>
        <button className={sectionBtnStyles.btn} type="button" onClick={onSync}>
          <GlobeIcon size={13} /> Sync all
        </button>
      </div>
    </CollapsibleSection>
  );
}
```

Replace `LibrariesPanel.module.css` content with just the minimal styles still needed (likely empty or just the sync button row).

- [ ] **Step 5: Create `ScopeToggle` component**

Create `src/webview/sidebar/components/ScopeToggle/ScopeToggle.module.css`:
```css
.bar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.btn {
  flex: 1;
  padding: 5px 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  transition: background 150ms, color 150ms;
}
.btn.active {
  background: var(--accent);
  color: var(--vscode-button-foreground, #fff);
}
```

Create `src/webview/sidebar/components/ScopeToggle/ScopeToggle.tsx`:
```tsx
import React from 'react';
import { Scope } from '../../types';
import styles from './ScopeToggle.module.css';

interface Props {
  active: Scope;
  onChange: (scope: Scope) => void;
}

export function ScopeToggle({ active, onChange }: Props) {
  return (
    <div className={styles.bar}>
      {(['workspace', 'global'] as Scope[]).map(s => (
        <button
          key={s}
          className={`${styles.btn}${active === s ? ' ' + styles.active : ''}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Use `ScopeToggle` in `SidebarApp.tsx`**

Add import: `import { ScopeToggle } from './components/ScopeToggle/ScopeToggle';`

Replace the inline `style={{}}` scope switcher block (the `{hasWorkspace && (<div style={{...}}>...</div>)}` block) with:
```tsx
{hasWorkspace && (
  <ScopeToggle active={activeScope} onChange={setActiveScope} />
)}
```

- [ ] **Step 7: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 8: Compile webview to verify no TypeScript errors**

```bash
npm run compile:webview
```
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/webview/sidebar/
git commit -m "refactor: extract useConfirmDelete hook, ScopeToggle component, convert LibrariesPanel to PanelRow, delete dead Header"
```

---

### Task 10: CSS deduplication

**Files:**
- Modify: `src/webview/global.css`
- Modify: `src/webview/sidebar/components/shared/Inputs.module.css`
- Modify: `src/webview/sidebar/components/InlineBookmarkForm/InlineBookmarkForm.module.css`
- Modify: `src/webview/sidebar/components/shared/InlineBarForm.module.css`
- Modify: `src/webview/sidebar/components/InlineTabForm/InlineTabForm.module.css`
- Modify: `src/webview/sidebar/components/BookmarkCard/BookmarkCard.module.css`
- Modify: `src/webview/sidebar/components/shared/PanelRow.module.css`
- Modify: `src/webview/sidebar/components/TabBar/TabBar.module.css` (if hover-btn rules present)
- Modify: `src/webview/sidebar/components/BookmarksPanel/BookmarksPanel.module.css`
- Modify: `src/webview/sidebar/components/BooksPanel/BooksPanel.module.css`
- Modify: `src/webview/sidebar/components/SkillsPanel/SkillsPanel.module.css`

- [ ] **Step 1: Move hover-reveal rules to `global.css`**

The following block appears in `BookmarkCard.module.css`, `PanelRow.module.css`, and possibly `TabBar.module.css`:
```css
/* These rules enable HoverIconButton visibility */
```
Find the exact selectors (they use `:hover [data-hover-btn]` patterns) and move them to `global.css`. Delete from each module file.

- [ ] **Step 2: Move `.error` span rule to `Inputs.module.css`**

Add to `Inputs.module.css`:
```css
.error { font-size: 11px; color: var(--vscode-errorForeground, #f48771); }
```

In `InlineBookmarkForm.module.css`, `InlineBarForm.module.css`, `InlineTabForm.module.css`: delete the `.error` rule and import the class from `Inputs.module.css` at the usage sites.

- [ ] **Step 3: Delete duplicate `InlineTabForm.module.css` content**

`InlineTabForm.module.css` is byte-for-byte identical to `QuickOpenForm.module.css`. Check which one `InlineTabForm.tsx` imports, then have it import from `InlineBarForm.module.css` (or the appropriate shared file) and delete `InlineTabForm.module.css`.

- [ ] **Step 4: Consolidate bottom action-button row padding**

`BookmarksPanel.module.css`, `BooksPanel.module.css`, `SkillsPanel.module.css` all define a padding wrapper (`.addRow`, `.submitRow`). These classes are already covered by `SectionBtn.module.css` (the `.btn` wrapping pattern). Remove the redundant module classes and update the JSX to use just the `sectionBtnStyles` wrapper div.

- [ ] **Step 5: Run unit tests and compile**

```bash
npm test && npm run compile:webview
```
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/webview/
git commit -m "refactor: consolidate duplicate CSS rules into global.css and shared module files"
```
