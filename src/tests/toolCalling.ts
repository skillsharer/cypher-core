import { Agent } from '../agents/Agent';
import { Logger } from '../util/logger';
import { createLoggerServer } from '../gui/loggerServer';

// Enable logging for clarity in test output
Logger.enable();
Logger.setLevel('debug');

const loggerServer = createLoggerServer();
loggerServer.start();

(async () => {
  // In this test, we assume the model and keys are properly set up in your environment.
  // We'll load the ChatAgentParallel agent we just created.

  const agent = new Agent({ agentName: "toolAgent" });

  // We'll simulate a user asking about the weather in San Francisco and the time in Tokyo simultaneously.
  const userMessage = "Hey, can you tell me the weather in San Francisco and also the current time in Tokyo?";
  const result = await agent.run(userMessage);

  if (result.success) {
    console.log("Agent response:", result.output);
  } else {
    console.error("Agent error:", result.error);
  }

  // In a real scenario, you'd implement the tool execution logic in the agent code or model adapter.
  // For this test, we just show how to run the agent. The agent would produce tool calls that you'd intercept,
  // execute, and then feed back the results.
})();