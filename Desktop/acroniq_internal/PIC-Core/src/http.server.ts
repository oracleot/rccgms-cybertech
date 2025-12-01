/**
 * PIC-Core HTTP Server
 * REST API endpoints for all AcronIQ applications
 * Enhanced with comprehensive API routes and monitoring
 */

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import { PICCore, PICRequest, type PICProfileKey } from './pic.core';
import { getPICMonitoringService } from './services/pic.monitoring.service';
import { getPICAnalysisService } from './services/pic.analysis.service';

export class PICServer {
  private app: Application;
  private picCore: PICCore;
  private port: number;
  
  constructor(port: number = 3001) {
    this.app = express();
    this.picCore = new PICCore();
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }
  
  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Root endpoint - service information
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'PIC-Core',
        description: 'Polaris Intelligence Core - Central reasoning engine for AcronIQ applications',
        version: '1.0.0',
        status: 'active',
        endpoints: {
          health: 'GET /health',
          analyse: 'POST /api/pic/analyse',
          modes: 'GET /api/pic/modes',
          profile: 'GET /api/pic/profile/:mode',
          metrics: 'GET /api/pic/metrics',
          analytics: 'GET /api/pic/analytics',
          alerts: 'GET /api/pic/alerts',
          frameworks: 'GET /api/pic/frameworks',
          feedback: 'POST /api/pic/feedback/:queryId',
          status: 'GET /api/pic/status'
        },
        documentation: 'https://docs.acroniq.com/pic-core',
        timestamp: new Date().toISOString()
      });
    });

    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const health = await this.picCore.healthCheck();
        res.json({
          status: health.status,
          service: 'PIC-Core',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          services: health.services
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          status: 'unhealthy',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Main PIC analysis endpoint
    this.app.post('/api/pic/analyse', async (req: Request, res: Response) => {
      try {
        const picRequest: PICRequest = {
          application: req.body.application || 'unknown',
          user_id: req.body.user_id,
          message: req.body.query || req.body.message,
          mode: req.body.mode || 'pic-mini',
          context: req.body.context,
          metadata: req.body.metadata
        };

        if (!picRequest.message) {
          return res.status(400).json({
            error: 'Missing required field: query/message',
            timestamp: new Date().toISOString()
          });
        }

        const result = await this.picCore.processRequest(picRequest);
        
        res.json({
          success: true,
          data: {
            content: result.response,
            insight: {
              summary: result.response.substring(0, 200) + '...',
              confidence: result.metadata.confidence,
              frameworksUsed: result.metadata.frameworks_used || [],
              analysisType: result.metadata.analysis_type
            },
            processingTime: result.metadata.processing_time_ms,
            version: result.metadata.mode,
            confidence: result.metadata.confidence,
            analysisType: result.metadata.analysis_type,
            frameworksUsed: result.metadata.frameworks_used,
            model: result.metadata.model_used,
            provider: result.metadata.provider
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        console.error('PIC analysis error:', err);
        res.status(500).json({
          success: false,
          error: {
            code: 'PIC_ANALYSIS_FAILED',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get available PIC modes
    this.app.get('/api/pic/modes', (req: Request, res: Response) => {
      try {
        const modes = this.picCore.getAvailableModes();
        res.json({
          success: true,
          data: {
            modes: modes.map(mode => ({
              id: mode,
              name: mode.replace('pic-', '').charAt(0).toUpperCase() + mode.replace('pic-', '').slice(1),
              description: this.getModeDescription(mode)
            }))
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get PIC profile/mode information
    this.app.get('/api/pic/profile/:mode', (req: Request, res: Response) => {
      try {
        const { mode } = req.params;
        const availableModes = this.picCore.getAvailableModes();
        
        if (!availableModes.includes(mode as PICProfileKey)) {
          return res.status(404).json({
            success: false,
            error: `PIC mode '${mode}' not found`,
            availableModes,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          data: {
            mode,
            name: mode.replace('pic-', '').charAt(0).toUpperCase() + mode.replace('pic-', '').slice(1),
            description: this.getModeDescription(mode),
            capabilities: this.getModeCapabilities(mode),
            recommendedFor: this.getModeUseCases(mode)
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitoring and analytics endpoints
    this.app.get('/api/pic/metrics', (req: Request, res: Response) => {
      try {
        const monitoringService = getPICMonitoringService();
        const metrics = monitoringService.getMetrics();
        
        res.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.get('/api/pic/analytics', (req: Request, res: Response) => {
      try {
        const timeRange = (req.query.timeRange as 'hour' | 'day' | 'week' | 'month') || 'day';
        const analytics = this.picCore.getAnalytics(timeRange);
        
        res.json({
          success: true,
          data: analytics,
          timeRange,
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.get('/api/pic/alerts', (req: Request, res: Response) => {
      try {
        const monitoringService = getPICMonitoringService();
        const alerts = monitoringService.getAlerts();
        
        res.json({
          success: true,
          data: alerts,
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Analysis frameworks endpoints
    this.app.get('/api/pic/frameworks', (req: Request, res: Response) => {
      try {
        const analysisService = getPICAnalysisService();
        const frameworks = analysisService.getAvailableFrameworks();
        
        res.json({
          success: true,
          data: frameworks.map(f => ({
            name: f.name,
            description: f.description,
            confidenceWeights: f.confidenceWeights
          })),
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // User feedback endpoint
    this.app.post('/api/pic/feedback/:queryId', (req: Request, res: Response) => {
      try {
        const { queryId } = req.params;
        const { rating, helpful, comments } = req.body;

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
          return res.status(400).json({
            success: false,
            error: 'Invalid rating. Must be a number between 1 and 5.',
            timestamp: new Date().toISOString()
          });
        }

        const monitoringService = getPICMonitoringService();
        monitoringService.addUserFeedback(queryId, {
          rating,
          helpful: helpful !== false,
          comments
        });

        res.json({
          success: true,
          message: 'Feedback recorded successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Service status endpoint
    this.app.get('/api/pic/status', async (req: Request, res: Response) => {
      try {
        const health = await this.picCore.healthCheck();
        const monitoringService = getPICMonitoringService();
        const metrics = monitoringService.getMetrics();
        const analysisService = getPICAnalysisService();
        
        res.json({
          status: 'active',
          health,
          stats: {
            totalQueries: metrics.totalQueries,
            successRate: metrics.totalQueries > 0 ? 
              Math.round((metrics.successfulQueries / metrics.totalQueries) * 100) : 0,
            averageResponseTime: metrics.averageResponseTime,
            averageConfidence: metrics.averageConfidenceScore,
            availableFrameworks: analysisService.getAvailableFrameworks().length,
            availableModes: this.picCore.getAvailableModes().length
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          error: 'PIC status check failed',
          details: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
          'GET /health',
          'POST /api/pic/analyse',
          'GET /api/pic/modes',
          'GET /api/pic/profile/:mode',
          'GET /api/pic/metrics',
          'GET /api/pic/analytics',
          'GET /api/pic/alerts',
          'GET /api/pic/frameworks',
          'POST /api/pic/feedback/:queryId',
          'GET /api/pic/status'
        ],
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    });
  }

  private getModeDescription(mode: string): string {
    const descriptions: Record<string, string> = {
      'pic-mini': 'Quick, lightweight analysis for rapid insights',
      'pic-strategic': 'Comprehensive strategic analysis with multiple frameworks',
      'pic-analysis': 'Deep-dive analysis with full framework suite'
    };
    return descriptions[mode] || 'PIC analysis mode';
  }

  private getModeCapabilities(mode: string): string[] {
    const capabilities: Record<string, string[]> = {
      'pic-mini': ['SWOT Analysis', 'Market Validation', 'Quick Scoring'],
      'pic-strategic': ['SWOT Analysis', 'Market Validation', 'Financial Analysis', 'Risk Assessment'],
      'pic-analysis': ['SWOT Analysis', 'Business Model Canvas', 'Market Validation', 'Financial Analysis', 'Risk Assessment']
    };
    return capabilities[mode] || [];
  }

  private getModeUseCases(mode: string): string[] {
    const useCases: Record<string, string[]> = {
      'pic-mini': ['Initial idea validation', 'Quick feasibility checks', 'Early-stage assessment'],
      'pic-strategic': ['Business planning', 'Investment preparation', 'Strategic decision making'],
      'pic-analysis': ['Comprehensive due diligence', 'Detailed business planning', 'Full strategic review']
    };
    return useCases[mode] || [];
  }

  /**
   * Start the PIC server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.port, () => {
          console.log(`🧠 PIC-Core server started on port ${this.port}`);
          console.log(`📡 API endpoints available:`);
          console.log(`   GET  /health - Health check`);
          console.log(`   POST /api/pic/analyse - Main analysis endpoint`);
          console.log(`   GET  /api/pic/modes - Available PIC modes`);
          console.log(`   GET  /api/pic/profile/:mode - Profile information`);
          console.log(`   GET  /api/pic/metrics - Performance metrics`);
          console.log(`   GET  /api/pic/analytics - Usage analytics`);
          console.log(`   GET  /api/pic/alerts - Active alerts`);
          console.log(`   GET  /api/pic/frameworks - Analysis frameworks`);
          console.log(`   POST /api/pic/feedback/:queryId - User feedback`);
          console.log(`   GET  /api/pic/status - Service status`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Application {
    return this.app;
  }
}
