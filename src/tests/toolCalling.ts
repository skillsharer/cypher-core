import { Agent } from '../agents/Agent';
import { Logger } from '../utils/logger';
import { createLoggerServer } from '../gui/loggerServer';
import { FunctionCall } from '../types/agentSystem';

// This is an example of how to simulate tool calling in an agent. API calls are simulated by adding messages to the agent.

Logger.enable();
Logger.setLevel('debug');

const loggerServer = createLoggerServer();
loggerServer.start();

(async () => {
  const agent = new Agent({ agentName: "toolAgent" });

  const userMessage = "Hey, can you tell me the weather in San Francisco and also the current time in Tokyo?";
  const result = await agent.run(userMessage);

  if (result.success) {
    console.log("Initial Agent response:", result.output);

    const resultWithFunctionCalls = result as { success: boolean; output: any; error?: string; functionCalls?: FunctionCall[] };

    // Check if we have function calls that need to be executed.
    if (resultWithFunctionCalls.functionCalls && resultWithFunctionCalls.functionCalls.length > 0) {
      // Simulate executing the tools externally:
      for (const call of resultWithFunctionCalls.functionCalls) {
        if (call.functionName === "get_weather") {
          // Simulate calling weather API
          const apiResult = { weather: "Sunny, 20°C" };
          // Feed the result back to the agent as a tool response
          agent.addUserMessage(JSON.stringify(apiResult));
        } else if (call.functionName === "get_time") {
          // Simulate calling time API
          const apiResult = { time: "2024-12-15T09:23:00Z" };
          agent.addUserMessage(JSON.stringify(apiResult));
        }
      }

      // Now re-run the agent so it can use these tool results to produce a final answer:
      const finalResult = await agent.run();
      if (finalResult.success) {
        console.log("Final Agent response with tool results:", finalResult.output);
      } else {
        console.error("Agent error on final run:", finalResult.error);
      }
    } else {
      console.log("No function calls to execute.");
    }
  } else {
    console.error("Agent error:", result.error);
  }
})();