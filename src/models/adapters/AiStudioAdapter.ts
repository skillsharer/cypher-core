import { Message, Tool } from '../../types/agentSystem';
import { ModelAdapter, ProcessedResponse, FunctionCall } from './ModelAdapter';
import { Logger } from '../../utils/logger';

export class AiStudioAdapter extends ModelAdapter {
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
    // Todo: Implement function calls
    if (!response || !response.response.candidates || response.response.candidates.length === 0) {
        Logger.error('[AiStudioAdapter] Got no response from model.');
        return { functionCalls: [] };
    }
    Logger.debug('[AiStudioAdapter] Processing response:', response);
    const candidate = response.response.candidates[0];
    const contentParts = candidate.content?.parts[0].text || [];
    const contentAfterMarker = contentParts.replace(/```json\n|\n```/g, '');
    const aiMessage = {
        role: 'assistant',
        content: contentAfterMarker
    };
    return { aiMessage, functionCalls: [] };
    }
}