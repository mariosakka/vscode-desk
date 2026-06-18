import { test, expect } from '@playwright/test';
import { buildSidebarHtml } from './helpers/webview';
import { dispatchToWebview, findSentMessage } from './helpers/vscode-mock';

const TAB_1 = { id: 'tab_1', name: 'Work', bookmarks: [] };
const TAB_2 = { id: 'tab_2', name: 'Research', bookmarks: [] };
const BM_EMOJI = {
  id: 'bm_1', title: 'GitHub', url: 'https://github.com',
  icon: '🐙', description: 'Code hosting',
};
const BM_IMG = {
  id: 'bm_2', title: 'VS Code', url: 'https://code.visualstudio.com',
  icon: 'data:image/png;base64,iVBORw0KGgo=', description: '',
};

test.beforeEach(async ({ page }) => {
  await page.setContent(buildSidebarHtml());
});

test('empty state — shows "No tabs yet" prompt', async ({ page }) => {
  await dispatchToWebview(page, { type: 'update', data: { tabs: [] } });
  await expect(page.locator('#bookmarks-grid')).toContainText('No tabs yet');
  await expect(page.locator('#tabs-bar')).toBeEmpty();
});

test('renders tab buttons from update message', async ({ page }) => {
  await dispatchToWebview(page, { type: 'update', data: { tabs: [TAB_1, TAB_2] } });
  const tabs = page.locator('.portal-tab');
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveText('Work');
  await expect(tabs.nth(1)).toHaveText('Research');
});

test('first tab is active by default', async ({ page }) => {
  await dispatchToWebview(page, { type: 'update', data: { tabs: [TAB_1, TAB_2] } });
  await expect(page.locator('.portal-tab.active')).toHaveText('Work');
});

test('clicking a tab switches the active tab and shows its bookmarks', async ({ page }) => {
  const tab2WithBm = { ...TAB_2, bookmarks: [BM_EMOJI] };
  await dispatchToWebview(page, { type: 'update', data: { tabs: [TAB_1, tab2WithBm] } });

  await page.locator('.portal-tab', { hasText: 'Research' }).click();

  await expect(page.locator('.portal-tab.active')).toHaveText('Research');
  await expect(page.locator('.bm-title')).toHaveText('GitHub');
});

test('clicking a bookmark card posts openUrl', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: { tabs: [{ ...TAB_1, bookmarks: [BM_EMOJI] }] },
  });

  await page.locator('.bookmark-card').click();

  const msg = await findSentMessage(page, 'openUrl');
  expect(msg).not.toBeNull();
  expect(msg.url).toBe('https://github.com');
});

test('clicking × button posts removeBookmark', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: { tabs: [{ ...TAB_1, bookmarks: [BM_EMOJI] }] },
  });

  await page.locator('.bookmark-card').hover();
  await page.locator('.bm-remove').click();

  const msg = await findSentMessage(page, 'removeBookmark');
  expect(msg).not.toBeNull();
  expect(msg.tabId).toBe('tab_1');
  expect(msg.bookmarkId).toBe('bm_1');
});

test('base64 icon renders as <img>', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: { tabs: [{ ...TAB_1, bookmarks: [BM_IMG] }] },
  });

  const img = page.locator('.bm-icon img');
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', /^data:image\/png/);
});

test('emoji icon renders as text (no <img>)', async ({ page }) => {
  await dispatchToWebview(page, {
    type: 'update',
    data: { tabs: [{ ...TAB_1, bookmarks: [BM_EMOJI] }] },
  });

  await expect(page.locator('.bm-icon img')).toHaveCount(0);
  await expect(page.locator('.bm-icon')).toContainText('🐙');
});

test('webview sends ready message on load', async ({ page }) => {
  const msg = await findSentMessage(page, 'ready');
  expect(msg).not.toBeNull();
});
