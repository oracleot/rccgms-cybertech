/**
 * PIC Programs - Specialized Reasoning Paths
 * 
 * These are predefined "thought paths" that PIC follows for different types of business analysis.
 * Each program represents a specific way of thinking about business problems.
 */

export interface PICProgram {
  name: string;
  description: string;
  frameworks: string[];
  prompts: {
    analysis: string;
    synthesis: string;
    validation: string;
  };
  outputStructure: string[];
}

export class PICProgramManager {
  private programs: Map<string, PICProgram> = new Map();

  constructor() {
    this.initializePrograms();
  }

  /**
   * Get a specific PIC program
   */
  getProgram(name: string): PICProgram | undefined {
    return this.programs.get(name);
  }

  /**
   * Get all available programs
   */
  getAllPrograms(): PICProgram[] {
    return Array.from(this.programs.values());
  }

  /**
   * Select the best program for a query type
   */
  selectProgram(queryType: string, businessContext?: any): PICProgram {
    const programMap: Record<string, string> = {
      'business_validation': 'pic-validation',
      'market_analysis': 'pic-market-scanner',
      'strategy': 'pic-strategy',
      'competitor_analysis': 'pic-competitor-engine',
      'general': 'pic-idea-filter'
    };

    const programName = programMap[queryType] || 'pic-idea-filter';
    return this.programs.get(programName) || this.programs.get('pic-idea-filter')!;
  }

  private initializePrograms(): void {
    // PIC-Strategy Program
    this.programs.set('pic-strategy', {
      name: 'PIC-Strategy Program',
      description: 'Comprehensive strategic planning and business model analysis',
      frameworks: ['swot', 'porter_five_forces', 'value_proposition', 'business_model_canvas'],
      prompts: {
        analysis: `
As PIC-Strategy, conduct a comprehensive strategic analysis:

1. STRATEGIC POSITION ANALYSIS
   - Current market position
   - Competitive advantages
   - Strategic assets and capabilities
   - Market dynamics and trends

2. STRATEGIC OPTIONS EVALUATION
   - Growth strategies available
   - Market expansion opportunities
   - Product/service development paths
   - Partnership and acquisition options

3. STRATEGIC IMPLEMENTATION ROADMAP
   - Priority initiatives
   - Resource requirements
   - Timeline and milestones
   - Success metrics and KPIs

Focus on actionable strategic insights that drive business growth.`,
        synthesis: `
Synthesize the strategic analysis into clear strategic recommendations:
- Primary strategic direction
- Key strategic initiatives
- Competitive positioning
- Resource allocation priorities
- Risk mitigation strategies`,
        validation: `
Validate the strategic recommendations:
- Market feasibility assessment
- Competitive response analysis
- Resource availability check
- Implementation complexity evaluation
- ROI and success probability`
      },
      outputStructure: [
        'strategic_position',
        'strategic_options',
        'recommended_strategy',
        'implementation_roadmap',
        'success_metrics',
        'risk_assessment'
      ]
    });

    // PIC-Validation Program
    this.programs.set('pic-validation', {
      name: 'PIC-Validation Program',
      description: 'Business idea validation and feasibility assessment',
      frameworks: ['market_fit', 'tam_sam_som', 'risk_analysis', 'customer_validation'],
      prompts: {
        analysis: `
As PIC-Validation, thoroughly validate this business concept:

1. MARKET VALIDATION
   - Target market size and growth
   - Customer pain points and needs
   - Market timing and readiness
   - Regulatory and compliance factors

2. BUSINESS MODEL VALIDATION
   - Revenue model viability
   - Cost structure analysis
   - Unit economics and scalability
   - Competitive differentiation

3. EXECUTION VALIDATION
   - Team and capability assessment
   - Resource requirements
   - Technical feasibility
   - Go-to-market strategy

Provide honest, data-driven validation insights.`,
        synthesis: `
Synthesize validation findings into clear go/no-go recommendation:
- Market opportunity score
- Business model viability
- Execution feasibility
- Overall validation score
- Critical success factors`,
        validation: `
Cross-validate the assessment:
- Compare against similar successful/failed ventures
- Stress-test key assumptions
- Identify validation experiments needed
- Assess confidence level in recommendation`
      },
      outputStructure: [
        'market_validation',
        'business_model_validation',
        'execution_validation',
        'go_no_go_recommendation',
        'validation_experiments',
        'confidence_assessment'
      ]
    });

    // PIC-Idea Filter
    this.programs.set('pic-idea-filter', {
      name: 'PIC-Idea Filter',
      description: 'Quick business idea screening and initial assessment',
      frameworks: ['swot', 'market_fit', 'basic_feasibility'],
      prompts: {
        analysis: `
As PIC-Idea Filter, quickly screen this business idea:

1. IDEA CLARITY AND UNIQUENESS
   - Problem being solved
   - Solution differentiation
   - Value proposition strength
   - Market need validation

2. MARKET OPPORTUNITY SCREENING
   - Market size estimation
   - Competition landscape
   - Customer segments
   - Market entry barriers

3. FEASIBILITY QUICK CHECK
   - Resource requirements
   - Technical complexity
   - Regulatory hurdles
   - Time to market

Provide rapid but insightful screening results.`,
        synthesis: `
Synthesize screening into clear initial assessment:
- Idea strength score
- Market opportunity rating
- Feasibility assessment
- Initial recommendation
- Next steps for validation`,
        validation: `
Quick validation check:
- Red flags identification
- Assumption validation needs
- Market research priorities
- Feasibility concerns`
      },
      outputStructure: [
        'idea_assessment',
        'market_opportunity',
        'feasibility_check',
        'initial_recommendation',
        'next_validation_steps'
      ]
    });

    // PIC-Market Scanner
    this.programs.set('pic-market-scanner', {
      name: 'PIC-Market Scanner',
      description: 'Comprehensive market analysis and opportunity identification',
      frameworks: ['tam_sam_som', 'competitor_mapping', 'trend_analysis', 'customer_segmentation'],
      prompts: {
        analysis: `
As PIC-Market Scanner, conduct deep market analysis:

1. MARKET SIZE AND DYNAMICS
   - Total Addressable Market (TAM)
   - Serviceable Addressable Market (SAM)
   - Serviceable Obtainable Market (SOM)
   - Market growth trends and drivers

2. COMPETITIVE LANDSCAPE MAPPING
   - Direct and indirect competitors
   - Market share distribution
   - Competitive positioning
   - Competitive advantages and weaknesses

3. CUSTOMER ANALYSIS
   - Customer segments and personas
   - Buying behavior and decision factors
   - Customer acquisition channels
   - Customer lifetime value potential

4. MARKET TRENDS AND OPPORTUNITIES
   - Emerging trends and disruptions
   - Unmet needs and gaps
   - Technology impacts
   - Regulatory changes

Provide comprehensive market intelligence.`,
        synthesis: `
Synthesize market analysis into strategic market insights:
- Market attractiveness score
- Competitive positioning opportunities
- Customer acquisition strategies
- Market entry recommendations
- Growth potential assessment`,
        validation: `
Validate market analysis:
- Market size assumptions
- Competitive intelligence accuracy
- Customer insight validation
- Trend analysis reliability`
      },
      outputStructure: [
        'market_size_analysis',
        'competitive_landscape',
        'customer_analysis',
        'market_trends',
        'market_opportunities',
        'entry_strategy'
      ]
    });

    // PIC-Competitor Engine
    this.programs.set('pic-competitor-engine', {
      name: 'PIC-Competitor Engine',
      description: 'Detailed competitive analysis and positioning strategy',
      frameworks: ['competitor_mapping', 'competitive_advantage', 'positioning_analysis'],
      prompts: {
        analysis: `
As PIC-Competitor Engine, analyze the competitive landscape:

1. COMPETITOR IDENTIFICATION AND MAPPING
   - Direct competitors analysis
   - Indirect competitors assessment
   - Substitute products/services
   - New entrant threats

2. COMPETITIVE POSITIONING ANALYSIS
   - Competitor strengths and weaknesses
   - Market positioning strategies
   - Pricing strategies
   - Value propositions comparison

3. COMPETITIVE ADVANTAGE ASSESSMENT
   - Sustainable competitive advantages
   - Competitive moats and barriers
   - Differentiation opportunities
   - Competitive response scenarios

4. COMPETITIVE STRATEGY DEVELOPMENT
   - Positioning strategy recommendations
   - Competitive response planning
   - Differentiation strategies
   - Competitive monitoring framework

Provide actionable competitive intelligence.`,
        synthesis: `
Synthesize competitive analysis into strategic positioning:
- Competitive positioning map
- Differentiation strategy
- Competitive advantages to build
- Competitive threats to monitor
- Positioning recommendations`,
        validation: `
Validate competitive analysis:
- Competitor assessment accuracy
- Positioning strategy viability
- Competitive advantage sustainability
- Market response predictions`
      },
      outputStructure: [
        'competitor_mapping',
        'competitive_positioning',
        'competitive_advantages',
        'differentiation_strategy',
        'competitive_monitoring',
        'positioning_recommendations'
      ]
    });

    console.log(`🧩 PIC Programs initialized: ${this.programs.size} programs available`);
  }

  /**
   * Execute a specific program with given input
   */
  async executeProgram(
    programName: string, 
    input: string, 
    context?: any,
    modelGenerator?: (prompt: string) => Promise<string>
  ): Promise<any> {
    const program = this.programs.get(programName);
    if (!program) {
      throw new Error(`PIC Program '${programName}' not found`);
    }

    console.log(`🚀 Executing ${program.name}...`);

    // If no model generator provided, return structured template
    if (!modelGenerator) {
      return {
        program: program.name,
        analysis: `${program.prompts.analysis}\n\nInput: ${input}`,
        frameworks: program.frameworks,
        outputStructure: program.outputStructure
      };
    }

    try {
      // Execute analysis phase
      const analysisPrompt = `${program.prompts.analysis}\n\nBusiness Context: ${input}\n\nAdditional Context: ${JSON.stringify(context || {})}`;
      const analysisResult = await modelGenerator(analysisPrompt);

      // Execute synthesis phase
      const synthesisPrompt = `${program.prompts.synthesis}\n\nAnalysis Results: ${analysisResult}`;
      const synthesisResult = await modelGenerator(synthesisPrompt);

      // Execute validation phase
      const validationPrompt = `${program.prompts.validation}\n\nSynthesis: ${synthesisResult}`;
      const validationResult = await modelGenerator(validationPrompt);

      return {
        program: program.name,
        frameworks: program.frameworks,
        results: {
          analysis: analysisResult,
          synthesis: synthesisResult,
          validation: validationResult
        },
        outputStructure: program.outputStructure,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ PIC Program execution failed:`, error);
      throw error;
    }
  }
}

export default PICProgramManager;
