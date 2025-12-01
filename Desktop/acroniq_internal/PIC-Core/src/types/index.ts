/**
 * Core TypeScript type definitions for PIC-Core
 */

// Environment variable types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server Configuration
      PORT?: string;
      NODE_ENV: 'development' | 'production' | 'test';
      
      // CORS
      ALLOWED_ORIGINS?: string;
      
      // Authentication
      SERVICE_API_KEY?: string;
      
      // Logging
      LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
      
      // PIC Configuration
      DEFAULT_PIC_PROFILE?: string;
      
      // External Services
      INDEX_SERVICE_URL?: string;
    }
  }
}

// Extended Error type with status code
export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

// Server configuration
export interface PICServerConfig {
  port: number;
  corsOptions?: {
    origin: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  enableRequestLogging?: boolean;
  enableResponseTime?: boolean;
}

// Request context
export interface RequestContext {
  requestId: string;
  ip: string;
  userAgent?: string;
  startTime: number;
}

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  checks: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message?: string;
      timestamp: string;
      [key: string]: any;
    };
  };
}

// Request validation error
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export * from './pic.types'; // We'll create this next
