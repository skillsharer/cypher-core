import { Tool, Message } from "../../types/agentSystem";
import { ZodTypeAny } from 'zod';

export interface ModelAdapter {
  supportsImages?: boolean;

  buildToolChoice(tools: Tool[]): any;

  formatTools(tools: Tool[]): any[];

  /**
   * Build parameters for the model's chat completion method.
   * If outputSchema is provided, we must include a response_format block (depending on model).
   */
  buildParams(
    messageHistory: Message[],
    formattedTools: any[],
    toolChoice: any,
    systemPrompt: string,
    outputSchema?: ZodTypeAny
  ): any;

  processResponse(response: any): { aiMessage: any; functionCall?: any };
}