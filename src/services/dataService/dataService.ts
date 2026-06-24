import * as fs from 'fs';
import * as path from 'path';
import { Bookmark, Project, PortalData } from '../../models';

const DEFAULT_DATA: PortalData = { projects: [] };

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export class DataService {
  constructor(private readonly dir: string) {}

  get(): PortalData {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.dir, 'data.json'), 'utf-8'));
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  save(data: PortalData): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8');
  }

  addBookmark(projectId: string, fields: Omit<Bookmark, 'id'>): Bookmark {
    const data = this.get();
    const project = data.projects.find(p => p.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const bookmark: Bookmark = { id: generateId('bm'), ...fields };
    project.bookmarks.push(bookmark);
    this.save(data);
    return bookmark;
  }

  removeBookmark(projectId: string, bookmarkId: string): void {
    const data = this.get();
    const project = data.projects.find(p => p.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    project.bookmarks = project.bookmarks.filter(b => b.id !== bookmarkId);
    this.save(data);
  }

  createProject(name: string): Project {
    const data = this.get();
    const project: Project = { id: generateId('project'), name, bookmarks: [] };
    data.projects.push(project);
    this.save(data);
    return project;
  }

  removeProject(projectId: string): void {
    const data = this.get();
    data.projects = data.projects.filter(p => p.id !== projectId);
    this.save(data);
  }

  updateBookmark(projectId: string, bookmarkId: string, fields: Partial<Omit<Bookmark, 'id'>>): Bookmark {
    const data = this.get();
    const project = data.projects.find(p => p.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const bm = project.bookmarks.find(b => b.id === bookmarkId);
    if (!bm) throw new Error(`Bookmark not found: ${bookmarkId}`);
    Object.assign(bm, fields);
    this.save(data);
    return bm;
  }
}
