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
    name: 'list_tabs',
    description: 'Returns all tabs with their bookmark counts',
    inputSchema: { type: 'object', properties: { scope: SCOPE_PROPERTY }, additionalProperties: false },
  },
  {
    name: 'list_bookmarks',
    description: 'Returns bookmarks; pass tab_id to filter to one tab',
    inputSchema: {
      type: 'object',
      properties: { tab_id: { type: 'string', description: 'Optional tab ID' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'add_bookmark',
    description: 'Adds a bookmark to a tab. Icon is auto-fetched from the URL if not provided.',
    inputSchema: {
      type: 'object',
      required: ['tab_id', 'title', 'url'],
      properties: {
        tab_id: { type: 'string' },
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
    description: 'Removes a bookmark from a tab',
    inputSchema: {
      type: 'object',
      required: ['tab_id', 'bookmark_id'],
      properties: { tab_id: { type: 'string' }, bookmark_id: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'create_tab',
    description: 'Creates a new empty tab',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_tab',
    description: 'Removes a tab and all its bookmarks',
    inputSchema: {
      type: 'object',
      required: ['tab_id'],
      properties: { tab_id: { type: 'string' }, scope: SCOPE_PROPERTY },
      additionalProperties: false,
    },
  },
  {
    name: 'update_bookmark',
    description: 'Updates one or more fields on a bookmark',
    inputSchema: {
      type: 'object',
      required: ['tab_id', 'bookmark_id', 'fields'],
      properties: {
        tab_id: { type: 'string' },
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
    description: 'Returns all .astrolabe page files in the workspace astrolabe-pages/ folder',
    inputSchema: { type: 'object', properties: { scope: SCOPE_PROPERTY }, additionalProperties: false },
  },
  {
    name: 'create_page',
    description: 'Creates a new .astrolabe page file. content is the HTML body; customStyles is optional CSS injected only for this page.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'title', 'content'],
      properties: {
        filename: { type: 'string', description: 'File name including .astrolabe extension, e.g. "auth-flow.astrolabe"' },
        title: { type: 'string' },
        content: { type: 'string', description: 'HTML body content (no <script> tags)' },
        customStyles: { type: 'string', description: 'Optional CSS rules scoped to this page' },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_page',
    description: 'Overwrites fields on an existing .astrolabe page. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      required: ['filename'],
      properties: {
        filename: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        customStyles: { type: 'string' },
        scope: SCOPE_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  {
    name: 'delete_page',
    description: 'Deletes a .astrolabe page file from the workspace',
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
];
