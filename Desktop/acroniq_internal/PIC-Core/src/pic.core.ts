/**
 * PIC-Core - Main Processing Engine
 * Central reasoning engine for all AcronIQ applications
 * Enhanced with real AI integration and analysis frameworks
 */

import { getAIModelService, type AIRequest, type AIResponse } from './services/ai.model.service';
import { getPICAnalysisService, type AnalysisRequest, type BusinessAnalysis } from './services/pic.analysis.service';
import { getPICMonitoringService } from './services/pic.monitoring.service';

// Define PIC mode types locally to avoid import issues
export type PICProfileKey = 'pic-mini' | 'pic-strategic' | 'pic-analysis';

export interface PICRequest {
  application: string;
  user_id?: string;
  message: string;
  mode: PICProfileKey;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PICResponse {
  response: string;
  reasoning: string;
  metadata: {
    model_used: string;
    provider: string;
    processing_time_ms: number;
    application: string;
    mode: string;
    timestamp: string;
    confidence: number;
    frameworks_used?: string[];
    analysis_type?: string;
  };
}

export class PICCore {
  private aiService = getAIModelService();
  private analysisService = getPICAnalysisService();
  private monitoringService = getPICMonitoringService();

  /**
   * Main processing entry point for PIC
   */
  async processRequest(request: PICRequest): Promise<PICResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Processing PIC request: ${request.application}/${request.mode}`);
      
      // Step 1: Determine if this is a business analysis query
      const isBusinessQuery = this.isBusinessAnalysisQuery(request.message);
      
      let response: string;
      let reasoning: string;
      let confidence: number;
      let frameworksUsed: string[] = [];
      let analysisType: string;

      if (isBusinessQuery) {
        // Step 2: Run business analysis
        const analysisResult = await this.runBusinessAnalysis(request);
        response = this.formatAnalysisResponse(analysisResult);
        reasoning = analysisResult.reasoning;
        confidence = analysisResult.confidence;
        frameworksUsed = analysisResult.frameworksUsed;
        analysisType = 'strategic_analysis';
      } else {
        // Step 3: Run standard AI response
        const aiResult = await this.runStandardAI(request);
        response = aiResult.content;
        reasoning = `Standard AI response using ${aiResult.model}`;
        confidence = 85; // Default confidence for standard responses
        analysisType = 'standard_ai';
      }

      const processingTime = Date.now() - startTime;
      
      // Step 4: Log the query for monitoring
      this.monitoringService.logQuery({
        application: request.application,
        userId: request.user_id,
        query: request.message,
        queryType: analysisType,
        picMode: request.mode,
        processingTime,
        confidenceScore: confidence,
        frameworksUsed,
        success: true,
        modelUsed: 'AI_MODEL', // Will be updated with actual model
        provider: 'AI_PROVIDER' // Will be updated with actual provider
      });

      return {
        response,
        reasoning,
        metadata: {
          model_used: 'AI_MODEL', // Will be updated with actual model
          provider: 'AI_PROVIDER', // Will be updated with actual provider
          processing_time_ms: processingTime,
          application: request.application,
          mode: request.mode,
          timestamp: new Date().toISOString(),
          confidence,
          frameworks_used: frameworksUsed,
          analysis_type: analysisType
        }
      };
    } catch (error) {
      console.error('PIC processing error:', error);
      
      // Log failed query
      const processingTime = Date.now() - startTime;
      const err = error as Error;
      this.monitoringService.logQuery({
        application: request.application,
        userId: request.user_id,
        query: request.message,
        queryType: 'error',
        picMode: request.mode,
        processingTime,
        confidenceScore: 0,
        frameworksUsed: [],
        success: false,
        errorMessage: err.message,
        modelUsed: 'N/A',
        provider: 'N/A'
      });
      
      throw new Error(`PIC processing failed: ${err.message}`);
    }
  }

  /**
   * Check if query requires business analysis
   */
  private isBusinessAnalysisQuery(message: string): boolean {
    const businessKeywords = [
      'business', 'idea', 'startup', 'market', 'strategy', 'plan', 'compete', 'revenue',
      'customer', 'product', 'service', 'launch', 'validate', 'feasible', 'viable',
      'opportunity', 'risk', 'analysis', 'swot', 'target', 'audience', 'pricing',
      'investment', 'profit', 'growth', 'scalable', 'business model'
    ];

    const lowerMessage = message.toLowerCase();
    return businessKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Run business analysis using strategic frameworks
   */
  private async runBusinessAnalysis(request: PICRequest): Promise<BusinessAnalysis> {
    const analysisRequest: AnalysisRequest = {
      businessIdea: request.message,
      context: request.context,
      frameworks: this.selectFrameworks(request.mode),
      depth: this.getAnalysisDepth(request.mode)
    };

    return await this.analysisService.analyzeBusiness(analysisRequest);
  }

  /**
   * Run standard AI response
   */
  private async runStandardAI(request: PICRequest): Promise<AIResponse> {
    const systemPrompt = this.generateSystemPrompt(request.mode);
    
    const aiRequest: AIRequest = {
      prompt: request.message,
      systemPrompt,
      context: request.context
    };

    const modelConfig = this.aiService.getModelConfig(request.mode);
    return await this.aiService.generateResponse(aiRequest, modelConfig);
  }

  /**
   * Select appropriate frameworks based on PIC mode
   */
  private selectFrameworks(mode: PICProfileKey): string[] {
    const frameworkMap: Record<PICProfileKey, string[]> = {
      'pic-mini': ['SWOT', 'MARKET'],
      'pic-strategic': ['SWOT', 'MARKET', 'FINANCIAL', 'RISK'],
      'pic-analysis': ['SWOT', 'BMC', 'MARKET', 'FINANCIAL', 'RISK']
    };

    return frameworkMap[mode] || frameworkMap['pic-mini'];
  }

  /**
   * Get analysis depth based on PIC mode
   */
  private getAnalysisDepth(mode: PICProfileKey): 'quick' | 'standard' | 'comprehensive' {
    const depthMap: Record<PICProfileKey, 'quick' | 'standard' | 'comprehensive'> = {
      'pic-mini': 'quick',
      'pic-strategic': 'standard', 
      'pic-analysis': 'comprehensive'
    };

    return depthMap[mode] || 'standard';
  }

  /**
   * Generate system prompt based on PIC mode
   */
  private generateSystemPrompt(mode: PICProfileKey): string {
    const prompts: Record<PICProfileKey, string> = {
      'pic-mini': 'You are PIC-mini, a strategic business assistant providing quick, actionable insights.',
      'pic-strategic': 'You are PIC-Strategic, a comprehensive business analyst providing detailed strategic guidance.',
      'pic-analysis': 'You are PIC-Analysis, an expert business consultant providing in-depth analysis and recommendations.'
    };

    return prompts[mode] || prompts['pic-mini'];
  }

  /**
   * Format business analysis into readable response
   */
  private formatAnalysisResponse(analysis: BusinessAnalysis): string {
    const sections = [];

    // Executive Summary
    sections.push(`## 📊 Strategic Analysis\n\n${analysis.summary}\n`);

    // Key Insights
    if (analysis.keyInsights.length > 0) {
      sections.push(`## 💡 Key Insights\n\n${analysis.keyInsights.map(item => `• ${item}`).join('\n')}\n`);
    }

    // Opportunities
    if (analysis.opportunities.length > 0) {
      sections.push(`## 🚀 Opportunities\n\n${analysis.opportunities.map(item => `• ${item}`).join('\n')}\n`);
    }

    // Risks
    if (analysis.risks.length > 0) {
      sections.push(`## ⚠️ Risks to Consider\n\n${analysis.risks.map(item => `• ${item}`).join('\n')}\n`);
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      sections.push(`## 🎯 Strategic Recommendations\n\n${analysis.recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`);
    }

    // Action Plan
    if (analysis.actionPlan) {
      sections.push(`## 📋 Action Plan\n`);
      
      if (analysis.actionPlan.immediate.length > 0) {
        sections.push(`**Immediate Actions:**\n${analysis.actionPlan.immediate.map(item => `• ${item}`).join('\n')}\n`);
      }
      
      if (analysis.actionPlan.thirtyDay.length > 0) {
        sections.push(`**30-Day Goals:**\n${analysis.actionPlan.thirtyDay.map(item => `• ${item}`).join('\n')}\n`);
      }
      
      if (analysis.actionPlan.ninetyDay.length > 0) {
        sections.push(`**90-Day Objectives:**\n${analysis.actionPlan.ninetyDay.map(item => `• ${item}`).join('\n')}\n`);
      }
    }

    // Scores
    sections.push(`## 📈 Strategic Scores\n\n` +
      `• **Feasibility:** ${analysis.scores.feasibility}/100\n` +
      `• **Market Fit:** ${analysis.scores.marketFit}/100\n` +
      `• **Go/No-Go:** ${analysis.scores.goNoGo}/100\n`
    );

    // Frameworks and Confidence
    sections.push(`---\n\n*Analysis powered by PIC using frameworks: ${analysis.frameworksUsed.join(', ')} with ${analysis.confidence}% confidence*`);

    return sections.join('\n');
  }

  /**
   * Health check for PIC-Core
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; services: Record<string, unknown> }> {
    try {
      const aiHealth = await this.aiService.healthCheck();
      
      return {
        status: aiHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        services: {
          ai: aiHealth,
          analysis: { status: 'healthy', frameworks: this.analysisService.getAvailableFrameworks().length },
          monitoring: { status: 'healthy', metricsLogged: this.monitoringService.getMetrics().totalQueries }
        }
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error('PIC health check failed:', err);
      return {
        status: 'unhealthy',
        services: { error: err.message }
      };
    }
  }

  /**
   * Get available PIC modes
   */
  getAvailableModes(): PICProfileKey[] {
    return ['pic-mini', 'pic-strategic', 'pic-analysis'];
  }

  /**
   * Get monitoring metrics
   */
  getMetrics(): unknown {
    return this.monitoringService.getMetrics();
  }

  /**
   * Get monitoring analytics
   */
  getAnalytics(timeRange?: 'hour' | 'day' | 'week' | 'month'): unknown {
    return this.monitoringService.getAnalytics(timeRange);
  }
}
