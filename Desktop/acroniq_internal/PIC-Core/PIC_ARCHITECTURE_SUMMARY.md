# PIC-Core Architecture Summary

## Overview

PIC-Core (Polaris Intelligence Core) is a **standalone backend microservice** that serves as the central intelligence engine for all AcronIQ applications. It provides strategic business analysis, AI reasoning, and performance monitoring capabilities through a REST API.

## Architecture Position

AcronIQ Applications (Veritus, Signals, DataVista, etc.)
                    ↓
                PIC-Core (Backend Service)
                    ↓
        ┌──────────┴──────────┐
        ↓                     ↓
   AI Providers           Index Service
 (OpenRouter, OpenAI)   (Data/Knowledge)

## Key Responsibilities

1. **AI Model Orchestration** - Manages connections to multiple AI providers
2. **Strategic Analysis** - Runs business analysis frameworks (SWOT, BMC, Financial, etc.)
3. **Performance Monitoring** - Tracks usage, metrics, and health
4. **API Gateway** - Provides unified interface for all applications

## Migration from Veritus

### What Was Moved ✅

- **AI Model Integration** - OpenRouter/OpenAI API connections
- **Strategic Frameworks** - SWOT, Business Model Canvas, Market Validation, etc.
- **Monitoring & Analytics** - Performance tracking, alerts, metrics
- **Analysis Service** - Business intelligence processing
- **Advanced API Endpoints** - Full REST API for applications

### What Remains in Veritus ✅

- **PIC Client Service** - HTTP client for calling PIC-Core
- **User Authentication** - Session management and auth
- **Veritus Business Logic** - Application-specific features
- **Frontend UI** - User interface components

## Core Services

### 1. AI Model Service (`ai.model.service.ts`)

- Manages OpenRouter, OpenAI, Anthropic connections
- Handles model configuration and routing
- Provides health checks and provider management

### 2. PIC Analysis Service (`pic.analysis.service.ts`)

- Strategic business analysis frameworks
- Multi-framework synthesis
- Confidence scoring and recommendations

### 3. PIC Monitoring Service (`pic.monitoring.service.ts`)

- Performance metrics and analytics
- Query logging and user feedback
- Health monitoring and alerts

### 4. PIC Core Engine (`pic.core.ts`)

- Main request processing logic
- Business query detection
- Response formatting and orchestration

## API Endpoints

### Core Analysis

- `POST /api/pic/analyse` - Main analysis endpoint
- `GET /api/pic/modes` - Available PIC modes
- `GET /api/pic/profile/:mode` - Mode information

### Monitoring & Analytics

- `GET /api/pic/metrics` - Performance metrics
- `GET /api/pic/analytics` - Usage analytics
- `GET /api/pic/alerts` - Active alerts
- `POST /api/pic/feedback/:queryId` - User feedback

### Service Management

- `GET /health` - Health check
- `GET /api/pic/status` - Service status
- `GET /api/pic/frameworks` - Available frameworks

## PIC Modes

### pic-mini

- **Purpose**: Quick, lightweight analysis
- **Frameworks**: SWOT, Market Validation
- **Use Case**: Initial idea validation, rapid insights

### pic-strategic  

- **Purpose**: Comprehensive strategic analysis
- **Frameworks**: SWOT, Market, Financial, Risk
- **Use Case**: Business planning, investment preparation

### pic-analysis

- **Purpose**: Deep-dive comprehensive analysis
- **Frameworks**: All frameworks including BMC
- **Use Case**: Due diligence, detailed planning

## Analysis Frameworks

1. **SWOT Analysis** - Strengths, Weaknesses, Opportunities, Threats
2. **Business Model Canvas** - 9 building blocks of business models
3. **Market Validation** - TAM, SAM, SOM, competitive analysis
4. **Financial Viability** - Unit economics, projections, funding needs
5. **Risk Assessment** - Comprehensive risk identification and mitigation

## Configuration

### Environment Variables

```bash
# AI Providers
OPENROUTER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Service
PORT=3001
SERVICE_API_KEY=acroniq-pic-service-key-2025

# Monitoring
ENABLE_MONITORING=true
ALERT_THRESHOLDS_RESPONSE_TIME_MS=10000
```

### Model Configuration

- **pic-mini**: GPT-4o-mini, 2000 tokens, 0.7 temp
- **pic-strategic**: GPT-4o, 4000 tokens, 0.8 temp  
- **pic-analysis**: Claude-3-Sonnet, 3000 tokens, 0.6 temp

## Performance Features

### Monitoring

- Query logging with 10k entry buffer
- Real-time metrics and analytics
- Performance alerts and health checks
- User feedback collection

### Analytics

- Query volume over time
- Response time distribution
- Confidence scoring
- Framework effectiveness
- Application usage patterns

### Health Checks

- AI provider connectivity
- Service component status
- Performance threshold monitoring
- Automatic alert resolution

## Security

### Authentication

- Service-to-service API keys
- Request origin validation
- Rate limiting (100 req/min)

### Data Protection

- No user data storage in PIC
- Request/response logging only
- Configurable data retention

## Integration Examples

### Veritus → PIC

```typescript
// Veritus calls PIC for analysis
const response = await fetch('http://localhost:3001/api/pic/analyse', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer SERVICE_API_KEY' },
  body: JSON.stringify({
    application: 'Veritus',
    user_id: 'user123',
    query: 'Is this coffee shop idea viable?',
    mode: 'pic-strategic',
    context: { industry: 'food-service', stage: 'idea' }
  })
});
```

### DataVista → PIC

```typescript
// DataVista calls PIC for document analysis
const response = await fetch('http://localhost:3001/api/pic/analyse', {
  method: 'POST',
  body: JSON.stringify({
    application: 'DataVista',
    query: 'Analyze this market research document',
    mode: 'pic-analysis',
    context: { documentType: 'market-research' }
  })
});
```

## Deployment

### Development

```bash
npm install
npm run dev
# Server runs on http://localhost:3001
```

### Production

```bash
npm run build
npm start
# Configure PORT, API keys, and monitoring
```

### Health Monitoring

- `/health` - Basic health check
- `/api/pic/status` - Detailed service status
- `/api/pic/metrics` - Performance metrics

## Future Enhancements

### Index Integration

- Connect to AcronIQ-Index for contextual data
- Enhanced knowledge retrieval
- Historical analysis patterns

### Advanced Features

- Custom framework creation
- Batch analysis processing
- Real-time collaboration
- Advanced caching strategies

## Benefits

1. **Centralized Intelligence** - Single source of AI reasoning
2. **Consistent Analysis** - Standardized frameworks across apps
3. **Performance Monitoring** - Comprehensive metrics and health tracking
4. **Scalable Architecture** - Easy to add new applications
5. **Security** - Centralized API key management
6. **Cost Efficiency** - Shared resources and optimization

---

**PIC-Core is the brain of the AcronIQ ecosystem - enabling all applications to access powerful strategic intelligence through a unified, scalable service.**
