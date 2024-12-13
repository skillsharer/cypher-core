import { Message, ModelClient, ModelType, Tool, AgentRunResult, ToolOutputFromSchema } from '../types/agentSystem';
import { ModelAdapter } from '../models/adapters/ModelAdapter';
import { OpenAIAdapter } from '../models/adapters/OpenAIAdapter';
import { AnthropicAdapter } from '../models/adapters/AnthropicAdapter';
import { FireworksAdapter } from '../models/adapters/FireworksAdapter';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Logger } from '../util/logger';
import { agentEventBus } from '../util/agentEventBus';

export type LogLevel = 'none' | 'error' | 'info' | 'debug';

type JsonSchema7Object = {
  properties?: {
    [key: string]: any;
  };
};

// Minimal config interface to hold what we load from YAML
interface BaseConfig {
  name: string;
  description?: string;
  systemPromptTemplate: string;
  dynamicVariables: { [key: string]: string };
}

export class BaseAgent<T extends z.ZodTypeAny | null = null> {
  protected messageHistory: Message[] = [];
  protected tools: Tool[] = [];
  protected outputSchema: T | null;
  protected modelClient: ModelClient;
  protected modelType: ModelType;
  protected toolChoice: any;
  private modelAdapter: ModelAdapter;
  protected config: BaseConfig;
  private schemaJson?: any;
  private logLevel: LogLevel;
  private agentId: string;
  private runData: any;
  private hasInjectedSchema: boolean = false;

  constructor(
    config: BaseConfig,
    modelClient: ModelClient,
    outputSchema: T | null = null,
    logLevel: LogLevel = 'none'
  ) {
    this.config = config;
    this.modelClient = modelClient;
    this.outputSchema = outputSchema;
    this.logLevel = logLevel;
    this.modelType = modelClient.modelType;

    switch (this.modelType) {
      case 'openai':
        this.modelAdapter = new OpenAIAdapter();
        break;
      case 'anthropic':
        this.modelAdapter = new AnthropicAdapter();
        break;
      case 'fireworks':
        this.modelAdapter = new FireworksAdapter();
        break;
      default:
        throw new Error(`Unsupported model type: ${this.modelType}`);
    }

    if (this.outputSchema) {
      const fullSchema = zodToJsonSchema(this.outputSchema) as JsonSchema7Object;
      this.schemaJson = fullSchema.properties || {};
      Logger.debug('[BaseAgent] Output schema JSON:', this.schemaJson);
    }

    // Initialize with empty system message - will be populated in first run
    this.messageHistory.push({
      role: 'system',
      content: '',
    });

    this.agentId = agentEventBus.registerAgent(config.name || 'Agent');
    
    if (config.systemPromptTemplate) {
      agentEventBus.updateAgentSystemPrompt(this.agentId, config.systemPromptTemplate);
    }

    this.runData = {};
  }

  public setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  public addMessage(message: Message) {
    Logger.debug('[BaseAgent] Adding message:', message);
    this.messageHistory.push(message);
    agentEventBus.updateAgentChatHistory(this.agentId, this.messageHistory);
  }

  public addUserMessage(content?: string, image?: Message['image']) {
    const msg: Message = {
      role: 'user',
      content,
      image,
    };
    Logger.debug('[BaseAgent] Adding user message:', msg);
    this.messageHistory.push(msg);
    agentEventBus.updateAgentChatHistory(this.agentId, this.messageHistory);
  }

  public addAgentMessage(content?: string, image?: Message['image']) {
    const sanitizedRunData = this.cloneAndSanitizeRunData(this.runData);

    const msg: Message = {
      role: 'assistant',
      content,
      image,
      runData: sanitizedRunData,
    };
    Logger.debug('[BaseAgent] Adding agent message:', msg);
    this.messageHistory.push(msg);
    agentEventBus.updateAgentChatHistory(this.agentId, this.messageHistory);
  }

  public getLastAgentMessage(): Message | null {
    for (let i = this.messageHistory.length - 1; i >= 0; i--) {
      if (this.messageHistory[i].role === 'assistant') {
        return this.messageHistory[i];
      }
    }
    return null;
  }

  public getLastUserMessage(): Message | null {
    for (let i = this.messageHistory.length - 1; i >= 0; i--) {
      if (this.messageHistory[i].role === 'user') {
        return this.messageHistory[i];
      }
    }
    return null;
  }

  public loadChatHistory(messages: Message[]): void {
    const systemMessage = this.messageHistory.find(msg => msg.role === 'system');
    this.messageHistory = systemMessage ? [systemMessage] : [];
    this.messageHistory.push(...messages);
    Logger.debug('[BaseAgent] Loaded chat history:', this.messageHistory);
    agentEventBus.updateAgentChatHistory(this.agentId, this.messageHistory);
  }

  protected compileSystemPrompt(
    dynamicVariables?: { [key: string]: string }
  ): string {
    let prompt = this.config.systemPromptTemplate;

    const mergedVariables = {
      ...this.config.dynamicVariables,
      ...dynamicVariables,
    };

    Logger.debug('[BaseAgent] Merged dynamic variables:', mergedVariables);
    for (const [key, value] of Object.entries(mergedVariables)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder, 'g');
      if (prompt.match(regex)) {
        const resolvedValue = typeof value === 'function' ? (value as () => string)() : value;
        prompt = prompt.replace(regex, resolvedValue);
      }
    }

    if (this.outputSchema && this.schemaJson && this.tools.length === 0) {
      prompt += `\n\n## OUTPUT FORMAT\nYou MUST output valid JSON that conforms to the schema below.\n${JSON.stringify(this.schemaJson, null, 2)}`;
    }

    const systemMessageIndex = this.messageHistory.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex !== -1) {
      this.messageHistory[systemMessageIndex].content = prompt;
      agentEventBus.updateAgentSystemPrompt(this.agentId, prompt);
    }

    return prompt;
  }

  protected async handleFunctionCall(args: any): Promise<any> {
    Logger.debug('[BaseAgent] Handling function call with args:', args);
    return args;
  }

  protected defineTools(): void {
    // Tools now come from YAML if needed. For now, no default tools.
    // In a real scenario, we could load tools from config, but here we have none.
  }

  protected buildToolChoice() {
    this.toolChoice = this.modelAdapter.buildToolChoice(this.tools);
    Logger.debug('[BaseAgent] Built tool choice:', this.toolChoice);
  }

  protected formatTools(): any[] {
    const formatted = this.modelAdapter.formatTools(this.tools);
    Logger.debug('[BaseAgent] Formatted tools:', formatted);
    return formatted;
  }

  public async run(
    inputMessage?: string,
    dynamicVariables?: { [key: string]: string },
    logLevel?: LogLevel
  ): Promise<AgentRunResult<T>> {
    this.runData = {
      inputMessage,
      dynamicVariables,
    };

    let formattedResponse = '';

    try {
      Logger.debug('[BaseAgent] Running agent with inputMessage:', inputMessage);
      this.runData.inputMessage = inputMessage;

      this.defineTools();
      this.buildToolChoice();

      const hasTools = this.tools && this.tools.length > 0;

      const updatedSystemPrompt = this.compileSystemPrompt(dynamicVariables);
      this.runData.systemPrompt = updatedSystemPrompt;

      if (this.modelType === 'anthropic' && this.outputSchema && this.schemaJson && !hasTools && !this.hasInjectedSchema) {
        this.addAgentMessage(`Below is the JSON schema you must follow for the final answer:\n${JSON.stringify(this.schemaJson, null, 2)}\nYou must ONLY output JSON following this schema.`);
        this.hasInjectedSchema = true;
      }

      if (inputMessage) {
        this.addUserMessage(inputMessage);
      }

      Logger.debug('[BaseAgent] Final message history before call:', this.messageHistory);
      this.runData.messageHistory = this.messageHistory;

      let params: any;
      if (!hasTools && this.outputSchema) {
        params = this.modelAdapter.buildParams(
          this.messageHistory,
          [],
          undefined,
          updatedSystemPrompt,
          this.outputSchema
        );
      } else {
        params = this.modelAdapter.buildParams(
          this.messageHistory,
          hasTools ? this.formatTools() : [],
          hasTools ? this.toolChoice : undefined,
          updatedSystemPrompt
        );
      }

      Logger.debug('[BaseAgent] Params for model:', params);
      this.runData.params = params;

      const response = await this.modelClient.chatCompletion(params);
      Logger.debug('[BaseAgent] Raw model response:', response);
      
      const { usage, ...responseWithoutUsage } = response;
      this.runData.response = responseWithoutUsage;
      
      if (response.usage) {
        this.runData.tokenUsage = response.usage;
      }

      const { aiMessage, functionCall } = this.modelAdapter.processResponse(response);
      Logger.debug('[BaseAgent] Processed model response:', { aiMessage, functionCall });
      this.runData.aiMessage = aiMessage;
      this.runData.functionCall = functionCall;

      if (functionCall) {
        formattedResponse += `## USED TOOL: ${functionCall.functionName}\n`;
        for (const [key, value] of Object.entries(functionCall.functionArgs)) {
          const formattedKey = key.toUpperCase().replace(/_/g, '_');
          const formattedValue = typeof value === 'string' ? `"${value}"` : value;
          formattedResponse += `${formattedKey}: ${formattedValue}\n`;
        }
      } else if (aiMessage?.content && !hasTools && this.outputSchema) {
        try {
          JSON.parse(aiMessage.content);
          formattedResponse = aiMessage.content;
        } catch (err) {
          formattedResponse = aiMessage.content;
        }
      } else if (aiMessage?.content) {
        formattedResponse = aiMessage.content;
      }

      if (formattedResponse) {
        this.addAgentMessage(formattedResponse.trim());
        agentEventBus.updateAgentResponse(this.agentId, formattedResponse.trim());
      }

      if (!hasTools && this.outputSchema) {
        if (functionCall) {
          try {
            const parsedArgs = this.outputSchema.parse(functionCall.functionArgs);
            Logger.debug('[BaseAgent] Parsed functionCall output successfully:', parsedArgs);
            return {
              success: true,
              output: parsedArgs,
            };
          } catch (err) {
            Logger.error('[BaseAgent] Failed to parse structured output from functionCall:', err);
            return {
              success: false,
              output: {} as (T extends z.ZodTypeAny ? ToolOutputFromSchema<T> : string),
              error: 'Failed to parse structured output from functionCall',
            };
          }
        } else if (aiMessage?.content) {
          try {
            const parsed = this.outputSchema.parse(JSON.parse(aiMessage.content));
            Logger.debug('[BaseAgent] Parsed AI message output successfully:', parsed);
            return {
              success: true,
              output: parsed,
            };
          } catch (err) {
            Logger.error('[BaseAgent] Failed to parse structured output:', err);
            return {
              success: false,
              output: {} as (T extends z.ZodTypeAny ? ToolOutputFromSchema<T> : string),
              error: 'Failed to parse structured output',
            };
          }
        }
      }

      return {
        success: true,
        output: formattedResponse as any,
      };
    } catch (error) {
      Logger.error('[BaseAgent] Run encountered error:', error);
      this.runData.error = (error as Error).message;
      return {
        success: false,
        output: (this.outputSchema ? {} : '') as (T extends z.ZodTypeAny ? ToolOutputFromSchema<T> : string),
        error: (error as Error).message,
      };
    } finally {
      if (this.runData.response?.usage) {
        delete this.runData.response.usage;
      }
      agentEventBus.updateAgentLastRunData(this.agentId, this.runData);
      Logger.debug('[BaseAgent] Returning final response:', formattedResponse);
    }
  }

  public addImage(
    images: Message['image'] | Message['image'][],
    content?: string,
    role: 'user' | 'assistant' = 'user'
  ) {
    if (!this.modelAdapter.supportsImages) {
      Logger.debug('[BaseAgent] Model does not support images.');
      return;
    }

    const imageArray = Array.isArray(images) ? images : [images];
    const invalidImages = imageArray.filter(img => !img || !img.data || !img.mime);
    if (invalidImages.length > 0) {
      Logger.debug('[BaseAgent] Invalid image(s) detected, skipping addImage.');
      return;
    }

    imageArray.forEach((image, index) => {
      const msg: Message = {
        role,
        content: index === 0 ? content : undefined,
        image,
      };
      Logger.debug('[BaseAgent] Adding image message:', msg);
      this.messageHistory.push(msg);
    });
  }

  private cloneAndSanitizeRunData(data: any): any {
    const seen = new WeakSet();

    const clone = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (seen.has(obj)) {
        return undefined; 
      }
      seen.add(obj);

      if (Array.isArray(obj)) {
        return obj.map((item: any): any => {
          if (item && typeof item === 'object' && 'role' in item) {
            const { runData, ...messageWithoutRunData } = item;
            return clone(messageWithoutRunData);
          }
          return clone(item);
        });
      }

      const clonedObj: any = {};
      for (const key in obj) {
        if (key === 'params' || key === 'response' || key === 'modelClient' || key === 'modelAdapter') {
          continue;
        }

        if (key === 'messageHistory') {
          if (Array.isArray(obj[key])) {
            clonedObj[key] = obj[key].slice(-10).map((msg: any): any => {
              const { runData, ...messageWithoutRunData } = msg;
              return clone(messageWithoutRunData);
            });
          } else {
            clonedObj[key] = clone(obj[key]);
          }
        } else {
          clonedObj[key] = clone(obj[key]);
        }
      }
      return clonedObj;
    };

    return clone(data);
  }

  public getChatHistory(limit?: number): Message[] {
    if (!limit) {
      return [...this.messageHistory];
    }
    const nonSystemMessages = this.messageHistory.filter(msg => msg.role !== 'system');
    return nonSystemMessages.slice(-limit);
  }

  public getFullChatHistory(): Message[] {
    return [...this.messageHistory];
  }
}