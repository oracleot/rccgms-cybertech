#!/usr/bin/env node

import 'dotenv/config';
import { PICMiniServer } from './http.mini.server';

// Initialize and start the PIC-Mini server
async function startMiniServer(): Promise<void> {
  try {
    const port = parseInt(process.env.MINI_PORT || '3002');
    const server = new PICMiniServer(port);
    
    console.log('🚀 Starting PIC-Mini service...');
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down PIC-Mini gracefully...');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down PIC-Mini...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start PIC-Mini:', error);
    process.exit(1);
  }
}

startMiniServer();
