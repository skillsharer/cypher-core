import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

// Interface for agent configuration
export interface AgentConfig {
  name: string;
  raw_personality: string;
  main_goal: string;
}

// Interface for the entire configuration
interface Config {
  agent: AgentConfig;
  ticker?: string;
  tickerName?: string;
  bannedPhrases?: string[];
  imageGen?: {
    loraPath: string;
    promptPrefix: string;
    triggerToken: string;
  };
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config!: Config;
  private configPath: string;

  private constructor() {
    // Default config path
    this.configPath = path.join(__dirname, '..', 'config', 'agent.yaml');
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const fileContents = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(fileContents) as Config;
      Logger.info('Configuration loaded successfully');
    } catch (error) {
      Logger.error(`Error loading configuration: ${error}`);
      throw error;
    }
  }

  // Add method to initialize with custom path
  public initializeWithPath(customPath: string) {
    this.configPath = customPath;
    this.loadConfig();
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public getAgentConfig(): AgentConfig {
    return this.config.agent;
  }

  public getAgentName(): string {
    return this.config.agent.name;
  }

  public getRawPersonality(): string {
    return this.config.agent.raw_personality.trim();
  }

  public getConfig(): Config {
    return this.config;
  }

  public getBannedPhrasesFormatted(): string {
    return (this.config.bannedPhrases || [])
      .map(phrase => `- ${phrase}`)
      .join('\n');
  }
}

export const configLoader = ConfigLoader.getInstance(); 