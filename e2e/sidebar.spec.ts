import { test, expect } from '@playwright/test';
import { buildSidebarHtml } from './helpers/webview';
import { dispatchToWebview, findSentMessage } from './helpers/vscode-mock';

const BM_EMOJI = {
  id: 'bm_1', title: 'GitHub', url: 'https://github.com',
  icon: '🐙', description: 'Code hosting',
};
const BM_IMG = {
  id: 'bm_2', title: 'VS Code', url: 'https://code.visualstudio.com',
  icon: 'data:image/png;base64,iVBORw0KGgo=', description: '',
};

function makeData(bookmarks: typeof BM_EMOJI[] = []) {
  return {
    workspaceName: 'test-workspace',
    workspace: {
      data: { bookmarks },
      pages: [],
      workflow: null,
      skills: [],
    },
    global: {
      data: { bookmarks: [] },
      pages: [],
      workflow: null,
      skills: [],
    },
  };
}

test.beforeEach(async ({ page }) => {
  await page.setContent(buildSidebarHtml());
});

test('empty state — shows "No bookmarks yet" prompt', async ({ page }) => {
  await dispatchToWebview(page, { type: 'update', data: makeData([]) });
  await expect(page.locator('#bookmarks-grid-workspace')).toContainText('No bookmarks yet');
});

test('renders bookmark cards from update message', async ({ page }) => {
  await dispatchToWebview(page, { type: 'update', data: makeData([BM_EMOJI]) });
  const cards = page.locator('[data-testid="bookmark-card"]');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('GitHub');
});

test('clicking a bookmark card posts openUrl', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: makeData([BM_EMOJI]),
  });

  await page.locator('[data-testid="bookmark-card"]').click();

  const msg = await findSentMessage(page, 'openUrl');
  expect(msg).not.toBeNull();
  expect(msg.url).toBe('https://github.com');
});

test('clicking × button posts removeBookmark', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: makeData([BM_EMOJI]),
  });

  await page.locator('[data-testid="bookmark-card"]').hover();
  await page.locator('[data-testid="bookmark-remove"]').click();
  await page.locator('button[title="Confirm"]').click();

  const msg = await findSentMessage(page, 'removeBookmark');
  expect(msg).not.toBeNull();
  expect(msg.bookmarkId).toBe('bm_1');
});

test('base64 icon renders as <img>', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: makeData([BM_IMG]),
  });

  const img = page.locator('[data-testid="bookmark-icon"] img');
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', /^data:image\/png/);
});

test('emoji icon renders as text (no <img>)', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: makeData([BM_EMOJI]),
  });

  await expect(page.locator('[data-testid="bookmark-icon"] img')).toHaveCount(0);
  await expect(page.locator('[data-testid="bookmark-icon"]')).toContainText('🐙');
});

test('webview sends ready message on load', async ({ page }) => {
  await page.waitForFunction(() => (window as any).__sentMessages?.some((m: any) => m.type === 'ready'));
  const msg = await findSentMessage(page, 'ready');
  expect(msg).not.toBeNull();
});

test('workspace section is hidden when workspace is null', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: {
      workspaceName: null,
      workspace: null,
      global: {
        data: { bookmarks: [] },
        pages: [],
        workflow: null,
        skills: [],
      },
    },
  });

  await expect(page.locator('button', { hasText: 'workspace' })).toHaveCount(0);
  await expect(page.locator('#bookmarks-grid-global')).toContainText('No bookmarks yet');
});
