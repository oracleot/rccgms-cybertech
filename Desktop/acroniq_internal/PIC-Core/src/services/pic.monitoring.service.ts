/**
 * PIC Monitoring Service - Performance Analytics and Health Monitoring
 * Migrated and enhanced from AcronIQ_Veritus
 */

export interface PICMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  averageConfidenceScore: number;
  queryTypeDistribution: Record<string, number>;
  frameworkUsage: Record<string, number>;
  picModeUsage: Record<string, number>;
  userSatisfactionScore: number;
  lastUpdated: Date;
}

export interface PICQueryLog {
  id: string;
  timestamp: Date;
  application: string;
  userId?: string;
  query: string;
  queryType: string;
  picMode: string;
  processingTime: number;
  confidenceScore: number;
  frameworksUsed: string[];
  success: boolean;
  errorMessage?: string;
  modelUsed: string;
  provider: string;
  userFeedback?: {
    rating: number; // 1-5
    helpful: boolean;
    comments?: string;
  };
}

export interface PICPerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'quality' | 'usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Record<string, any>;
  resolved: boolean;
}

export class PICMonitoringService {
  private queryLogs: PICQueryLog[] = [];
  private metrics: PICMetrics;
  private alerts: PICPerformanceAlert[] = [];
  private maxLogSize = 10000; // Keep last 10k queries
  private alertThresholds = {
    responseTime: 10000, // 10 seconds
    confidenceScore: 60, // Below 60%
    errorRate: 0.1, // 10% error rate
    lowSatisfaction: 3.0 // Below 3.0/5.0
  };

  constructor() {
    this.metrics = this.initializeMetrics();
    this.startPeriodicAnalysis();
  }

  /**
   * Log a PIC query for monitoring
   */
  logQuery(queryLog: Omit<PICQueryLog, 'id' | 'timestamp'>): void {
    const log: PICQueryLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...queryLog
    };

    this.queryLogs.push(log);
    
    // Maintain log size limit
    if (this.queryLogs.length > this.maxLogSize) {
      this.queryLogs = this.queryLogs.slice(-this.maxLogSize);
    }

    // Update metrics
    this.updateMetrics(log);
    
    // Check for alerts
    this.checkAlerts(log);

    console.log(`📊 PIC Query logged: ${log.application}/${log.queryType} (${log.processingTime}ms, ${log.confidenceScore}% confidence)`);
  }

  /**
   * Get current PIC metrics
   */
  getMetrics(): PICMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent query logs
   */
  getRecentLogs(limit: number = 100): PICQueryLog[] {
    return this.queryLogs.slice(-limit).reverse();
  }

  /**
   * Get performance analytics
   */
  getAnalytics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): {
    queryVolume: Array<{ timestamp: Date; count: number }>;
    responseTimeDistribution: Array<{ range: string; count: number }>;
    confidenceDistribution: Array<{ range: string; count: number }>;
    topQueryTypes: Array<{ type: string; count: number; avgConfidence: number }>;
    frameworkEffectiveness: Array<{ framework: string; avgConfidence: number; usage: number }>;
    applicationUsage: Array<{ app: string; count: number; avgResponseTime: number }>;
  } {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentLogs = this.queryLogs.filter(log => log.timestamp >= cutoffTime);

    return {
      queryVolume: this.calculateQueryVolume(recentLogs, timeRange),
      responseTimeDistribution: this.calculateResponseTimeDistribution(recentLogs),
      confidenceDistribution: this.calculateConfidenceDistribution(recentLogs),
      topQueryTypes: this.calculateTopQueryTypes(recentLogs),
      frameworkEffectiveness: this.calculateFrameworkEffectiveness(recentLogs),
      applicationUsage: this.calculateApplicationUsage(recentLogs)
    };
  }

  /**
   * Get active alerts
   */
  getAlerts(): PICPerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Add user feedback to a query
   */
  addUserFeedback(queryId: string, feedback: PICQueryLog['userFeedback']): void {
    const log = this.queryLogs.find(log => log.id === queryId);
    if (log && feedback) {
      log.userFeedback = feedback;
      this.updateSatisfactionScore();
      console.log(`📝 User feedback added for query ${queryId}: ${feedback.rating}/5`);
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
    uptime: number;
    lastHealthCheck: Date;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check response time
    if (this.metrics.averageResponseTime > this.alertThresholds.responseTime) {
      issues.push(`High response time: ${this.metrics.averageResponseTime}ms`);
      recommendations.push('Consider optimizing model selection or caching');
    }

    // Check confidence scores
    if (this.metrics.averageConfidenceScore < this.alertThresholds.confidenceScore) {
      issues.push(`Low confidence scores: ${this.metrics.averageConfidenceScore}%`);
      recommendations.push('Review and improve strategic frameworks');
    }

    // Check error rate
    const errorRate = this.metrics.failedQueries / Math.max(1, this.metrics.totalQueries);
    if (errorRate > this.alertThresholds.errorRate) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate and fix recurring errors');
    }

    // Check user satisfaction
    if (this.metrics.userSatisfactionScore < this.alertThresholds.lowSatisfaction) {
      issues.push(`Low user satisfaction: ${this.metrics.userSatisfactionScore}/5.0`);
      recommendations.push('Gather user feedback and improve response quality');
    }

    const status = issues.length === 0 ? 'healthy' : 
                  issues.length <= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      issues,
      recommendations,
      uptime: this.calculateUptime(),
      lastHealthCheck: new Date()
    };
  }

  private initializeMetrics(): PICMetrics {
    return {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      averageConfidenceScore: 0,
      queryTypeDistribution: {},
      frameworkUsage: {},
      picModeUsage: {},
      userSatisfactionScore: 0,
      lastUpdated: new Date()
    };
  }

  private updateMetrics(log: PICQueryLog): void {
    this.metrics.totalQueries++;
    
    if (log.success) {
      this.metrics.successfulQueries++;
    } else {
      this.metrics.failedQueries++;
    }

    // Update averages
    this.metrics.averageResponseTime = this.calculateRunningAverage(
      this.metrics.averageResponseTime,
      log.processingTime,
      this.metrics.totalQueries
    );

    this.metrics.averageConfidenceScore = this.calculateRunningAverage(
      this.metrics.averageConfidenceScore,
      log.confidenceScore,
      this.metrics.successfulQueries
    );

    // Update distributions
    this.metrics.queryTypeDistribution[log.queryType] = 
      (this.metrics.queryTypeDistribution[log.queryType] || 0) + 1;

    this.metrics.picModeUsage[log.picMode] = 
      (this.metrics.picModeUsage[log.picMode] || 0) + 1;

    // Update framework usage
    log.frameworksUsed.forEach(framework => {
      this.metrics.frameworkUsage[framework] = 
        (this.metrics.frameworkUsage[framework] || 0) + 1;
    });

    this.metrics.lastUpdated = new Date();
  }

  private calculateRunningAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private updateSatisfactionScore(): void {
    const logsWithFeedback = this.queryLogs.filter(log => log.userFeedback?.rating);
    if (logsWithFeedback.length > 0) {
      const totalRating = logsWithFeedback.reduce((sum, log) => sum + (log.userFeedback?.rating || 0), 0);
      this.metrics.userSatisfactionScore = totalRating / logsWithFeedback.length;
    }
  }

  private checkAlerts(log: PICQueryLog): void {
    // High response time alert
    if (log.processingTime > this.alertThresholds.responseTime) {
      this.createAlert('performance', 'high', 
        `High response time detected: ${log.processingTime}ms for query type ${log.queryType}`,
        { processingTime: log.processingTime, queryType: log.queryType, application: log.application }
      );
    }

    // Low confidence alert
    if (log.confidenceScore < this.alertThresholds.confidenceScore) {
      this.createAlert('quality', 'medium',
        `Low confidence score: ${log.confidenceScore}% for query type ${log.queryType}`,
        { confidenceScore: log.confidenceScore, queryType: log.queryType, application: log.application }
      );
    }

    // Error alert
    if (!log.success) {
      this.createAlert('error', 'high',
        `Query failed: ${log.errorMessage || 'Unknown error'}`,
        { queryType: log.queryType, errorMessage: log.errorMessage, application: log.application }
      );
    }
  }

  private createAlert(
    type: PICPerformanceAlert['type'],
    severity: PICPerformanceAlert['severity'],
    message: string,
    metrics: Record<string, any>
  ): void {
    const alert: PICPerformanceAlert = {
      id: this.generateId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics,
      resolved: false
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    console.warn(`🚨 PIC Alert [${severity.toUpperCase()}]: ${message}`);
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case 'hour': return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateQueryVolume(logs: PICQueryLog[], timeRange: string): Array<{ timestamp: Date; count: number }> {
    const buckets = new Map<string, number>();
    const bucketSize = this.getBucketSize(timeRange);

    logs.forEach(log => {
      const bucketKey = this.getBucketKey(log.timestamp, bucketSize);
      buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
    });

    return Array.from(buckets.entries()).map(([key, count]) => ({
      timestamp: new Date(key),
      count
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private calculateResponseTimeDistribution(logs: PICQueryLog[]): Array<{ range: string; count: number }> {
    const ranges = [
      { min: 0, max: 1000, label: '0-1s' },
      { min: 1000, max: 3000, label: '1-3s' },
      { min: 3000, max: 5000, label: '3-5s' },
      { min: 5000, max: 10000, label: '5-10s' },
      { min: 10000, max: Infinity, label: '10s+' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: logs.filter(log => log.processingTime >= range.min && log.processingTime < range.max).length
    }));
  }

  private calculateConfidenceDistribution(logs: PICQueryLog[]): Array<{ range: string; count: number }> {
    const ranges = [
      { min: 0, max: 50, label: '0-50%' },
      { min: 50, max: 70, label: '50-70%' },
      { min: 70, max: 85, label: '70-85%' },
      { min: 85, max: 95, label: '85-95%' },
      { min: 95, max: 100, label: '95-100%' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: logs.filter(log => log.confidenceScore >= range.min && log.confidenceScore < range.max).length
    }));
  }

  private calculateTopQueryTypes(logs: PICQueryLog[]): Array<{ type: string; count: number; avgConfidence: number }> {
    const typeStats = new Map<string, { count: number; totalConfidence: number }>();

    logs.forEach(log => {
      const stats = typeStats.get(log.queryType) || { count: 0, totalConfidence: 0 };
      stats.count++;
      stats.totalConfidence += log.confidenceScore;
      typeStats.set(log.queryType, stats);
    });

    return Array.from(typeStats.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        avgConfidence: Math.round(stats.totalConfidence / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateFrameworkEffectiveness(logs: PICQueryLog[]): Array<{ framework: string; avgConfidence: number; usage: number }> {
    const frameworkStats = new Map<string, { totalConfidence: number; count: number }>();

    logs.forEach(log => {
      log.frameworksUsed.forEach(framework => {
        const stats = frameworkStats.get(framework) || { totalConfidence: 0, count: 0 };
        stats.totalConfidence += log.confidenceScore;
        stats.count++;
        frameworkStats.set(framework, stats);
      });
    });

    return Array.from(frameworkStats.entries())
      .map(([framework, stats]) => ({
        framework,
        avgConfidence: Math.round(stats.totalConfidence / stats.count),
        usage: stats.count
      }))
      .sort((a, b) => b.avgConfidence - a.avgConfidence);
  }

  private calculateApplicationUsage(logs: PICQueryLog[]): Array<{ app: string; count: number; avgResponseTime: number }> {
    const appStats = new Map<string, { count: number; totalResponseTime: number }>();

    logs.forEach(log => {
      const stats = appStats.get(log.application) || { count: 0, totalResponseTime: 0 };
      stats.count++;
      stats.totalResponseTime += log.processingTime;
      appStats.set(log.application, stats);
    });

    return Array.from(appStats.entries())
      .map(([app, stats]) => ({
        app,
        count: stats.count,
        avgResponseTime: Math.round(stats.totalResponseTime / stats.count)
      }))
      .sort((a, b) => b.count - a.count);
  }

  private getBucketSize(timeRange: string): number {
    switch (timeRange) {
      case 'hour': return 5 * 60 * 1000; // 5 minutes
      case 'day': return 60 * 60 * 1000; // 1 hour
      case 'week': return 24 * 60 * 60 * 1000; // 1 day
      case 'month': return 7 * 24 * 60 * 60 * 1000; // 1 week
      default: return 60 * 60 * 1000;
    }
  }

  private getBucketKey(timestamp: Date, bucketSize: number): string {
    const bucketTime = Math.floor(timestamp.getTime() / bucketSize) * bucketSize;
    return new Date(bucketTime).toISOString();
  }

  private calculateUptime(): number {
    const recentLogs = this.queryLogs.slice(-1000);
    if (recentLogs.length === 0) return 100;
    
    const successfulQueries = recentLogs.filter(log => log.success).length;
    return (successfulQueries / recentLogs.length) * 100;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 5 minutes
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 5 * 60 * 1000);
  }

  private performPeriodicAnalysis(): void {
    const health = this.getHealthStatus();
    
    if (health.status !== 'healthy') {
      console.warn(`🏥 PIC Health Check: ${health.status.toUpperCase()}`);
      health.issues.forEach(issue => console.warn(`  - ${issue}`));
    }

    // Auto-resolve old alerts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.alerts.forEach(alert => {
      if (!alert.resolved && alert.timestamp < oneHourAgo) {
        alert.resolved = true;
      }
    });
  }
}

// Singleton instance
let monitoringServiceInstance: PICMonitoringService | null = null;

export function getPICMonitoringService(): PICMonitoringService {
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = new PICMonitoringService();
  }
  return monitoringServiceInstance;
}

export default PICMonitoringService;
