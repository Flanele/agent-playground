import { MemoryDecision } from '../agent.types';

export function parseMemoryDecision(raw: string): MemoryDecision {
  try {
    const parsed = JSON.parse(raw) as Partial<MemoryDecision>;

    if (!Array.isArray(parsed.memories)) {
      return { memories: [] };
    }

    return {
      memories: parsed.memories.filter(
        (memory): memory is string =>
          typeof memory === 'string' && memory.trim().length > 0,
      ),
    };
  } catch {
    return { memories: [] };
  }
}
