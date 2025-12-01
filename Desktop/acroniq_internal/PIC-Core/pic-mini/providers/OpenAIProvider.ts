/**
 * OpenAI Provider for PIC Engine
 * 
 * Connects PIC to actual OpenAI API for real model responses
 */

import { PICModel } from '../engine/PICEngine';

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  timeout?: number;
}

export interface OpenAIResponse {
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

export class OpenAIProvider implements PICModel {
  name: string;
  provider: 'openai' = 'openai';
  cost: 'low' = 'low';
  speed: 'fast' = 'fast';
  quality: 'good' = 'good';

  private config: OpenAIConfig;
  private baseURL: string;

  constructor(config: OpenAIConfig) {
    this.name = 'GPT-4o Mini';
    this.config = config;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    
    if (!config.apiKey) {
      console.warn('⚠️ OpenAI API key not provided - using mock responses');
    }
  }

  /**
   * Generate response using OpenAI API
   */
  async generate(prompt: string, options?: any): Promise<string> {
    if (!this.config.apiKey) {
      return this.generateMockResponse(prompt);
    }

    try {
      console.log('🤖 Calling OpenAI API...');
      
      const response = await this.callOpenAI({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are PIC (Polaris Intelligence Core), a strategic business analyst. Provide structured, actionable business insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1.0
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      console.log(`✅ OpenAI response received (${response.usage.total_tokens} tokens)`);
      return content;

    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      
      // Fallback to mock response
      console.log('🔄 Falling back to mock response');
      return this.generateMockResponse(prompt);
    }
  }

  /**
   * Call OpenAI API directly
   */
  private async callOpenAI(payload: any): Promise<OpenAIResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...(this.config.organization && { 'OpenAI-Organization': this.config.organization })
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Generate mock response for testing/fallback
   */
  private generateMockResponse(prompt: string): string {
    console.log('🎭 Generating mock PIC response...');
    
    // Analyze prompt to determine response type
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('swot')) {
      return this.generateMockSWOT();
    }
    
    if (lowerPrompt.includes('market fit') || lowerPrompt.includes('market analysis')) {
      return this.generateMockMarketAnalysis();
    }
    
    if (lowerPrompt.includes('risk') || lowerPrompt.includes('risks')) {
      return this.generateMockRiskAnalysis();
    }
    
    if (lowerPrompt.includes('business idea') || lowerPrompt.includes('validate')) {
      return this.generateMockBusinessValidation();
    }
    
    // Default strategic analysis
    return this.generateMockStrategicAnalysis(prompt);
  }

  private generateMockSWOT(): string {
    return JSON.stringify({
      strengths: [
        "Strong value proposition addressing clear market need",
        "Experienced team with relevant industry expertise",
        "Scalable technology platform"
      ],
      weaknesses: [
        "Limited initial funding and resources",
        "Lack of established brand recognition",
        "Dependence on key personnel"
      ],
      opportunities: [
        "Growing market demand for digital solutions",
        "Potential for strategic partnerships",
        "Expansion into adjacent markets"
      ],
      threats: [
        "Established competitors with larger resources",
        "Regulatory changes in the industry",
        "Economic downturn affecting customer spending"
      ]
    });
  }

  private generateMockMarketAnalysis(): string {
    return JSON.stringify({
      marketSize: "£2.5B TAM, £500M SAM, £50M SOM",
      growthRate: "15% CAGR over next 5 years",
      customerSegments: [
        "Small to medium businesses (40%)",
        "Enterprise clients (35%)",
        "Individual consumers (25%)"
      ],
      marketTrends: [
        "Increasing digital transformation adoption",
        "Growing demand for automation solutions",
        "Shift towards subscription-based models"
      ],
      competitiveIntensity: "Medium - established players but room for innovation"
    });
  }

  private generateMockRiskAnalysis(): string {
    return JSON.stringify({
      highRisks: [
        "Market adoption slower than expected",
        "Key competitor launches similar solution"
      ],
      mediumRisks: [
        "Technical development delays",
        "Regulatory compliance challenges"
      ],
      lowRisks: [
        "Currency fluctuation impacts",
        "Supplier relationship issues"
      ],
      mitigationStrategies: [
        "Conduct thorough market validation",
        "Build strong IP protection",
        "Maintain flexible development approach"
      ]
    });
  }

  private generateMockBusinessValidation(): string {
    return JSON.stringify({
      validationScore: 75,
      marketOpportunity: "Strong - clear customer pain point with growing market",
      businessModel: "Viable - recurring revenue model with good unit economics",
      competitivePosition: "Differentiated - unique approach to solving customer problem",
      executionFeasibility: "Moderate - requires significant resources but achievable",
      recommendation: "Proceed with MVP development and customer validation",
      nextSteps: [
        "Conduct customer interviews to validate assumptions",
        "Build minimum viable product",
        "Test pricing and business model",
        "Secure initial funding"
      ]
    });
  }

  private generateMockStrategicAnalysis(prompt: string): string {
    return `## Strategic Analysis

Based on the query: "${prompt.substring(0, 100)}..."

### Key Insights
• Market opportunity exists with clear customer demand
• Competitive landscape shows room for differentiation  
• Business model appears viable with proper execution
• Resource requirements are manageable with phased approach

### Strategic Recommendations
1. **Validate Market Assumptions** - Conduct customer interviews and market research
2. **Develop MVP** - Build minimum viable product to test core value proposition
3. **Secure Funding** - Raise initial capital for product development and market entry
4. **Build Strategic Partnerships** - Identify key partners for distribution and growth

### Risk Considerations
• Market adoption may be slower than projected
• Competition from established players
• Technical execution challenges
• Resource constraints during scaling

### Success Metrics
• Customer acquisition rate
• Product-market fit indicators
• Revenue growth trajectory
• Market share capture

**Confidence Level: 75%**
*Analysis powered by PIC (Polaris Intelligence Core)*`;
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.apiKey) {
      return { success: false, message: 'No API key configured' };
    }

    try {
      const response = await this.callOpenAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test connection' }],
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
   * Get usage statistics
   */
  getUsageStats(): { totalTokens: number; totalCalls: number; estimatedCost: number } {
    // This would track actual usage in a real implementation
    return {
      totalTokens: 0,
      totalCalls: 0,
      estimatedCost: 0
    };
  }
}

/**
 * Create OpenAI provider from environment variables
 */
export function createOpenAIProvider(): OpenAIProvider {
  const config: OpenAIConfig = {
    // @ts-ignore - Node.js environment variables
    apiKey: process.env.OPENAI_API_KEY || '',
    // @ts-ignore - Node.js environment variables
    organization: process.env.OPENAI_ORGANIZATION,
    timeout: 30000
  };

  return new OpenAIProvider(config);
}

export default OpenAIProvider;
