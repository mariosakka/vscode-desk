import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { SectionTypeService } from './sectionTypeService';
import { BUILT_IN_TYPES } from '../../pages/sectionTypes';

let dir: string;
let svc: SectionTypeService;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-sts-test-'));
  svc = new SectionTypeService(dir);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('listAll()', () => {
  it('includes all 9 built-in types when no custom types exist', () => {
    const all = svc.listAll();
    expect(all.length).toBe(BUILT_IN_TYPES.length);
    const names = all.map(t => t.name);
    for (const bt of BUILT_IN_TYPES) {
      expect(names).toContain(bt.name);
    }
  });

  it('marks built-ins as builtin:true and custom as builtin:false', () => {
    svc.register('my-custom', 'A custom type', '<p>{{body}}</p>');
    const all = svc.listAll();
    const custom = all.find(t => t.name === 'my-custom');
    const builtin = all.find(t => t.name === 'steps');
    expect(custom!.builtin).toBe(false);
    expect(builtin!.builtin).toBe(true);
  });

  it('hides a built-in name when a custom type with the same name is registered', () => {
    svc.register('lead', 'Override lead', '<div class="custom">{{body}}</div>');
    const all = svc.listAll();
    const leads = all.filter(t => t.name === 'lead');
    expect(leads).toHaveLength(1);
    expect(leads[0].builtin).toBe(false);
  });
});

describe('register()', () => {
  it('writes a new custom type to the JSON file', () => {
    svc.register('my-type', 'A type', '<div>{{body}}</div>');
    const all = svc.listAll();
    const found = all.find(t => t.name === 'my-type');
    expect(found).toBeDefined();
    expect(found!.builtin).toBe(false);
  });

  it('overwrites an existing custom type with the same name', () => {
    svc.register('my-type', 'Old', '<p>old</p>');
    svc.register('my-type', 'New', '<p>new</p>');
    const customs = svc.getCustomTypes();
    expect(customs.filter(t => t.name === 'my-type')).toHaveLength(1);
    expect(customs.find(t => t.name === 'my-type')!.description).toBe('New');
  });
});

describe('getCustomTypes()', () => {
  it('returns only custom types, not built-ins', () => {
    svc.register('custom-a', 'A', '<p>A</p>');
    const customs = svc.getCustomTypes();
    expect(customs.every(t => !BUILT_IN_TYPES.some(b => b.name === t.name && b.description === t.description))).toBe(true);
    expect(customs.some(t => t.name === 'custom-a')).toBe(true);
    expect(customs.some(t => t.name === 'steps')).toBe(false);
  });
});

describe('remove()', () => {
  it('removes a custom type', () => {
    svc.register('bye', 'Bye', '<p>bye</p>');
    svc.remove('bye');
    expect(svc.getCustomTypes().find(t => t.name === 'bye')).toBeUndefined();
  });

  it('throws Cannot remove built-in type when name is built-in', () => {
    expect(() => svc.remove('steps')).toThrow('Cannot remove built-in type "steps"');
  });
});
