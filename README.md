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
   Agents no longer require multiple separate files for personality, prompts, and config. Each agent is defined entirely in a single ```.yaml``` file, which includes:
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

## Why YAML?

**Modularity & Ease of Use**:  
By defining agents entirely in YAML, you avoid scattering configurations across multiple files. This approach lets you drop in a single ```.yaml``` file to define a new agent, or edit an existing YAML file to tweak behavior and personality. The personality and global variables are in ```personality.yaml```, and each agent (like ```terminalAgent.yaml```) references these shared variables dynamically.

**Developer & User-Friendly**:  
If this is a distributed package, your users can create their own ```personality.yaml``` and ```MyCustomAgent.yaml``` in a specified directory (or pass a path) without modifying source code. They can then run the system and immediately have a custom agent personality, behavior, and goals.

## Setting Up Your Agent

### 1. The ```personality.yaml``` File

A global file defining the core personality and any other variables you want available to all agents.

```yaml
core_personality: "This is the shared core personality that all agents can reference."
```

### 2. Defining an Agent in One YAML File

Example ```myAgent.yaml```:

```yaml
name: "MyAgent"
description: "An agent specialized in friendly conversations."
client: "openai"
model: "gpt-4"

system_prompt: |
  # PERSONALITY
  {{core_personality}}

  # MAIN GOAL
  {{main_goal}}

  {{additional_info}}

main_goal: "Help the user with general information"

dynamic_variables:
  core_personality: "{{from_personality:core_personality}}"
  main_goal: "Be as helpful and friendly as possible."
  additional_info: "No additional info at this time."

output_schema: null
tools: []
```

In this example:

- ```{{from_personality:core_personality}}``` pulls the ```core_personality``` value from ```personality.yaml```.
- You can easily adjust ```tools``` or ```output_schema``` if needed.

### 3. Running the Agent

```typescript
import { Agent } from 'cypher-core'; // hypothetical package name

const myAgent = new Agent("myAgent"); // Matches the filename myAgent.yaml
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
client: "openai"
model: "gpt-4o"

system_prompt: |
  # PERSONALITY
  {{core_personality}}

  # MAIN GOAL
  {{main_goal}}

  {{additional_dynamic_variables}}

  # TERMINAL COMMANDS
  {{terminal_commands}}

main_goal: "Continuously perform tasks and gather information."

dynamic_variables:
  core_personality: "{{from_personality:core_personality}}"
  main_goal: "{{from_main_goal_config}}"
  additional_dynamic_variables: ""
  terminal_commands: "{{from_terminal_commands}}"

output_schema:
  type: object
  properties:
    internal_thought:
      type: string
    plan:
      type: string
    terminal_commands:
      type: string
  required: ["internal_thought", "plan", "terminal_commands"]

tools: []
```

2. Run with ```TerminalCore```:

```typescript
import { TerminalCore } from 'cypher-core';
import InternetFeature from 'cypher-core/features/internet';

const core = new TerminalCore({
  agentName: "terminalAgent",
  maxActions: 10,
  actionCooldownMs: 10000,
  features: [InternetFeature],
});

core.on('loop:iteration', (messages) => {
  console.log('Iteration messages:', messages);
});

core.on('loop:maxActions', (fullHistory) => {
  console.log('Reached max actions for this cycle');
});

await core.init();

core.setDynamicVariables({
  additional_dynamic_variables: "## CURRENT SUMMARIES OF YOUR RECENT ACTIVITY\n\nSomething happened"
});

await core.runLoop();
```

## Using the GUI Logger

```typescript
import { createLoggerServer, Logger } from 'cypher-core';

Logger.enable();
Logger.setLevel('debug');

const loggerServer = createLoggerServer();
await loggerServer.start(); // Visit http://localhost:3000
```

## Conclusion

- **Define personality globally** in ```personality.yaml```.
- **Define each agent in a single YAML file** (e.g. ```myAgent.yaml```, ```terminalAgent.yaml```).
- **No code changes required** to add a new agent—just add a new YAML file.
- **TerminalCore** allows continuous, autonomous operation.
- **GUI & Logging** provide real-time insights into agent behavior.

With YAML-based configuration, users can quickly customize and deploy their own agents with minimal overhead.