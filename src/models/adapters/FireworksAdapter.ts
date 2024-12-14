import { Message, Tool } from '../../types/agentSystem';
import { ModelAdapter, ProcessedResponse, FunctionCall } from './ModelAdapter';

export class FireworksAdapter extends ModelAdapter {
  public buildParams(
    messages: Message[],
    tools: Tool[],
    toolChoice?: any,
    systemPrompt?: string,
    outputSchema?: any
  ): any {
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content || ''
    }));

    const params: any = {
      model: this.modelName,
      messages: formattedMessages
    };

    if (tools && tools.length > 0) {
      params.tools = tools.map(t => ({
        type: "function",
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters
        }
      }));
    }

    if (toolChoice) {
      params.tool_choice = toolChoice;
    }

    if (outputSchema) {
      // Fireworks does not accept strict, so do nothing special
    }

    return params;
  }

  public formatTools(tools: Tool[]): any[] {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }
    }));
  }

  public buildToolChoice(tools: Tool[]): any {
    return "auto";
  }

  public processResponse(response: any): ProcessedResponse {
    const choice = response.choices && response.choices[0];
    if (!choice) {
      return { functionCalls: [] };
    }

    const message = choice.message || {};
    const aiMessage = message.role === 'assistant' && message.content ? {
      role: 'assistant',
      content: message.content
    } : undefined;

    let functionCalls: FunctionCall[] = [];

    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      functionCalls = message.tool_calls.map((tc: any) => ({
        functionName: tc.function.name,
        functionArgs: JSON.parse(tc.function.arguments)
      }));
    } else if (message.function_call) {
      functionCalls.push({
        functionName: message.function_call.name,
        functionArgs: JSON.parse(message.function_call.arguments)
      });
    }

    return { aiMessage, functionCalls };
  }
}