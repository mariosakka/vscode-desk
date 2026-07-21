import * as path from 'path';
import { CustomSectionType, BUILT_IN_TYPES } from '../../pages/sectionTypes';
import { readJson, writeJson } from '../../storage/jsonStore';

export class SectionTypeService {
  private readonly filePath: string;

  constructor(private readonly dir: string) {
    this.filePath = path.join(dir, 'section-types.json');
  }

  private readAll(): CustomSectionType[] {
    return readJson<CustomSectionType[]>(this.filePath, []);
  }

  private writeAll(types: CustomSectionType[]): void {
    writeJson(this.filePath, types);
  }

  listAll(): Array<{ name: string; description: string; builtin: boolean }> {
    const custom = this.readAll();
    const customNames = new Set(custom.map(t => t.name));
    return [
      ...BUILT_IN_TYPES
        .filter(t => !customNames.has(t.name))
        .map(t => ({ name: t.name, description: t.description, builtin: true })),
      ...custom.map(t => ({ name: t.name, description: t.description, builtin: false })),
    ];
  }

  getCustomTypes(): CustomSectionType[] {
    return this.readAll();
  }

  register(name: string, description: string, template: string): void {
    const types = this.readAll();
    const idx = types.findIndex(t => t.name === name);
    if (idx >= 0) {
      types[idx] = { name, description, template };
    } else {
      types.push({ name, description, template });
    }
    this.writeAll(types);
  }

  remove(name: string): void {
    if (BUILT_IN_TYPES.some(t => t.name === name)) {
      throw new Error(`Cannot remove built-in type "${name}"`);
    }
    this.writeAll(this.readAll().filter(t => t.name !== name));
  }
}
