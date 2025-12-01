/**
 * Intelligent Model Router for PIC
 * 
 * Routes queries to the most appropriate AI model based on:
 * - Query complexity
 * - Budget constraints
 * - Speed vs accuracy requirements
 * - Model availability
 */

export interface ModelCapabilities {
  name: string;
  provider: 'openai' | 'openrouter' | 'anthropic' | 'local';
  cost: 'free' | 'low' | 'medium' | 'high';
  speed: 'fast' | 'medium' | 'slow';
  quality: 'basic' | 'good' | 'excellent';
  maxTokens: number;
  strengths: string[];
  weaknesses: string[];
  available: boolean;
}

export interface RoutingCriteria {
  complexity: 'low' | 'medium' | 'high';
  budget: 'free' | 'low' | 'medium' | 'unlimited';
  priority: 'speed' | 'balanced' | 'quality';
  queryType: string;
  estimatedTokens?: number;
}

export interface RoutingDecision {
  selectedModel: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
  estimatedCost: string;
  estimatedTime: string;
}

export class ModelRouter {
  private models: Map<string, ModelCapabilities> = new Map();
  private routingHistory: Array<{
    criteria: RoutingCriteria;
    decision: RoutingDecision;
    success: boolean;
    actualTime: number;
    timestamp: Date;
  }> = [];

  constructor() {
    this.initializeModels();
  }

  /**
   * Route a query to the best available model
   */
  routeQuery(criteria: RoutingCriteria): RoutingDecision {
    console.log(`🎯 Routing query with criteria:`, criteria);

    // Get available models
    const availableModels = Array.from(this.models.values()).filter(m => m.available);
    
    if (availableModels.length === 0) {
      throw new Error('No AI models available');
    }

    // Score models based on criteria
    const scoredModels = availableModels.map(model => ({
      model,
      score: this.scoreModel(model, criteria)
    })).sort((a, b) => b.score - a.score);

    const bestModel = scoredModels[0].model;
    const alternatives = scoredModels.slice(1, 3).map(sm => sm.model.name);

    const decision: RoutingDecision = {
      selectedModel: bestModel.name,
      reasoning: this.generateReasoning(bestModel, criteria),
      alternatives,
      confidence: this.calculateConfidence(scoredModels[0].score, criteria),
      estimatedCost: this.estimateCost(bestModel, criteria.estimatedTokens || 1000),
      estimatedTime: this.estimateTime(bestModel, criteria.estimatedTokens || 1000)
    };

    console.log(`✅ Selected model: ${decision.selectedModel} (${decision.confidence}% confidence)`);
    return decision;
  }

  /**
   * Score a model based on routing criteria
   */
  private scoreModel(model: ModelCapabilities, criteria: RoutingCriteria): number {
    let score = 0;

    // Budget scoring (40% weight)
    score += this.scoreBudget(model.cost, criteria.budget) * 0.4;

    // Quality scoring (30% weight)
    score += this.scoreQuality(model.quality, criteria.complexity) * 0.3;

    // Speed scoring (20% weight)
    score += this.scoreSpeed(model.speed, criteria.priority) * 0.2;

    // Specialization scoring (10% weight)
    score += this.scoreSpecialization(model, criteria.queryType) * 0.1;

    return score;
  }

  private scoreBudget(modelCost: string, budgetConstraint: string): number {
    const costMap = { free: 0, low: 1, medium: 2, high: 3 };
    const budgetMap = { free: 0, low: 1, medium: 2, unlimited: 3 };
    
    const modelCostLevel = costMap[modelCost as keyof typeof costMap];
    const budgetLevel = budgetMap[budgetConstraint as keyof typeof budgetMap];
    
    return modelCostLevel <= budgetLevel ? 100 : Math.max(0, 100 - (modelCostLevel - budgetLevel) * 30);
  }

  private scoreQuality(modelQuality: string, complexity: string): number {
    const qualityMap = { basic: 1, good: 2, excellent: 3 };
    const complexityMap = { low: 1, medium: 2, high: 3 };
    
    const qualityLevel = qualityMap[modelQuality as keyof typeof qualityMap];
    const complexityLevel = complexityMap[complexity as keyof typeof complexityMap];
    
    // Higher complexity requires higher quality
    return qualityLevel >= complexityLevel ? 100 : qualityLevel * 33;
  }

  private scoreSpeed(modelSpeed: string, priority: string): number {
    const speedMap = { slow: 1, medium: 2, fast: 3 };
    const speedLevel = speedMap[modelSpeed as keyof typeof speedMap];
    
    if (priority === 'speed') return speedLevel * 33;
    if (priority === 'balanced') return speedLevel >= 2 ? 100 : 50;
    return 100; // Quality priority doesn't penalize slow models
  }

  private scoreSpecialization(model: ModelCapabilities, queryType: string): number {
    // Check if model has strengths that match the query type
    const relevantStrengths = model.strengths.filter(strength => 
      queryType.toLowerCase().includes(strength.toLowerCase()) ||
      strength.toLowerCase().includes(queryType.toLowerCase())
    );
    
    return relevantStrengths.length > 0 ? 100 : 50;
  }

  private generateReasoning(model: ModelCapabilities, criteria: RoutingCriteria): string {
    const reasons = [];
    
    if (model.cost === 'free' && criteria.budget === 'free') {
      reasons.push('matches free budget constraint');
    }
    
    if (model.quality === 'excellent' && criteria.complexity === 'high') {
      reasons.push('excellent quality needed for high complexity');
    }
    
    if (model.speed === 'fast' && criteria.priority === 'speed') {
      reasons.push('fast response time prioritized');
    }
    
    if (model.strengths.some(s => criteria.queryType.includes(s))) {
      reasons.push('specialized for this query type');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'best overall match for criteria';
  }

  private calculateConfidence(score: number, criteria: RoutingCriteria): number {
    let confidence = Math.min(95, score);
    
    // Reduce confidence if criteria are conflicting
    if (criteria.budget === 'free' && criteria.priority === 'quality') {
      confidence *= 0.8;
    }
    
    if (criteria.complexity === 'high' && criteria.priority === 'speed') {
      confidence *= 0.9;
    }
    
    return Math.round(confidence);
  }

  private estimateCost(model: ModelCapabilities, tokens: number): string {
    const costEstimates = {
      free: '$0.00',
      low: `$${(tokens * 0.0001).toFixed(4)}`,
      medium: `$${(tokens * 0.001).toFixed(3)}`,
      high: `$${(tokens * 0.01).toFixed(2)}`
    };
    
    return costEstimates[model.cost as keyof typeof costEstimates];
  }

  private estimateTime(model: ModelCapabilities, tokens: number): string {
    const timeEstimates = {
      fast: `${Math.max(1, Math.round(tokens / 1000))}s`,
      medium: `${Math.max(2, Math.round(tokens / 500))}s`,
      slow: `${Math.max(3, Math.round(tokens / 200))}s`
    };
    
    return timeEstimates[model.speed as keyof typeof timeEstimates];
  }

  /**
   * Record routing outcome for learning
   */
  recordOutcome(decision: RoutingDecision, success: boolean, actualTime: number): void {
    // This would be used for ML-based routing optimization in the future
    console.log(`📊 Recording routing outcome: ${success ? 'success' : 'failure'} in ${actualTime}ms`);
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalRoutes: number;
    successRate: number;
    averageTime: number;
    modelUsage: Record<string, number>;
  } {
    const total = this.routingHistory.length;
    const successful = this.routingHistory.filter(h => h.success).length;
    const avgTime = this.routingHistory.reduce((sum, h) => sum + h.actualTime, 0) / total || 0;
    
    const modelUsage: Record<string, number> = {};
    this.routingHistory.forEach(h => {
      modelUsage[h.decision.selectedModel] = (modelUsage[h.decision.selectedModel] || 0) + 1;
    });
    
    return {
      totalRoutes: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageTime: avgTime,
      modelUsage
    };
  }

  private initializeModels(): void {
    // GPT-4o Mini - Primary model for PIC-mini
    this.models.set('gpt-4o-mini', {
      name: 'GPT-4o Mini',
      provider: 'openai',
      cost: 'low',
      speed: 'fast',
      quality: 'good',
      maxTokens: 128000,
      strengths: ['business analysis', 'strategic thinking', 'structured output'],
      weaknesses: ['complex reasoning', 'specialized knowledge'],
      available: true
    });

    // GPT-4o - Premium model for complex analysis
    this.models.set('gpt-4o', {
      name: 'GPT-4o',
      provider: 'openai',
      cost: 'medium',
      speed: 'medium',
      quality: 'excellent',
      maxTokens: 128000,
      strengths: ['complex reasoning', 'strategic analysis', 'comprehensive insights'],
      weaknesses: ['cost', 'speed'],
      available: false // Will be enabled when API key is configured
    });

    // OpenRouter models
    this.models.set('claude-3-haiku', {
      name: 'Claude 3 Haiku',
      provider: 'openrouter',
      cost: 'low',
      speed: 'fast',
      quality: 'good',
      maxTokens: 200000,
      strengths: ['analysis', 'structured thinking', 'business insights'],
      weaknesses: ['creative tasks'],
      available: false
    });

    this.models.set('llama-3.1-8b', {
      name: 'Llama 3.1 8B',
      provider: 'openrouter',
      cost: 'free',
      speed: 'fast',
      quality: 'basic',
      maxTokens: 128000,
      strengths: ['general purpose', 'fast responses'],
      weaknesses: ['complex reasoning', 'business expertise'],
      available: false
    });

    // Local models (future)
    this.models.set('local-llama', {
      name: 'Local Llama',
      provider: 'local',
      cost: 'free',
      speed: 'medium',
      quality: 'basic',
      maxTokens: 32000,
      strengths: ['privacy', 'no cost'],
      weaknesses: ['quality', 'complex reasoning'],
      available: false
    });

    console.log(`🤖 Model Router initialized with ${this.models.size} models`);
  }

  /**
   * Update model availability
   */
  updateModelAvailability(modelName: string, available: boolean): void {
    const model = this.models.get(modelName);
    if (model) {
      model.available = available;
      console.log(`🔄 Model ${modelName} ${available ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelCapabilities[] {
    return Array.from(this.models.values()).filter(m => m.available);
  }

  /**
   * Get model by name
   */
  getModel(name: string): ModelCapabilities | undefined {
    return this.models.get(name);
  }
}

export default ModelRouter;
