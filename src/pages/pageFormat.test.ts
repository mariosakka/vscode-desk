import {
  parseSections, getSectionHtml, replaceSectionHtml, removeSection,
  insertSection, parseListItems, rebuildList, assembleSections,
} from './pageFormat';

const HTML_TWO_SECTIONS = assembleSections({
  title: 'Test',
  sections: [
    { id: 'sec-a', heading: 'Alpha', content: '<p>First</p>' },
    { id: 'sec-b', heading: 'Beta', content: '<ul><li>Item one</li><li>Item two</li></ul>' },
  ],
});

describe('parseSections', () => {
  it('returns metadata for every section', () => {
    const sections = parseSections(HTML_TWO_SECTIONS);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({ id: 'sec-a', heading: 'Alpha' });
    expect(sections[1]).toEqual({ id: 'sec-b', heading: 'Beta' });
  });

  it('returns empty array when body has no sections', () => {
    expect(parseSections('<p>plain</p>')).toEqual([]);
  });
});

describe('getSectionHtml', () => {
  it('returns the full section div including content', () => {
    const html = getSectionHtml(HTML_TWO_SECTIONS, 'sec-a');
    expect(html).toContain('id="sec-a"');
    expect(html).toContain('<p>First</p>');
  });

  it('throws with clear message for missing id', () => {
    expect(() => getSectionHtml(HTML_TWO_SECTIONS, 'missing')).toThrow('section "missing" not found');
  });
});

describe('replaceSectionHtml', () => {
  it('replaces only the targeted section leaving sibling intact', () => {
    const newSection = '<div class="section" id="sec-a"><h2 class="section-title">Alpha</h2><p>Updated</p></div>';
    const result = replaceSectionHtml(HTML_TWO_SECTIONS, 'sec-a', newSection);
    expect(result).toContain('<p>Updated</p>');
    expect(result).toContain('id="sec-b"');
    expect(result).not.toContain('<p>First</p>');
  });

  it('throws for missing id', () => {
    expect(() => replaceSectionHtml(HTML_TWO_SECTIONS, 'nope', '')).toThrow('section "nope" not found');
  });
});

describe('removeSection', () => {
  it('removes the section and leaves the sibling', () => {
    const result = removeSection(HTML_TWO_SECTIONS, 'sec-a');
    expect(result).not.toContain('id="sec-a"');
    expect(result).toContain('id="sec-b"');
  });

  it('throws for missing id', () => {
    expect(() => removeSection(HTML_TWO_SECTIONS, 'nope')).toThrow();
  });
});

describe('insertSection', () => {
  it('appends section before </main>', () => {
    const newSection = '<div class="section" id="sec-c"><h2 class="section-title">Gamma</h2></div>';
    const result = insertSection(HTML_TWO_SECTIONS, newSection);
    expect(result.indexOf('sec-c')).toBeGreaterThan(result.indexOf('sec-b'));
    expect(result).toContain('</main>');
  });

  it('appends to end when no </main> tag present', () => {
    const result = insertSection('<p>no main</p>', '<div id="s"></div>');
    expect(result).toContain('<div id="s"></div>');
  });
});

describe('parseListItems', () => {
  it('extracts ul items from section html', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-b');
    const result = parseListItems(sectionHtml);
    expect(result.type).toBe('ul');
    expect(result.items).toEqual(['Item one', 'Item two']);
  });

  it('returns null type and empty items when no list exists', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-a');
    expect(parseListItems(sectionHtml)).toEqual({ type: null, items: [] });
  });
});

describe('rebuildList', () => {
  it('replaces existing list with new items', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-b');
    const result = rebuildList(sectionHtml, 'ol', ['First', 'Second', 'Third']);
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>First</li>');
    expect(result).not.toContain('<ul>');
  });

  it('inserts a new list when no list exists', () => {
    const sectionHtml = getSectionHtml(HTML_TWO_SECTIONS, 'sec-a');
    const result = rebuildList(sectionHtml, 'ul', ['Added']);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Added</li>');
  });
});
