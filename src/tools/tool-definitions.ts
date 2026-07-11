import type { Tool } from 'openai/resources/responses/responses';

export const TOOL_DEFINITIONS: Tool[] = [
  {
    type: 'function',
    name: 'get_current_time',
    description:
      'Get the current date and time. If a timeZone is provided, also return local time for that time zone. Always return UTC time.',
    parameters: {
      type: 'object',
      properties: {
        timeZone: {
          type: ['string', 'null'],
          description:
            'Optional IANA time zone name, for example Europe/Berlin, Europe/Amsterdam, America/Santiago',
        },
      },
      required: ['timeZone'],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: 'function',
    name: 'get_chat_memories',
    description:
      'Retrieve long-term memories associated with the current chat. Use this whenever you think previous knowledge about the people in this chat could be useful. This includes answering questions, understanding context, recalling user preferences, recognizing ongoing projects, or refreshing your memory after a long or unrelated conversation.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
];
