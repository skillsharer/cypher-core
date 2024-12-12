import dotenv from 'dotenv';
dotenv.config();

import { TerminalCore } from './src/terminalCore';
import InternetFeature from './src/features/internet';
import { createLoggerServer } from './src/gui/loggerServer';
import { Logger } from './src/util/logger';

Logger.enable();
Logger.setLevel('debug');

const loggerServer = createLoggerServer();
await loggerServer.start();

// Initialize TerminalCore with base options
const core = new TerminalCore({
  modelType: 'fireworks',
  modelName: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
  maxActions: 1,
  actionCooldownMs: 10000,
  features: [InternetFeature],
  configPath: 'config.yaml'
});

// Add event listeners for loop events. This is so we can process each individual message
core.on('loop:iteration', async (messages) => {
  Logger.info('New messages found to save to database', {
    assistantMessage: messages.assistantMessage.content,
    userMessage: messages.userMessage.content,
  });
});

// Add event listener for max actions reached. This is so we can process the full history of messages
core.on('loop:maxActions', async (fullHistory) => {
  Logger.info('Max actions reached !!!');
});

await core.init();

const externalCurrentSummaries = "Freshly launched";

// Set dynamic variables before starting the loop
core.setDynamicVariables({
  additional_dynamic_variables: `## CURRENT SUMMARIES OF YOUR RECENT ACTIVITY\n\n${externalCurrentSummaries}`
});

await core.runLoop();