import * as https from 'https';
import * as http from 'http';
import * as vscode from 'vscode';

const CACHE_KEY = 'fezzan.favicon-cache';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const FALLBACK_ICON = '🌐';

interface CacheEntry {
  dataUrl: string;
  fetchedAt: number;
}

type FaviconCache = Record<string, CacheEntry>;

type Fetcher = (url: string) => Promise<{ buffer: Buffer; contentType: string | undefined }>;

export class FaviconService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly fetcher: Fetcher = defaultFetcher,
  ) {}

  async getIcon(bookmarkUrl: string): Promise<string> {
    let hostname: string;
    try {
      hostname = new URL(bookmarkUrl).hostname;
    } catch {
      return FALLBACK_ICON;
    }

    const cache = this.context.globalState.get<FaviconCache>(CACHE_KEY) ?? {};
    const entry = cache[hostname];
    if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
      return entry.dataUrl;
    }

    const dataUrl = await this.fetchFaviconDataUrl(hostname);
    if (dataUrl) {
      cache[hostname] = { dataUrl, fetchedAt: Date.now() };
      await this.context.globalState.update(CACHE_KEY, cache);
      return dataUrl;
    }

    return FALLBACK_ICON;
  }

  private async fetchFaviconDataUrl(hostname: string): Promise<string | null> {
    // Strategy 1: /favicon.ico
    try {
      const { buffer, contentType } = await this.fetcher(`https://${hostname}/favicon.ico`);
      if (buffer.length > 0) {
        const mime = normalizeMime(contentType) ?? 'image/x-icon';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
    } catch {
      // fall through
    }

    // Strategy 2: parse <link rel="icon"> from homepage
    try {
      const { buffer } = await this.fetcher(`https://${hostname}`);
      const html = buffer.toString('utf-8', 0, 8192);
      const href = parseIconHref(html);
      if (href) {
        const iconUrl = href.startsWith('http') ? href : `https://${hostname}${href.startsWith('/') ? '' : '/'}${href}`;
        const { buffer: iconBuf, contentType } = await this.fetcher(iconUrl);
        if (iconBuf.length > 0) {
          const mime = normalizeMime(contentType) ?? 'image/png';
          return `data:${mime};base64,${iconBuf.toString('base64')}`;
        }
      }
    } catch {
      // fall through
    }

    return null;
  }
}

function parseIconHref(html: string): string | null {
  const patterns = [
    /<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut icon|icon)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function normalizeMime(ct: string | undefined): string | null {
  if (!ct) return null;
  const base = ct.split(';')[0].trim().toLowerCase();
  // Only allow image MIME types
  return base.startsWith('image/') ? base : null;
}

function defaultFetcher(url: string, redirectDepth = 0): Promise<{ buffer: Buffer; contentType: string | undefined }> {
  return new Promise((resolve, reject) => {
    const mod: typeof https = url.startsWith('https:') ? https : (http as unknown as typeof https);
    const req = mod.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const location = res.headers.location;
        if (redirectDepth >= 2 || (!location.startsWith('https://') && !location.startsWith('http://'))) {
          reject(new Error('redirect limit reached or unsafe redirect'));
          return;
        }
        defaultFetcher(location, redirectDepth + 1).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const contentType = res.headers['content-type'];
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}
