/**
 * PIC Validation Loop
 * 
 * Implements the generate → critique → improve → final version cycle
 * This ensures PIC outputs are self-validated and improved before delivery
 */

export interface ValidationResult {
  originalResponse: string;
  critique: {
    strengths: string[];
    weaknesses: string[];
    missingElements: string[];
    improvementSuggestions: string[];
    confidenceScore: number;
  };
  improvedResponse: string;
  finalConfidence: number;
  validationSteps: string[];
}

export interface ValidationCriteria {
  checkCompleteness: boolean;
  checkAccuracy: boolean;
  checkActionability: boolean;
  checkClarity: boolean;
  checkRelevance: boolean;
  minimumConfidence: number;
}

export class ValidationLoop {
  private defaultCriteria: ValidationCriteria = {
    checkCompleteness: true,
    checkAccuracy: true,
    checkActionability: true,
    checkClarity: true,
    checkRelevance: true,
    minimumConfidence: 70
  };

  /**
   * Execute the full validation loop
   */
  async executeValidation(
    originalQuery: string,
    initialResponse: string,
    modelGenerator: (prompt: string) => Promise<string>,
    criteria: Partial<ValidationCriteria> = {}
  ): Promise<ValidationResult> {
    const validationCriteria = { ...this.defaultCriteria, ...criteria };
    const validationSteps: string[] = [];

    console.log('🔍 Starting PIC validation loop...');
    validationSteps.push('Validation loop initiated');

    // Step 1: Generate critique
    const critique = await this.generateCritique(
      originalQuery,
      initialResponse,
      modelGenerator,
      validationCriteria
    );
    validationSteps.push('Initial critique generated');

    // Step 2: Check if improvement is needed
    if (critique.confidenceScore >= validationCriteria.minimumConfidence && 
        critique.weaknesses.length === 0) {
      console.log('✅ Initial response meets validation criteria');
      validationSteps.push('Response validated - no improvements needed');
      
      return {
        originalResponse: initialResponse,
        critique,
        improvedResponse: initialResponse,
        finalConfidence: critique.confidenceScore,
        validationSteps
      };
    }

    // Step 3: Generate improved response
    console.log('🔄 Generating improved response based on critique...');
    const improvedResponse = await this.generateImprovement(
      originalQuery,
      initialResponse,
      critique,
      modelGenerator
    );
    validationSteps.push('Improved response generated');

    // Step 4: Final validation check
    const finalCritique = await this.generateCritique(
      originalQuery,
      improvedResponse,
      modelGenerator,
      validationCriteria
    );
    validationSteps.push('Final validation completed');

    const finalConfidence = Math.max(critique.confidenceScore, finalCritique.confidenceScore);

    console.log(`✅ Validation loop completed with ${finalConfidence}% confidence`);

    return {
      originalResponse: initialResponse,
      critique,
      improvedResponse,
      finalConfidence,
      validationSteps
    };
  }

  /**
   * Generate critique of the response
   */
  private async generateCritique(
    originalQuery: string,
    response: string,
    modelGenerator: (prompt: string) => Promise<string>,
    criteria: ValidationCriteria
  ): Promise<ValidationResult['critique']> {
    const critiquePrompt = this.buildCritiquePrompt(originalQuery, response, criteria);
    
    try {
      const critiqueResponse = await modelGenerator(critiquePrompt);
      return this.parseCritiqueResponse(critiqueResponse);
    } catch (error) {
      console.warn('⚠️ Critique generation failed, using fallback');
      return this.generateFallbackCritique(response);
    }
  }

  /**
   * Generate improved response based on critique
   */
  private async generateImprovement(
    originalQuery: string,
    originalResponse: string,
    critique: ValidationResult['critique'],
    modelGenerator: (prompt: string) => Promise<string>
  ): Promise<string> {
    const improvementPrompt = `
As PIC Improvement Engine, enhance this strategic analysis based on the critique:

ORIGINAL QUERY: "${originalQuery}"

ORIGINAL RESPONSE:
${originalResponse}

CRITIQUE FINDINGS:
Strengths: ${critique.strengths.join(', ')}
Weaknesses: ${critique.weaknesses.join(', ')}
Missing Elements: ${critique.missingElements.join(', ')}
Improvement Suggestions: ${critique.improvementSuggestions.join(', ')}

IMPROVEMENT INSTRUCTIONS:
1. Keep all the strengths from the original response
2. Address each identified weakness
3. Add the missing elements
4. Implement the improvement suggestions
5. Maintain the strategic, actionable tone
6. Ensure the response is comprehensive and well-structured

Generate an improved version that addresses all critique points while maintaining PIC's strategic intelligence standards:`;

    try {
      return await modelGenerator(improvementPrompt);
    } catch (error) {
      console.warn('⚠️ Improvement generation failed, returning original');
      return originalResponse;
    }
  }

  /**
   * Build critique prompt based on validation criteria
   */
  private buildCritiquePrompt(
    originalQuery: string,
    response: string,
    criteria: ValidationCriteria
  ): string {
    const checks = [];
    
    if (criteria.checkCompleteness) {
      checks.push('COMPLETENESS: Does the response fully address all aspects of the query?');
    }
    
    if (criteria.checkAccuracy) {
      checks.push('ACCURACY: Are the insights and recommendations realistic and well-founded?');
    }
    
    if (criteria.checkActionability) {
      checks.push('ACTIONABILITY: Does the response provide clear, specific actions the user can take?');
    }
    
    if (criteria.checkClarity) {
      checks.push('CLARITY: Is the response well-structured and easy to understand?');
    }
    
    if (criteria.checkRelevance) {
      checks.push('RELEVANCE: Does the response directly address the user\'s business context?');
    }

    return `
As PIC Validation Engine, critically evaluate this strategic analysis:

ORIGINAL QUERY: "${originalQuery}"

RESPONSE TO EVALUATE:
${response}

VALIDATION CRITERIA:
${checks.join('\n')}

Provide a structured critique in JSON format:
{
  "strengths": ["list of what works well"],
  "weaknesses": ["list of issues or gaps"],
  "missingElements": ["list of what should be added"],
  "improvementSuggestions": ["specific suggestions for enhancement"],
  "confidenceScore": number (0-100)
}

Be thorough but constructive in your critique. Focus on making the response more strategic and actionable.`;
  }

  /**
   * Parse critique response from model
   */
  private parseCritiqueResponse(critiqueResponse: string): ValidationResult['critique'] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = critiqueResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          missingElements: parsed.missingElements || [],
          improvementSuggestions: parsed.improvementSuggestions || [],
          confidenceScore: parsed.confidenceScore || 75
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse critique JSON, using text analysis');
    }

    // Fallback: analyze text for critique elements
    return this.extractCritiqueFromText(critiqueResponse);
  }

  /**
   * Extract critique elements from unstructured text
   */
  private extractCritiqueFromText(text: string): ValidationResult['critique'] {
    const strengths = this.extractListItems(text, ['strength', 'good', 'well', 'effective']);
    const weaknesses = this.extractListItems(text, ['weakness', 'issue', 'problem', 'lacking']);
    const missing = this.extractListItems(text, ['missing', 'absent', 'needs', 'should include']);
    const suggestions = this.extractListItems(text, ['suggest', 'recommend', 'improve', 'enhance']);

    // Estimate confidence based on critique content
    const confidenceScore = this.estimateConfidenceFromCritique(text, weaknesses.length);

    return {
      strengths,
      weaknesses,
      missingElements: missing,
      improvementSuggestions: suggestions,
      confidenceScore
    };
  }

  /**
   * Extract list items from text based on keywords
   */
  private extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (cleanLine.length > 10) {
          items.push(cleanLine);
        }
      }
    }

    return items.slice(0, 5); // Limit to 5 items per category
  }

  /**
   * Estimate confidence score from critique text
   */
  private estimateConfidenceFromCritique(text: string, weaknessCount: number): number {
    const positiveWords = ['good', 'well', 'strong', 'effective', 'comprehensive'];
    const negativeWords = ['weak', 'missing', 'unclear', 'incomplete', 'poor'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    let baseScore = 75;
    baseScore += positiveCount * 5;
    baseScore -= negativeCount * 8;
    baseScore -= weaknessCount * 10;

    return Math.max(30, Math.min(95, baseScore));
  }

  /**
   * Generate fallback critique when model fails
   */
  private generateFallbackCritique(response: string): ValidationResult['critique'] {
    const wordCount = response.split(' ').length;
    const hasStructure = response.includes('##') || response.includes('•') || response.includes('-');
    const hasNumbers = /\d+/.test(response);
    const hasActionWords = /\b(recommend|suggest|should|action|step|plan)\b/i.test(response);

    const strengths = [];
    const weaknesses = [];
    const missing = [];
    const suggestions = [];

    if (hasStructure) strengths.push('Well-structured response with clear sections');
    if (hasNumbers) strengths.push('Includes quantitative elements');
    if (hasActionWords) strengths.push('Contains actionable recommendations');

    if (wordCount < 200) {
      weaknesses.push('Response may be too brief for comprehensive analysis');
      suggestions.push('Expand with more detailed insights and recommendations');
    }

    if (!hasStructure) {
      missing.push('Clear structure with headings and bullet points');
      suggestions.push('Organize content with clear sections and formatting');
    }

    if (!hasActionWords) {
      missing.push('Specific actionable recommendations');
      suggestions.push('Add concrete next steps and action items');
    }

    const confidenceScore = Math.max(60, 
      (strengths.length * 15) - (weaknesses.length * 10) + (wordCount > 300 ? 10 : 0)
    );

    return {
      strengths,
      weaknesses,
      missingElements: missing,
      improvementSuggestions: suggestions,
      confidenceScore
    };
  }

  /**
   * Quick validation check without full loop
   */
  async quickValidation(
    response: string,
    modelGenerator?: (prompt: string) => Promise<string>
  ): Promise<{ isValid: boolean; confidence: number; issues: string[] }> {
    const issues = [];
    let confidence = 85;

    // Basic structural checks
    if (response.length < 100) {
      issues.push('Response too short for strategic analysis');
      confidence -= 20;
    }

    if (!response.includes('##') && !response.includes('•') && !response.includes('-')) {
      issues.push('Lacks clear structure and formatting');
      confidence -= 15;
    }

    if (!/\b(recommend|suggest|action|step|plan)\b/i.test(response)) {
      issues.push('Missing actionable recommendations');
      confidence -= 15;
    }

    if (!/\b(risk|opportunity|market|business)\b/i.test(response)) {
      issues.push('May lack strategic business focus');
      confidence -= 10;
    }

    return {
      isValid: confidence >= 70 && issues.length === 0,
      confidence: Math.max(30, confidence),
      issues
    };
  }
}

export default ValidationLoop;
