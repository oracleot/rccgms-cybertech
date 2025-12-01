/**
 * PIC-mini Strategic Analysis Module
 * Core reasoning logic for strategic business analysis
 */

export interface AnalysisContext {
  industry?: string;
  companyStage?: 'idea' | 'startup' | 'growth' | 'mature';
  founderChallenges?: string[];
  marketConditions?: 'bull' | 'bear' | 'uncertain';
  timeHorizon?: 'immediate' | 'short-term' | 'long-term';
}

export interface AnalysisOutput {
  insights: string[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
  nextSteps: string[];
}

/**
 * PIC-mini Strategic Analysis Engine
 */
export class StrategicAnalysisEngine {
  
  /**
   * Analyse business context and generate strategic insights
   */
  public analyseBusinessContext(
    query: string, 
    context: AnalysisContext = {}
  ): AnalysisOutput {
    
    const insights = this.generateInsights(query, context);
    const recommendations = this.generateRecommendations(query, context);
    const risks = this.identifyRisks(query, context);
    const opportunities = this.identifyOpportunities(query, context);
    const nextSteps = this.generateNextSteps(query, context);
    
    return {
      insights,
      recommendations,
      risks,
      opportunities,
      nextSteps
    };
  }
  
  /**
   * Generate strategic insights based on founder-focused approach
   */
  private generateInsights(query: string, context: AnalysisContext): string[] {
    // PIC-mini reasoning: Lead with insights, not disclaimers
    const insights: string[] = [];
    
    // Analyse query for strategic patterns
    if (this.isMarketResearchQuery(query)) {
      insights.push("🎯 Market positioning opportunity identified");
      insights.push("📊 Competitive landscape analysis required");
    }
    
    if (this.isBusinessModelQuery(query)) {
      insights.push("💰 Revenue model optimisation potential");
      insights.push("🚀 Scalability factors to consider");
    }
    
    if (this.isFounderChallengeQuery(query)) {
      insights.push("⚡ Founder-specific strategic considerations");
      insights.push("🔍 Resource allocation priorities");
    }
    
    return insights;
  }
  
  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(query: string, context: AnalysisContext): string[] {
    const recommendations: string[] = [];
    
    // PIC-mini approach: Structured actionable recommendations
    recommendations.push("📈 Conduct targeted market validation");
    recommendations.push("🤝 Engage with potential customers early");
    recommendations.push("💡 Develop MVP with core value proposition");
    
    return recommendations;
  }
  
  /**
   * Identify strategic risks
   */
  private identifyRisks(query: string, context: AnalysisContext): string[] {
    const risks: string[] = [];
    
    // Consider founder speed and uncertainty constraints
    if (context.companyStage === 'startup') {
      risks.push("⚠️ Resource constraints may limit execution speed");
      risks.push("🎯 Market timing risks in competitive landscape");
    }
    
    return risks;
  }
  
  /**
   * Identify strategic opportunities
   */
  private identifyOpportunities(query: string, context: AnalysisContext): string[] {
    const opportunities: string[] = [];
    
    // Reframe limitations as collaboration opportunities
    opportunities.push("🌟 Partnership potential with complementary businesses");
    opportunities.push("📊 Data-driven decision making advantages");
    
    return opportunities;
  }
  
  /**
   * Generate next steps
   */
  private generateNextSteps(query: string, context: AnalysisContext): string[] {
    const nextSteps: string[] = [];
    
    // Focus on turning complexity to clarity
    nextSteps.push("1️⃣ Define clear success metrics");
    nextSteps.push("2️⃣ Create actionable 30-day plan");
    nextSteps.push("3️⃣ Identify key stakeholders to engage");
    
    return nextSteps;
  }
  
  // Helper methods for query classification
  private isMarketResearchQuery(query: string): boolean {
    const marketKeywords = ['market', 'competition', 'industry', 'trends', 'analysis'];
    return marketKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }
  
  private isBusinessModelQuery(query: string): boolean {
    const businessKeywords = ['revenue', 'business model', 'monetisation', 'pricing'];
    return businessKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }
  
  private isFounderChallengeQuery(query: string): boolean {
    const founderKeywords = ['founder', 'startup', 'challenge', 'strategy', 'decision'];
    return founderKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }
}

export default StrategicAnalysisEngine;
