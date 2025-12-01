/**
 * PIC (Polaris Intelligence Core) Type Definitions
 * Defines the structure for PIC reasoning profiles
 */

export interface PICProfile {
  name: string;
  version: string;
  description: string;
  status: 'active' | 'planned' | 'conceptual' | 'deprecated';
  release_date?: string;
  reasoning_style: {
    approach: string;
    thinking_pattern: string;
    complexity_level: 'basic' | 'balanced' | 'advanced' | 'expert';
    response_structure: string;
  };
  personality?: {
    tone: string;
    communication_style: string;
    emotional_intelligence: 'low' | 'medium' | 'high';
    confidence_level: string;
    empathy_focus: string;
  };
  output_formatting?: {
    use_emojis: boolean;
    structure_type: string;
    avoid_markdown: boolean;
    visual_anchors: string[];
    section_headers: string;
    list_style: string;
  };
  reasoning_instructions?: {
    lead_with: string;
    focus_on: string;
    language_style: string;
    acknowledge: string;
    provide: string;
    reframe_limitations: string;
  };
  backend_model?: {
    primary: string;
    fallback: string[];
    provider: string;
    temperature: number;
    max_tokens: number;
  };
  capabilities?: string[];
  limitations?: string[];
  brand_identity?: {
    created_by: string;
    part_of: string;
    suppress_patterns: string[];
    identity_response: string;
  };
  note?: string;
}

export interface PICConfig {
  profiles: Record<string, PICProfile>;
  default_profile: string;
  config_version: string;
  last_updated: string;
}

export type PICProfileKey = 'pic-mini' | 'pic-1' | 'pic-pro';

export interface ModelMapping {
  [key: string]: {
    backend_model: string;
    provider: string;
    display_name: string;
    description: string;
  };
}

// Helper type for reasoning modes
export type ReasoningMode = 'quick-scan' | 'balanced' | 'deep-dive';

// PIC-mini specific types
export interface PICMiniConfig extends PICProfile {
  status: 'active';
  personality: NonNullable<PICProfile['personality']>;
  output_formatting: NonNullable<PICProfile['output_formatting']>;
  reasoning_instructions: NonNullable<PICProfile['reasoning_instructions']>;
  backend_model: NonNullable<PICProfile['backend_model']>;
  brand_identity: NonNullable<PICProfile['brand_identity']>;
}

// Export default to make this a module
export default {};
