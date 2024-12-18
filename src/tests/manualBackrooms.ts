import dotenv from 'dotenv';
dotenv.config();
import { createLoggerServer } from '../gui/loggerServer';
import { Logger } from '../utils/logger';
import { Agent } from '../agents/Agent';
import readline from 'readline';

async function main() {
  // Initialize logging
  Logger.enable();
  Logger.setLevel('debug');

  // Start the logger GUI server
  const loggerServer = createLoggerServer();
  await loggerServer.start();

  // Initialize the CLI agent only
  const cliAgent = new Agent({ agentName: 'cliAgent' });

  // Create readline interface for manual input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Initialize conversation with the terminal prompt
  console.log("\nTerminal ready. Type your messages (Ctrl+C to exit):");
  console.log("simulator@{lm2_company}:~/$ ");

  // Manual CLI input loop
  const getInput = () => {
    rl.question('', async (input) => {
      // Exit condition
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        rl.close();
        process.exit(0);
      }

      try {
        // Add user message to agent's history
        cliAgent.addUserMessage(input);

        // Get agent's response
        const result = await cliAgent.run();
        
        if (!result.success) {
          console.error('Error getting response:', result.error);
        } else {
          // Get and display the agent's response
          const response = cliAgent.getLastAgentMessage();
          if (response) {
            console.log('\n' + response.content);
          }
        }

        // Prompt for next input
        console.log("\nsimulator@{lm2_company}:~/$ ");
        
        // Continue the input loop
        getInput();
      } catch (error) {
        console.error('Error processing input:', error);
        getInput();
      }
    });
  };

  // Start the input loop
  getInput();

  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await loggerServer.stop();
    rl.close();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Error in main:', error);
  process.exit(1);
});