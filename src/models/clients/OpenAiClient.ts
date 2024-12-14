// models/OpenAIClient.ts

import OpenAI from 'openai';
import { ModelClient, ModelType } from '../../types/agentSystem';

export class OpenAIClient implements ModelClient {
  private openai: OpenAI;
  private _modelName: string;
  private defaultParams: any;
  modelType: ModelType = 'openai';

  constructor(
    apiKey: string,
    modelName: string,
    params: any = {}
  ) {
    this.openai = new OpenAI({ apiKey });
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
      const requestParams = {
        model: this._modelName,
        ...this.defaultParams,
        ...params,
      };
      const response = await this.openai.chat.completions.create(requestParams);
      return response;
    } catch (error) {
      throw error;
    }
  }
}