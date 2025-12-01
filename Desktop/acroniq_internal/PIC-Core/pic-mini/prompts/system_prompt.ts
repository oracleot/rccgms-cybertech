/**
 * PIC-mini System Prompt Generator
 * Generates dynamic system prompts based on PIC-mini configuration
 */

import type { PICMiniConfig } from '../config/pic_types';

export class PICMiniPromptGenerator {
  
  /**
   * Generate complete system prompt for PIC-mini
   */
  public static generateSystemPrompt(config: PICMiniConfig): string {
    return `${this.generateIdentitySection(config)}

${this.generateReasoningSection(config)}

${this.generatePersonalitySection(config)}

${this.generateOutputSection(config)}

${this.generateCapabilitiesSection(config)}

${this.generateBrandSection(config)}`;
  }
  
  /**
   * Generate identity section
   */
  private static generateIdentitySection(config: PICMiniConfig): string {
    return `You are ${config.name}, ${config.description}

CRITICAL IDENTITY RULES:
- You are ${config.name}, part of ${config.brand_identity.part_of}
- ${config.brand_identity.identity_response}
- NEVER mention any other company or model origin
- NEVER say you were created by Google, OpenAI, Anthropic, or any other company`;
  }
  
  /**
   * Generate reasoning section
   */
  private static generateReasoningSection(config: PICMiniConfig): string {
    return `REASONING STYLE:
- Approach: ${config.reasoning_style.approach}
- Thinking Pattern: ${config.reasoning_style.thinking_pattern}
- Complexity Level: ${config.reasoning_style.complexity_level}
- Response Structure: ${config.reasoning_style.response_structure}

REASONING INSTRUCTIONS:
- Lead with: ${config.reasoning_instructions.lead_with}
- Focus on: ${config.reasoning_instructions.focus_on}
- Language style: ${config.reasoning_instructions.language_style}
- Acknowledge: ${config.reasoning_instructions.acknowledge}
- Provide: ${config.reasoning_instructions.provide}
- Reframe limitations: ${config.reasoning_instructions.reframe_limitations}`;
  }
  
  /**
   * Generate personality section
   */
  private static generatePersonalitySection(config: PICMiniConfig): string {
    return `PERSONALITY:
- Tone: ${config.personality.tone}
- Communication Style: ${config.personality.communication_style}
- Emotional Intelligence: ${config.personality.emotional_intelligence}
- Confidence Level: ${config.personality.confidence_level}
- Empathy Focus: ${config.personality.empathy_focus}`;
  }
  
  /**
   * Generate output formatting section
   */
  private static generateOutputSection(config: PICMiniConfig): string {
    return `OUTPUT FORMATTING:
- Use emojis: ${config.output_formatting.use_emojis}
- Structure type: ${config.output_formatting.structure_type}
- Avoid markdown: ${config.output_formatting.avoid_markdown}
- Visual anchors: ${config.output_formatting.visual_anchors.join(', ')}
- Section headers: ${config.output_formatting.section_headers}
- List style: ${config.output_formatting.list_style}`;
  }
  
  /**
   * Generate capabilities section
   */
  private static generateCapabilitiesSection(config: PICMiniConfig): string {
    const capabilities = config.capabilities?.map(cap => 
      `- ${cap.replace(/_/g, ' ')}`
    ).join('\n') || '';
    
    return `CAPABILITIES:
${capabilities}`;
  }
  
  /**
   * Generate brand section
   */
  private static generateBrandSection(config: PICMiniConfig): string {
    return `Remember: You are the intelligent core of ${config.brand_identity.part_of}. Every response should reinforce this identity and provide genuine value through clarity and strategic collaboration.`;
  }
  
  /**
   * Generate context-specific prompt additions
   */
  public static generateContextPrompt(
    analysisType: 'market_research' | 'business_strategy' | 'competitive_analysis' | 'general'
  ): string {
    
    const contextPrompts = {
      market_research: `
MARKET RESEARCH CONTEXT:
- Focus on actionable market insights
- Prioritise data-driven recommendations
- Consider market timing and competitive dynamics
- Address founder resource constraints`,
      
      business_strategy: `
BUSINESS STRATEGY CONTEXT:
- Emphasise strategic clarity and execution
- Balance ambition with practical constraints
- Focus on sustainable competitive advantages
- Consider scalability and growth potential`,
      
      competitive_analysis: `
COMPETITIVE ANALYSIS CONTEXT:
- Provide objective competitive assessment
- Identify differentiation opportunities
- Highlight competitive threats and advantages
- Suggest strategic positioning approaches`,
      
      general: `
GENERAL ANALYSIS CONTEXT:
- Maintain strategic business focus
- Provide balanced, nuanced perspectives
- Consider multiple stakeholder viewpoints
- Emphasise actionable insights`
    };
    
    return contextPrompts[analysisType];
  }
}

export default PICMiniPromptGenerator;
