import { Message, Tool } from '../../types/agentSystem';

export interface ToolSchema {
  name: string;
  description: string;
  parameters: any; // Renamed from input_schema to parameters
}

export interface FunctionCall {
  functionName: string;
  functionArgs: Record<string, any>;
}

export interface ProcessedResponse {
  aiMessage?: {
    role: string;
    content: string;
  };
  functionCalls: FunctionCall[];
}

export abstract class ModelAdapter {
  public supportsImages: boolean = false;
  protected modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  abstract buildParams(
    messages: Message[],
    tools: Tool[],
    toolChoice?: any,
    systemPrompt?: string,
    outputSchema?: any
  ): any;

  abstract formatTools(tools: Tool[]): any[];

  abstract buildToolChoice(tools: Tool[]): any;

  abstract processResponse(response: any): ProcessedResponse;
}