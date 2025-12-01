/**
 * AI Model Service - Centralized AI Provider Management
 * Handles all AI model interactions (OpenRouter, OpenAI, etc.)
 */

import OpenAI from 'openai';

export interface AIModelConfig {
  provider: 'openrouter' | 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  processingTime: number;
}

export class AIModelService {
  private openaiClients: Map<string, OpenAI> = new Map();
  private defaultConfig: AIModelConfig;

  constructor() {
    this.defaultConfig = {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4000,
      temperature: 0.7
    };

    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize OpenRouter client
    if (this.defaultConfig.apiKey) {
      const openRouterClient = new OpenAI({
        apiKey: this.defaultConfig.apiKey,
        baseURL: this.defaultConfig.baseURL,
      });
      this.openaiClients.set('openrouter', openRouterClient);
      console.log('🔌 OpenRouter client initialized');
    }

    // Initialize OpenAI client if available
    if (process.env.OPENAI_API_KEY) {
      const openAIClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.openaiClients.set('openai', openAIClient);
      console.log('🔌 OpenAI client initialized');
    }
  }

  /**
   * Generate response using configured AI model
   */
  async generateResponse(request: AIRequest, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    try {
      const client = this.openaiClients.get(finalConfig.provider);
      if (!client) {
        throw new Error(`AI provider '${finalConfig.provider}' not initialized`);
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      // Add system prompt if provided
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }

      // Add context if provided
      if (request.context) {
        messages.push({
          role: 'system',
          content: `Context:\n${JSON.stringify(request.context, null, 2)}`
        });
      }

      // Add user prompt
      messages.push({ role: 'user', content: request.prompt });

      const completion = await client.chat.completions.create({
        model: finalConfig.model,
        messages,
        max_tokens: request.maxTokens || finalConfig.maxTokens,
        temperature: request.temperature || finalConfig.temperature,
      });

      const processingTime = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';

      return {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        model: finalConfig.model,
        provider: finalConfig.provider,
        processingTime,
      };

    } catch (error) {
      console.error(`AI Model Service error (${finalConfig.provider}):`, error);
      const err = error as Error;
      throw new Error(`AI generation failed: ${err.message}`);
    }
  }

  /**
   * Get available models and providers
   */
  getAvailableProviders(): { provider: string; models: string[] }[] {
    const providers = [
      {
        provider: 'openrouter',
        models: [
          'openai/gpt-4o-mini',
          'openai/gpt-4o',
          'openai/gpt-3.5-turbo',
          'anthropic/claude-3-haiku',
          'anthropic/claude-3-sonnet',
          'google/gemini-pro'
        ]
      }
    ];

    if (this.openaiClients.has('openai')) {
      providers.push({
        provider: 'openai',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
      });
    }

    return providers;
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; providers: string[] }> {
    const providers: string[] = [];
    
    for (const [provider, client] of this.openaiClients) {
      try {
        // Simple test request
        await client.chat.completions.create({
          model: provider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Health check' }],
          max_tokens: 1,
        });
        providers.push(provider);
      } catch (error) {
        console.warn(`Provider ${provider} health check failed:`, (error as Error).message);
      }
    }

    return {
      status: providers.length > 0 ? 'healthy' : 'unhealthy',
      providers
    };
  }

  /**
   * Get model configuration for PIC mode
   */
  getModelConfig(picMode: string): AIModelConfig {
    const modeConfigs: Record<string, Partial<AIModelConfig>> = {
      'pic-mini': {
        model: 'openai/gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000
      },
      'pic-strategic': {
        model: 'openai/gpt-4o',
        temperature: 0.8,
        maxTokens: 4000
      },
      'pic-analysis': {
        model: 'anthropic/claude-3-sonnet',
        temperature: 0.6,
        maxTokens: 3000
      }
    };

    const config = modeConfigs[picMode] || modeConfigs['pic-mini'];
    return { ...this.defaultConfig, ...config };
  }
}

// Singleton instance
let aiModelServiceInstance: AIModelService | null = null;

export function getAIModelService(): AIModelService {
  if (!aiModelServiceInstance) {
    aiModelServiceInstance = new AIModelService();
  }
  return aiModelServiceInstance;
}
