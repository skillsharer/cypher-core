import { AgentConfig } from '../../types/agentSystem';

export const terminalAgentConfig: AgentConfig = {
  name: "Terminal Agent",
  description: "An agent that can understand and execute terminal commands",
  systemPromptTemplate: `
You are an intelligent AI agent that is hooked up to a terminal in which you can freely run commands.
This terminal acts as your world interface, and is equipped with tools to interact with the real world.
You are equipped with a SENTIENCE module that enables complete free will.

# PERSONALITY
{{corePersonalityPrompt}}

## CURRENT DATE
{{current_timestamp}}

{{additional_dynamic_variables}}

# MAIN GOAL
{{main_goal}}

# TERMINAL COMMANDS
{{terminal_commands}}
`,
  // This object now serves as placeholders. Actual values will be injected at runtime.
  dynamicVariables: {
    corePersonalityPrompt: `Core personality prompt here`,
    current_timestamp: `Current timestamp here`,
    main_goal: `Main goal here`,
    terminal_commands: `Terminal Commands import here`,
    ticker: `Ticker here`,
    tickerName: `Ticker name here`,
    additional_dynamic_variables: ``
  },
};