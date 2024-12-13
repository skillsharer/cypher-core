import { Agent } from './agents/Agent';
import { Logger } from './util/logger';
import { getCurrentTimestamp } from './util/formatTimestamps';
import { executeCommand } from './terminal/executeCommand';
import { EventEmitter } from 'events';

interface Feature {
  loadFeatureCommands: () => Promise<any[]>;
}

// For compatibility with your original code, we define types and a basic command registry mock:
let commandRegistry: any[] = [];
function registerCommands(cmds: any[]) {
  commandRegistry = commandRegistry.concat(cmds);
}
function generateHelpText() {
  return "help command: shows available commands\n" + commandRegistry.map(c => c.name).join("\n");
}

// Simulate features and a config loader if needed
interface TerminalCoreOptions {
  agentName?: string;
  modelType?: 'openai' | 'anthropic' | 'fireworks';
  modelName?: string;
  maxActions?: number;
  actionCooldownMs?: number;
  features?: Feature[];
}

export interface TerminalCoreEvents {
  'loop:iteration': (messages: { userMessage?: { content?: string }, assistantMessage?: { content?: string } }) => Promise<void> | void;
  'loop:maxActions': (fullHistory: any[]) => Promise<void> | void;
}

export class TerminalCore extends EventEmitter {
  private agent!: Agent;
  private sessionId: string;
  private maxActions: number;
  private actionCooldownMs: number;
  private features: Feature[];
  private actionCount: number = 0;
  private dynamicVariables: { [key: string]: string } = {};

  constructor(
    private options: TerminalCoreOptions = {}
  ) {
    super();
    this.sessionId = Math.random().toString(36).slice(2);
    this.maxActions = options.maxActions ?? 20;
    this.actionCooldownMs = options.actionCooldownMs ?? 120_000;
    this.features = options.features ?? [];
  }

  public setDynamicVariables(vars: Record<string, string>) {
    this.dynamicVariables = {
      ...this.dynamicVariables,
      ...vars
    };
  }

  public async init() {
    // Load feature commands
    for (const feature of this.features) {
      const cmds = await feature.loadFeatureCommands();
      registerCommands(cmds);
    }

    // Default to "Terminal Agent" if none provided
    const agentName = this.options.agentName || "Terminal Agent";
    this.agent = new Agent(agentName);

    Logger.info('TerminalCore initialized with agent and features');
  }

  public async runLoop() {
    Logger.info('Starting TerminalCore run loop');

    while (true) {
      this.actionCount = 0;
      while (this.actionCount < this.maxActions) {
        // Inject dynamic variables
        const terminalCommandsHelp = generateHelpText();
        const mergedVars = {
          ...this.dynamicVariables,
          current_timestamp: getCurrentTimestamp(),
          terminal_commands: terminalCommandsHelp
        };

        const agentResult = await this.agent.run(undefined, mergedVars);

        if (agentResult.success) {
          let assistantMessage = agentResult.output;
          let userMessageContent: string | undefined;

          // Try parsing JSON if structured
          let parsedOutput: any;
          try {
            parsedOutput = JSON.parse(assistantMessage);
          } catch (err) {
            parsedOutput = null;
          }

          if (parsedOutput && parsedOutput.terminal_commands) {
            const commands = parsedOutput.terminal_commands
              .split(/[\n;]/)
              .map((cmd: string) => cmd.trim())
              .filter((cmd: string) => cmd.length > 0);

            for (const cmd of commands) {
              const execResult = await executeCommand(cmd);
              // Feed command output back
              const feedbackResult = await this.agent.run(`${getCurrentTimestamp()} - [TERMINAL LOG]\n\n${execResult.output}`, mergedVars);
              if (feedbackResult.success) {
                assistantMessage = feedbackResult.output;
              } else {
                Logger.error('Error feeding terminal logs back to agent:', feedbackResult.error);
              }
            }
          }

          // Emit iteration event
          this.emit('loop:iteration', {
            userMessage: userMessageContent ? { content: userMessageContent } : undefined,
            assistantMessage: assistantMessage ? { content: assistantMessage } : undefined
          });
        } else {
          Logger.error('Agent Failed:', agentResult.error);
          break;
        }

        // Wait for cooldown before next action
        await new Promise((resolve) => setTimeout(resolve, this.actionCooldownMs));
        this.actionCount++;
      }

      // Emit event for max actions reached
      const fullHistory: any[] = []; // If needed, we can implement agent.getFullChatHistory()
      this.emit('loop:maxActions', fullHistory);

      // Idle period
      const idleMinutes = Math.floor(Math.random() * (60 - 30 + 1)) + 30;
      Logger.info(`Entering idle mode for ${idleMinutes} minutes`);
      await new Promise((resolve) => setTimeout(resolve, idleMinutes * 60 * 1000));
      Logger.info('Resuming active mode');
    }
  }
}