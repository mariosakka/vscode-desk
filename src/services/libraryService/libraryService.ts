import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';

export interface LibraryFile {
  url: string;
  type: 'script' | 'style';
}

export interface Library {
  name: string;
  description?: string;
  files: LibraryFile[];
}

export type Downloader = (url: string, dest: string) => Promise<void>;

const DEFAULT_LIBRARIES: Library[] = [
  {
    name: 'highlight',
    description: 'Syntax highlighting for code blocks — call hljs.highlightAll() in a <script>',
    files: [
      { url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', type: 'script' },
      { url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css', type: 'style' },
    ],
  },
  {
    name: 'tocbot',
    description: 'Auto-generates a table of contents — call tocbot.init({...}) in a <script>',
    files: [
      { url: 'https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.25.0/tocbot.min.js', type: 'script' },
      { url: 'https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.25.0/tocbot.css', type: 'style' },
    ],
  },
];

export function defaultDownloader(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        defaultDownloader(res.headers.location!, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

export class LibraryService {
  readonly libCacheDir: string;

  constructor(
    private readonly dir: string,
    private readonly download: Downloader = defaultDownloader,
  ) {
    this.libCacheDir = path.join(os.homedir(), '.desk', 'lib');
  }

  private get configPath(): string {
    return path.join(this.dir, 'libraries.json');
  }

  list(): Library[] {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8')) as Library[];
    } catch {
      return DEFAULT_LIBRARIES.map(l => ({ ...l, files: [...l.files] }));
    }
  }

  get(name: string): Library | null {
    return this.list().find(l => l.name === name) ?? null;
  }

  private _save(libraries: Library[]): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(libraries, null, 2), 'utf-8');
  }

  add(entry: Library): void {
    const libs = this.list().filter(l => l.name !== entry.name);
    this._save([...libs, entry]);
  }

  remove(name: string): void {
    const libs = this.list();
    if (!libs.some(l => l.name === name)) throw new Error(`Library not found: ${name}`);
    this._save(libs.filter(l => l.name !== name));
    try { fs.rmSync(path.join(this.libCacheDir, name), { recursive: true, force: true }); } catch {}
  }

  isInstalled(name: string): boolean {
    const lib = this.get(name);
    if (!lib) return false;
    return lib.files.every(f => {
      const filename = path.basename(new URL(f.url).pathname);
      return fs.existsSync(path.join(this.libCacheDir, name, filename));
    });
  }

  getInstalledFiles(): { filePath: string; type: 'script' | 'style' }[] {
    const result: { filePath: string; type: 'script' | 'style' }[] = [];
    for (const lib of this.list()) {
      for (const f of lib.files) {
        const filename = path.basename(new URL(f.url).pathname);
        const filePath = path.join(this.libCacheDir, lib.name, filename);
        if (fs.existsSync(filePath)) {
          result.push({ filePath, type: f.type });
        }
      }
    }
    return result;
  }

  async install(name: string): Promise<void> {
    const lib = this.get(name);
    if (!lib) throw new Error(`Library not found: ${name}`);
    const dir = path.join(this.libCacheDir, name);
    fs.mkdirSync(dir, { recursive: true });
    await Promise.all(
      lib.files.map(f => {
        const filename = path.basename(new URL(f.url).pathname);
        return this.download(f.url, path.join(dir, filename));
      }),
    );
  }

  async installAll(): Promise<void> {
    for (const lib of this.list()) {
      try { await this.install(lib.name); } catch { /* skip failed downloads silently */ }
    }
  }
}
