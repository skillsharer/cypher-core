# Cypher Core System Documentation

## Overview

Cypher Core is a flexible framework for building AI agents that can interact with various interfaces and external systems. It provides a structured way to define agent personalities, goals, tool usage (via function calls), and even fully autonomous, continuous operation through a "TerminalCore" loop. This system is designed to scale from simple chat agents to complex, multi-step, tool-using autonomous agents.

## Key Concepts

1. **BaseAgent**:  
   The foundation of all agents. Handles message history, model interactions, optional tool calls, and (optionally) structured outputs via JSON schemas.

2. **Model Adapters**:  
   Integrations for different AI backends (OpenAI, Anthropic, Fireworks). They normalize model inputs/outputs so you can switch providers easily.

3. **Tools (Function Calling)**:  
   Agents can call functions (tools) using OpenAI-style function calling schemas. Tools let the AI perform actions like searching the web, running terminal commands, or querying databases.

4. **Structured Outputs**:  
   Instead of returning free-form text, agents can return strictly typed JSON structures validated by Zod schemas. This ensures predictable, machine-readable responses.

5. **TerminalCore**:  
   A specialized runtime that continuously runs an agent in a loop. It leverages a "terminal" metaphor, letting your agent issue commands to interact with the world. You can add feature modules that introduce new terminal commands and functionalities.

6. **GUI Logger**:  
   A local GUI to view and monitor agent logs, system prompts, chat history, and last run data. Provides real-time insights for debugging and understanding agent behavior.

---

## 1. The Base Agent System

### How It Works

- **Message History Management**:  
  Each agent maintains a conversation history of user and assistant messages. The `BaseAgent` ensures all previous context is used for subsequent responses.

- **Model Interactions**:  
  The `BaseAgent` interacts with models through a `ModelClient` (e.g., `OpenAIClient`). Different model providers are supported (OpenAI, Anthropic, Fireworks).

- **Optional Tools & Structured Output**:  
  Agents can be configured in two primary modes:
  1. **Tool Mode**: The agent can call functions (tools) to perform actions.  
  2. **Schema Mode (Structured Output)**: The agent returns a strictly typed JSON object defined by a Zod schema, without calling tools.

You choose one approach based on your use case. A single agent typically either uses tools or returns a structured JSON response (though the system can handle both scenarios under different conditions).

### Creating an Agent with Tools (Function Calling)

**Step-by-Step:**

1. **Define a Tool Schema & Tool**:  
   Tools follow the OpenAI function calling format. Use Zod for validating the tool arguments/outputs.
   ```typescript
   import { z } from 'zod';

   // Define the schema for the tool's parameters/output
   const searchToolSchema = z.object({
     query: z.string()
   });

   // Define the tool itself
   const SearchTool = {
     type: 'function',
     function: {
       name: 'search_web',
       description: 'Search the web for a given query',
       parameters: {
         type: 'object',
         properties: {
           query: { type: 'string', description: 'The search query' }
         },
         required: ['query']
       }
     }
   };
   ```

2. **Create Agent Config**:  
   ```typescript
   import { AgentConfig } from './types/agentSystem';

   export const myAgentConfig: AgentConfig = {
     name: "MyAgent",
     description: "An agent that can search the web",
     systemPromptTemplate: `
     You are a helpful agent. The user might ask you to find information online.
     Use the 'search_web' function if needed.
     `
   };
   ```

3. **Implement the Agent Class**:  
   ```typescript
   import { BaseAgent } from './agents/baseAgent';
   import { searchToolSchema } from './myTools'; // from step 1
   import { ModelClient } from './types/agentSystem';

   export class MySearchAgent extends BaseAgent<typeof searchToolSchema> {
     constructor(modelClient: ModelClient) {
       super(myAgentConfig, modelClient, searchToolSchema);
     }

     protected defineTools(): void {
       this.tools = [SearchTool];
     }
   }
   ```

4. **Run the Agent**:
   ```typescript
   import { OpenAIClient } from './models/clients/OpenAiClient';
   import { MySearchAgent } from './MySearchAgent';

   const modelClient = new OpenAIClient(process.env.OPENAI_API_KEY, 'gpt-4');
   const agent = new MySearchAgent(modelClient);

   const result = await agent.run("Please find the top news on Bitcoin");
   if (result.success) {
     console.log('Agent Output:', result.output);
   } else {
     console.error('Error:', result.error);
   }
   ```

### Creating an Agent with Structured Outputs Only

For agents that must return strictly formatted JSON (no tools):

1. **Define a Zod Schema for the Output**:
   ```typescript
   import { z } from 'zod';

   const storySchema = z.object({
     title: z.string(),
     content: z.string()
   });
   ```

2. **Create Agent Config**:
   ```typescript
   import { AgentConfig } from './types/agentSystem';

   export const storyAgentConfig: AgentConfig = {
     name: "StoryAgent",
     description: "An agent that returns a story in structured JSON",
     systemPromptTemplate: `
     You are a story-telling agent. You must return your answer as a JSON object:
     {
       "title": "<string>",
       "content": "<string>"
     }
     `
   };
   ```

3. **Implement the Agent Class**:
   ```typescript
   import { BaseAgent } from './agents/baseAgent';
   import { storyAgentConfig } from './agentConfigs';
   import { storySchema } from './schemas/storySchema';
   import { ModelClient } from './types/agentSystem';

   export class StoryAgent extends BaseAgent<typeof storySchema> {
     constructor(modelClient: ModelClient) {
       super(storyAgentConfig, modelClient, storySchema); 
       // No tools defined
     }

     protected defineTools(): void {
       // No tools, pure structured output
     }
   }
   ```

4. **Use the Agent**:
   ```typescript
   const agent = new StoryAgent(modelClient);
   const result = await agent.run("Tell me a short story about a brave knight.");
   if (result.success) {
     console.log('Parsed Title:', result.output.title);
     console.log('Parsed Content:', result.output.content);
   } else {
     console.error('Failed to parse story:', result.error);
   }
   ```

---

## 2. The Terminal Core Extension

The `TerminalCore` is a special runtime designed for autonomous operation. It continuously runs an agent in a loop, allowing the agent to issue terminal commands to interact with the environment. Think of it as giving your agent a "world interface"—it can run commands, fetch data, and take actions, all from a loop that never ends.

- **Core of the System**:  
  TerminalCore turns your agent from a single-run assistant into a continuous, autonomous system. It manages looping, action limits, cooldowns, and integration with features.

- **Features**:  
  Features are modules that provide new terminal commands. For example, an `InternetFeature` might add a `search-web` command. The agent can then run `search-web "bitcoin news"` to gather data.

### Adding a New Feature (Terminal Command)

1. **Create a Feature**:
   ```typescript
   // src/features/myFeature.ts
   import { TerminalFeature } from './featureTypes';
   import { Command } from '../terminal/types/commands';

   const myCommand: Command = {
     name: 'get-mentions',
     description: 'Fetches the latest twitter mentions',
     handler: async () => {
       // Implement the logic for fetching mentions
       return { output: "Here are your mentions..." };
     }
   };

   const MyFeature: TerminalFeature = {
     async loadFeatureCommands(): Promise<Command[]> {
       return [myCommand];
     }
   };

   export default MyFeature;
   ```

2. **Add the Feature to TerminalCore**:
   ```typescript
   import MyFeature from './src/features/myFeature';

   const core = new TerminalCore({
     modelType: 'fireworks',
     modelName: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
     features: [MyFeature], // add your new feature here
   });

   await core.init();
   await core.runLoop();
   ```

3. **Result**:  
   The agent now knows about `get-mentions`. If the agent is configured to handle Twitter interactions, it can produce a structured output that includes the `get-mentions` command. TerminalCore executes it, returns the output, and the loop continues.

---

## 3. Starting the GUI to View Agent Logs

The system includes a built-in GUI for logs, system prompts, chat history, and last run data.

**Steps:**

1. **Start the Logger Server**:
   In your `index.ts` or main entry:
   ```typescript
   const loggerServer = createLoggerServer();
   await loggerServer.start();
   ```

2. **Open the GUI**:
   Navigate to `http://localhost:3000` in your browser.
   
   - See agents running
   - View system prompts, chat history, AI responses
   - Tail logs in real-time

3. **Monitor Your Agent**:
   As your agent operates, logs stream live. You see commands it runs, outputs produced, and the system prompt used.

---

## 4. Additional Tips and Best Practices

- **Dynamic Variables**:  
  Inject runtime variables into the system prompt by calling `core.setDynamicVariables({ ... })`.

- **Error Handling & Validation**:  
  For structured outputs, ensure the schema matches expected responses. Check `result.success` to handle errors gracefully.

- **Logging**:
   Use `Logger.setLevel('debug')` for deep troubleshooting, `Logger.disable()` to silence logs. Logs are critical for understanding agent reasoning.

- **Scaling Up**:
  Start simple (a basic chat agent), then add tools, then integrate TerminalCore for autonomy. Add features incrementally and test each step.

- **Continuous Running**:
  TerminalCore runs indefinitely. Adjust `maxActions` and `actionCooldownMs` to control frequency and pacing.

---

## Conclusion

Cypher Core gives you a robust foundation for advanced AI agents that do more than chat. By leveraging tools, structured outputs, and the continuous runtime environment of the `TerminalCore`, you can create agents that interact with external systems, maintain context, and run autonomously. The built-in GUI simplifies monitoring and debugging in real time.

This README should guide you through:

- Understanding the core `BaseAgent` system
- Creating agents that return structured JSON or call tools
- Using the `TerminalCore` for continuous autonomous operation
- Adding new features (terminal commands)
- Starting the GUI for real-time logging and debugging

With this setup, you're well on your way to building complex, stateful, and autonomous AI-driven applications.