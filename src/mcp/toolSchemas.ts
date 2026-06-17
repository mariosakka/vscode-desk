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

export const TOOLS: McpTool[] = [
  {
    name: 'list_tabs',
    description: 'Returns all tabs with their bookmark counts',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_bookmarks',
    description: 'Returns bookmarks; pass tab_id to filter to one tab',
    inputSchema: {
      type: 'object',
      properties: { tab_id: { type: 'string', description: 'Optional tab ID' } },
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
      properties: { tab_id: { type: 'string' }, bookmark_id: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'create_tab',
    description: 'Creates a new empty tab',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_tab',
    description: 'Removes a tab and all its bookmarks',
    inputSchema: {
      type: 'object',
      required: ['tab_id'],
      properties: { tab_id: { type: 'string' } },
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
      },
      additionalProperties: false,
    },
  },
];
