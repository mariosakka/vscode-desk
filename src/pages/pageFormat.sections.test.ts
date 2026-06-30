import { extractStyleFromTemplate, assembleSections } from './pageFormat';

describe('extractStyleFromTemplate', () => {
  it('returns CSS rules from a template with a style block', () => {
    const template = '<desk-page title="T"><style>\n  h1 { color: red; }\n</style>\n<h1>hi</h1>\n</desk-page>';
    expect(extractStyleFromTemplate(template)).toBe('\n  h1 { color: red; }\n');
  });

  it('returns empty string when template has no style block', () => {
    const template = '<desk-page title="T"><h1>hi</h1></desk-page>';
    expect(extractStyleFromTemplate(template)).toBe('');
  });
});

describe('assembleSections', () => {
  it('produces page-intro header with eyebrow and subtitle', () => {
    const html = assembleSections({ title: 'My Page', eyebrow: 'Cat · Sub', subtitle: 'A summary.', sections: [] });
    expect(html).toContain('<section class="page-intro">');
    expect(html).toContain('<div class="eyebrow">Cat · Sub</div>');
    expect(html).toContain('<h1>My Page</h1>');
    expect(html).toContain('<p>A summary.</p>');
    expect(html).toContain('<hr/>');
  });
  it('omits eyebrow div when eyebrow is not provided', () => {
    const html = assembleSections({ title: 'T', sections: [] });
    expect(html).not.toContain('eyebrow');
  });
  it('omits subtitle p when subtitle is not provided', () => {
    const html = assembleSections({ title: 'T', sections: [] });
    expect(html).not.toContain('<p>');
  });
  it('renders sections with explicit id', () => {
    const html = assembleSections({ title: 'T', sections: [{ id: 'custom-id', heading: 'Section A', content: '<p>body</p>' }] });
    expect(html).toContain('id="custom-id"');
    expect(html).toContain('Section A');
    expect(html).toContain('<p>body</p>');
  });
  it('auto-assigns sec-N ids when id is omitted', () => {
    const html = assembleSections({ title: 'T', sections: [{ heading: 'First', content: '<p>1</p>' }, { heading: 'Second', content: '<p>2</p>' }] });
    expect(html).toContain('id="sec-0"');
    expect(html).toContain('id="sec-1"');
  });
  it('renders section icon in h2 when provided', () => {
    const html = assembleSections({ title: 'T', sections: [{ heading: 'S', icon: '🔧', content: '' }] });
    expect(html).toContain('<span class="icon">🔧</span>');
  });
  it('omits icon span when icon is not provided', () => {
    const html = assembleSections({ title: 'T', sections: [{ heading: 'S', content: '' }] });
    expect(html).not.toContain('class="icon"');
  });
});
