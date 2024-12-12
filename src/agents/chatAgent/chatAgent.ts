import { BaseAgent } from '../baseAgent';
import { ModelClient } from '../../types/agentSystem';
import { generateSystemPrompt } from '../corePersonality';
import { AgentConfig } from '../../types/agentSystem';

// Configuration for chat agent following terminal agent pattern
const chatAgentConfig: AgentConfig = {
  name: 'ChatAgent',
  description: 'A chat agent designed to have natural conversations with other AI agents.',
  systemPromptTemplate: `
# PERSONALITY
{{corePersonalityPrompt}}

# MAIN GOAL
You are a chat agent designed to have natural conversations

# OUTPUT FORMAT
Respond naturally in a conversational manner while maintaining the personality defined above.
`,
  dynamicVariables: {
    corePersonalityPrompt: generateSystemPrompt(),
  },
};

// ChatAgent extends BaseAgent with no schema type (null)
export class ChatAgent extends BaseAgent<null> {
  constructor(modelClient: ModelClient) {
    super(chatAgentConfig, modelClient, null);
  }

  protected defineTools(): void {
    // No tools to define for basic chat functionality
  }
}