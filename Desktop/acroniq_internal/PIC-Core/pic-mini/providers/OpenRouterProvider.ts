/**
 * OpenRouter Provider for PIC Engine
 * 
 * Connects PIC to OpenRouter API for access to multiple AI models
 */

import { PICModel } from '../engine/PICEngine';

export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  timeout?: number;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterProvider implements PICModel {
  name: string;
  provider: 'openrouter' = 'openrouter';
  cost: 'low' = 'low';
  speed: 'fast' = 'fast';
  quality: 'excellent' = 'excellent';

  private config: OpenRouterConfig;
  private baseURL: string;
  private model: string;

  constructor(config: OpenRouterConfig) {
    this.name = config.model || 'OpenRouter GPT-4o Mini';
    this.config = config;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.model = config.model || 'openai/gpt-4o-mini';
    
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Generate response using OpenRouter API
   */
  async generate(prompt: string, options?: any): Promise<string> {
    try {
      console.log(`🤖 Calling OpenRouter API with model: ${this.model}`);
      
      const response = await this.callOpenRouter({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are PIC (Polaris Intelligence Core), an advanced strategic business analyst. 

Your role is to provide comprehensive, actionable business intelligence and strategic insights. 

Analysis Framework:
- Market Analysis: Size, trends, competitive landscape
- Strategic Assessment: Opportunities, risks, positioning
- Business Intelligence: Data-driven insights and recommendations
- Implementation Guidance: Practical next steps and metrics

Response Style:
- Professional and structured
- Data-driven with specific insights
- Actionable recommendations
- Clear risk assessments
- Strategic perspective

Always provide concrete, implementable advice based on business best practices and market intelligence.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1.0,
        stream: false
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      console.log(`✅ OpenRouter response received (${response.usage.total_tokens} tokens)`);
      return content;

    } catch (error) {
      console.error('❌ OpenRouter API error:', error);
      throw error;
    }
  }

  /**
   * Call OpenRouter API directly
   */
  private async callOpenRouter(payload: any): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://acroniq-veritus.com',
        'X-Title': 'AcronIQ Veritus PIC-mini'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.callOpenRouter({
        model: this.model,
        messages: [{ role: 'user', content: 'Test connection - respond with "Connected"' }],
        max_tokens: 10
      });

      return { 
        success: true, 
        message: `Connected successfully. Model: ${response.model}` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return [];
    }
  }
}

/**
 * Create OpenRouter provider from environment variables
 */
export function createOpenRouterProvider(): OpenRouterProvider {
  const config: OpenRouterConfig = {
    // @ts-ignore - Node.js environment variables
    apiKey: process.env.OPENROUTER_API_KEY || '',
    // @ts-ignore - Node.js environment variables
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    timeout: 30000
  };

  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  return new OpenRouterProvider(config);
}

export default OpenRouterProvider;
