export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    required?: string[];
    properties: Record<string, unknown>;
    additionalProperties: boolean;
  };
}

const SCOPE_PROPERTY = {
  type: 'string',
  enum: ['workspace', 'global'],
  description: 'Data scope. Defaults to "workspace"; use "global" for cross-workspace data.',
  default: 'workspace',
};

export const TOOLS: McpTool[] = [
  {
    name: 'list_bookmarks',
    description: 'Returns all bookmarks in the flat list',
    inputSchema: {
      type: 'object',
      properties: { scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'add_bookmark',
    description: 'Adds a bookmark to the flat list. Icon is auto-fetched from the URL if not provided.',
    inputSchema: {
      type: 'object',
      required: ['title', 'url'],
      properties: {
        title: { type: 'string' },
        url: { type: 'string' },
        icon: { type: 'string', description: 'Emoji or leave blank to auto-fetch favicon' },
        description: { type: 'string' },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_bookmark',
    description: 'Removes a bookmark',
    inputSchema: {
      type: 'object',
      required: ['bookmark_id'],
      properties: { bookmark_id: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'update_bookmark',
    description: 'Updates one or more fields on a bookmark',
    inputSchema: {
      type: 'object',
      required: ['bookmark_id', 'fields'],
      properties: {
        bookmark_id: { type: 'string' },
        fields: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            icon: { type: 'string' },
            description: { type: 'string' },
          },
          additionalProperties: false,
        },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },

  // ── Page tools ────────────────────────────────────────────────────────────
  {
    name: 'list_pages',
    description: 'Returns all .desk page files in the workspace desk-pages/ folder',
    inputSchema: { type: 'object', properties: { scope: SCOPE_PROPERTY }, additionalProperties: false },
  },
  {
    name: 'create_page',
    description: 'Create a new page inside a book. filename must be in "bookSlug/page.desk" format (e.g. "my-book/intro.desk"). Standalone pages are not supported.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'title', 'sections'],
      properties: {
        filename: { type: 'string', description: 'File name in "bookSlug/page.desk" format, e.g. "my-book/intro.desk"' },
        title: { type: 'string' },
        eyebrow: { type: 'string', description: 'Small label above the title, e.g. "Reference · Backend"' },
        subtitle: { type: 'string', description: 'One-sentence summary shown below the title' },
        chapter: { type: 'number', description: 'Chapter index (0-based) — required when filename contains a book slug prefix' },
        sections: {
          type: 'array',
          description: 'Content sections. Each section becomes an <h2> + body block.',
          items: {
            type: 'object',
            required: ['heading', 'content'],
            properties: {
              id: { type: 'string', description: 'Anchor id for scroll-to links, e.g. "sec-0". Auto-assigned if omitted.' },
              heading: { type: 'string', description: 'Section heading text (plain text, no HTML)' },
              icon: { type: 'string', description: 'Single emoji shown before the heading, e.g. "🔧"' },
              content: { type: 'string', description: 'Inner HTML for this section. No <style> tags.' },
            },
            additionalProperties: false,
          },
        },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_page',
    description: 'Updates an existing .desk page. Providing sections rebuilds the entire body from the template; omitting sections keeps the existing body. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      required: ['filename'],
      properties: {
        filename: { type: 'string' },
        title: { type: 'string' },
        eyebrow: { type: 'string' },
        subtitle: { type: 'string' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['heading', 'content'],
            properties: {
              id: { type: 'string' },
              heading: { type: 'string' },
              icon: { type: 'string' },
              content: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'delete_page',
    description: 'Deletes a .desk page file from the workspace',
    inputSchema: {
      type: 'object',
      required: ['filename'],
      properties: { filename: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },

  // ── Workflow tools ────────────────────────────────────────────────────────
  {
    name: 'get_workflow_config',
    description: 'Returns the current team workflow config (Slack channels, GitHub org, language, PR account). Returns -32603 error if no config has been saved yet.',
    inputSchema: { type: 'object', properties: { scope: SCOPE_PROPERTY }, additionalProperties: false },
  },
  {
    name: 'submit_workflow_config',
    description: 'Submits a partial WorkflowConfig for user review. Non-blocking — returns { status: "submitted" } immediately; the user confirms in VS Code before anything is persisted.',
    inputSchema: {
      type: 'object',
      required: ['config'],
      properties: {
        config: {
          type: 'object',
          properties: {
            communication: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  channel: { type: 'string' },
                },
                required: ['label', 'channel'],
              },
              description: 'Communication channels with user-defined labels',
            },
            general: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                },
                required: ['label', 'value'],
              },
              description: 'General key-value settings with user-defined labels',
            },
          },
          additionalProperties: false,
        },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_skills',
    description: 'Returns all stored workflow skills without their content bodies.',
    inputSchema: { type: 'object', properties: { scope: SCOPE_PROPERTY }, additionalProperties: false },
  },
  {
    name: 'get_skill',
    description: 'Returns the full markdown content of a stored skill by name.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'add_skill',
    description: 'Submits a workflow skill for user review. Content must include YAML frontmatter with name (kebab-case) and description. Non-blocking — returns { status: "submitted" } immediately.',
    inputSchema: {
      type: 'object',
      required: ['name', 'content'],
      properties: {
        name: { type: 'string', description: 'Kebab-case skill name, e.g. "dev-flow"' },
        content: { type: 'string', description: 'Full skill markdown with YAML frontmatter' },
        description: { type: 'string', description: 'Optional override for the frontmatter description' },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_skill',
    description: 'Removes a stored skill and uninstalls it from all agent paths. Returns -32603 if not found.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },

  // ── Page template tools ───────────────────────────────────────────────────
  {
    name: 'get_page_template',
    description: 'Returns the global page template content (shared style/structure agents apply to all new pages). Returns -32603 if not set.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'set_page_template',
    description: 'Saves the global page template. Always global — no scope. Call get_page_template first on session start to check if one already exists.',
    inputSchema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', description: '<style> block and/or HTML skeleton that agents copy when creating new pages' },
      },
      additionalProperties: false,
    },
  },

  // ── Library tools ────────────────────────────────────────────────────────
  {
    name: 'list_libraries',
    description: 'Returns the curated list of page libraries (highlight.js, tocbot, etc.) with install status. Libraries are global only — their JS/CSS is auto-injected into every page viewer.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'add_library',
    description: 'Adds or replaces a page library entry. After adding, the user must sync (install) libraries to download the files.',
    inputSchema: {
      type: 'object',
      required: ['name', 'files'],
      properties: {
        name: { type: 'string', description: 'Unique library identifier, e.g. "highlight"' },
        description: { type: 'string', description: 'One-line description of what the library provides' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            required: ['url', 'type'],
            properties: {
              url: { type: 'string', description: 'Public CDN URL to download the file from' },
              type: { type: 'string', enum: ['script', 'style'], description: 'script = JS file, style = CSS file' },
            },
            additionalProperties: false,
          },
          description: 'Files to download for this library',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_library',
    description: 'Removes a library from the config and deletes its cached files. Returns -32603 if not found.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    },
  },

  // ── Section CRUD ──────────────────────────────────────────────────────────
  {
    name: 'list_sections',
    description: 'Lists all sections in a page, returning id and heading for each',
    inputSchema: {
      type: 'object', required: ['filename'],
      properties: { filename: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'add_section',
    description: 'Appends a new section to a page. Provide raw content HTML or a type+data pair.',
    inputSchema: {
      type: 'object', required: ['filename', 'heading'],
      properties: {
        filename: { type: 'string' },
        heading: { type: 'string' },
        content: { type: 'string' },
        id: { type: 'string' },
        icon: { type: 'string' },
        type: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_section',
    description: 'Updates heading, icon, or content of an existing section',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id'],
      properties: {
        filename: { type: 'string' },
        section_id: { type: 'string' },
        heading: { type: 'string' },
        icon: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_section',
    description: 'Removes a section from a page by id',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id'],
      properties: { filename: { type: 'string' }, section_id: { type: 'string' } },
      additionalProperties: false,
    },
  },

  // ── List CRUD ─────────────────────────────────────────────────────────────
  {
    name: 'list_items',
    description: 'Returns the list items in the first ul/ol inside a section',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id'],
      properties: { filename: { type: 'string' }, section_id: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'add_list_item',
    description: 'Appends a list item to the first list in a section. Creates the list if absent.',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id', 'text'],
      properties: {
        filename: { type: 'string' }, section_id: { type: 'string' },
        text: { type: 'string' },
        list_type: { type: 'string', enum: ['ul', 'ol'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_list_item',
    description: 'Removes the list item at the given 1-based index',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id', 'index'],
      properties: { filename: { type: 'string' }, section_id: { type: 'string' }, index: { type: 'number' } },
      additionalProperties: false,
    },
  },
  {
    name: 'update_list_item',
    description: 'Replaces the text of a list item at the given 1-based index',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id', 'index', 'text'],
      properties: {
        filename: { type: 'string' }, section_id: { type: 'string' },
        index: { type: 'number' }, text: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'set_list_type',
    description: 'Swaps the list tag (ul/ol) without changing items',
    inputSchema: {
      type: 'object', required: ['filename', 'section_id', 'type'],
      properties: {
        filename: { type: 'string' }, section_id: { type: 'string' },
        type: { type: 'string', enum: ['ul', 'ol'] },
      },
      additionalProperties: false,
    },
  },

  // ── Section type registry ─────────────────────────────────────────────────
  {
    name: 'list_section_types',
    description: 'Returns all available section types (built-in and custom)',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'register_section_type',
    description: 'Creates or replaces a custom section type with a Mustache-style template',
    inputSchema: {
      type: 'object', required: ['name', 'description', 'template'],
      properties: { name: { type: 'string' }, description: { type: 'string' }, template: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_section_type',
    description: 'Removes a custom section type (built-in types cannot be removed)',
    inputSchema: {
      type: 'object', required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    },
  },

  // ── Book tools ────────────────────────────────────────────────────────────
  {
    name: 'create_book',
    description: 'Creates a book folder and empty manifest in the workspace. Returns the slug.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_books',
    description: 'Returns all books with slug, title, and page count',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_book',
    description: 'Returns the full chapter/page tree for a book',
    inputSchema: {
      type: 'object',
      required: ['slug'],
      properties: { slug: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'delete_book',
    description: 'Deletes a book folder, its manifest, and all its page files',
    inputSchema: {
      type: 'object',
      required: ['slug'],
      properties: { slug: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'add_chapter',
    description: 'Adds a chapter to a book. Appends at end unless position is specified.',
    inputSchema: {
      type: 'object',
      required: ['slug', 'title'],
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        position: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'rename_chapter',
    description: 'Renames a chapter in a book',
    inputSchema: {
      type: 'object',
      required: ['slug', 'chapter_index', 'title'],
      properties: {
        slug: { type: 'string' },
        chapter_index: { type: 'number' },
        title: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_chapter',
    description: 'Removes a chapter and deletes its page files from disk',
    inputSchema: {
      type: 'object',
      required: ['slug', 'chapter_index'],
      properties: {
        slug: { type: 'string' },
        chapter_index: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'move_page',
    description: 'Moves a page to a different chapter or position within a book',
    inputSchema: {
      type: 'object',
      required: ['slug', 'filename', 'to_chapter'],
      properties: {
        slug: { type: 'string' },
        filename: { type: 'string' },
        to_chapter: { type: 'number' },
        position: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_workspace_context',
    description: 'Returns the VS Code workspace name, root folder path, and pages directory this MCP server instance is attached to. Call at session start to verify you are operating on the correct project before any write operations.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

];
