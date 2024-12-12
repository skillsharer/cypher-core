import { TerminalAgent } from './agents/terminalAgent/terminalAgent';
import { ModelClient, Message } from './types/agentSystem';
import { OpenAIClient } from './models/clients/OpenAiClient';
import { AnthropicClient } from './models/clients/AnthropicClient';
import { FireworkClient } from './models/clients/FireworkClient';
import { registerCommands, generateHelpText } from './terminal/commandRegistry';
import { Logger } from './util/logger';
import { v4 as uuidv4 } from 'uuid';
import { configLoader } from './util/config';
import { getCurrentTimestamp } from './util/formatTimestamps';
import { executeCommand } from './terminal/executeCommand';
import { EventEmitter } from 'events';

interface Feature {
  loadFeatureCommands: () => Promise<any[]>;
}

interface TerminalCoreOptions {
  modelType: 'openai' | 'anthropic' | 'fireworks';
  modelName: string;
  maxActions?: number;
  actionCooldownMs?: number;
  features?: Feature[];
  configPath?: string;
}

export interface TerminalCoreEvents {
  'loop:iteration': (messages: { userMessage?: Message, assistantMessage?: Message }) => Promise<void> | void;
  'loop:maxActions': (fullHistory: Message[]) => Promise<void> | void;
}

interface DynamicVariables {
  corePersonalityPrompt?: string;
  currentSummaries?: string;
  current_timestamp?: string;
  main_goal?: string;
  terminal_commands?: string;
  ticker?: string;
  tickerName?: string;
  // Additional dynamic variables can be added here
  [key: string]: string | undefined;
}

/**
 * TerminalCore sets up and runs a terminal-driven agent loop.
 * It integrates with optional features (commands), optional Supabase storage,
 * and controls model client & personality.
 */
export class TerminalCore extends EventEmitter {
  private modelClient: ModelClient;
  private agent!: TerminalAgent; // Use definite assignment
  private sessionId: string;
  private maxActions: number;
  private actionCooldownMs: number;
  private features: Feature[];
  private actionCount: number = 0;

  // Store dynamic variables externally so they can be set without embedding data-fetch logic here
  private dynamicVariables: DynamicVariables = {};

  constructor(private options: TerminalCoreOptions) {
    super();
    this.sessionId = uuidv4();
    this.maxActions = options.maxActions ?? 20;
    this.actionCooldownMs = options.actionCooldownMs ?? 120_000;
    this.features = options.features ?? [];

    // Set up the model client
    switch (options.modelType) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is not set in the environment');
        }
        this.modelClient = new OpenAIClient(process.env.OPENAI_API_KEY, options.modelName);
        break;
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY is not set in the environment');
        }
        this.modelClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY, options.modelName);
        break;
      case 'fireworks':
        if (!process.env.FIREWORKS_API_KEY) {
          throw new Error('FIREWORKS_API_KEY is not set in the environment');
        }
        this.modelClient = new FireworkClient(process.env.FIREWORKS_API_KEY, options.modelName);
        break;
      default:
        throw new Error(`Unsupported model type: ${options.modelType}`);
    }

    // If custom config path provided, initialize config loader with it
    if (options.configPath) {
      configLoader.initializeWithPath(options.configPath);
    }
  }

  /**
   * Allows external code to set or update dynamic variables at runtime.
   * For example, currentSummaries can be fetched from a database and passed in here.
   */
  public setDynamicVariables(vars: Partial<DynamicVariables>) {
    this.dynamicVariables = {
      ...this.dynamicVariables,
      ...vars
    };
  }

  // Initialize the agent and load all feature commands
  public async init() {
    // Load feature commands
    for (const feature of this.features) {
      const cmds = await feature.loadFeatureCommands();
      registerCommands(cmds);
    }

    // Initialize agent with just the model client
    this.agent = new TerminalAgent(this.modelClient);

    Logger.info('TerminalCore initialized with agent and features');
  }

  public async loadChatHistory(messages: Message[]) {
    if (messages.length > 0) {
      Logger.info('Loading chat history...');
      this.agent.loadChatHistory(messages);
    }
  }

  public getLastAgentMessage(): Message | null {
    return this.agent.getLastAgentMessage();
  }

  public getChatHistory(limit?: number): Message[] {
    return this.agent.getChatHistory(limit);
  }

  public getFullChatHistory(): Message[] {
    return this.agent.getFullChatHistory();
  }

  /**
   * The main run loop logic, incorporating actions, cooldown, and idle cycle.
   */
  public async runLoop() {
    Logger.info('Starting TerminalCore run loop');

    while (true) {
      this.actionCount = 0;
      while (this.actionCount < this.maxActions) {
        const terminalCommandsHelp = generateHelpText();
        
        // Populate dynamic variables from config, if not already provided externally
        this.dynamicVariables.corePersonalityPrompt = this.dynamicVariables.corePersonalityPrompt ?? configLoader.getRawPersonality();
        this.dynamicVariables.current_timestamp = getCurrentTimestamp();
        this.dynamicVariables.main_goal = this.dynamicVariables.main_goal ?? (configLoader.getConfig()?.agent?.main_goal ?? '');
        this.dynamicVariables.terminal_commands = terminalCommandsHelp;
        this.dynamicVariables.ticker = this.dynamicVariables.ticker ?? (configLoader.getConfig()?.ticker ?? '');
        this.dynamicVariables.tickerName = this.dynamicVariables.tickerName ?? (configLoader.getConfig()?.tickerName ?? '');

        // Filter out undefined values before passing to agent.run
        const filteredVariables = Object.fromEntries(
          Object.entries(this.dynamicVariables).filter(([_, v]) => v !== undefined)
        ) as { [key: string]: string };

        const agentResult = await this.agent.run(undefined, filteredVariables);
        
        if (agentResult.success) {
          // Handle the structured output
          if (agentResult.output) {
            const { internal_thought, plan, terminal_commands } = agentResult.output;
            
            // Log the agent's thought process
            Logger.debug('Agent Thought:', internal_thought);
            Logger.debug('Agent Plan:', plan);

            // Execute terminal commands if present
            if (terminal_commands) {
              try {
                const commands = terminal_commands
                  .split(/[\n;]/)
                  .map(cmd => cmd.trim())
                  .filter(cmd => cmd.length > 0);

                for (const cmd of commands) {
                  const result = await executeCommand(cmd);
                  
                  // Feed the command output back to the agent as a user message
                  await this.agent.addMessage({
                    role: 'user',
                    content: `${getCurrentTimestamp()} - [TERMINAL LOG]\n\n${result.output}`
                  });
                }
              } catch (error) {
                Logger.error('Error executing terminal commands:', error);
                // Feed error back to agent
                await this.agent.addMessage({
                  role: 'user',
                  content: `Error executing command: ${error}`
                });
              }
            }

            // Move the event emission here, after terminal commands are processed
            const recentMessages = this.agent.getChatHistory(2);
            const messagePayload = {
              userMessage: recentMessages.find(m => m.role === 'user'),
              assistantMessage: recentMessages.find(m => m.role === 'assistant')
            };
            
            await this.emitAsync('loop:iteration', messagePayload);
          }
        }

        // Wait for cooldown before next action
        await new Promise((resolve) => setTimeout(resolve, this.actionCooldownMs));
        this.actionCount++;
      }

      // Emit event for max actions reached
      const fullHistory = this.agent.getFullChatHistory();
      await this.emitAsync('loop:maxActions', fullHistory);

      // Idle period
      const idleMinutes = Math.floor(Math.random() * (60 - 30 + 1)) + 30;
      Logger.info(`Entering idle mode for ${idleMinutes} minutes`);
      await new Promise((resolve) => setTimeout(resolve, idleMinutes * 60 * 1000));
      Logger.info('Resuming active mode');
    }
  }

  // Helper method to handle async event emissions
  private async emitAsync(event: keyof TerminalCoreEvents, ...args: any[]) {
    const listeners = this.listeners(event);
    for (const listener of listeners) {
      await Promise.resolve(listener.apply(this, args));
    }
  }
}