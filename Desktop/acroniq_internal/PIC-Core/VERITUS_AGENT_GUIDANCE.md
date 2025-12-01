# 🤖 Veritus Agent Development Guidance

## 📅 **Effective Date: December 1, 2025**

---

## 🎯 **Mission: Align Veritus with Current PIC Architecture**

### **🔥 Your Primary Objective**
You are the Veritus development agent. Your job is to ensure Veritus (the business intelligence platform) properly integrates with PIC (the strategic analysis service) following the **current production-ready architecture**.

---

## 🏗️ **Current PIC Architecture (NON-NEGOTIABLE)**

### **📡 Service Communication Pattern**
```
Veritus Backend (4000) ──► PIC-Core (3001)
     │                        │
     │  HTTP API Calls         │
     │  Bearer Token Auth      │
     ▼                        ▼
  Strategic Analysis    AI Processing
```

### **🔐 Authentication Requirements**
```bash
# ONLY use this secure key:
PIC_SERVICE_API_KEY=acroniq-pic-2025-618dd40b6a2c70bb227da1e6aeb4d397d97225f85002c11a9ee40e173d5da2b0

# Headers required:
Authorization: Bearer acroniq-pic-2025-618dd40b6a2c70bb227da1e6aeb4d397d97225f85002c11a9ee40e173d5da2b0
X-Service-Auth: acroniq-pic-2025-618dd40b6a2c70bb227da1e6aeb4d397d97225f85002c11a9ee40e173d5da2b0
```

### **🌐 Service Endpoints**
```bash
# PIC-Core Service
URL: http://localhost:3001
Main Endpoint: /api/pic/analyse
Health Check: /health

# Veritus Backend  
URL: http://localhost:4000
PIC Test: /api/pic/test (requires auth)
Health Check: /api/health
```

---

## ⚡ **Integration Implementation Rules**

### **✅ DO:**
1. **Use the existing PIC Client Service** in `services/pic-client.service.ts`
2. **Follow the current request/response patterns** already implemented
3. **Maintain the strategic/quick/fallback mode selection** logic
4. **Preserve error handling and retry mechanisms**
5. **Keep the business context mapping** (industry, businessType, stage)
6. **Use the secure authentication pattern** with Bearer tokens

### **❌ DO NOT:**
1. **Create new AI models or analysis frameworks** in Veritus
2. **Add OpenAI/Anthropic integrations** directly in Veritus
3. **Implement custom analysis logic** - use PIC instead
4. **Change the authentication method** - stick to Bearer tokens
5. **Modify the PIC service URL** - keep it as http://localhost:3001
6. **Create parallel AI services** - PIC is the single source of truth

---

## 🔄 **Request/Response Patterns**

### **📤 Request Format (to PIC)**
```typescript
interface PICRequest {
  message: string;
  mode?: 'strategic' | 'quick' | 'fallback';
  context?: {
    industry?: string;
    businessType?: string;
    stage?: 'idea' | 'startup' | 'growth' | 'mature';
    userId?: string;
    sessionId?: string;
    previousAnalysis?: any;
  };
}
```

### **📥 Response Format (from PIC)**
```typescript
interface PICResponse {
  success: boolean;
  data?: {
    content: string;           // Main response content
    metadata: {
      picVersion: string;
      processingTime: number;
      confidence: number;
      analysisType: string;
      recommendations?: string[];
      riskFactors?: string[];
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

## 🎯 **Specific Veritus Features to Align**

### **1. Business Analysis Integration**
```typescript
// Current pattern in pic-client.service.ts
async query(request: PICRequest): Promise<PICResponse> {
  const response = await fetch(`${this.picServiceUrl}/api/pic/analyse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.serviceApiKey}`,
      'X-Service-Auth': this.serviceApiKey
    },
    body: JSON.stringify(request)
  });
  return response.json();
}
```

### **2. Mode Selection Logic**
```typescript
// Use existing logic in pic-ai.service.ts
function shouldUsePIC(prompt: string): boolean {
  const businessKeywords = [
    'business', 'startup', 'market', 'strategy',
    'investment', 'revenue', 'profit', 'analysis'
  ];
  return businessKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
}
```

### **3. Context Mapping**
```typescript
// Map Veritus business context to PIC format
const picContext = {
  industry: businessData.industry,
  businessType: businessData.type,
  stage: businessData.stage,
  userId: user.id,
  sessionId: session.id
};
```

---

## 🚨 **CRITICAL: Only PIC Needs Index Configuration**

### **📋 What This Means:**
- **Veritus:** NO index configuration needed
- **DataVista:** NO index configuration needed  
- **Signals:** NO index configuration needed
- **Only PIC-Core:** Handles all index/search operations

### **🔧 Index Service Access (PIC Only)**
```bash
# ONLY in PIC-Core .env:
INDEX_SERVICE_URL=http://localhost:3004
INDEX_SERVICE_API_KEY=acroniq-index-service-key-2025

# Veritus and other apps should NOT have:
# ❌ INDEX_SERVICE_URL
# ❌ INDEX_SERVICE_API_KEY  
# ❌ Any index-related configuration
```

### **🎯 Why This Architecture:**
1. **Single Source of Truth:** PIC manages all knowledge indexing
2. **Simplified Security:** Only PIC needs index service access
3. **Clean Separation:** Apps focus on their domain, PIC handles intelligence
4. **Easier Maintenance:** Index updates only affect PIC

---

## 🛠️ **Implementation Checklist**

### **✅ Verify Current Integration:**
- [ ] PIC service URL is correct: `http://localhost:3001`
- [ ] API key matches secure key: `acroniq-pic-2025-618dd40b6a2c70bb227da1e6aeb4d397d97225f85002c11a9ee40e173d5da2b0`
- [ ] Authentication headers are properly set
- [ ] Error handling preserves PIC responses
- [ ] Business context mapping is accurate

### **✅ Remove Anti-Patterns:**
- [ ] No direct OpenAI/Anthropic calls in Veritus
- [ ] No custom analysis logic competing with PIC
- [ ] No index configuration in Veritus
- [ ] No alternative AI services in Veritus

### **✅ Enhance Existing Features:**
- [ ] Better business context extraction
- [ ] Improved mode selection logic
- [ ] Enhanced error messages from PIC responses
- [ ] Better integration with Veritus UI components

---

## 📊 **Service Status Reference**

### **🟢 Currently Running:**
- **PIC-Core (3001):** ✅ Main strategic analysis service
- **PIC-Mini (3002):** ✅ Lightweight quick analysis
- **PIC Dashboard (3003):** ✅ Monitoring interface
- **Veritus Backend (4000):** ✅ Business intelligence platform

### **🔐 Security Status:**
- **API Key:** Cryptographically secure (256-bit entropy)
- **Authentication:** Bearer token pattern
- **Access Control:** Service-to-service only
- **Audit Trail:** Request logging in PIC

---

## 🚀 **Your Development Workflow**

### **Step 1: Understand Current State**
1. Review `services/pic-client.service.ts` - this is your main integration point
2. Check `services/pic-ai.service.ts` - this handles mode selection
3. Examine existing API endpoints in `routes.ts`

### **Step 2: Enhance Integration**
1. Improve business context extraction from Veritus data
2. Better error handling and user feedback
3. Enhanced UI integration with PIC responses
4. Performance optimizations for PIC calls

### **Step 3: Maintain Alignment**
1. Never bypass PIC for AI functionality
2. Keep authentication patterns consistent
3. Preserve the single-source-of-truth architecture
4. Document any new Veritus-specific features that use PIC

---

## 🎯 **Success Metrics**

### **✅ What Success Looks Like:**
- **Veritus users get strategic insights** powered by PIC
- **All AI analysis goes through PIC** (no exceptions)
- **Authentication works seamlessly** across services
- **Error handling preserves PIC context**
- **Performance is optimal** with proper caching

### **❌ What Failure Looks Like:**
- **Direct AI calls in Veritus** bypassing PIC
- **Missing or incorrect authentication**
- **Index configuration in Veritus**
- **Custom analysis logic** competing with PIC
- **Broken service communication**

---

## 🔥 **Final Directive**

**Your job is to make Veritus the BEST possible interface to PIC's strategic analysis capabilities.** 

- **Don't reinvent the wheel** - use PIC's powerful analysis
- **Don't break the architecture** - maintain service boundaries  
- **Don't add complexity** - keep the clean integration pattern
- **DO enhance the user experience** - make PIC insights shine in Veritus

**Veritus + PIC = Unbeatable Business Intelligence** 🚀

---

**📋 This guidance is current as of December 1, 2025. Follow these rules exactly.**
