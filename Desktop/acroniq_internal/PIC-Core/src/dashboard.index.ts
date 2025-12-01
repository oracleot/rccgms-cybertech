#!/usr/bin/env node

import 'dotenv/config';
import { PICDashboardServer } from './monitoring/dashboard.server';

// Initialize and start the PIC Dashboard server
async function startDashboardServer() {
  try {
    const port = parseInt(process.env.DASHBOARD_PORT || '3003');
    const server = new PICDashboardServer(port);
    
    console.log('📊 Starting PIC Dashboard service...');
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down PIC Dashboard gracefully...');
      server.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down PIC Dashboard...');
      server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start PIC Dashboard:', error);
    process.exit(1);
  }
}

startDashboardServer();
