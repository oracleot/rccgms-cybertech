/**
 * PIC (Personal Intelligence Core) Type Definitions
 */

export type PICProfile = 'pic-mini' | 'pic-1' | 'pic-pro' | string;

export interface PICRequest {
  /**
   * The application making the request (e.g., 'veritus', 'acroniq')
   */
  application: string;
  
  /**
   * Optional user identifier for personalization
   */
  user_id?: string;
  
  /**
   * The message or query to process
   */
  message: string;
  
  /**
   * The PIC profile to use (defaults to 'pic-mini')
   */
  mode?: PICProfile;
  
  /**
   * Additional context for the request
   */
  context?: Record<string, any>;
  
  /**
   * Optional metadata
   */
  metadata?: {
    session_id?: string;
    request_id?: string;
    [key: string]: any;
  };
}

export interface PICResponse {
  /**
   * The processed response message
   */
  response: string;
  
  /**
   * The reasoning steps taken (if applicable)
   */
  reasoning?: string[];
  
  /**
   * Any data or structured information
   */
  data?: Record<string, any>;
  
  /**
   * The profile used for processing
   */
  profile: PICProfile;
  
  /**
   * Any metadata about the response
   */
  metadata?: {
    model_used?: string;
    tokens_used?: number;
    processing_time_ms?: number;
    [key: string]: any;
  };
}

export interface PICProfileConfig {
  /**
   * Unique identifier for the profile
   */
  id: string;
  
  /**
   * Display name
   */
  name: string;
  
  /**
   * Version of the profile
   */
  version: string;
  
  /**
   * Description of the profile
   */
  description: string;
  
  /**
   * The model to use (e.g., 'gpt-4', 'claude-2')
   */
  model: string;
  
  /**
   * Maximum tokens for the response
   */
  max_tokens: number;
  
  /**
   * Temperature setting (0-2)
   */
  temperature: number;
  
  /**
   * System prompt template
   */
  system_prompt: string;
  
  /**
   * Whether this is the default profile
   */
  is_default?: boolean;
  
  /**
   * Any additional configuration
   */
  [key: string]: any;
}

export interface PICHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    core: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message?: string;
    };
    index_service?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message?: string;
      url?: string;
    };
    [key: string]: any;
  };
}

export interface PICError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  timestamp?: string;
}

/**
 * Standard error codes for PIC-Core
 */
export enum PICErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  
  // PIC-specific errors
  INVALID_PROFILE = 'INVALID_PROFILE',
  PROFILE_LOAD_ERROR = 'PROFILE_LOAD_ERROR',
  INDEX_SERVICE_ERROR = 'INDEX_SERVICE_ERROR',
  MODEL_ERROR = 'MODEL_ERROR'
}
