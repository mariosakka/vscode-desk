# Default Template — Collapsible TOC Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible tocbot-powered sidebar and ul/ol usage examples to the default `.desk` page template so pages built from it automatically get navigation when tocbot is installed.

**Architecture:** All changes are confined to a single `.desk` XML file. The sidebar degrades gracefully — when tocbot is not installed the toggle button is hidden and the page renders normally. No TypeScript or test changes are required.

**Tech Stack:** XML/HTML, CSS (VS Code theme variables only), vanilla JS (IIFE, no dependencies beyond optional tocbot)

## Global Constraints

- CSS must use only `var(--bg)`, `var(--surface)`, `var(--surface2)`, `var(--border)`, `var(--text)`, `var(--muted)`, `var(--accent)`, `var(--accent2)`, `var(--radius)` — never hex values or `rgb()`
- No `!important` overrides
- No automated test for this change (visual only); verify XML is well-formed

---

## File Map

- **Modify:** `src/resources/default-page-template.desk`
  - Add `.toc-panel` and `.toc-toggle` CSS to the `<style>` block (after the `.page-intro`/`.eyebrow`/`a` rules)
  - Add `ul`/`ol` usage examples to the usage-guide comment block (after the existing `=== TOC table ===` section)
  - Add toggle button, nav element, and wiring script to the visible HTML (before `<section class="page-intro">`)

---

### Task 1: Add TOC sidebar CSS, toggle button, nav, script, and list examples

**Files:**
- Modify: `src/resources/default-page-template.desk`

**Interfaces:**
- Consumes: nothing
- Produces: updated template file consumed by `DataService.getPageTemplate()` and served via `get_page_template` MCP tool

- [ ] **Step 1: Add TOC sidebar CSS to the `<style>` block**

  In `src/resources/default-page-template.desk`, find the `/* ── Links */` block at the bottom of `<style>` (line 73):
  ```css
      /* ── Links */
      a { color: var(--accent2); }
  ```
  Replace it with:
  ```css
      /* ── TOC sidebar */
      .toc-panel {
        position: fixed; left: 0; top: 44px;
        width: 220px; height: calc(100vh - 44px);
        overflow-y: auto;
        background: var(--surface); border-right: 1px solid var(--border);
        padding: 1rem 0.75rem;
        transition: transform .25s ease;
        z-index: 99;
      }
      .toc-panel.collapsed { transform: translateX(-100%); }
      .toc-toggle {
        position: fixed; left: 8px; top: 50px; z-index: 100;
        background: var(--surface2); border: 1px solid var(--border);
        border-radius: 6px; padding: 4px 10px;
        cursor: pointer; color: var(--muted);
        transition: left .25s ease;
      }
      body.toc-open .toc-toggle { left: 228px; }
      body.toc-open .page-content { margin-left: 230px; max-width: calc(860px + 230px); }
      .toc-panel ol, .toc-panel ul { padding-left: 0.75rem; list-style: none; }
      .toc-panel a { color: var(--muted); text-decoration: none; font-size: 0.82rem; line-height: 1.8; display: block; }
      .toc-panel a:hover, .toc-panel .is-active-link { color: var(--accent2); }

      /* ── Links */
      a { color: var(--accent2); }
  ```

- [ ] **Step 2: Add ul/ol examples to the usage-guide comment block**

  Find the line in the comment block (after the `=== TOC table ===` section, around line 153):
  ```
    </table>

    === Section lead box ===
  ```
  Insert the new examples between the TOC table block and the Section lead box block:
  ```
    </table>

    === Unordered list ===
    <ul>
      <li>First item</li>
      <li>Second item with <code>inline code</code></li>
    </ul>

    === Ordered list ===
    <ol>
      <li>Step one</li>
      <li>Step two</li>
    </ol>

    === Section lead box ===
  ```

- [ ] **Step 3: Add toggle button, nav element, and wiring script to the visible HTML**

  Find the visible HTML section (after the closing `-->` of the comment block, around line 189–191):
  ```
    ═══════════════════════════════════════════════════════════════ -->

    <section class="page-intro">
  ```
  Insert the button, nav, and script immediately before `<section class="page-intro">`:
  ```
    ═══════════════════════════════════════════════════════════════ -->

    <button id="toc-toggle" class="toc-toggle" aria-label="Toggle table of contents">≡</button>
    <nav id="toc" class="toc-panel collapsed"></nav>
    <script>
      (function () {
        var toc = document.getElementById('toc');
        var toggle = document.getElementById('toc-toggle');
        if (!toc || !toggle) return;
        if (typeof tocbot === 'undefined') { toggle.style.display = 'none'; return; }
        tocbot.init({ tocSelector: '#toc', contentSelector: '.page-content', headingSelector: 'h2, h3', orderedList: false });
        toggle.addEventListener('click', function () {
          var collapsed = toc.classList.toggle('collapsed');
          toggle.textContent = collapsed ? '≡' : '←';
          document.body.classList.toggle('toc-open', !collapsed);
        });
      })();
    </script>

    <section class="page-intro">
  ```

- [ ] **Step 4: Verify the file is well-formed XML**

  Run:
  ```bash
  node -e "const fs=require('fs'); const s=fs.readFileSync('src/resources/default-page-template.desk','utf-8'); require('assert').ok(s.includes('toc-panel')&&s.includes('toc-toggle')&&s.includes('Unordered list')); console.log('OK');"
  ```
  Expected: `OK`

- [ ] **Step 5: Commit**

  ```bash
  git add src/resources/default-page-template.desk
  git commit -m "chore: add collapsible TOC sidebar and list examples to default template"
  ```
