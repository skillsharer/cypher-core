import { ModelAdapter } from './ModelAdapter';
import { Message, Tool } from '../../types/agentSystem';
import { ZodTypeAny } from 'zod';

export class FireworksAdapter implements ModelAdapter {
  supportsImages = false;

  buildToolChoice(tools: Tool[]): any {
    if (tools.length > 0) {
      return {
        type: 'function',
        function: { name: tools[0].function.name },
      };
    }
    return undefined;
  }

  formatTools(tools: Tool[]): any[] {
    return tools.map((tool) => {
      const { strict, ...functionWithoutStrict } = tool.function;
      return {
        ...tool,
        function: functionWithoutStrict,
      };
    });
  }

  buildParams(
    messageHistory: Message[],
    formattedTools: any[],
    toolChoice: any,
    systemPrompt: string,
    outputSchema?: ZodTypeAny
  ): any {
    const filteredMessages = messageHistory.filter(msg => !msg.image);
    
    const updatedMessageHistory = filteredMessages.map(msg =>
      msg.role === 'system'
        ? { ...msg, content: systemPrompt }
        : msg
    );

    const params: any = {
      messages: updatedMessageHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
      })),
    };

    if (outputSchema) {
      // For Fireworks structured outputs, we can also provide a response_format schema
      // We'll assume simple json_object mode:
      params.response_format = { type: "json_object" };
    } else if (formattedTools.length > 0) {
      params.tools = formattedTools;
      if (toolChoice) {
        params.tool_choice = toolChoice;
      }
    }

    return params;
  }

  processResponse(response: any): { aiMessage: any; functionCall?: any } {
    const aiMessage = response.choices[0]?.message;
    if (aiMessage?.tool_calls?.[0]) {
      const toolCall = aiMessage.tool_calls[0];
      return {
        aiMessage,
        functionCall: {
          functionName: toolCall.function.name,
          functionArgs: JSON.parse(toolCall.function.arguments),
        },
      };
    }
    return { aiMessage };
  }
}