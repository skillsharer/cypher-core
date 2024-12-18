import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { agentEventBus } from '../utils/agentEventBus';
import * as WebSocket from 'ws';

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

    this.server = http.createServer((req, res) => {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      // API endpoints
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

          const agent = agentEventBus.getAgent(agentId);
          if (!agent) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ error: 'Agent not found' }));
            return;
          }

          if (endpoint === 'system-prompt') {
            res.writeHead(200, { 'Content-Type': 'text/plain', ...corsHeaders });
            res.end(agent.systemPrompt);
            return;
          }

          if (endpoint === 'chat-history') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify(agent.chatHistory));
            return;
          }

          if (endpoint === 'ai-response') {
            res.writeHead(200, { 'Content-Type': 'text/plain', ...corsHeaders });
            res.end(agent.aiResponse);
            return;
          }

          if (endpoint === 'logs') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify(Logger.getLogs()));
            return;
          }

          if (endpoint === 'last-run-data') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify(agent.lastRunData || {}));
            return;
          }
        }

        // Serve the GUI files
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

      res.writeHead(404, corsHeaders);
      res.end('Not Found');
    });

    // Add error handling
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
      // Send initial state
      const agents = agentEventBus.getAllAgents();
      ws.send(JSON.stringify({ type: 'agents', agents }));

      // Define event handlers specific to this connection
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

      const logHandler = (log: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'logAdded', log }));
        }
      };

      // Add event listeners
      agentEventBus.on('chatHistoryUpdated', chatHistoryUpdatedHandler);
      agentEventBus.on('systemPromptUpdated', systemPromptUpdatedHandler);
      agentEventBus.on('aiResponseUpdated', aiResponseUpdatedHandler);
      agentEventBus.on('agentLastRunDataUpdated', agentLastRunDataUpdatedHandler);
      Logger.on('log', logHandler);

      // Remove listeners when the WebSocket connection closes
      ws.on('close', () => {
        agentEventBus.removeListener('chatHistoryUpdated', chatHistoryUpdatedHandler);
        agentEventBus.removeListener('systemPromptUpdated', systemPromptUpdatedHandler);
        agentEventBus.removeListener('aiResponseUpdated', aiResponseUpdatedHandler);
        agentEventBus.removeListener('agentLastRunDataUpdated', agentLastRunDataUpdatedHandler);
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
        this.wss.close(() => {
          this.server.close(() => {
            console.log('Logger GUI server stopped');
            resolve();
          });
        });
      } catch (error) {
        console.error('Failed to stop logger GUI server:', error);
        reject(error);
      }
    });
  }
}

// Export a function to create the server
export function createLoggerServer(port?: number, wsPort?: number) {
  return new LoggerServer(port, wsPort);
}