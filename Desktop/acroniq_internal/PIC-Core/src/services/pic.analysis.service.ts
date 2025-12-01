/**
 * PIC Analysis Service - Strategic Business Analysis Frameworks
 * Core intelligence engine migrated and enhanced from AcronIQ_Veritus
 */

export interface StrategicFramework {
  name: string;
  description: string;
  prompts: {
    system: string;
    analysis: string;
    scoring?: string;
  };
  confidenceWeights: {
    market: number;
    financial: number;
    operational: number;
    strategic: number;
  };
}

export interface BusinessAnalysis {
  summary: string;
  keyInsights: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  actionPlan: {
    immediate: string[];
    thirtyDay: string[];
    ninetyDay: string[];
  };
  scores: {
    feasibility: number; // 0-100
    marketFit: number; // 0-100
    goNoGo: number; // 0-100
  };
  confidence: number; // 0-100
  frameworksUsed: string[];
  reasoning: string;
}

export interface AnalysisRequest {
  businessIdea: string;
  context?: {
    industry?: string;
    businessType?: string;
    stage?: 'idea' | 'startup' | 'growth' | 'mature';
    targetMarket?: string;
    revenueModel?: string;
    competition?: string;
  };
  frameworks?: string[];
  depth?: 'quick' | 'standard' | 'comprehensive';
}

export class PICAnalysisService {
  private frameworks: Map<string, StrategicFramework> = new Map();

  constructor() {
    this.initializeFrameworks();
  }

  private initializeFrameworks(): void {
    // SWOT Analysis Framework
    this.frameworks.set('SWOT', {
      name: 'SWOT Analysis',
      description: 'Strengths, Weaknesses, Opportunities, Threats assessment',
      prompts: {
        system: 'You are a strategic business analyst specializing in SWOT analysis.',
        analysis: `Analyze the following business idea using SWOT framework:
        
Business Idea: {businessIdea}
Context: {context}

Provide detailed analysis covering:
- Strengths: Internal advantages and capabilities
- Weaknesses: Internal limitations and challenges  
- Opportunities: External market possibilities
- Threats: External risks and challenges

Format as structured strategic assessment with actionable insights.`,
        scoring: 'Rate the overall viability on 0-100 scale based on SWOT balance'
      },
      confidenceWeights: { market: 0.3, financial: 0.2, operational: 0.2, strategic: 0.3 }
    });

    // Business Model Canvas Framework
    this.frameworks.set('BMC', {
      name: 'Business Model Canvas',
      description: '9 building blocks of business model analysis',
      prompts: {
        system: 'You are a business model architect specializing in Business Model Canvas analysis.',
        analysis: `Analyze this business idea using Business Model Canvas framework:

Business Idea: {businessIdea}
Context: {context}

Evaluate all 9 blocks:
1. Value Propositions
2. Customer Segments  
3. Channels
4. Customer Relationships
5. Revenue Streams
6. Key Activities
7. Key Resources
8. Key Partnerships
9. Cost Structure

Provide insights for each block with strategic recommendations.`
      },
      confidenceWeights: { market: 0.25, financial: 0.35, operational: 0.25, strategic: 0.15 }
    });

    // Market Validation Framework
    this.frameworks.set('MARKET', {
      name: 'Market Validation',
      description: 'Market size, competition, and demand analysis',
      prompts: {
        system: 'You are a market research analyst specializing in startup validation.',
        analysis: `Conduct comprehensive market validation for:

Business Idea: {businessIdea}
Context: {context}

Analyze:
- Total Addressable Market (TAM)
- Serviceable Addressable Market (SAM)  
- Serviceable Obtainable Market (SOM)
- Competitive landscape
- Market trends and timing
- Customer pain points and willingness to pay
- Market entry barriers

Include data-driven insights and validation recommendations.`
      },
      confidenceWeights: { market: 0.5, financial: 0.2, operational: 0.1, strategic: 0.2 }
    });

    // Financial Viability Framework
    this.frameworks.set('FINANCIAL', {
      name: 'Financial Viability',
      description: 'Financial projections and unit economics analysis',
      prompts: {
        system: 'You are a financial analyst specializing in startup economics and projections.',
        analysis: `Analyze financial viability of this business:

Business Idea: {businessIdea}
Context: {context}

Evaluate:
- Revenue model sustainability
- Unit economics (LTV:CAC ratio)
- Break-even analysis
- Startup costs and funding requirements
- Profit margins and scalability
- Cash flow projections
- Key financial metrics and KPIs

Provide detailed financial assessment with risks and opportunities.`
      },
      confidenceWeights: { market: 0.1, financial: 0.6, operational: 0.2, strategic: 0.1 }
    });

    // Risk Assessment Framework
    this.frameworks.set('RISK', {
      name: 'Risk Assessment',
      description: 'Comprehensive risk identification and mitigation',
      prompts: {
        system: 'You are a risk management consultant specializing in business risk assessment.',
        analysis: `Conduct comprehensive risk analysis for:

Business Idea: {businessIdea}
Context: {context}

Identify and assess risks across categories:
- Market risks (demand, competition, trends)
- Financial risks (funding, cash flow, economics)
- Operational risks (execution, scaling, team)
- Regulatory and legal risks
- Technology risks
- Reputational risks

For each risk: assess probability, impact, and provide mitigation strategies.`
      },
      confidenceWeights: { market: 0.2, financial: 0.3, operational: 0.3, strategic: 0.2 }
    });

    console.log(`🧠 Loaded ${this.frameworks.size} strategic analysis frameworks`);
  }

  /**
   * Perform comprehensive business analysis using selected frameworks
   */
  async analyzeBusiness(request: AnalysisRequest): Promise<BusinessAnalysis> {
    const selectedFrameworks = request.frameworks || ['SWOT', 'MARKET', 'FINANCIAL'];
    const frameworkAnalyses: any[] = [];
    
    console.log(`🎯 Starting business analysis with frameworks: ${selectedFrameworks.join(', ')}`);

    // Run each framework analysis
    for (const frameworkName of selectedFrameworks) {
      const framework = this.frameworks.get(frameworkName);
      if (!framework) {
        console.warn(`Framework '${frameworkName}' not found, skipping`);
        continue;
      }

      try {
        const analysis = await this.runFrameworkAnalysis(framework, request);
        frameworkAnalyses.push({
          framework: frameworkName,
          analysis,
          weight: framework.confidenceWeights
        });
      } catch (error) {
        console.error(`Framework '${frameworkName}' analysis failed:`, error);
      }
    }

    // Synthesize results into comprehensive analysis
    return this.synthesizeAnalysis(frameworkAnalyses, request);
  }

  /**
   * Run individual framework analysis
   */
  private async runFrameworkAnalysis(
    framework: StrategicFramework, 
    request: AnalysisRequest
  ): Promise<any> {
    // This would integrate with the AI model service
    // For now, return structured placeholder
    const prompt = framework.prompts.analysis
      .replace('{businessIdea}', request.businessIdea)
      .replace('{context}', JSON.stringify(request.context || {}));

    return {
      framework: framework.name,
      prompt,
      insights: [`Analysis insights for ${framework.name}`],
      recommendations: [`Recommendations from ${framework.name}`],
      risks: [`Risks identified by ${framework.name}`],
      scores: {
        feasibility: 75 + Math.random() * 20,
        marketFit: 70 + Math.random() * 25,
        confidence: 80 + Math.random() * 15
      }
    };
  }

  /**
   * Synthesize multiple framework analyses into comprehensive result
   */
  private synthesizeAnalysis(frameworkAnalyses: any[], request: AnalysisRequest): BusinessAnalysis {
    const allInsights: string[] = [];
    const allOpportunities: string[] = [];
    const allRisks: string[] = [];
    const allRecommendations: string[] = [];
    const frameworksUsed: string[] = [];
    let totalFeasibility = 0;
    let totalMarketFit = 0;
    let totalConfidence = 0;
    let weightSum = 0;

    // Aggregate results from all frameworks
    for (const { framework, analysis, weight } of frameworkAnalyses) {
      frameworksUsed.push(framework);
      
      if (analysis.insights) allInsights.push(...analysis.insights);
      if (analysis.opportunities) allOpportunities.push(...analysis.opportunities);
      if (analysis.risks) allRisks.push(...analysis.risks);
      if (analysis.recommendations) allRecommendations.push(...analysis.recommendations);

      // Weighted scoring
      const frameworkWeight = 1; // Simplified weight
      totalFeasibility += (analysis.scores?.feasibility || 75) * frameworkWeight;
      totalMarketFit += (analysis.scores?.marketFit || 75) * frameworkWeight;
      totalConfidence += (analysis.scores?.confidence || 80) * frameworkWeight;
      weightSum += frameworkWeight;
    }

    // Calculate final scores
    const finalScores = {
      feasibility: weightSum > 0 ? Math.round(totalFeasibility / weightSum) : 75,
      marketFit: weightSum > 0 ? Math.round(totalMarketFit / weightSum) : 75,
      goNoGo: weightSum > 0 ? Math.round((totalFeasibility + totalMarketFit) / (2 * weightSum)) : 75
    };

    const finalConfidence = weightSum > 0 ? Math.round(totalConfidence / weightSum) : 80;

    // Generate action plan based on analysis depth
    const actionPlan = this.generateActionPlan(request.depth || 'standard', allRecommendations);

    return {
      summary: this.generateSummary(request.businessIdea, finalScores, frameworksUsed),
      keyInsights: this.deduplicateAndPrioritize(allInsights, 5),
      opportunities: this.deduplicateAndPrioritize(allOpportunities, 5),
      risks: this.deduplicateAndPrioritize(allRisks, 5),
      recommendations: this.deduplicateAndPrioritize(allRecommendations, 7),
      actionPlan,
      scores: finalScores,
      confidence: finalConfidence,
      frameworksUsed,
      reasoning: `Analysis conducted using ${frameworksUsed.length} frameworks: ${frameworksUsed.join(', ')}`
    };
  }

  /**
   * Generate executive summary
   */
  private generateSummary(businessIdea: string, scores: any, frameworksUsed: string[]): string {
    const goNoGo = scores.goNoGo >= 70 ? 'PROCEED' : scores.goNoGo >= 50 ? 'PROCEED WITH CAUTION' : 'RECONSIDER';
    
    return `Strategic analysis of "${businessIdea}" indicates ${goNoGo} recommendation. 
Based on ${frameworksUsed.length} analytical frameworks, the venture shows ${scores.feasibility}% feasibility 
and ${scores.marketFit}% market fit, with overall confidence of ${scores.goNoGo}%.`;
  }

  /**
   * Generate action plan based on analysis depth
   */
  private generateActionPlan(depth: string, recommendations: string[]): any {
    const plan = {
      immediate: [] as string[],
      thirtyDay: [] as string[],
      ninetyDay: [] as string[]
    };

    // Categorize recommendations based on keywords and depth
    recommendations.forEach((rec, index) => {
      const lowerRec = rec.toLowerCase();
      
      if (lowerRec.includes('research') || lowerRec.includes('validate') || lowerRec.includes('market')) {
        plan.immediate.push(rec);
      } else if (lowerRec.includes('develop') || lowerRec.includes('build') || lowerRec.includes('launch')) {
        plan.thirtyDay.push(rec);
      } else if (lowerRec.includes('scale') || lowerRec.includes('expand') || lowerRec.includes('optimize')) {
        plan.ninetyDay.push(rec);
      } else {
        // Default distribution
        if (index % 3 === 0) plan.immediate.push(rec);
        else if (index % 3 === 1) plan.thirtyDay.push(rec);
        else plan.ninetyDay.push(rec);
      }
    });

    // Ensure each phase has at least some items
    if (plan.immediate.length === 0) plan.immediate.push('Conduct market research and validation');
    if (plan.thirtyDay.length === 0) plan.thirtyDay.push('Develop minimum viable product');
    if (plan.ninetyDay.length === 0) plan.ninetyDay.push('Prepare for market launch');

    return plan;
  }

  /**
   * Remove duplicates and prioritize items
   */
  private deduplicateAndPrioritize(items: string[], maxItems: number): string[] {
    // Simple deduplication based on string similarity
    const unique = [...new Set(items)];
    
    // Sort by length (longer items might be more detailed) and return top N
    return unique
      .sort((a, b) => b.length - a.length)
      .slice(0, maxItems);
  }

  /**
   * Get available frameworks
   */
  getAvailableFrameworks(): StrategicFramework[] {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get framework by name
   */
  getFramework(name: string): StrategicFramework | undefined {
    return this.frameworks.get(name);
  }

  /**
   * Quick analysis for simple queries
   */
  async quickAnalysis(businessIdea: string): Promise<Partial<BusinessAnalysis>> {
    return this.analyzeBusiness({
      businessIdea,
      frameworks: ['SWOT'],
      depth: 'quick'
    });
  }
}

// Singleton instance
let analysisServiceInstance: PICAnalysisService | null = null;

export function getPICAnalysisService(): PICAnalysisService {
  if (!analysisServiceInstance) {
    analysisServiceInstance = new PICAnalysisService();
  }
  return analysisServiceInstance;
}

export default PICAnalysisService;
