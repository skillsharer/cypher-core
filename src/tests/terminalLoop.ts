import dotenv from 'dotenv';
dotenv.config();

import { Logger } from './util/logger';
import { createLoggerServer } from './gui/loggerServer';
import InternetFeature from './features/internet';
import { TerminalCore } from './terminalCore';

// Main async function to handle all async operations
async function main() {
  Logger.enable();
  Logger.setLevel('debug');

  const loggerServer = createLoggerServer();
  await loggerServer.start();

  // Initialize TerminalCore with desired options and features
  const core = new TerminalCore({
    agentName: "terminalAgent",
    // If you have a particular model you want, define it in the YAML or here if needed.
    maxActions: 2,
    actionCooldownMs: 10000,
    features: [InternetFeature],
  });

  // Add event listeners for loop events
  core.on('loop:iteration', async (messages) => {
    Logger.info('New messages found to save to database', {
      assistantMessage: messages.assistantMessage?.content,
      userMessage: messages.userMessage?.content,
    });
  });

  core.on('loop:maxActions', async (fullHistory) => {
    Logger.info('Max actions reached !!!', fullHistory);
  });

  await core.init();

  const externalCurrentSummaries = "Freshly launched";

  // Set dynamic variables before starting the loop
  core.setDynamicVariables({
    additional_dynamic_variables: `## CURRENT SUMMARIES OF YOUR RECENT ACTIVITY\n\n${externalCurrentSummaries}`
  });

  await core.runLoop();
}

// Execute the main function and handle any errors
main().catch(error => {
  console.error('Error in main:', error);
  process.exit(1);
});