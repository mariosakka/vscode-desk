import { test, expect } from '@playwright/test';
import { buildPageViewerHtml } from './helpers/webview';
import { findSentMessage } from './helpers/vscode-mock';

const DEFAULT_OPTS = {
  title: 'Auth Flow',
  content: '<h2>Login</h2><p>Details here.</p>',
  hasBack: false,
};

test('renders title in <title>', async ({ page }) => {
  await page.setContent(buildPageViewerHtml(DEFAULT_OPTS));
  await expect(page).toHaveTitle('Auth Flow');
});

test('renders body content', async ({ page }) => {
  await page.setContent(buildPageViewerHtml(DEFAULT_OPTS));
  await expect(page.locator('h2')).toHaveText('Login');
  await expect(page.locator('p')).toHaveText('Details here.');
});

test('back button is hidden when hasBack=false', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({ ...DEFAULT_OPTS, hasBack: false }));
  const nav = page.locator('#page-nav');
  await expect(nav).toHaveAttribute('data-has-back', 'false');
});

test('back button is visible when hasBack=true', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({ ...DEFAULT_OPTS, hasBack: true }));
  const nav = page.locator('#page-nav');
  await expect(nav).toHaveAttribute('data-has-back', 'true');
});

test('clicking back button posts back message', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({ ...DEFAULT_OPTS, hasBack: true }));
  await page.locator('#back-btn').click();

  const msg = await findSentMessage(page, 'back');
  expect(msg).not.toBeNull();
});

test('clicking a .desk link posts navigate message', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({
    title: 'Index',
    content: '<p><a href="setup.desk">Setup guide</a></p>',
  }));

  await page.locator('a[href="setup.desk"]').click();

  const msg = await findSentMessage(page, 'navigate');
  expect(msg).not.toBeNull();
  expect(msg.filename).toBe('setup.desk');
});

test('clicking an https:// link posts openUrl message', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({
    title: 'Links',
    content: '<p><a href="https://example.com">External</a></p>',
  }));

  await page.locator('a[href="https://example.com"]').click();

  const msg = await findSentMessage(page, 'openUrl');
  expect(msg).not.toBeNull();
  expect(msg.url).toBe('https://example.com');
});

test('clicking a #hash link does not post a message', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({
    title: 'Nav',
    content: '<p><a href="#section1">Jump</a></p><h2 id="section1">Section</h2>',
  }));

  await page.locator('a[href="#section1"]').click();

  const msgs = await page.evaluate(() => (window as any).__sentMessages);
  expect(msgs.length).toBe(0);
});

test('page scripts are injected and executed', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({
    title: 'Scripts',
    content: '<div id="script-target"></div>',
    pageScripts: '<script>document.getElementById("script-target").textContent = "injected";</script>',
  }));

  await expect(page.locator('#script-target')).toHaveText('injected');
});

test('custom styles are injected into the page', async ({ page }) => {
  await page.setContent(buildPageViewerHtml({
    ...DEFAULT_OPTS,
    customStyles: '.page-body { --test-marker: 1; }',
  }));

  // Verify the custom style block exists in the DOM
  const styleContent = await page.evaluate(() => {
    const styles = Array.from(document.querySelectorAll('style'));
    return styles.some(s => s.textContent?.includes('--test-marker'));
  });
  expect(styleContent).toBe(true);
});
