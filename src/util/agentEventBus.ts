// Manages communication between agents and the logger GUI
import { Message } from '../types/agentSystem';
import { EventEmitter } from 'events';

interface AgentInfo {
  id: string;
  name: string;
  systemPrompt: string;
  chatHistory: Message[];
  aiResponse: string | null;
  sessionStartTime: number;
  lastRunData?: any;
}

class AgentEventBus extends EventEmitter {
  private static instance: AgentEventBus;
  private activeAgents: Map<string, AgentInfo> = new Map();
  private agentCounter = 0;

  private constructor() {
    super();
  }

  static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }

  registerAgent(name: string = 'Agent'): string {
    this.agentCounter++;
    const id = `agent-${this.agentCounter}`;
    const sessionStartTime = Date.now();
    
    const agentInfo: AgentInfo = {
      id,
      name: `${name} ${this.agentCounter}`,
      systemPrompt: '',
      chatHistory: [],
      aiResponse: null,
      sessionStartTime,
      lastRunData: null
    };
    
    this.activeAgents.set(id, agentInfo);
    this.emit('newAgentSession', { agent: agentInfo });
    return id;
  }

  getAgent(agentId: string): AgentInfo | undefined {
    return this.activeAgents.get(agentId);
  }

  getAllAgents(): AgentInfo[] {
    return Array.from(this.activeAgents.values())
      .sort((a, b) => b.sessionStartTime - a.sessionStartTime);
  }

  updateAgentSystemPrompt(agentId: string, prompt: string) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.systemPrompt = prompt;
      this.emit('systemPromptUpdated', { agentId, prompt });
    }
  }

  updateAgentChatHistory(agentId: string, messages: Message[]) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.chatHistory = [...messages];
      this.emit('chatHistoryUpdated', { agentId, messages: agent.chatHistory });
    }
  }

  updateAgentResponse(agentId: string, response: string) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.aiResponse = response;
      this.emit('aiResponseUpdated', { agentId, response });
    }
  }

  updateAgentLastRunData(agentId: string, data: any) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.lastRunData = data;
      this.syncAgentChatHistory(agentId, data);
      this.emit('agentLastRunDataUpdated', { agentId, data });
    }
  }

  syncAgentChatHistory(agentId: string, lastRunData: any) {
    if (lastRunData?.messageHistory) {
      this.updateAgentChatHistory(agentId, lastRunData.messageHistory);
    }
  }
}

export const agentEventBus = AgentEventBus.getInstance(); 