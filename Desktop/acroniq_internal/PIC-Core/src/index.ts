#!/usr/bin/env node

import 'dotenv/config';
import { PICServer } from './http.server';
import { PICCore } from './pic.core';

// Initialize and start the PIC server
async function startServer() {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const server = new PICServer(port);
    
    console.log('🚀 Starting PIC-Core service...');
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start PIC-Core:', error);
    process.exit(1);
  }
}

startServer();
