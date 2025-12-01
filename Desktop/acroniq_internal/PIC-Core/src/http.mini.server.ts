/**
 * PIC-Mini HTTP Server - Lightweight Analysis Service
 * Optimized for quick business insights and rapid validation
 */

import express, { Request, Response, Application, NextFunction } from 'express';
import cors from 'cors';
import { getPICMiniService, type MiniAnalysisRequest } from './services/pic.mini.service';

export class PICMiniServer {
  private app: Application;
  private miniService = getPICMiniService();
  private port: number;

  constructor(port: number = 3002) {
    this.app = express();
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
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req: Request, res: Response, next) => {
      console.log(`🚀 PIC-Mini: ${new Date().toISOString()} - ${req.method} ${req.path}`);
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
        service: 'PIC-Mini',
        description: 'Lightweight business analysis service for rapid insights',
        version: '1.0.0',
        status: 'active',
        endpoints: {
          health: 'GET /health',
          analyse: 'POST /api/mini/analyse',
          quick: 'POST /api/mini/quick',
          capabilities: 'GET /api/mini/capabilities',
          info: 'GET /api/mini/info'
        },
        features: [
          'Quick business idea validation',
          'Market feasibility assessment',
          'SWOT analysis',
          'Rapid risk assessment',
          'Actionable recommendations'
        ],
        documentation: 'https://docs.acroniq.com/pic-mini',
        timestamp: new Date().toISOString()
      });
    });

    // Health check
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const health = await this.miniService.healthCheck();
        res.json({
          service: 'PIC-Mini',
          status: health.status,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          ...health.details
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          service: 'PIC-Mini',
          status: 'unhealthy',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Main mini analysis endpoint
    this.app.post('/api/mini/analyse', async (req: Request, res: Response) => {
      try {
        const request: MiniAnalysisRequest = {
          query: req.body.query,
          context: req.body.context,
          depth: req.body.depth || 'quick'
        };

        // Validate required fields
        if (!request.query || typeof request.query !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Query is required and must be a string',
            timestamp: new Date().toISOString()
          });
        }

        if (request.query.length < 10) {
          return res.status(400).json({
            success: false,
            error: 'Query must be at least 10 characters long',
            timestamp: new Date().toISOString()
          });
        }

        const result = await this.miniService.analyzeMini(request);
        
        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });

      } catch (error: unknown) {
        const err = error as Error;
        console.error('PIC-Mini analysis error:', err);
        res.status(500).json({
          success: false,
          error: {
            code: 'MINI_ANALYSIS_FAILED',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Quick analysis endpoint (simplified)
    this.app.post('/api/mini/quick', async (req: Request, res: Response) => {
      try {
        const { query } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'Query is required',
            timestamp: new Date().toISOString()
          });
        }

        // Use quick analysis preset
        const request: MiniAnalysisRequest = {
          query,
          depth: 'quick'
        };

        const result = await this.miniService.analyzeMini(request);
        
        // Return simplified response for quick endpoint
        res.json({
          success: true,
          data: {
            summary: result.summary,
            feasibility: result.scores.feasibility,
            marketFit: result.scores.marketFit,
            confidence: result.scores.confidence,
            processingTime: result.processingTime
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

    // Service capabilities
    this.app.get('/api/mini/capabilities', (req: Request, res: Response) => {
      try {
        const capabilities = this.miniService.getCapabilities();
        res.json({
          success: true,
          data: capabilities,
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

    // Service info
    this.app.get('/api/mini/info', (req: Request, res: Response) => {
      res.json({
        service: 'PIC-Mini',
        description: 'Lightweight business analysis service for rapid insights',
        version: '1.0.0',
        features: [
          'Quick business idea validation',
          'Market feasibility assessment',
          'SWOT analysis',
          'Rapid risk assessment',
          'Actionable recommendations'
        ],
        endpoints: [
          'GET /health - Service health check',
          'POST /api/mini/analyse - Full analysis',
          'POST /api/mini/quick - Quick analysis',
          'GET /api/mini/capabilities - Service capabilities',
          'GET /api/mini/info - Service information'
        ],
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
          'GET /health',
          'POST /api/mini/analyse',
          'POST /api/mini/quick',
          'GET /api/mini/capabilities',
          'GET /api/mini/info'
        ],
        timestamp: new Date().toISOString()
      });
    });

    // Error handler
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error('PIC-Mini unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start the PIC-Mini server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.port, () => {
          console.log(`🚀 PIC-Mini server started on port ${this.port}`);
          console.log(`⚡ Quick analysis endpoints available:`);
          console.log(`   GET  /health - Health check`);
          console.log(`   POST /api/mini/analyse - Full analysis`);
          console.log(`   POST /api/mini/quick - Quick analysis`);
          console.log(`   GET  /api/mini/capabilities - Service capabilities`);
          console.log(`   GET  /api/mini/info - Service information`);
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
