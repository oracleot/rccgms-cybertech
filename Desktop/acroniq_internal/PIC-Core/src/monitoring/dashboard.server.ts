/**
 * PIC Monitoring Dashboard Server
 * Web-based GUI for monitoring all PIC services
 */

import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import path from 'path';
import { getAIModelService } from '../services/ai.model.service';
import { getPICMonitoringService } from '../services/pic.monitoring.service';
import { getPICAnalysisService } from '../services/pic.analysis.service';

export interface ServiceHealth {
  name: string;
  url: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  version: string;
  endpoints: string[];
  metrics?: Record<string, unknown>;
}

export interface TrafficMetrics {
  totalRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ path: string; count: number; avgTime: number }>;
  statusCodes: Record<string, number>;
}

export class PICDashboardServer {
  private app: Application;
  private port: number;
  private services: Map<string, ServiceHealth> = new Map();
  private trafficData: TrafficMetrics = {
    totalRequests: 0,
    requestsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0,
    topEndpoints: [],
    statusCodes: {}
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3003) {
    this.app = express();
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeServices();
    this.startHealthMonitoring();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    // Request logging for traffic monitoring
    this.app.use((req: Request, res: Response, next) => {
      this.recordRequest(req);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Dashboard home page
    this.app.get('/', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
    });

    // API Routes for monitoring data
    this.app.get('/api/services', (req: Request, res: Response) => {
      res.json({
        services: Array.from(this.services.values()),
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/api/health', async (req: Request, res: Response) => {
      try {
        await this.checkAllServices();
        res.json({
          services: Array.from(this.services.values()),
          overall: this.calculateOverallHealth(),
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.get('/api/metrics', (req: Request, res: Response) => {
      const monitoringService = getPICMonitoringService();
      const metrics = monitoringService.getMetrics();
      
      res.json({
        traffic: this.trafficData,
        services: {
          'pic-core': this.getServiceMetrics('pic-core'),
          'pic-mini': this.getServiceMetrics('pic-mini'),
          'ai-model': this.getServiceMetrics('ai-model'),
          'analysis': this.getServiceMetrics('analysis'),
          'monitoring': metrics
        },
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/api/alerts', (req: Request, res: Response) => {
      const monitoringService = getPICMonitoringService();
      const alerts = monitoringService.getAlerts();
      
      res.json({
        alerts,
        timestamp: new Date().toISOString()
      });
    });

    // Service control endpoints
    this.app.post('/api/services/:name/restart', async (req: Request, res: Response) => {
      const serviceName = req.params.name;
      
      try {
        // Find service case-insensitively
        const serviceKey = Array.from(this.services.keys()).find(key => 
          key.toLowerCase() === serviceName.toLowerCase()
        );
        
        const service = serviceKey ? this.services.get(serviceKey) : null;
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: `Service ${serviceName} not found`,
            availableServices: Array.from(this.services.keys()),
            timestamp: new Date().toISOString()
          });
        }

        // Simulate restart process
        console.log(`Restart request received for service: ${serviceKey}`);
        
        // Mark as restarting
        service.status = 'unhealthy';
        service.lastCheck = new Date().toISOString();
        
        // Simulate restart delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark as healthy again
        service.status = 'healthy';
        service.responseTime = Math.floor(Math.random() * 1000) + 500;
        service.lastCheck = new Date().toISOString();
        service.uptime = (service.uptime || 0) + 1;
        
        res.json({
          success: true,
          message: `Service ${serviceKey} restarted successfully (simulated)`,
          service: {
            name: serviceKey,
            status: service.status,
            responseTime: service.responseTime,
            uptime: service.uptime,
            lastCheck: service.lastCheck
          },
          note: "This is a simulated restart. In production, you'd integrate with process managers like PM2 or systemd.",
          timestamp: new Date().toISOString()
        });
        
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`Failed to restart service ${serviceName}:`, err);
        res.status(500).json({
          success: false,
          error: `Failed to restart service: ${err.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.post('/api/services/:name/health-check', async (req: Request, res: Response) => {
      const serviceName = req.params.name;
      
      try {
        // Find service case-insensitively
        const serviceKey = Array.from(this.services.keys()).find(key => 
          key.toLowerCase() === serviceName.toLowerCase()
        );
        
        const service = serviceKey ? this.services.get(serviceKey) : null;
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: `Service ${serviceName} not found`,
            availableServices: Array.from(this.services.keys()),
            timestamp: new Date().toISOString()
          });
        }

        await this.checkService(serviceKey!);
        const updatedService = this.services.get(serviceKey!);
        
        res.json({
          success: true,
          message: `Health check completed for ${serviceKey}`,
          service: updatedService,
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`Health check failed for ${serviceName}:`, err);
        res.status(500).json({
          success: false,
          error: `Health check failed: ${err.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // WebSocket endpoint for real-time updates
    this.app.get('/api/stream', (req: Request, res: Response): void => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const sendUpdate = (): void => {
        const data = {
          services: Array.from(this.services.values()),
          traffic: this.trafficData,
          timestamp: new Date().toISOString()
        };
        
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Send initial data
      sendUpdate();

      // Send updates every 5 seconds
      const interval = setInterval(sendUpdate, 5000);

      // Clean up on disconnect
      req.on('close', () => {
        clearInterval(interval);
      });
    });

    // API documentation
    this.app.get('/api/docs', (req: Request, res: Response) => {
      res.json({
        title: 'PIC Monitoring Dashboard API',
        version: '1.0.0',
        endpoints: {
          'GET /': 'Dashboard web interface',
          'GET /api/services': 'List all services',
          'GET /api/health': 'Health status of all services',
          'GET /api/metrics': 'Traffic and performance metrics',
          'GET /api/alerts': 'Active alerts and warnings',
          'POST /api/services/:name/restart': 'Restart a service',
          'POST /api/services/:name/health-check': 'Manual health check',
          'GET /api/stream': 'Real-time updates (Server-Sent Events)'
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Initialize service definitions
   */
  private initializeServices(): void {
    this.services.set('pic-core', {
      name: 'PIC-Core',
      url: 'http://localhost:3001',
      port: 3001,
      status: 'unknown',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      endpoints: [
        'GET /',
        'GET /health',
        'POST /api/pic/analyse',
        'GET /api/pic/modes',
        'GET /api/pic/metrics',
        'GET /api/pic/status'
      ]
    });

    this.services.set('pic-mini', {
      name: 'PIC-Mini',
      url: 'http://localhost:3002',
      port: 3002,
      status: 'unknown',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      endpoints: [
        'GET /',
        'GET /health',
        'POST /api/mini/analyse',
        'POST /api/mini/quick',
        'GET /api/mini/capabilities'
      ]
    });

    this.services.set('ai-model', {
      name: 'AI Model Service',
      url: 'internal',
      port: 0,
      status: 'unknown',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      endpoints: ['generateResponse', 'healthCheck', 'getAvailableProviders']
    });

    this.services.set('analysis', {
      name: 'Analysis Service',
      url: 'internal',
      port: 0,
      status: 'unknown',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      endpoints: ['analyzeBusiness', 'getAvailableFrameworks']
    });

    this.services.set('monitoring', {
      name: 'Monitoring Service',
      url: 'internal',
      port: 0,
      status: 'unknown',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      endpoints: ['logQuery', 'getMetrics', 'getAlerts']
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllServices();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check all services health
   */
  private async checkAllServices(): Promise<void> {
    const promises = Array.from(this.services.keys()).map(name => 
      this.checkService(name).catch(error => {
        console.error(`Health check failed for ${name}:`, error);
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Check individual service health
   */
  private async checkService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    const startTime = Date.now();
    
    try {
      if (serviceName === 'pic-core' || serviceName === 'pic-mini') {
        // Check HTTP services
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(`${service.url}/health`, {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          if (response.ok) {
            const health = await response.json();
            service.status = 'healthy';
            service.responseTime = responseTime;
            service.metrics = health;
          } else {
            service.status = 'unhealthy';
            service.responseTime = responseTime;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          service.status = 'unhealthy';
          service.responseTime = Date.now() - startTime;
          service.lastCheck = new Date().toISOString();
          console.error(`Health check failed for ${serviceName}:`, error);
          return;
        }
      } else {
        // Check internal services
        await this.checkInternalService(serviceName);
        service.status = 'healthy';
        service.responseTime = Date.now() - startTime;
      }
      
      service.lastCheck = new Date().toISOString();
      
    } catch (error) {
      service.status = 'unhealthy';
      service.responseTime = Date.now() - startTime;
      service.lastCheck = new Date().toISOString();
      console.error(`Health check failed for ${serviceName}:`, error);
    }
  }

  /**
   * Check internal service health
   */
  private async checkInternalService(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'ai-model': {
        const aiService = getAIModelService();
        await aiService.healthCheck();
        break;
      }
      case 'analysis': {
        const analysisService = getPICAnalysisService();
        analysisService.getAvailableFrameworks();
        break;
      }
      case 'monitoring': {
        const monitoringService = getPICMonitoringService();
        monitoringService.getMetrics();
        break;
      }
      default:
        throw new Error(`Unknown internal service: ${serviceName}`);
    }
  }

  /**
   * Record request for traffic monitoring
   */
  private recordRequest(req: Request): void {
    this.trafficData.totalRequests++;
    
    // Update requests per minute (simplified calculation)
    // This is a simplified version - in production you'd use a proper time-series database
    this.trafficData.requestsPerMinute = Math.round(this.trafficData.totalRequests / 10);
    
    // Record endpoint usage
    const path = req.path;
    const existingEndpoint = this.trafficData.topEndpoints.find(e => e.path === path);
    
    if (existingEndpoint) {
      existingEndpoint.count++;
    } else {
      this.trafficData.topEndpoints.push({ path, count: 1, avgTime: 0 });
    }
  }

  /**
   * Get service-specific metrics
   */
  private getServiceMetrics(serviceName: string): Record<string, unknown> | null {
    const service = this.services.get(serviceName);
    if (!service) return null;

    switch (serviceName) {
      case 'pic-core':
        return {
          status: service.status,
          responseTime: service.responseTime,
          uptime: service.uptime,
          endpoints: service.endpoints.length,
          metrics: service.metrics
        };
      case 'pic-mini':
        return {
          status: service.status,
          responseTime: service.responseTime,
          uptime: service.uptime,
          endpoints: service.endpoints.length,
          metrics: service.metrics
        };
      default:
        return service.metrics || null;
    }
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const services = Array.from(this.services.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;
    
    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount > 0) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Restart service (placeholder - would need actual service management)
   */
  private async restartService(serviceName: string): Promise<void> {
    // This is a placeholder implementation
    // In a real deployment, you'd use process managers like PM2, systemd, etc.
    console.log(`Restarting service: ${serviceName}`);
    
    // Mark service as restarting
    const service = this.services.get(serviceName);
    if (service) {
      service.status = 'unhealthy';
      service.lastCheck = new Date().toISOString();
    }
    
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demonstration, we'll simulate a successful restart
    // In reality, you'd check if the service actually came back up
    if (service) {
      service.status = 'healthy';
      service.responseTime = Math.floor(Math.random() * 1000) + 500; // Random response time
      service.lastCheck = new Date().toISOString();
      service.uptime = (service.uptime || 0) + 1;
    }
    
    console.log(`Service ${serviceName} restarted successfully`);
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.port, () => {
          console.log(`📊 PIC Dashboard started on port ${this.port}`);
          console.log(`🌐 Web interface: http://localhost:${this.port}`);
          console.log(`📡 API endpoints: http://localhost:${this.port}/api`);
          console.log(`🔄 Real-time updates: http://localhost:${this.port}/api/stream`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the dashboard server
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Application {
    return this.app;
  }
}
