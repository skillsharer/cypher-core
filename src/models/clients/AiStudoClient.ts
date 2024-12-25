import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModelClient, ModelType } from '../../types/agentSystem';
import { Logger } from "../../utils/logger";

export class AiStudioClient implements ModelClient {
  private googleAI: GoogleGenerativeAI;
  private _modelName: string;
  private defaultParams: any;
  modelType: ModelType = 'google';

  constructor(apiKey: string, modelName: string, params: any = {}) {
    this.googleAI = new GoogleGenerativeAI(apiKey);
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
        request: typeof params.request === 'string' ? params.request : JSON.stringify(params.request), // Ensure request is a string
      };
      const model = this.googleAI.getGenerativeModel({ model: this._modelName });
      const response = await model.generateContent(JSON.stringify(requestParams));
      return response;
    } catch (error) {
      throw error;
    }
  }
}