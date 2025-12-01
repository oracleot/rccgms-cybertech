# PIC-Core Migration Guide

## Overview

This guide explains how to migrate from the embedded PIC implementation in AcronIQ_Veritus to the standalone PIC-Core microservice architecture.

## Architecture Change

### Before (Embedded)
```
Veritus Backend
├── PIC Client Service (calls external)
├── PIC AI Service (embedded logic)
├── PIC Monitoring Service (embedded)
└── Direct OpenRouter API calls
```

### After (Standalone)
```
Veritus Backend
└── PIC Client Service (calls PIC-Core)

PIC-Core (Standalone Service)
├── AI Model Service
├── Analysis Service  
├── Monitoring Service
└── REST API Endpoints
```

## Migration Steps

### 1. Update Veritus Configuration

**Remove from Veritus `.env`:**
```bash
# DELETE these lines from Veritus
OPENROUTER_API_KEY=your_key_here
PIC_SERVICE_URL=http://localhost:3001
PIC_SERVICE_API_KEY=service_key
```

**Add to Veritus `.env`:**
```bash
# ADD these lines to Veritus
PIC_CORE_URL=http://localhost:3001
PIC_CORE_API_KEY=acroniq-pic-service-key-2025
```

### 2. Update Veritus PIC Client Service

**File: `AcronIQ_Veritus/v1/backend/services/pic-client.service.ts`**

```typescript
// UPDATE the constructor and service URL
constructor() {
  // Changed from PIC_SERVICE_URL to PIC_CORE_URL
  this.picServiceUrl = process.env.PIC_CORE_URL || 'http://localhost:3001';
  this.serviceApiKey = process.env.PIC_CORE_API_KEY || 'acroniq-pic-service-key-2025';
  
  console.log(`🧠 PIC Client Service initialized - connecting to ${this.picServiceUrl}`);
}

// UPDATE the API endpoint
async query(request: PICRequest): Promise<PICResponse> {
  // Changed from /api/pic/analyze to /api/pic/analyse
  const response = await fetch(`${this.picServiceUrl}/api/pic/analyse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.serviceApiKey}`,
      'X-Service-Auth': this.serviceApiKey
    },
    body: JSON.stringify({
      application: request.context?.application || 'Veritus',
      user_id: request.context?.userId,
      query: request.message,  // Changed from message to query
      mode: request.mode || 'strategic',
      context: request.context
    })
  });
  
  // Response format stays the same
  return this.formatResponse(response);
}
```

### 3. Update Veritus Routes

**File: `AcronIQ_Veritus/v1/backend/routes.ts`**

```typescript
// UPDATE the PIC test endpoint
app.get('/api/pic/test', requireAuth, async (req, res) => {
  try {
    const { queryPIC } = await import('./services/pic-client.service');
    
    const testResponse = await queryPIC('Test PIC connection with a simple business question: Is starting a coffee shop a good idea?', {
      mode: 'pic-strategic',  // Changed from 'strategic' to 'pic-strategic'
      context: {
        industry: 'food-service',
        businessType: 'retail',
        stage: 'idea'
      }
    });
    
    res.json({
      success: testResponse.success,
      picConnected: testResponse.success,
      response: testResponse.success ? {
        confidence: testResponse.data?.metadata.confidence,
        analysisType: testResponse.data?.metadata.analysisType,
        processingTime: testResponse.data?.metadata.processingTime
      } : null,
      error: testResponse.error?.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      picConnected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 4. Remove Embedded PIC Services from Veritus

**Delete these files from Veritus:**
```bash
# DELETE these files from AcronIQ_Veritus/v1/backend/services/
rm services/ai/pic-ai.service.ts
rm services/pic-monitoring.service.ts
```

**Update imports in affected files:**
```typescript
// REMOVE these imports
import { PICEnhancedAIService } from './services/ai/pic-ai.service';
import { getPICMonitoringService } from './services/pic-monitoring.service';
```

### 5. Setup PIC-Core Service

**Create PIC-Core directory structure:**
```bash
mkdir -p PIC-Core/src/services
mkdir -p PIC-Core/src/types
```

**Install dependencies in PIC-Core:**
```bash
cd PIC-Core
npm install express cors openai dotenv
npm install -D @types/node @types/express typescript ts-node nodemon
```

**Copy the enhanced services to PIC-Core:**
- `ai.model.service.ts` - AI provider management
- `pic.analysis.service.ts` - Strategic analysis frameworks  
- `pic.monitoring.service.ts` - Performance monitoring

### 6. Configure PIC-Core Environment

**Create `PIC-Core/.env`:**
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Provider Configuration
OPENROUTER_API_KEY=your_actual_openrouter_key
OPENAI_API_KEY=your_actual_openai_key  # Optional

# Service Authentication
SERVICE_API_KEY=acroniq-pic-service-key-2025

# Monitoring
ENABLE_MONITORING=true
ALERT_THRESHOLDS_RESPONSE_TIME_MS=10000
ALERT_THRESHOLDS_CONFIDENCE_PERCENT=60

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
```

### 7. Update Package Scripts

**Add to `PIC-Core/package.json`:**
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  }
}
```

### 8. Startup Sequence

**Start services in order:**
```bash
# 1. Start PIC-Core first
cd PIC-Core
npm run dev

# 2. Start Veritus (in separate terminal)
cd ../AcronIQ_Veritus/v1
npm run dev
```

### 9. Verify Migration

**Test PIC-Core health:**
```bash
curl http://localhost:3001/health
```

**Test Veritus PIC integration:**
```bash
# Test PIC connection from Veritus
curl http://localhost:3000/api/pic/test \
  -H "Authorization: Bearer <your_session_token>"
```

## API Changes

### Request Format Changes

**Before:**
```json
{
  "message": "Is this a good business idea?",
  "mode": "strategic",
  "context": { ... }
}
```

**After:**
```json
{
  "query": "Is this a good business idea?",
  "mode": "pic-strategic",
  "context": { ... },
  "application": "Veritus",
  "user_id": "user123"
}
```

### Response Format Changes

**Before:**
```json
{
  "success": true,
  "data": {
    "content": "Analysis response...",
    "metadata": { ... }
  }
}
```

**After:** (Same format, enhanced metadata)
```json
{
  "success": true,
  "data": {
    "content": "Analysis response...",
    "insight": {
      "summary": "...",
      "confidence": 85,
      "frameworksUsed": ["SWOT", "MARKET"],
      "analysisType": "strategic_analysis"
    },
    "processingTime": 2500,
    "version": "pic-strategic",
    "confidence": 85,
    "analysisType": "strategic_analysis",
    "frameworksUsed": ["SWOT", "MARKET"]
  }
}
```

## Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Check if PIC-Core is running
curl http://localhost:3001/health

# Check PORT configuration
echo $PORT  # Should be 3001
```

**2. Authentication Errors**
```bash
# Verify API keys match
grep SERVICE_API_KEY PIC-Core/.env
grep PIC_CORE_API_KEY ../AcronIQ_Veritus/v1/.env
```

**3. CORS Issues**
```bash
# Check allowed origins
grep ALLOWED_ORIGINS PIC-Core/.env
```

**4. AI Provider Errors**
```bash
# Verify OpenRouter key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
```

### Debug Mode

**Enable debug logging:**
```bash
# Add to PIC-Core/.env
DEBUG_PIC_ANALYSIS=true
ENABLE_FRAMEWORK_LOGGING=true
```

**Check logs:**
```bash
# PIC-Core logs
cd PIC-Core && npm run dev

# Veritus logs  
cd ../AcronIQ_Veritus/v1 && npm run dev
```

## Performance Considerations

### Response Times
- **pic-mini**: ~2-3 seconds
- **pic-strategic**: ~4-6 seconds  
- **pic-analysis**: ~6-10 seconds

### Rate Limits
- Default: 100 requests per minute
- Configurable via environment variables

### Monitoring
- Built-in metrics collection
- Performance alerts
- Health checks

## Rollback Plan

If migration fails, rollback by:

1. **Stop PIC-Core:**
```bash
pkill -f "PIC-Core"
```

2. **Restore Veritus PIC services:**
```bash
# Restore embedded services
git checkout HEAD~1 -- services/ai/pic-ai.service.ts
git checkout HEAD~1 -- services/pic-monitoring.service.ts
```

3. **Restore Veritus environment:**
```bash
# Add back to Veritus .env
OPENROUTER_API_KEY=your_key_here
```

4. **Restart Veritus:**
```bash
npm run dev
```

## Testing

### Unit Tests
```bash
cd PIC-Core
npm test
```

### Integration Tests
```bash
# Test PIC-Core endpoints
curl -X POST http://localhost:3001/api/pic/analyse \
  -H "Content-Type: application/json" \
  -d '{"query":"test","mode":"pic-mini"}'

# Test Veritus integration
curl http://localhost:3000/api/pic/test \
  -H "Authorization: Bearer <session>"
```

### Load Testing
```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/pic/analyse \
    -H "Content-Type: application/json" \
    -d '{"query":"test query '$i'","mode":"pic-mini"}' &
done
wait
```

---

**Migration Complete! 🎉**

Your AcronIQ ecosystem now has a centralized, scalable PIC service that can be shared across all applications.
