import { Command } from '../../../terminal/types/commands';
import { twitterSubCommands } from './subCommandsRegistry';
import { ensureAuthenticated } from '../../../twitter/twitterClient';

export const twitter: Command = {
  name: 'twitter',
  description: 'Interact with Twitter environment. Use "twitter help" for sub-commands.',
  parameters: [
    {
      name: 'subcommand',
      description: 'Sub-command to run, or "help"',
      required: false,
      type: 'string'
    },
    {
      name: 'args',
      description: 'Arguments for the sub-command',
      required: false,
      type: 'string'
    }
  ],
  handler: async (args) => {
    const subcommand = args.subcommand;
    const restArgs = args.args ? args.args.split(' ') : [];

    // Show detailed help for specific subcommand
    if (subcommand === 'help' && restArgs.length > 0) {
      const cmdName = restArgs[0];
      const cmd = twitterSubCommands.find(sc => sc.name === cmdName);
      
      if (!cmd) {
        return { output: `Unknown sub-command: ${cmdName}. Try "twitter help" for available commands.` };
      }

      const helpText = [
        `Command: twitter ${cmd.name}`,
        `Description: ${cmd.description}`,
        '',
        'Usage:',
        `  twitter ${cmd.name} ${cmd.parameters?.map(p => p.required ? `<${p.name}>` : `[${p.name}]`).join(' ') || ''}`,
        ''
      ];

      if (cmd.parameters && cmd.parameters.length > 0) {
        helpText.push('Parameters:');
        for (const param of cmd.parameters) {
          const required = param.required ? '(Required)' : '(Optional)';
          const defaultValue = param.defaultValue ? ` [default: ${param.defaultValue}]` : '';
          const type = param.type ? ` <${param.type}>` : '';
          helpText.push(`  ${param.name}${type}: ${param.description} ${required}${defaultValue}`);
        }
      }

      return { output: helpText.join('\n') };
    }

    // Show general help (list of commands)
    if (!subcommand || subcommand === 'help') {
      const helpText = [
        'Available Twitter sub-commands:',
        '(Use "twitter help <command>" for detailed parameter information)',
        ''
      ];
      
      for (const sc of twitterSubCommands) {
        const paramString = sc.parameters?.map(p => 
          p.required ? `<${p.name}>` : `[${p.name}]`
        ).join(' ') || '';
        const cmdString = `${sc.name} ${paramString}`.padEnd(25);
        helpText.push(`${cmdString} - ${sc.description}`);
      }
      
      return { output: helpText.join('\n') };
    }

    const cmd = twitterSubCommands.find(sc => sc.name === subcommand);
    if (!cmd) {
      return { output: `Unknown twitter sub-command: ${subcommand}. Try "twitter help".` };
    }

    try {
      await ensureAuthenticated();
      return await cmd.handler({ args: restArgs.join(' ') });
    } catch (error) {
      return {
        output: `❌ Authentication Error: ${error instanceof Error ? error.message : 'Failed to authenticate with Twitter'}`
      };
    }
  }
};