import { Message, Tool } from '../../types/agentSystem';
import { ModelAdapter, ProcessedResponse, FunctionCall } from './ModelAdapter';

export class OpenAIAdapter extends ModelAdapter {
  public buildParams(
    messages: Message[],
    tools: Tool[],
    toolChoice?: any,
    systemPrompt?: string,
    outputSchema?: any
  ): any {
    const formattedMessages = messages.map(m => {
      return { role: m.role, content: m.content || '' };
    });

    const params: any = {
      model: this.modelName,
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0
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

    if (outputSchema && params.tools) {
      // Strict can be turned on for structured outputs
      params.tools.forEach((tool: any) => {
        tool.function.strict = true;
      });
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