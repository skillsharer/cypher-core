import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { agentEventBus } from '../utils/agentEventBus';
import * as WebSocket from 'ws';
import { Agent } from '../agents/Agent';

const agentsMap: Record<string, Agent> = {};

/**
 * Allows external code (like manualBackrooms.ts) to register an agent instance
 * so that the GUI can interact with it.
 */
export function registerAgentInstance(agentId: string, agentInstance: Agent) {
  agentsMap[agentId] = agentInstance;
}

export class LoggerServer {
  private server!: http.Server;
  private wss!: WebSocket.Server;
  private port: number;
  private wsPort: number;

  constructor(port: number = 3000, wsPort: number = 3001) {
    this.port = port;
    this.wsPort = wsPort;
    this.setupHttpServer();
    this.setupWebSocketServer();
  }

  private setupHttpServer() {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    const mimeTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css'
    };

    this.server = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      const url = req.url || '';
      const method = req.method || 'GET';

      if (method === 'GET') {
        if (url === '/agents') {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify(agentEventBus.getAllAgents().map(a => ({ id: a.id, name: a.name }))));
          return;
        }

        const agentMatch = url.match(/^\/agent\/([^/]+)\/(.+)$/);
        if (agentMatch) {
          const agentId = agentMatch[1];
          const endpoint = agentMatch[2];

          const agentInfo = agentEventBus.getAgent(agentId);
          if (!agentInfo) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ error: 'Agent not found' }));
            return;
          }

          if (endpoint === 'system-prompt') {
            res.writeHead(200, { 'Content-Type': 'text/plain', ...corsHeaders });
            res.end(agentInfo.systemPrompt);
            return;
          }

          if (endpoint === 'chat-history') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify(agentInfo.chatHistory));
            return;
          }

          if (endpoint === 'ai-response') {
            res.writeHead(200, { 'Content-Type': 'text/plain', ...corsHeaders });
            res.end(agentInfo.aiResponse);
            return;
          }

          if (endpoint === 'logs') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify(Logger.getLogs()));
            return;
          }

          if (endpoint === 'last-run-data') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify(agentInfo.lastRunData || {}));
            return;
          }
        }

        // Serve GUI files
        let filePath = url === '/' ? '/loggerGUI.html' : url;
        filePath = path.join(__dirname, filePath);

        const extname = path.extname(filePath);
        const contentType = mimeTypes[extname] || 'text/plain';

        try {
          const content = fs.readFileSync(filePath);
          res.writeHead(200, {
            'Content-Type': contentType,
            ...corsHeaders
          });
          res.end(content);
        } catch (error) {
          res.writeHead(404, corsHeaders);
          res.end('Not Found');
        }
        return;
      }

      if (method === 'POST') {
        const agentMatch = url.match(/^\/agent\/([^/]+)\/message$/);
        if (agentMatch) {
          const agentId = agentMatch[1];
          const agentInfo = agentEventBus.getAgent(agentId);

          if (!agentInfo) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ error: 'Agent not found' }));
            return;
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const message = data.message;
              if (!message) {
                res.writeHead(400, corsHeaders);
                res.end(JSON.stringify({ error: 'No message provided' }));
                return;
              }

              const agentInstance = agentsMap[agentId];
              if (!agentInstance) {
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({ error: 'Agent instance not available' }));
                return;
              }

              agentInstance.addUserMessage(message);
              const result = await agentInstance.run();

              res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
              res.end(JSON.stringify({ success: result.success, output: result.output }));
            } catch (err) {
              console.error('Error processing POST message:', err);
              res.writeHead(500, corsHeaders);
              res.end(JSON.stringify({ error: 'Internal server error' }));
            }
          });
          return;
        }

        res.writeHead(404, corsHeaders);
        res.end('Not Found');
        return;
      }

      res.writeHead(404, corsHeaders);
      res.end('Not Found');
    });

    this.server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${this.port} is already in use. Logger GUI server may already be running.`);
      } else {
        console.error('Logger GUI server error:', error);
      }
    });
  }

  private setupWebSocketServer() {
    this.wss = new WebSocket.Server({ port: this.wsPort });

    this.wss.on('connection', (ws) => {
      const agents = agentEventBus.getAllAgents();
      ws.send(JSON.stringify({ type: 'agents', agents }));

      const chatHistoryUpdatedHandler = (data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'chatHistoryUpdated', ...data }));
        }
      };

      const systemPromptUpdatedHandler = (data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'systemPromptUpdated', ...data }));
        }
      };

      const aiResponseUpdatedHandler = (data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'aiResponseUpdated', ...data }));
        }
      };

      const agentLastRunDataUpdatedHandler = (data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'agentLastRunDataUpdated', ...data }));
        }
      };

      const newAgentSessionHandler = (data: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'newAgentSession', ...data }));
        }
      };

      const logHandler = (log: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'logAdded', log }));
        }
      };

      agentEventBus.on('chatHistoryUpdated', chatHistoryUpdatedHandler);
      agentEventBus.on('systemPromptUpdated', systemPromptUpdatedHandler);
      agentEventBus.on('aiResponseUpdated', aiResponseUpdatedHandler);
      agentEventBus.on('agentLastRunDataUpdated', agentLastRunDataUpdatedHandler);
      agentEventBus.on('newAgentSession', newAgentSessionHandler);
      Logger.on('log', logHandler);

      ws.on('close', () => {
        agentEventBus.removeListener('chatHistoryUpdated', chatHistoryUpdatedHandler);
        agentEventBus.removeListener('systemPromptUpdated', systemPromptUpdatedHandler);
        agentEventBus.removeListener('aiResponseUpdated', aiResponseUpdatedHandler);
        agentEventBus.removeListener('agentLastRunDataUpdated', agentLastRunDataUpdatedHandler);
        agentEventBus.removeListener('newAgentSession', newAgentSessionHandler);
        Logger.removeListener('log', logHandler);
      });
    });
  }

  public start() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.server.listen(this.port, () => {
          console.log(`Logger GUI available at http://localhost:${this.port}`);
          console.log(`Logger API available at http://localhost:${this.port}/logs`);
          console.log(`Agents endpoint: http://localhost:${this.port}/agents`);
          resolve();
        });
      } catch (error) {
        console.error('Failed to start logger GUI server:', error);
        reject(error);
      }
    });
  }

  public stop() {
    return new Promise<void>((resolve, reject) => {
      try {
        let wssClosed = !this.wss; // If wss is undefined, consider it closed
        let serverClosed = !this.server; // If server is undefined, consider it closed

        const tryResolve = () => {
          if (wssClosed && serverClosed) {
            console.log('Logger GUI server stopped');
            resolve();
          }
        };

        if (!wssClosed) {
          this.wss.close(() => {
            wssClosed = true;
            tryResolve();
          });
        }

        if (!serverClosed) {
          this.server.close(() => {
            serverClosed = true;
            tryResolve();
          });
        }

        // In case servers are already closed
        tryResolve();
      } catch (error) {
        console.error('Failed to stop logger GUI server:', error);
        resolve(); // Proceed even if there's an error
      }
    });
  }
}

export function createLoggerServer(port?: number, wsPort?: number) {
  return new LoggerServer(port, wsPort);
}
