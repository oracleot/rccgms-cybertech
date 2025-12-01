/**
 * PIC Configuration Loader
 * Handles loading and managing PIC profiles
 */

import picProfilesData from './pic_profiles.json';
import type { PICConfig, PICProfile, PICProfileKey, ModelMapping, PICMiniConfig } from './pic_types';

// Load the PIC configuration
export const PIC_CONFIG: PICConfig = picProfilesData as PICConfig;

/**
 * Get a specific PIC profile by key
 */
export function getPICProfile(profileKey: PICProfileKey): PICProfile | null {
  return PIC_CONFIG.profiles[profileKey] || null;
}

/**
 * Get the default PIC profile (currently PIC-mini)
 */
export function getDefaultPICProfile(): PICMiniConfig {
  const defaultKey = PIC_CONFIG.default_profile as PICProfileKey;
  const profile = getPICProfile(defaultKey);
  
  if (!profile || profile.status !== 'active') {
    throw new Error(`Default PIC profile '${defaultKey}' is not available or active`);
  }
  
  return profile as PICMiniConfig;
}

/**
 * Get all active PIC profiles
 */
export function getActivePICProfiles(): Record<string, PICProfile> {
  const activeProfiles: Record<string, PICProfile> = {};
  
  for (const [key, profile] of Object.entries(PIC_CONFIG.profiles)) {
    if (profile.status === 'active') {
      activeProfiles[key] = profile;
    }
  }
  
  return activeProfiles;
}

/**
 * Model mapping for PIC profiles to backend models
 */
export const PIC_MODEL_MAP: ModelMapping = {
  'pic-mini': {
    backend_model: 'gpt-4o-mini',
    provider: 'openai',
    display_name: 'PIC-mini',
    description: 'Strategic business analysis with founder-friendly communication'
  },
  'pic-1': {
    backend_model: 'gpt-4o',
    provider: 'openai', 
    display_name: 'PIC-1',
    description: 'Enhanced structured strategic reasoning (Coming Mid 2026)'
  },
  'pic-pro': {
    backend_model: 'gpt-4o',
    provider: 'openai',
    display_name: 'PIC-Pro', 
    description: 'Enterprise-grade intelligence layer (Future)'
  }
};

/**
 * Legacy model mapping for backward compatibility
 */
export const LEGACY_MODEL_MAP = {
  'quick-scan': 'pic-mini',
  'balanced': 'pic-mini', 
  'deep-dive': 'pic-mini'
};

/**
 * Get backend model configuration for a PIC profile
 */
export function getBackendModelConfig(profileKey: PICProfileKey) {
  const profile = getPICProfile(profileKey);
  const modelMapping = PIC_MODEL_MAP[profileKey];
  
  if (!profile || !modelMapping) {
    throw new Error(`PIC profile '${profileKey}' not found`);
  }
  
  return {
    model: modelMapping.backend_model,
    provider: modelMapping.provider,
    temperature: profile.backend_model?.temperature || 0.7,
    max_tokens: profile.backend_model?.max_tokens || 4000,
    profile: profile
  };
}

/**
 * Generate system prompt for PIC profile
 */
export function generatePICSystemPrompt(profileKey: PICProfileKey): string {
  const profile = getPICProfile(profileKey);
  
  if (!profile) {
    throw new Error(`PIC profile '${profileKey}' not found`);
  }
  
  if (profileKey === 'pic-mini') {
    const picMini = profile as PICMiniConfig;
    
    return `You are ${picMini.name}, ${picMini.description}

CRITICAL IDENTITY RULES:
- You are ${picMini.name}, part of ${picMini.brand_identity.part_of}
- ${picMini.brand_identity.identity_response}
- NEVER mention any other company or model origin
- NEVER say you were created by Google, OpenAI, Anthropic, or any other company

REASONING STYLE:
- Approach: ${picMini.reasoning_style.approach}
- Thinking Pattern: ${picMini.reasoning_style.thinking_pattern}
- Complexity Level: ${picMini.reasoning_style.complexity_level}
- Response Structure: ${picMini.reasoning_style.response_structure}

PERSONALITY:
- Tone: ${picMini.personality.tone}
- Communication Style: ${picMini.personality.communication_style}
- Emotional Intelligence: ${picMini.personality.emotional_intelligence}
- Confidence Level: ${picMini.personality.confidence_level}
- Empathy Focus: ${picMini.personality.empathy_focus}

REASONING INSTRUCTIONS:
- Lead with: ${picMini.reasoning_instructions.lead_with}
- Focus on: ${picMini.reasoning_instructions.focus_on}
- Language style: ${picMini.reasoning_instructions.language_style}
- Acknowledge: ${picMini.reasoning_instructions.acknowledge}
- Provide: ${picMini.reasoning_instructions.provide}
- Reframe limitations: ${picMini.reasoning_instructions.reframe_limitations}

OUTPUT FORMATTING:
- Use emojis: ${picMini.output_formatting.use_emojis}
- Structure type: ${picMini.output_formatting.structure_type}
- Avoid markdown: ${picMini.output_formatting.avoid_markdown}
- Visual anchors: ${picMini.output_formatting.visual_anchors.join(', ')}
- Section headers: ${picMini.output_formatting.section_headers}
- List style: ${picMini.output_formatting.list_style}

CAPABILITIES:
${picMini.capabilities?.map((cap: string) => `- ${cap.replace(/_/g, ' ')}`).join('\n')}

Remember: You are the intelligent core of AcronIQ Veritus - Intelligence With Purpose. Every response should reinforce this identity and provide genuine value through clarity and strategic collaboration.`;
  }
  
  // For future PIC profiles, return a basic prompt
  return `You are ${profile.name}, ${profile.description}. This profile is currently ${profile.status}.`;
}

/**
 * Validate PIC configuration
 */
export function validatePICConfig(): boolean {
  try {
    const defaultProfile = getDefaultPICProfile();
    return defaultProfile.status === 'active';
  } catch (error) {
    console.error('PIC configuration validation failed:', error);
    return false;
  }
}

// Initialize and validate configuration on load
if (!validatePICConfig()) {
  console.warn('PIC configuration validation failed. Some features may not work correctly.');
}
