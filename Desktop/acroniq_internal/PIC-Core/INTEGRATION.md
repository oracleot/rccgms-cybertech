# PIC Core Integration Guide

## Overview

This guide explains how different Veritus platform versions integrate with PIC intelligence versions.

## Architecture Principle

**PIC Core is shared across all Veritus versions** to enable:
- ✅ **Cross-platform compatibility**
- ✅ **Independent evolution** of platform and intelligence
- ✅ **Smooth migration paths** between versions
- ✅ **Consistent reasoning** across platform updates

## Integration Matrix

### **Veritus v1 (Current)**
```typescript
// v1/frontend/src/config/pic.ts
import { getPICProfile } from '../../../pic-core/pic-mini/config/pic_config';
import { StrategicAnalysisEngine } from '../../../pic-core/pic-mini/reasoning/strategic_analysis';

// Supported PIC versions
const SUPPORTED_PICS = ['pic-mini', 'pic-1'];
const DEFAULT_PIC = 'pic-mini';
```

### **Veritus v2 (Future - Mid 2026)**
```typescript
// v2/backend/src/intelligence/pic.py
from pic_core.pic_1.reasoning import AdvancedAnalysisEngine
from pic_core.pic_2.analytics import PredictiveEngine

# Supported PIC versions
SUPPORTED_PICS = ['pic-1', 'pic-2', 'pic-3']
DEFAULT_PIC = 'pic-1'
```

### **Veritus v3 (Future - 2027+)**
```typescript
// v3/services/intelligence/pic-gateway.ts
import { PICOrchestrator } from '../../../pic-core/pic-3/orchestration/multi_agent';
import { EnterpriseEngine } from '../../../pic-core/pic-4/enterprise/analysis';

// Supported PIC versions
const SUPPORTED_PICS = ['pic-3', 'pic-4', 'pic-5'];
const DEFAULT_PIC = 'pic-3';
```

## Integration Patterns

### **1. Configuration Loading**
```typescript
// Any Veritus version can load any compatible PIC
import { getPICProfile } from '../../pic-core/[pic-version]/config/pic_config';

const picConfig = getPICProfile('pic-mini');
```

### **2. Reasoning Engine Access**
```typescript
// Each PIC version exposes standard interfaces
import { ReasoningEngine } from '../../pic-core/[pic-version]/reasoning/engine';

const engine = new ReasoningEngine(picConfig);
const analysis = await engine.analyse(query, context);
```

### **3. Prompt Generation**
```typescript
// Dynamic prompt generation based on PIC version
import { generateSystemPrompt } from '../../pic-core/[pic-version]/prompts/system_prompt';

const prompt = generateSystemPrompt(picConfig, context);
```

## Migration Scenarios

### **Scenario 1: PIC Upgrade Within Same Platform**
```
Veritus v1 + PIC-mini → Veritus v1 + PIC-1
```
- Update configuration: `DEFAULT_PIC = 'pic-1'`
- No platform code changes required
- Gradual rollout possible

### **Scenario 2: Platform Upgrade With PIC Continuity**
```
Veritus v1 + PIC-1 → Veritus v2 + PIC-1
```
- PIC reasoning logic unchanged
- Platform benefits from v2 enhancements
- Smooth transition for users

### **Scenario 3: Simultaneous Upgrade**
```
Veritus v1 + PIC-mini → Veritus v2 + PIC-2
```
- Major capability leap
- Requires migration planning
- Beta testing recommended

## Development Workflow

### **Adding New PIC Version**
1. Create new folder: `pic-core/pic-X/`
2. Implement standard interfaces
3. Add to compatibility matrix
4. Update integration tests
5. Deploy to compatible Veritus versions

### **Adding New Veritus Version**
1. Create new folder: `vX/`
2. Import compatible PIC versions
3. Implement PIC integration layer
4. Test cross-PIC compatibility
5. Document supported PIC versions

## File Path Examples

### **Veritus v1 accessing PIC-mini:**
```
v1/frontend/src/components/chat.tsx
  ↓ imports from
pic-core/pic-mini/config/pic_config.ts
```

### **Veritus v2 accessing PIC-2:**
```
v2/backend/src/api/intelligence.py
  ↓ imports from  
pic-core/pic-2/analytics/predictive.py
```

### **Veritus v3 accessing PIC-4:**
```
v3/services/intelligence/gateway.ts
  ↓ imports from
pic-core/pic-4/enterprise/orchestrator.ts
```

## Benefits of Shared PIC Core

### **🔄 Independent Evolution**
- Platform and intelligence can evolve separately
- No need to duplicate PIC logic across versions
- Easier maintenance and updates

### **🚀 Flexible Deployment**
- Users can upgrade platform OR intelligence independently
- A/B testing between PIC versions
- Gradual migration paths

### **📈 Scalable Architecture**
- New PIC versions work across multiple platform versions
- Reduced development overhead
- Consistent reasoning across platforms

### **🔧 Easier Development**
- Single source of truth for each PIC version
- Shared testing and validation
- Clear separation of concerns

---

**Key Principle:** PIC Core is the **shared intelligence foundation** that powers all AcronIQ Veritus platform versions, enabling independent evolution and maximum flexibility.

**AcronIQ Development Team**
