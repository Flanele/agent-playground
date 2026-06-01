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
];
