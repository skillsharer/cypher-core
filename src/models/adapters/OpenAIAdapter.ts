import { ModelAdapter } from './ModelAdapter';
import { Message, Tool } from '../../types/agentSystem';
import { ZodTypeAny } from 'zod';

export class OpenAIAdapter implements ModelAdapter {
  supportsImages = true;

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
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    }));
  }

  buildParams(
    messageHistory: Message[],
    formattedTools: any[],
    toolChoice: any,
    systemPrompt: string,
    outputSchema?: ZodTypeAny
  ): any {
    const updatedMessageHistory = messageHistory.map((msg) => {
      if (msg.role === 'system') {
        return { ...msg, content: systemPrompt };
      }

      if (msg.image) {
        return {
          role: msg.role,
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${msg.image.mime};base64,${msg.image.data.toString('base64')}`
              }
            },
            ...(msg.content ? [{ type: 'text', text: msg.content }] : [])
          ]
        };
      }

      return {
        role: msg.role,
        content: msg.content
      };
    });

    const params: any = {
      messages: updatedMessageHistory
    };

    if (outputSchema) {
      // For OpenAI structured outputs using json_schema:
      // We'll just provide a placeholder json_schema. In real usage, we'd convert zod schema.
      // Here, assume outputSchema is a z.ZodTypeAny. For demonstration, we just do minimal.
      const schemaJson = { 
        type: "json_object" 
        // In a real scenario, we'd convert outputSchema to actual JSON schema here.
      };
      params.response_format = schemaJson;
    } else if (formattedTools.length > 0) {
      params.functions = formattedTools;
      if (toolChoice) {
        params.function_call = toolChoice.function;
      }
    }

    return params;
  }

  processResponse(response: any): { aiMessage: any; functionCall?: any } {
    const aiMessage = response.choices[0]?.message;
    if (aiMessage?.function_call) {
      const functionCall = aiMessage.function_call;
      return {
        aiMessage,
        functionCall: {
          functionName: functionCall.name,
          functionArgs: JSON.parse(functionCall.arguments),
        },
      };
    }
    return { aiMessage };
  }
}