import { renderSectionType, BUILT_IN_TYPES, CustomSectionType } from './sectionTypes';

const NO_CUSTOM: CustomSectionType[] = [];

describe('built-in renderers', () => {
  it('steps renders numbered divs', () => {
    const html = renderSectionType('steps', { items: [{ label: 'Do A', body: 'first step' }] }, NO_CUSTOM);
    expect(html).toContain('class="steps"');
    expect(html).toContain('step-num">1');
    expect(html).toContain('Do A');
  });

  it('cards renders card-grid', () => {
    const html = renderSectionType('cards', { items: [{ title: 'Card', description: 'Desc' }] }, NO_CUSTOM);
    expect(html).toContain('class="card-grid"');
    expect(html).toContain('<h4>Card</h4>');
  });

  it('compare renders compare-grid with labels', () => {
    const html = renderSectionType('compare', {
      left: { label: 'Before', content: '<p>old</p>' },
      right: { label: 'After', content: '<p>new</p>' },
    }, NO_CUSTOM);
    expect(html).toContain('compare-grid');
    expect(html).toContain('Before');
    expect(html).toContain('After');
  });

  it('callout renders with variant class', () => {
    const html = renderSectionType('callout', { body: 'Watch out', variant: 'warning', title: 'Note' }, NO_CUSTOM);
    expect(html).toContain('callout-warning');
    expect(html).toContain('<strong>Note</strong>');
    expect(html).toContain('Watch out');
  });

  it('callout renders without variant when not provided', () => {
    const html = renderSectionType('callout', { body: 'Info text' }, NO_CUSTOM);
    expect(html).toContain('class="callout"');
    expect(html).not.toContain('callout-');
  });

  it('lead renders lead div', () => {
    const html = renderSectionType('lead', { body: 'Summary here' }, NO_CUSTOM);
    expect(html).toContain('class="lead"');
    expect(html).toContain('Summary here');
  });

  it('flow renders flow-blocks', () => {
    const html = renderSectionType('flow', { items: [{ label: 'A → B', body: 'Connection' }] }, NO_CUSTOM);
    expect(html).toContain('flow-block');
    expect(html).toContain('A → B');
  });

  it('table renders table with headers and rows', () => {
    const html = renderSectionType('table', {
      headers: ['Col A', 'Col B'],
      rows: [['R1A', 'R1B']],
    }, NO_CUSTOM);
    expect(html).toContain('<th>Col A</th>');
    expect(html).toContain('<td>R1A</td>');
  });

  it('code renders pre/code block', () => {
    const html = renderSectionType('code', { code: 'const x = 1;', language: 'typescript' }, NO_CUSTOM);
    expect(html).toContain('language-typescript');
    expect(html).toContain('const x = 1;');
  });

  it('list renders ul by default', () => {
    const html = renderSectionType('list', { items: ['Alpha', 'Beta'] }, NO_CUSTOM);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Alpha</li>');
  });

  it('list renders ol when type is ol', () => {
    const html = renderSectionType('list', { items: ['One'], type: 'ol' }, NO_CUSTOM);
    expect(html).toContain('<ol>');
  });
});

describe('renderSectionType unknown name', () => {
  it('throws for unknown built-in with no custom match', () => {
    expect(() => renderSectionType('does-not-exist', {}, NO_CUSTOM)).toThrow('Unknown section type: "does-not-exist"');
  });
});

describe('custom type template', () => {
  it('renders scalar substitution', () => {
    const custom: CustomSectionType[] = [{ name: 'hero', description: '', template: '<h1>{{title}}</h1>' }];
    expect(renderSectionType('hero', { title: 'Hello' }, custom)).toBe('<h1>Hello</h1>');
  });

  it('renders array iteration with {{item}}', () => {
    const custom: CustomSectionType[] = [{
      name: 'chips',
      description: '',
      template: '<div>{{#tags}}<span>{{item}}</span>{{/tags}}</div>',
    }];
    const html = renderSectionType('chips', { tags: ['a', 'b'] }, custom);
    expect(html).toBe('<div><span>a</span><span>b</span></div>');
  });

  it('custom type overrides built-in with same name', () => {
    const custom: CustomSectionType[] = [{ name: 'lead', description: '', template: '<div class="custom">{{body}}</div>' }];
    const html = renderSectionType('lead', { body: 'Hi' }, custom);
    expect(html).toContain('class="custom"');
  });
});
