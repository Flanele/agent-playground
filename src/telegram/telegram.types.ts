import { AgentResult } from "src/agent/agent.types";

export type ImageInput = {
  dataUrl: string;
};

export type TelegramAgentResult = Extract<
  AgentResult,
  { source: 'telegram' }
>;