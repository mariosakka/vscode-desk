import { Page } from '@playwright/test';

/** Inject acquireVsCodeApi() mock before any page scripts run */
export async function injectVsCodeMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const msgs: any[] = [];
    const api = {
      postMessage(msg: any) { msgs.push(msg); },
      getState() { return (window as any).__vsState ?? null; },
      setState(s: any) { (window as any).__vsState = s; },
    };
    (window as any).__sentMessages = msgs;
    (window as any).acquireVsCodeApi = () => api;
  });
}

/** All messages posted to the VS Code host since the page loaded */
export async function getSentMessages(page: Page): Promise<any[]> {
  return page.evaluate(() => (window as any).__sentMessages ?? []);
}

/** Find the last posted message matching a type */
export async function findSentMessage(page: Page, type: string): Promise<any | null> {
  const msgs = await getSentMessages(page);
  return [...msgs].reverse().find(m => m.type === type) ?? null;
}

/** Dispatch a window message into the webview (simulates the extension host) */
export async function dispatchToWebview(page: Page, data: unknown): Promise<void> {
  await page.evaluate(d => {
    window.dispatchEvent(new MessageEvent('message', { data: d }));
  }, data as any);
}
