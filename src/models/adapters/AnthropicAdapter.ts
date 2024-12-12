import { ModelAdapter } from './ModelAdapter';
import { Message, Tool } from '../../types/agentSystem';
import { ZodTypeAny } from 'zod';

export class AnthropicAdapter implements ModelAdapter {
  supportsImages = true;

  buildToolChoice(tools: Tool[]): any {
    if (tools.length > 0) {
      return {
        type: 'tool',
        name: tools[0].function.name,
      };
    }
    return undefined;
  }

  formatTools(tools: Tool[]): any[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  buildParams(
    messageHistory: Message[],
    formattedTools: any[],
    toolChoice: any,
    systemPrompt: string,
    outputSchema?: ZodTypeAny
  ): any {
    const nonSystemMessages = messageHistory.filter((msg) => msg.role !== 'system');
    
    if (nonSystemMessages.length === 0) {
      nonSystemMessages.push({
        role: 'user',
        content: 'AGENT INITIALIZED',
      });
    }

    const params: any = {
      system: systemPrompt,
      messages: nonSystemMessages.map((msg) => {
        const content: any[] = [];

        if (msg.image) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: msg.image.mime,
              data: msg.image.data.toString('base64')
            }
          });
        }

        if (msg.content) {
          content.push({
            type: "text",
            text: msg.content
          });
        }

        if (content.length === 0) {
          content.push({
            type: "text",
            text: " "
          });
        }

        return {
          role: msg.role,
          content,
          name: msg.name,
        };
      }),
    };

    if (outputSchema) {
      // Anthropic doesn't have a direct JSON Schema param yet (hypothetical scenario).
      // We'll just instruct via the system prompt and rely on correct formatting.
      // No separate response_format param exposed for Anthropic currently.
      // If in future: params.response_format = { ...schema ... }
    } else if (formattedTools.length > 0) {
      params.tools = formattedTools;
      if (toolChoice) {
        params.tool_choice = toolChoice;
      }
    }

    return params;
  }

  processResponse(response: any): { aiMessage: any; functionCall?: any } {
    const messageText = response.content?.[0]?.text || '';
    const normalizedMessage = {
      role: 'assistant',
      content: messageText
    };

    if (response.content?.[0]?.type === 'tool_use') {
      const toolCall = response.content[0];
      return {
        aiMessage: normalizedMessage,
        functionCall: {
          functionName: toolCall.name,
          functionArgs: toolCall.input,
        },
      };
    }

    return { aiMessage: normalizedMessage };
  }
}