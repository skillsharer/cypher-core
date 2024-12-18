import { EventEmitter } from 'events';

interface LogEntry {
  level: string;
  timestamp: string;
  messages: (string | object)[];
}

// Define log levels and their priorities
const LOG_LEVELS = {
  none: 0,
  error: 1,
  info: 2,
  debug: 3
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

class LoggerClass extends EventEmitter {
  private logs: LogEntry[] = [];
  private enabled: boolean = false;
  private currentLevel: LogLevel = 'none';
  
  constructor() {
    super();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    // Don't log if logger is disabled or if current level is none
    if (!this.enabled || this.currentLevel === 'none') {
      return false;
    }
    
    // Log if the message's level priority is <= current level priority
    return LOG_LEVELS[level] <= LOG_LEVELS[this.currentLevel];
  }

  private storeLog(level: 'error' | 'info' | 'debug', ...args: any[]) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      messages: args
    };
    this.logs.push(entry);
    this.emit('log', entry);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(...args);
      this.storeLog('error', ...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(...args);
      this.storeLog('info', ...args);
    }
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(...args);
      this.storeLog('debug', ...args);
    }
  }
}

// Export singleton instance
export const Logger = new LoggerClass();