# Cypher Core System Documentation

<img width="1728" alt="image (2)" src="https://github.com/user-attachments/assets/e353452f-5db0-4143-a309-b6a65335ba1d" />

## Introduction

Cypher Core is a flexible and modular framework for building AI agents that can:

- Chat naturally
- Utilize tools (function calling)
- Produce structured JSON outputs validated by schemas
- Operate continuously and autonomously (via ```TerminalCore```), running commands and interacting with a "world" environment.

This framework emphasizes modularity and ease of customization. Agents are defined through YAML files rather than hard-coded configurations, making it simple to swap in your own agent definitions and personalities without touching the underlying code.

## High-Level Architecture

1. **Personality & Configuration via YAML**:  
  Each agent is defined entirely in a single ```.yaml``` file, which includes:
   - Agent name & description
   - Model/client selection
   - System prompt with embedded references to global personality variables
   - Main goals and dynamic variables
   - Tools (function-calling capabilities, if any)
   - Optional structured output schemas

   Additionally, a global ```personality.yaml``` file holds shared personality traits or variables. Agent YAML files can reference these global variables dynamically using placeholders like ```{{from_personality:core_personality}}```.

2. **BaseAgent**:  
   A foundational class that:
   - Manages chat history
   - Interacts with the model (OpenAI, Anthropic, Fireworks)
   - Optionally uses tools or returns structured outputs (via JSON schemas)

3. **TerminalCore (Autonomous Runtime)**:  
   A loop-based runtime that continuously runs an agent, allowing it to:
   - Issue terminal commands (tools)
   - Interact with features that introduce new commands
   - Operate indefinitely, enabling fully autonomous behavior

4. **GUI & Logger**:  
   A built-in GUI allows you to monitor your agent’s behavior, view logs, system prompts, and last run data in real-time.

## Setting Up Your Agent

### 1. Loading Agents

There are two main ways to load agent configurations:

#### Option 1: Direct Config Path
Specify the exact path to your agent's YAML config file:

```typescript
import { Agent } from 'cypher-core';

const myAgent = new Agent({ 
  agentConfigPath: './my_agents/mySpecialAgent.yaml' 
});
const result = await myAgent.run("Hello");
```

#### Option 2: Load by Agent Name
Load an agent by name, which will search in your local agents directory and fall back to built-in agents:

```typescript
import { Agent } from 'cypher-core';

const myAgent = new Agent({ agentName: "MyAgent" });
const result = await myAgent.run("Hello");
```

**Built-in Fallbacks**: When using `agentName: "TerminalAgent"` or `agentName: "ChatAgent"`, Cypher Core will automatically use the built-in configurations if no custom configs are found.

### 2. Configuration and Environment

You can customize the agent loading behavior using environment variables:

```bash
# Set custom directories for agents and personality
export AGENTS_DIR=./my_custom_agents
export PERSONALITY_PATH=./my_custom_agents/personality.yaml
```

### 3. The `personality.yaml` File

A global file defining the core personality and any other variables you want available to all agents.

```yaml
core_personality: "This is the shared core personality that all agents can reference."
```

### 4. Defining an Agent in YAML

Example `myAgent.yaml`:

```yaml
name: "MyAgent"
description: "An agent specialized in friendly conversations."
client: "openai"
model: "gpt-4o"

personality: "{{from_personality:core_personality}}"
main_goal: "Help the user with general information"

system_prompt: |
  # PERSONALITY
  {{personality}}

  # MAIN GOAL
  {{main_goal}}

  {{additional_info}}

dynamic_variables:
  additional_info: "No additional info at this time."

output_schema: null
tools: []
```

In this example:

- ```{{from_personality:core_personality}}``` pulls the ```core_personality``` value from ```personality.yaml```.
- You can easily adjust ```tools``` or ```output_schema``` if needed.

### 5. Running the Agent

```typescript
import { Agent } from 'cypher-core'; // hypothetical package name

const myAgent = new Agent({ agentName: "myAgent" }); // Matches the filename myAgent.yaml
const result = await myAgent.run("Hello there!");
if (result.success) {
  console.log("Agent response:", result.output);
} else {
  console.error("Agent error:", result.error);
}
```

## TerminalCore Integration for Autonomy

To run agents continuously:

1. Create ```terminalAgent.yaml```:

```yaml
name: "terminalAgent"
description: "Agent with terminal capabilities"
client: "fireworks"
model: "accounts/fireworks/models/llama-v3p1-405b-instruct"

personality: "{{from_personality:core_personality}}"
main_goal: "Continuously perform tasks and gather information."

system_prompt: |
  You are an intelligent AI agent that is hooked up to a terminal in which you can freely run commands.
  This terminal acts as your world interface, and is equipped with tools to interact with the real world.

  # PERSONALITY
  {{personality}}

  # MAIN GOAL
  {{main_goal}}

  {{additional_dynamic_variables}}

  # TERMINAL COMMANDS
  {{terminal_commands}}

dynamic_variables:
  terminal_commands: "{{from_terminal_commands}}"
  additional_dynamic_variables: ""

output_schema:
  type: object
  properties:
    internal_thought:
      type: string
      description: "Your internal reasoning process about the next commands to run."
    plan:
      type: string
      description: "A short plan of what to do next."
    terminal_commands:
      type: string
      description: "The full terminal command to execute, including all arguments and options."
  required:
    - internal_thought
    - plan
    - terminal_commands

tools: []
```

2. Run with ```TerminalCore```:

```typescript
import { TerminalCore } from 'cypher-core';
import InternetFeature from 'cypher-core/features/internet';

const core = new TerminalCore({
  maxActions: 10,
  actionCooldownMs: 10000,
  features: [InternetFeature],
});

// This lets us extract individual messages per iteration
core.on('loop:iteration', (messages) => {
  console.log('Iteration messages:', messages);
});

// This lets us extract the full history of the loop after it finishes (typically for memory purposes)
core.on('loop:maxActions', (fullHistory) => {
  console.log('Reached max actions for this cycle');
});

await core.init();

// This lets us set dynamic variables before starting the loop, can add any variables you want to be available to the agent
core.setDynamicVariables({
  additional_dynamic_variables: "## CURRENT SUMMARIES OF YOUR RECENT ACTIVITY\n\nSomething happened"
});

await core.runLoop();
```

## Using the GUI Logger

This spins up a local server that you can visit at ```http://localhost:3000``` to view the logs and messages of your agent.
ANY agent defined in a run will automatically show up in the GUI.

```typescript
import { createLoggerServer, Logger } from 'cypher-core';

Logger.enable();
Logger.setLevel('debug');

const loggerServer = createLoggerServer();
await loggerServer.start(); // Visit http://localhost:3000
```