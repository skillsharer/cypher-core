document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('logs');
    const toggleLogsButton = document.getElementById('toggleLogsButton');
    const aiResponseContainer = document.getElementById('aiResponseContainer');
    const chatHistoryContainer = document.getElementById('chatHistoryContainer');
    const systemPromptDisplay = document.getElementById('systemPromptDisplay');
    const agentTabs = document.getElementById('agentTabs');
    const chatArea = document.getElementById('chatArea');
    const toggleRawInputButton = document.getElementById('toggleRawInputButton');
    const rawInputContainer = document.getElementById('rawInputContainer');
    const refreshButton = document.getElementById('refreshButton');

    let currentAgentId = null;
    let logsVisible = localStorage.getItem('logsVisible') === 'true';

    const logLevels = {
      error: localStorage.getItem('logLevel_error') === 'true' || true,
      info: localStorage.getItem('logLevel_info') === 'true' || true,
      debug: localStorage.getItem('logLevel_debug') === 'true' || true
    };

    function updateLogLevelUI() {
      const levels = document.querySelectorAll('.log-level-toggle');
      levels.forEach(level => {
        const levelName = level.dataset.level;
        level.classList.toggle('active', logLevels[levelName]);
      });
    }

    function toggleLogLevel(level) {
      logLevels[level] = !logLevels[level];
      localStorage.setItem(`logLevel_${level}`, logLevels[level]);
      updateLogLevelUI();
      updateUI();
    }

    const filterContainer = document.createElement('div');
    filterContainer.className = 'log-level-filters';
    ['error', 'info', 'debug'].forEach(level => {
      const button = document.createElement('button');
      button.className = 'log-level-toggle';
      button.dataset.level = level;
      button.textContent = level.toUpperCase();
      button.addEventListener('click', () => toggleLogLevel(level));
      filterContainer.appendChild(button);
    });

    const oldLogLevelFilter = document.getElementById('logLevelFilter');
    if (oldLogLevelFilter && oldLogLevelFilter.parentNode) {
      oldLogLevelFilter.parentNode.replaceChild(filterContainer, oldLogLevelFilter);
    }

    if (logsVisible) {
      logContainer.parentElement.classList.remove('hidden');
      toggleLogsButton.textContent = 'Hide Logs';
    } else {
      logContainer.parentElement.classList.add('hidden');
      toggleLogsButton.textContent = 'Show Logs';
    }

    async function fetchAgents() {
      try {
        const response = await fetch('http://localhost:3000/agents');
        if (!response.ok) {
          console.error('Failed to fetch agents:', response.statusText);
          return [];
        }
        const agents = await response.json();
        return agents;
      } catch (error) {
        console.error('Error fetching agents:', error);
        return [];
      }
    }

    async function fetchSystemPrompt(agentId) {
      try {
        const response = await fetch(`http://localhost:3000/agent/${agentId}/system-prompt`);
        if (!response.ok) {
          console.error('Failed to fetch system prompt:', response.statusText);
          return '';
        }
        const prompt = await response.text();
        return prompt;
      } catch (error) {
        console.error('Error fetching system prompt:', error);
        return '';
      }
    }

    async function fetchChatHistory(agentId) {
      try {
        const response = await fetch(`http://localhost:3000/agent/${agentId}/chat-history`);
        if (!response.ok) {
          console.error('Failed to fetch chat history:', response.statusText);
          return [];
        }
        const messages = await response.json();
        console.log('Fetched chat history:', messages);
        return messages;
      } catch (error) {
        console.error('Error fetching chat history:', error);
        return [];
      }
    }

    async function fetchAIResponse(agentId) {
      try {
        const response = await fetch(`http://localhost:3000/agent/${agentId}/ai-response`);
        if (!response.ok) {
          console.error('Failed to fetch AI response:', response.statusText);
          return '';
        }
        const aiResponse = await response.text();
        return aiResponse || 'No AI response available yet.';
      } catch (error) {
        console.error('Error fetching AI response:', error);
        return '';
      }
    }

    async function fetchLogs(agentId) {
      try {
        const response = await fetch(`http://localhost:3000/agent/${agentId}/logs`);
        if (!response.ok) {
          console.error('Failed to fetch logs:', response.statusText);
          return [];
        }
        const logs = await response.json();
        return logs;
      } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
      }
    }

    async function fetchLastRunData(agentId) {
      try {
        const response = await fetch(`http://localhost:3000/agent/${agentId}/last-run-data`);
        if (!response.ok) {
          console.error('Failed to fetch last run data:', response.statusText);
          return {};
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching last run data:', error);
        return {};
      }
    }

    function renderLogs(logs) {
      logContainer.innerHTML = '';

      if (logs.length === 0) {
        logContainer.innerHTML = '<div class="log-entry">No logs available</div>';
        return;
      }

      logs.forEach((log) => {
        if (!logLevels[log.level]) return;
        
        const div = document.createElement('div');
        div.className = `log-entry ${log.level}`;
        div.innerHTML = `
          <span class="timestamp">${log.timestamp}</span>
          [${log.level.toUpperCase()}]
          ${log.messages.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' ')}
        `;
        logContainer.appendChild(div);
      });
    }

    function renderChatHistory(messages) {
      chatHistoryContainer.innerHTML = '';
      if (messages.length === 0) {
        chatHistoryContainer.innerHTML = '<div>No chat history</div>';
        return;
      }

      messages.forEach((msg) => {
        const div = document.createElement('div');
        div.className = `chat-message ${msg.role}`;
        div.innerHTML = `<strong>${msg.role.toUpperCase()}:</strong> ${msg.content || '[No Content]'}`;
        chatHistoryContainer.appendChild(div);
      });
    }

    function renderMainChat(messages) {
      chatArea.innerHTML = '';
      const chatMessages = messages.filter(m => m.role !== 'system');

      if (chatMessages.length === 0) {
        chatArea.innerHTML = '<div>No chat messages</div>';
        return;
      }

      chatMessages.forEach((msg, index) => {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${msg.role}`;
        messageDiv.innerHTML = `<strong>${msg.role.toUpperCase()}:</strong> ${msg.content || '[No Content]'}`;

        messageGroup.appendChild(messageDiv);

        if (msg.role === 'assistant' && msg.runData) {
          // Add token usage if available
          if (msg.runData.tokenUsage) {
            const tokenUsage = msg.runData.tokenUsage;
            const usageDiv = document.createElement('div');
            usageDiv.className = 'token-usage';
            
            // Support both OpenAI and Anthropic token usage formats
            const promptTokens = tokenUsage.prompt_tokens || tokenUsage.input_tokens;
            const completionTokens = tokenUsage.completion_tokens || tokenUsage.output_tokens;
            const totalTokens = tokenUsage.total_tokens || (promptTokens + completionTokens);

            usageDiv.innerHTML = `
              <em>Tokens used - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}</em>
            `;
            messageDiv.appendChild(usageDiv);
          }

          // Add raw input button
          const rawInputButton = document.createElement('button');
          rawInputButton.className = 'raw-input-button';
          rawInputButton.textContent = 'Show Raw Input';

          const rawInputContainer = document.createElement('div');
          rawInputContainer.className = 'raw-input-container hidden';
          rawInputContainer.innerHTML = `<pre>${JSON.stringify(msg.runData, null, 2)}</pre>`;

          rawInputButton.addEventListener('click', () => {
            const isHidden = rawInputContainer.classList.contains('hidden');
            rawInputContainer.classList.toggle('hidden');
            rawInputButton.textContent = isHidden ? 'Show Raw Input' : 'Hide Raw Input';
          });

          messageGroup.appendChild(rawInputButton);
          messageGroup.appendChild(rawInputContainer);
        }

        chatArea.appendChild(messageGroup);
      });
    }

    function toggleLogsVisibility() {
      logsVisible = !logsVisible;
      localStorage.setItem('logsVisible', logsVisible);
      if (logsVisible) {
        logContainer.parentElement.classList.remove('hidden');
        toggleLogsButton.textContent = 'Hide Logs';
      } else {
        logContainer.parentElement.classList.add('hidden');
        toggleLogsButton.textContent = 'Show Logs';
      }
    }

    async function updateUI() {
      if (!currentAgentId) return;

      const [prompt, messages, aiResponse, logs] = await Promise.all([
        fetchSystemPrompt(currentAgentId),
        fetchChatHistory(currentAgentId),
        fetchAIResponse(currentAgentId),
        fetchLogs(currentAgentId),
      ]);

      console.log('Fetched messages:', messages);

      systemPromptDisplay.textContent = prompt || 'No system prompt available.';
      renderChatHistory(messages);
      renderMainChat(messages);
      aiResponseContainer.textContent = aiResponse || 'No AI response available.';
      renderLogs(logs);

      rawInputContainer.innerHTML = `<pre>${JSON.stringify(lastRunData, null, 2)}</pre>`;
    }

    function renderAgentTabs(agents) {
      agentTabs.innerHTML = '';
      if (agents.length === 0) {
        agentTabs.innerHTML = '<div class="agent-tab">No Agents Found</div>';
        return;
      }

      agents.forEach((agent) => {
        const tab = document.createElement('div');
        tab.className = 'agent-tab' + (agent.id === currentAgentId ? ' selected' : '');
        tab.textContent = agent.name || `Agent ${agent.id}`;
        tab.addEventListener('click', () => {
          currentAgentId = agent.id;
          document.querySelectorAll('.agent-tab').forEach(t => t.classList.remove('selected'));
          tab.classList.add('selected');
          updateUI();
        });
        agentTabs.appendChild(tab);
      });
    }

    refreshButton.addEventListener('click', updateUI);
    toggleLogsButton.addEventListener('click', toggleLogsVisibility);

    (async () => {
      const agents = await fetchAgents();
      if (agents.length > 0) {
        currentAgentId = agents[0].id;
      }
      renderAgentTabs(agents);
      await updateUI();
      setInterval(updateUI, 5000);
    })();

    const ws = new WebSocket('ws://localhost:3001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket received:', data);

      switch (data.type) {
        case 'agents':
          renderAgentTabs(data.agents);
          break;
        case 'chatHistoryUpdated':
          if (data.agentId === currentAgentId) {
            console.log('Updating chat history with:', data.messages);
            renderChatHistory(data.messages);
            renderMainChat(data.messages);
          }
          break;
        case 'systemPromptUpdated':
          if (data.agentId === currentAgentId) {
            systemPromptDisplay.textContent = data.prompt;
          }
          break;
        case 'aiResponseUpdated':
          if (data.agentId === currentAgentId) {
            aiResponseContainer.textContent = data.response;
          }
          break;
        case 'logAdded':
          if (logLevels[data.log.level]) {
            appendLog(data.log);
          }
          break;
        case 'newAgentSession':
          fetchAgents().then(agents => {
            renderAgentTabs(agents);
            currentAgentId = data.agent.id;
            updateUI();
          });
          break;
        case 'agentLastRunDataUpdated':
          if (data.agentId === currentAgentId) {
            rawInputContainer.innerHTML = `<pre>${JSON.stringify(data.data, null, 2)}</pre>`;
          }
          break;
      }
    };

    function appendLog(log) {
      const div = document.createElement('div');
      div.className = `log-entry ${log.level}`;
      div.innerHTML = `
        <span class="timestamp">${log.timestamp}</span>
        [${log.level.toUpperCase()}]
        ${log.messages.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' ')}
      `;
      logContainer.appendChild(div);
      logContainer.scrollTop = logContainer.scrollHeight;
    }

    updateLogLevelUI();

    toggleRawInputButton.addEventListener('click', () => {
      if (rawInputContainer.classList.contains('hidden')) {
        rawInputContainer.classList.remove('hidden');
        toggleRawInputButton.textContent = 'Hide Raw Input';
      } else {
        rawInputContainer.classList.add('hidden');
        toggleRawInputButton.textContent = 'Show Raw Input';
      }
    });

    // Add debounce utility
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Modify the updateUI call in the interval
    const debouncedUpdateUI = debounce(updateUI, 1000);
    setInterval(debouncedUpdateUI, 5000);
});