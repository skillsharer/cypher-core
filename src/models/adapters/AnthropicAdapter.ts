import { Message, Tool } from '../../types/agentSystem';
import { ModelAdapter, ProcessedResponse, FunctionCall } from './ModelAdapter';
import { Logger } from '../../utils/logger';

export class AnthropicAdapter extends ModelAdapter {
  public buildParams(
    messages: Message[],
    tools: Tool[],
    toolChoice?: any,
    systemPrompt?: string,
    outputSchema?: any
  ): any {
    let systemMsg = '';
    let nonSystemMessages = messages.filter(m => m.role !== 'system');
    const finalMessages = nonSystemMessages.map(m => {
      let role = m.role;
      if (role === 'system') role = 'user';

      const contentArr = m.content ? [{type:"text",text:m.content}] : [];
      return { role, content: contentArr };
    });

    // If there are no messages after filtering, Anthropic requires at least one.
    // Add a dummy user message if needed.
    if (finalMessages.length === 0) {
      finalMessages.push({
        role: 'user',
        content: [{ type: 'text', text: '.' }]
      });
    }

    if (systemPrompt) {
      systemMsg = systemPrompt;
    }

    const params: any = {
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0,
      system: systemMsg,
      messages: finalMessages
    };

    let hasTools = false;
    if (tools && tools.length > 0) {
      params.tools = tools;
      hasTools = true;
    }

    if (hasTools) {
      if (toolChoice) {
        if (typeof toolChoice === 'string') {
          params.tool_choice = { type: toolChoice };
        } else {
          params.tool_choice = toolChoice;
        }
      } else {
        params.tool_choice = { type: "auto" };
      }
    }

    return params;
  }

  public formatTools(tools: Tool[]): any[] {
    const processed = tools.map(tool => {
      if (!tool.function || !tool.function.name || !tool.function.parameters || !tool.function.description) {
        Logger.error('[AnthropicAdapter] Tool missing function fields in formatTools:', tool);
        return null;
      }
      return {
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      };
    }).filter(Boolean);
    return processed;
  }

  public buildToolChoice(tools: Tool[]): any {
    if (tools && tools.length > 0) {
      return { type: "auto" };
    }
    return undefined;
  }

  public processResponse(response: any): ProcessedResponse {
    if (!response || response.type !== 'message') {
      Logger.error('[AnthropicAdapter] Invalid response format:', response);
      return { functionCalls: [] };
    }

    const message = response;
    const contentBlocks = Array.isArray(message.content) ? message.content : [];

    const toolBlocks = contentBlocks.filter((c: any) => c.type === 'tool_use');
    const functionCalls: FunctionCall[] = toolBlocks.map((tb: any) => ({
      functionName: tb.name,
      functionArgs: tb.input || {}
    }));

    const textBlocks = contentBlocks
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');

    let aiMessage;
    if (textBlocks && message.role === 'assistant') {
      aiMessage = { role: 'assistant', content: textBlocks };
    }

    return { aiMessage, functionCalls };
  }
}