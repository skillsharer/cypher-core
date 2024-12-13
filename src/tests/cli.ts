// Simple CLI interface to accept user input

import readline from 'readline';
import { executeCommand } from '../terminal/executeCommand';
import { Logger } from '../util/logger';
import { registerCommands } from '../terminal/commandRegistry';
import { help } from '../terminal/commands/help';

Logger.enable();

/**
 * Initializes the CLI application for manual use to test terminal functions
 * - Sets up readline interface
 * - Registers core commands
 * - Starts accepting commands
 * - Logs terminal history
 */
async function initializeCLI() {
  try {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Register core commands
    registerCommands([
      help,
      // Add other commands as needed
    ]);

    console.log('\nWelcome to the Terminal. Use "help" to view available commands. Type commands below:');

    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      if (trimmedInput) {
        // Execute the command and get raw result
        const result = await executeCommand(trimmedInput);
        
        // Log the raw output
        console.log(result);
      }
    });

    // Handle CLI shutdown
    rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to initialize CLI:', error);
    process.exit(1);
  }
}

// Start the CLI
initializeCLI();