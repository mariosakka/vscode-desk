export interface CustomSectionType {
  name: string;
  description: string;
  template: string;
}

interface BuiltInType {
  name: string;
  description: string;
  render(data: unknown): string;
}

export const BUILT_IN_TYPES: BuiltInType[] = [
  {
    name: 'steps',
    description: 'Numbered step flow. data: { items: { label: string, body: string }[] }',
    render(data: any): string {
      return [
        '<div class="steps">',
        ...data.items.map((item: any, i: number) =>
          `  <div class="step"><div class="step-num">${i + 1}</div><div class="step-body"><strong>${item.label}</strong> — ${item.body}</div></div>`
        ),
        '</div>',
      ].join('\n');
    },
  },
  {
    name: 'cards',
    description: 'Card grid. data: { items: { title: string, description: string }[] }',
    render(data: any): string {
      return [
        '<div class="card-grid">',
        ...data.items.map((c: any) => `  <div class="card"><h4>${c.title}</h4><p>${c.description}</p></div>`),
        '</div>',
      ].join('\n');
    },
  },
  {
    name: 'compare',
    description: 'Side-by-side compare. data: { left: { label, content }, right: { label, content } }',
    render(data: any): string {
      return [
        '<div class="compare-grid">',
        `  <div class="compare-col"><div class="compare-label">${data.left.label}</div>${data.left.content}</div>`,
        `  <div class="compare-col"><div class="compare-label">${data.right.label}</div>${data.right.content}</div>`,
        '</div>',
      ].join('\n');
    },
  },
  {
    name: 'callout',
    description: 'Callout box. data: { body: string, variant?: "info"|"warning"|"tip"|"danger", title?: string }',
    render(data: any): string {
      const v = data.variant ? ` callout-${data.variant}` : '';
      const t = data.title ? `<strong>${data.title}</strong> ` : '';
      return `<div class="callout${v}">${t}${data.body}</div>`;
    },
  },
  {
    name: 'lead',
    description: 'Section lead box. data: { body: string }',
    render(data: any): string {
      return `<div class="lead">${data.body}</div>`;
    },
  },
  {
    name: 'flow',
    description: 'Flow block sequence. data: { items: { label: string, body: string }[] }',
    render(data: any): string {
      return data.items.map((item: any) =>
        `<div class="flow-block">\n  <div class="flow-label">${item.label}</div>\n  <p>${item.body}</p>\n</div>`
      ).join('\n');
    },
  },
  {
    name: 'table',
    description: 'Formatted table. data: { headers: string[], rows: string[][] }',
    render(data: any): string {
      return [
        '<table>',
        '  <thead><tr>' + data.headers.map((h: string) => `<th>${h}</th>`).join('') + '</tr></thead>',
        '  <tbody>',
        ...data.rows.map((row: string[]) => '    <tr>' + row.map((c: string) => `<td>${c}</td>`).join('') + '</tr>'),
        '  </tbody>',
        '</table>',
      ].join('\n');
    },
  },
  {
    name: 'code',
    description: 'Code block. data: { code: string, language?: string }',
    render(data: any): string {
      const cls = data.language ? ` class="language-${data.language}"` : '';
      return `<pre><code${cls}>${data.code}</code></pre>`;
    },
  },
  {
    name: 'list',
    description: 'Unordered or ordered list. data: { items: string[], type?: "ul"|"ol" }',
    render(data: any): string {
      const tag = data.type ?? 'ul';
      return `<${tag}>\n${data.items.map((i: string) => `  <li>${i}</li>`).join('\n')}\n</${tag}>`;
    },
  },
];

export function renderSectionType(name: string, data: unknown, customTypes: CustomSectionType[]): string {
  const custom = customTypes.find(t => t.name === name);
  if (custom) return renderTemplate(custom.template, data);
  const builtin = BUILT_IN_TYPES.find(t => t.name === name);
  if (!builtin) throw new Error(`Unknown section type: "${name}"`);
  return builtin.render(data);
}

function renderTemplate(template: string, data: unknown): string {
  const d = data as Record<string, unknown>;
  let result = template;
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key, body) => {
    const arr = Array.isArray(d[key]) ? (d[key] as unknown[]) : [];
    return arr.map(item => body.replace(/\{\{item\}\}/g, String(item))).join('');
  });
  result = result.replace(/\{\{(\w+)\}\}/g, (_m, key) => String(d[key] ?? ''));
  return result;
}
