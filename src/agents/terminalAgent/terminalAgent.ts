// src/ai/agents/TerminalAgent/terminalAgent.ts
import { BaseAgent } from '../baseAgent';
import { terminalAgentConfig } from './terminalAgentConfig';
import { ModelClient, Message } from '../../types/agentSystem';
import { z } from 'zod';

// Main schema for the agent output
export const terminalOutputSchema = z.object({
  internal_thought: z.string().describe("Your internal reasoning process about the next commands to run."),
  plan: z.string().describe("A short plan of what to do next."),
  terminal_commands: z.string().describe("The full terminal command to execute, including all arguments and options."),
}).describe("Structured output containing the agent's internal thought process, next plan, and a list of terminal commands.");

export class TerminalAgent extends BaseAgent<typeof terminalOutputSchema> {
  constructor(modelClient: ModelClient) {
    super(terminalAgentConfig, modelClient, terminalOutputSchema);
  }

  protected defineTools(): void {
    // No tools - we rely solely on structured output
  }
}