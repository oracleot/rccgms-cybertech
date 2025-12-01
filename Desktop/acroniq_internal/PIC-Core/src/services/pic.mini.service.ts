/**
 * PIC-Mini Service - Lightweight Strategic Analysis
 * Optimized for quick insights and rapid business validation
 */

import { getAIModelService, type AIRequest } from './ai.model.service';
import { getPICMonitoringService } from './pic.monitoring.service';

export interface MiniAnalysisRequest {
  query: string;
  context?: {
    industry?: string;
    businessType?: string;
    stage?: string;
    targetMarket?: string;
  };
  depth?: 'quick' | 'standard';
}

export interface MiniAnalysisResponse {
  summary: string;
  keyInsights: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  scores: {
    feasibility: number; // 0-100
    marketFit: number; // 0-100
    confidence: number; // 0-100
  };
  processingTime: number;
  frameworks: string[];
}

export class PICMiniService {
  private aiService = getAIModelService();
  private monitoringService = getPICMonitoringService();

  /**
   * Quick business analysis using lightweight frameworks
   */
  async analyzeMini(request: MiniAnalysisRequest): Promise<MiniAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Starting PIC-Mini analysis: "${request.query.substring(0, 50)}..."`);
      
      // Step 1: Determine analysis approach
      const analysisType = this.determineAnalysisType(request.query);
      
      // Step 2: Generate prompt based on analysis type
      const prompt = this.buildMiniPrompt(request, analysisType);
      
      // Step 3: Process with AI
      const aiRequest: AIRequest = {
        prompt,
        systemPrompt: this.getMiniSystemPrompt(analysisType),
        context: request.context,
        maxTokens: 1500,
        temperature: 0.7
      };
      
      const aiResponse = await this.aiService.generateResponse(aiRequest);
      
      // Step 4: Parse and structure the response
      const analysis = this.parseMiniResponse(aiResponse.content, analysisType);
      
      const processingTime = Date.now() - startTime;
      
      // Step 5: Log for monitoring
      this.monitoringService.logQuery({
        application: 'PIC-Mini',
        query: request.query,
        queryType: 'mini_analysis',
        picMode: 'pic-mini',
        processingTime,
        confidenceScore: analysis.scores.confidence,
        frameworksUsed: analysis.frameworks,
        success: true,
        modelUsed: aiResponse.model,
        provider: aiResponse.provider
      });
      
      return {
        ...analysis,
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const err = error as Error;
      
      this.monitoringService.logQuery({
        application: 'PIC-Mini',
        query: request.query,
        queryType: 'mini_analysis',
        picMode: 'pic-mini',
        processingTime,
        confidenceScore: 0,
        frameworksUsed: [],
        success: false,
        errorMessage: err.message,
        modelUsed: 'N/A',
        provider: 'N/A'
      });
      
      throw new Error(`PIC-Mini analysis failed: ${err.message}`);
    }
  }

  /**
   * Determine the type of analysis needed
   */
  private determineAnalysisType(query: string): 'business_idea' | 'market_validation' | 'quick_swot' | 'general' {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('business idea') || lowerQuery.includes('startup') || lowerQuery.includes('entrepreneur')) {
      return 'business_idea';
    }
    
    if (lowerQuery.includes('market') || lowerQuery.includes('customer') || lowerQuery.includes('demand')) {
      return 'market_validation';
    }
    
    if (lowerQuery.includes('swot') || lowerQuery.includes('strengths') || lowerQuery.includes('weaknesses')) {
      return 'quick_swot';
    }
    
    return 'general';
  }

  /**
   * Build analysis prompt based on type
   */
  private buildMiniPrompt(request: MiniAnalysisRequest, analysisType: string): string {
    const contextInfo = request.context ? 
      `\nContext: Industry - ${request.context.industry || 'Not specified'}, Stage - ${request.context.stage || 'Not specified'}` : '';
    
    const basePrompt = `Business Query: ${request.query}${contextInfo}\n\n`;
    
    switch (analysisType) {
      case 'business_idea':
        return basePrompt + `Provide a quick business idea assessment covering:
1. Feasibility (0-100%): How realistic is this idea?
2. Market Fit (0-100%): Is there market demand?
3. Top 3 opportunities
4. Top 3 risks
5. 3 key recommendations

Format as JSON:
{
  "feasibility": 75,
  "marketFit": 80,
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "risks": ["risk1", "risk2", "risk3"],
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

      case 'market_validation':
        return basePrompt + `Provide quick market validation covering:
1. Market demand assessment (0-100%)
2. Target market analysis
3. Competition overview
4. Market entry strategy
5. 2 key recommendations

Format as JSON:
{
  "feasibility": 70,
  "marketFit": 75,
  "opportunities": ["market opportunity1", "market opportunity2"],
  "risks": ["market risk1", "market risk2"],
  "recommendations": ["market rec1", "market rec2"]
}`;

      case 'quick_swot':
        return basePrompt + `Provide quick SWOT analysis:
1. Strengths (2-3 key strengths)
2. Weaknesses (2-3 key weaknesses)
3. Opportunities (2-3 opportunities)
4. Threats (2-3 threats)
5. Overall feasibility (0-100%)

Format as JSON:
{
  "feasibility": 80,
  "marketFit": 75,
  "opportunities": ["strength1", "opportunity1"],
  "risks": ["weakness1", "threat1"],
  "recommendations": ["swot rec1", "swot rec2"]
}`;

      default:
        return basePrompt + `Provide quick business analysis covering:
1. Overall feasibility (0-100%)
2. Market potential (0-100%)
3. 2 key insights
4. 2 opportunities
5. 2 risks
6. 2 recommendations

Format as JSON:
{
  "feasibility": 75,
  "marketFit": 70,
  "opportunities ["opportunity1", "opportunity2"],
  "risks": ["risk1", "risk2"],
  "recommendations": ["rec1", "rec2"]
}`;
    }
  }

  /**
   * Get system prompt for mini analysis
   */
  private getMiniSystemPrompt(analysisType: string): string {
    const basePrompt = 'You are PIC-Mini, a rapid business analysis assistant. Provide quick, actionable insights for entrepreneurs and business professionals. ';
    
    switch (analysisType) {
      case 'business_idea':
        return basePrompt + 'Focus on practical feasibility and immediate action steps for new business ideas.';
      case 'market_validation':
        return basePrompt + 'Focus on market demand, customer needs, and competitive landscape.';
      case 'quick_swot':
        return basePrompt + 'Focus on balanced assessment of strengths, weaknesses, opportunities, and threats.';
      default:
        return basePrompt + 'Focus on practical business insights and recommendations.';
    }
  }

  /**
   * Parse AI response into structured format
   */
  private parseMiniResponse(content: string, analysisType: string): Omit<MiniAnalysisResponse, 'processingTime'> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          summary: this.generateSummary(parsed, analysisType),
          keyInsights: this.extractInsights(parsed, content),
          opportunities: parsed.opportunities || [],
          risks: parsed.risks || [],
          recommendations: parsed.recommendations || [],
          scores: {
            feasibility: parsed.feasibility || 75,
            marketFit: parsed.marketFit || 75,
            confidence: this.calculateConfidence(parsed)
          },
          frameworks: ['Mini-' + analysisType]
        };
      }
      
      // Fallback if JSON parsing fails
      return this.createFallbackResponse(content, analysisType);
      
    } catch (error) {
      console.warn('Failed to parse mini response, using fallback:', error);
      return this.createFallbackResponse(content, analysisType);
    }
  }

  /**
   * Generate summary from parsed data
   */
  private generateSummary(parsed: any, analysisType: string): string {
    const feasibility = parsed.feasibility || 75;
    const marketFit = parsed.marketFit || 75;
    const avgScore = Math.round((feasibility + marketFit) / 2);
    
    const recommendation = avgScore >= 80 ? 'STRONG PROCEED' : 
                          avgScore >= 60 ? 'PROCEED WITH CAUTION' : 'RECONSIDER';
    
    return `Quick ${analysisType.replace('_', ' ')} analysis indicates ${recommendation} with ${avgScore}% overall viability. Feasibility: ${feasibility}%, Market Fit: ${marketFit}%.`;
  }

  /**
   * Extract key insights from content
   */
  private extractInsights(parsed: any, content: string): string[] {
    const insights: string[] = [];
    
    // Extract insights from parsed data
    if (parsed.opportunities && parsed.opportunities.length > 0) {
      insights.push(`Key opportunity: ${parsed.opportunities[0]}`);
    }
    
    if (parsed.risks && parsed.risks.length > 0) {
      insights.push(`Main risk: ${parsed.risks[0]}`);
    }
    
    // Add insight from content text
    const sentences = content.split('.').filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      insights.push(sentences[0].trim());
    }
    
    return insights.slice(0, 3);
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(parsed: any): number {
    let confidence = 70; // Base confidence
    
    // Boost confidence if we have good data
    if (parsed.feasibility && parsed.marketFit) {
      confidence += 10;
    }
    
    if (parsed.opportunities && parsed.opportunities.length >= 2) {
      confidence += 5;
    }
    
    if (parsed.recommendations && parsed.recommendations.length >= 2) {
      confidence += 5;
    }
    
    // Ensure confidence stays in valid range
    return Math.min(95, Math.max(50, confidence));
  }

  /**
   * Create fallback response when parsing fails
   */
  private createFallbackResponse(content: string, analysisType: string): Omit<MiniAnalysisResponse, 'processingTime'> {
    return {
      summary: `Quick ${analysisType.replace('_', ' ')} analysis completed. Review the detailed response for specific insights.`,
      keyInsights: [content.substring(0, 100) + '...'],
      opportunities: ['Review detailed analysis for opportunities'],
      risks: ['Review detailed analysis for risks'],
      recommendations: ['Review detailed analysis for recommendations'],
      scores: {
        feasibility: 75,
        marketFit: 75,
        confidence: 65
      },
      frameworks: ['Mini-' + analysisType + '-fallback']
    };
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const aiHealth = await this.aiService.healthCheck();
      const metrics = this.monitoringService.getMetrics();
      
      return {
        status: aiHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: {
          ai: aiHealth,
          queriesProcessed: metrics.totalQueries,
          averageResponseTime: metrics.averageResponseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }

  /**
   * Get service capabilities
   */
  getCapabilities(): {
    analysisTypes: string[];
    maxTokens: number;
    averageResponseTime: number;
    supportedQueries: string[];
  } {
    return {
      analysisTypes: ['business_idea', 'market_validation', 'quick_swot', 'general'],
      maxTokens: 1500,
      averageResponseTime: 2000, // 2 seconds
      supportedQueries: [
        'business idea validation',
        'market assessment',
        'SWOT analysis',
        'feasibility study',
        'startup evaluation'
      ]
    };
  }
}

// Singleton instance
let picMiniServiceInstance: PICMiniService | null = null;

export function getPICMiniService(): PICMiniService {
  if (!picMiniServiceInstance) {
    picMiniServiceInstance = new PICMiniService();
  }
  return picMiniServiceInstance;
}

export default PICMiniService;
