import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface AgentDefinition {
  name: string;
  description?: string;
  client: string;
  model: string;
  system_prompt: string;
  main_goal?: string;
  dynamic_variables?: Record<string, string>;
  output_schema?: any;
  tools?: any[];
}

interface PersonalityDefinition {
  [key: string]: string;
}

const AGENTS_DIR = path.resolve(__dirname);

let personality: PersonalityDefinition | null = null;

export function loadPersonality(): PersonalityDefinition {
  if (personality) return personality;
  const personalityPath = path.join(AGENTS_DIR, 'personality.yaml');
  if (!fs.existsSync(personalityPath)) {
    throw new Error(`personality.yaml not found in ${AGENTS_DIR}`);
  }
  personality = yaml.load(fs.readFileSync(personalityPath, 'utf8')) as PersonalityDefinition;
  return personality;
}

export function loadAgentDefinition(agentName: string): AgentDefinition {
  const agentPath = path.join(AGENTS_DIR, `${agentName}.yaml`);
  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent YAML definition not found: ${agentPath}`);
  }
  const raw = yaml.load(fs.readFileSync(agentPath, 'utf8')) as AgentDefinition;

  // Resolve {{from_personality:VAR}} placeholders
  const personalityDef = loadPersonality();
  function resolvePlaceholders(value: string): string {
    const fromPersonalityMatch = value.match(/{{from_personality:(.*?)}}/);
    if (fromPersonalityMatch) {
      const varName = fromPersonalityMatch[1].trim();
      if (!(varName in personalityDef)) {
        throw new Error(`Personality variable "${varName}" not found in personality.yaml`);
      }
      return value.replace(fromPersonalityMatch[0], personalityDef[varName]);
    }
    return value;
  }

  // Process dynamic_variables in agent YAML
  if (raw.dynamic_variables) {
    for (const [key, val] of Object.entries(raw.dynamic_variables)) {
      if (typeof val === 'string') {
        raw.dynamic_variables[key] = resolvePlaceholders(val);
      }
    }
  }

  // Also resolve placeholders in system_prompt and main_goal if present
  if (raw.system_prompt) {
    raw.system_prompt = resolvePlaceholders(raw.system_prompt);
  }
  if (raw.main_goal) {
    raw.main_goal = resolvePlaceholders(raw.main_goal);
  }

  return raw;
}