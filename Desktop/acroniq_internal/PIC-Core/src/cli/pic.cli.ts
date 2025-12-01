#!/usr/bin/env node

/**
 * PIC Command Line Interface
 * CLI tool for managing and monitoring PIC services
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { PICDashboardServer } from '../monitoring/dashboard.server';
import { getAIModelService } from '../services/ai.model.service';
import { getPICMonitoringService } from '../services/pic.monitoring.service';
import { getPICAnalysisService } from '../services/pic.analysis.service';
import { getPICMiniService } from '../services/pic.mini.service';

const program = new Command();

// Configuration
const CONFIG = {
  dashboardPort: 3003,
  services: {
    'pic-core': { url: 'http://localhost:3001', port: 3001 },
    'pic-mini': { url: 'http://localhost:3002', port: 3002 },
    'dashboard': { url: 'http://localhost:3003', port: 3003 }
  }
};

// Utility functions
function logSuccess(message: string) {
  console.log(chalk.green('✓'), message);
}

function logError(message: string) {
  console.log(chalk.red('✗'), message);
}

function logWarning(message: string) {
  console.log(chalk.yellow('⚠'), message);
}

function logInfo(message: string) {
  console.log(chalk.blue('ℹ'), message);
}

// Service health check
async function checkServiceHealth(serviceName: string): Promise<any> {
  try {
    const service = CONFIG.services[serviceName as keyof typeof CONFIG.services];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    if (serviceName === 'pic-core' || serviceName === 'pic-mini') {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${service.url}/health`, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } else {
      // Check internal services
      switch (serviceName) {
        case 'ai-model':
          const aiService = getAIModelService();
          return await aiService.healthCheck();
        case 'analysis':
          const analysisService = getPICAnalysisService();
          analysisService.getAvailableFrameworks();
          return { status: 'healthy' };
        case 'monitoring':
          const monitoringService = getPICMonitoringService();
          monitoringService.getMetrics();
          return { status: 'healthy' };
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    }
  } catch (error) {
    return { status: 'unhealthy', error: (error as Error).message };
  }
}

// Check all services
async function checkAllServices(verbose: boolean = false) {
  console.log(chalk.bold.blue('\n🔍 PIC Services Health Check\n'));

  const table = new Table({
    head: ['Service', 'Status', 'Response Time', 'Version', 'Last Check'],
    colWidths: [15, 12, 15, 10, 20]
  });

  let healthyCount = 0;
  const services = ['pic-core', 'pic-mini', 'ai-model', 'analysis', 'monitoring'];

  for (const serviceName of services) {
    const startTime = Date.now();
    const health = await checkServiceHealth(serviceName);
    const responseTime = Date.now() - startTime;

    const status = health.status === 'healthy' ? 
      chalk.green('● Healthy') : 
      chalk.red('● Unhealthy');

    if (health.status === 'healthy') healthyCount++;

    table.push([
      serviceName,
      status,
      `${responseTime}ms`,
      health.version || '1.0.0',
      new Date().toLocaleTimeString()
    ]);

    if (verbose && health.error) {
      table.push(['', chalk.red(health.error), '', '', '']);
    }
  }

  console.log(table.toString());

  const overallStatus = healthyCount === services.length ? 
    chalk.green('All services healthy') : 
    healthyCount > 0 ? 
      chalk.yellow(`${healthyCount}/${services.length} services healthy`) :
      chalk.red('No services healthy');

  console.log(`\nOverall Status: ${overallStatus}\n`);
}

// Get service metrics
async function getServiceMetrics(serviceName: string) {
  try {
    const service = CONFIG.services[serviceName as keyof typeof CONFIG.services];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const response = await fetch(`${service.url}/api/metrics`);
    const metrics = await response.json();

    console.log(chalk.bold.blue(`\n📊 ${serviceName.toUpperCase()} Metrics\n`));

    const table = new Table({
      head: ['Metric', 'Value'],
      colWidths: [25, 20]
    });

    if (metrics.data) {
      Object.entries(metrics.data).forEach(([key, value]) => {
        let displayValue = String(value);
        
        if (typeof value === 'number') {
          if (key.includes('Time') || key.includes('time')) {
            displayValue = `${value}ms`;
          } else if (key.includes('Rate') || key.includes('Score')) {
            displayValue = `${value}%`;
          }
        }

        table.push([key, displayValue]);
      });
    }

    console.log(table.toString());
  } catch (error) {
    logError(`Failed to get metrics for ${serviceName}: ${(error as Error).message}`);
  }
}

// Test service endpoint
async function testService(serviceName: string, endpoint?: string) {
  try {
    const service = CONFIG.services[serviceName as keyof typeof CONFIG.services];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const testEndpoint = endpoint || '/health';
    const url = `${service.url}${testEndpoint}`;
    
    console.log(chalk.bold.blue(`\n🧪 Testing ${serviceName} - ${testEndpoint}\n`));

    const startTime = Date.now();
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    const data = await response.json();

    console.log(chalk.green(`Status: ${response.status} ${response.statusText}`));
    console.log(chalk.blue(`Response Time: ${responseTime}ms`));
    console.log(chalk.blue(`Response Size: ${JSON.stringify(data).length} bytes`));
    
    if (response.ok) {
      logSuccess('Test passed');
      if (verbose) {
        console.log(chalk.gray('\nResponse:'));
        console.log(JSON.stringify(data, null, 2));
      }
    } else {
      logError('Test failed');
      console.log(chalk.red('Error:'), data);
    }
  } catch (error) {
    logError(`Test failed: ${(error as Error).message}`);
  }
}

// Start analysis
async function startAnalysis(query: string, mode: string = 'quick') {
  try {
    console.log(chalk.bold.blue(`\n🧠 Starting Analysis\n`));
    console.log(chalk.gray(`Query: ${query}`));
    console.log(chalk.gray(`Mode: ${mode}\n`));

    const service = mode === 'quick' ? CONFIG.services['pic-mini'] : CONFIG.services['pic-core'];
    const endpoint = mode === 'quick' ? '/api/mini/quick' : '/api/pic/analyse';
    
    const response = await fetch(`${service.url}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();

    if (result.success) {
      logSuccess('Analysis completed');
      
      console.log(chalk.bold('\n📋 Analysis Results:\n'));
      
      if (result.data.summary) {
        console.log(chalk.yellow('Summary:'));
        console.log(result.data.summary);
      }
      
      if (result.data.scores) {
        console.log(chalk.yellow('\nScores:'));
        Object.entries(result.data.scores).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}%`);
        });
      }
      
      if (result.data.processingTime) {
        console.log(chalk.yellow(`\nProcessing Time: ${result.data.processingTime}ms`));
      }
    } else {
      logError('Analysis failed');
      console.log(chalk.red('Error:'), result.error);
    }
  } catch (error) {
    logError(`Analysis failed: ${(error as Error).message}`);
  }
}

// Start dashboard
async function startDashboard(port?: number) {
  try {
    const dashboardPort = port || CONFIG.dashboardPort;
    
    console.log(chalk.bold.blue(`\n📊 Starting PIC Dashboard\n`));
    
    const server = new PICDashboardServer(dashboardPort);
    await server.start();
    
    logSuccess(`Dashboard started on port ${dashboardPort}`);
    logInfo(`Web interface: http://localhost:${dashboardPort}`);
    logInfo(`API endpoints: http://localhost:${dashboardPort}/api`);
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Stopping dashboard...'));
      server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logError(`Failed to start dashboard: ${(error as Error).message}`);
  }
}

// Interactive mode
async function interactiveMode() {
  console.log(chalk.bold.blue('\n🎮 PIC Interactive CLI\n'));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Check all services',
        'Check specific service',
        'Get service metrics',
        'Test service endpoint',
        'Start analysis',
        'Start dashboard',
        'View logs',
        'Exit'
      ]
    }
  ]);

  switch (action) {
    case 'Check all services':
      await checkAllServices(true);
      break;
    
    case 'Check specific service':
      const { serviceName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'serviceName',
          message: 'Select service:',
          choices: ['pic-core', 'pic-mini', 'ai-model', 'analysis', 'monitoring']
        }
      ]);
      await checkAllServices(true);
      break;
    
    case 'Get service metrics':
      const { metricsService } = await inquirer.prompt([
        {
          type: 'list',
          name: 'metricsService',
          message: 'Select service:',
          choices: ['pic-core', 'pic-mini']
        }
      ]);
      await getServiceMetrics(metricsService);
      break;
    
    case 'Test service endpoint':
      const { testService, testEndpoint } = await inquirer.prompt([
        {
          type: 'list',
          name: 'testService',
          message: 'Select service:',
          choices: ['pic-core', 'pic-mini']
        },
        {
          type: 'input',
          name: 'testEndpoint',
          message: 'Enter endpoint (or leave empty for /health):',
          default: '/health'
        }
      ]);
      await testService(testService, testEndpoint);
      break;
    
    case 'Start analysis':
      const { analysisQuery, analysisMode } = await inquirer.prompt([
        {
          type: 'input',
          name: 'analysisQuery',
          message: 'Enter your business query:'
        },
        {
          type: 'list',
          name: 'analysisMode',
          message: 'Select analysis mode:',
          choices: ['quick', 'comprehensive']
        }
      ]);
      await startAnalysis(analysisQuery, analysisMode);
      break;
    
    case 'Start dashboard':
      await startDashboard();
      break;
    
    case 'View logs':
      logInfo('Log viewing not implemented yet. Use dashboard for real-time monitoring.');
      break;
    
    case 'Exit':
      console.log(chalk.green('👋 Goodbye!'));
      process.exit(0);
  }

  // Continue interactive mode
  await interactiveMode();
}

// CLI Commands
program
  .name('pic')
  .description('PIC Command Line Interface - Manage and monitor PIC services')
  .version('1.0.0');

program
  .command('status')
  .description('Check health status of all PIC services')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    await checkAllServices(options.verbose);
  });

program
  .command('metrics <service>')
  .description('Get metrics for a specific service')
  .action(async (service) => {
    await getServiceMetrics(service);
  });

program
  .command('test <service>')
  .description('Test a service endpoint')
  .option('-e, --endpoint <endpoint>', 'Endpoint to test (default: /health)', '/health')
  .action(async (service, options) => {
    await testService(service, options.endpoint);
  });

program
  .command('analyze <query>')
  .description('Start a business analysis')
  .option('-m, --mode <mode>', 'Analysis mode (quick/comprehensive)', 'quick')
  .action(async (query, options) => {
    await startAnalysis(query, options.mode);
  });

program
  .command('dashboard')
  .description('Start the monitoring dashboard')
  .option('-p, --port <port>', 'Port to run dashboard on', '3003')
  .action(async (options) => {
    await startDashboard(parseInt(options.port));
  });

program
  .command('interactive')
  .description('Start interactive mode')
  .action(async () => {
    await interactiveMode();
  });

program
  .command('monitor')
  .description('Real-time monitoring of all services')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '5')
  .action(async (options) => {
    const interval = parseInt(options.interval) * 1000;
    
    console.log(chalk.bold.blue(`\n📡 Real-time Monitoring (Update every ${options.interval}s)\n`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    const monitor = async () => {
      console.clear();
      console.log(chalk.bold.blue(`🔍 PIC Services Monitor - ${new Date().toLocaleTimeString()}\n`));
      await checkAllServices(false);
    };

    // Initial check
    await monitor();

    // Set up interval
    const intervalId = setInterval(monitor, interval);

    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.yellow('\n🛑 Monitoring stopped'));
      process.exit(0);
    });
  });

// Global verbose flag
let verbose = false;
program
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', (thisCommand) => {
    verbose = thisCommand.opts().verbose;
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

export { program };
