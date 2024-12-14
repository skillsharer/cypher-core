// models/FireworkClient.ts

import OpenAI from 'openai'; // Firework API is OpenAI compatible
import { ModelClient, ModelType } from '../../types/agentSystem';

export class FireworkClient implements ModelClient {
  private client: OpenAI;
  private _modelName: string;
  private defaultParams: any;
  modelType: ModelType = 'fireworks';

  constructor(
    apiKey: string,
    modelName: string,
    params: any = {}
  ) {
    // Initialize client with provided API key instead of env
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.fireworks.ai/inference/v1',
    });

    this._modelName = modelName;
    this.defaultParams = {
      temperature: 0.8,
      max_tokens: 1000,
      ...params,
    };
  }

  get modelName(): string {
    return this._modelName;
  }

  async chatCompletion(params: any): Promise<any> {
    try {
      // Merge default parameters with method-specific params
      const requestParams = {
        model: this._modelName,
        ...this.defaultParams,
        ...params,
      };
      const response = await this.client.chat.completions.create(requestParams);
      return response;
    } catch (error) {
      throw error;
    }
  }
}