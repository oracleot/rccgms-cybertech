# PIC Core - Polaris Intelligence Core

**The reasoning engine family powering AcronIQ Veritus**

## 🚀 Quick Start

### Development

```bash
# Clone repository
git clone https://github.com/Dars2307/PIC-Core.git
cd PIC-Core

# Install dependencies
npm install

# Start all services
npm run dev          # PIC-Core (3001)
npm run dev:mini      # PIC-Mini (3002)  
npm run dev:dashboard # Dashboard (3003)
```

### Production Deployment (Railway)

```bash
# Deploy to Railway
# 1. Connect GitHub repository to Railway
# 2. Railway will auto-detect railway.toml configuration
# 3. Set environment variables in Railway dashboard
# 4. Deploy all three services as separate Railway services
```

## Overview

The Polaris Intelligence Core (PIC) is a family of AI reasoning engines designed to provide strategic business intelligence with increasing sophistication across versions.

## Architecture Philosophy

```
AcronIQ Veritus (Platform)
    ↓ powered by
PIC Family (Reasoning Layer)
    ↓ running on
Backend Models (GPT, Claude, etc.)
```

PIC is **not a model** - it's a **reasoning system layer** that defines:

- Tone and personality
- Strategic thinking patterns
- Output formatting rules
- Analysis frameworks

## PIC Family Roadmap

### 🟢 PIC-mini (v1.0.0 - Active)

- **Focus**: Foundational reasoning for founders
- **Capabilities**: Strategic business analysis, founder-friendly communication
- **Backend**: GPT-4o-mini
- **Status**: Production ready

### 🟡 PIC-1 (v2.0.0 - Planned Mid 2026)

- **Focus**: Enhanced structured strategic reasoning
- **Capabilities**: Multi-layered analysis, predictive insights
- **Backend**: GPT-4o, Claude-3.5
- **Status**: In planning

### 🔵 PIC-2 (v3.0.0 - Future)

- **Focus**: Predictive analytics and scenario planning
- **Capabilities**: Market forecasting, risk modeling
- **Backend**: GPT-5, Claude-4
- **Status**: Conceptual

### 🟣 PIC-3 (v4.0.0 - Future)

- **Focus**: Multi-agent collaboration
- **Capabilities**: Team-based analysis, collaborative intelligence
- **Backend**: Advanced multi-modal models
- **Status**: Conceptual

### 🔴 PIC-4 (v5.0.0 - Future)

- **Focus**: Enterprise intelligence
- **Capabilities**: Large-scale analysis, enterprise integration
- **Backend**: Enterprise AI models
- **Status**: Conceptual

### ⚫ PIC-5 (v6.0.0 - Future)

- **Focus**: Autonomous strategic planning
- **Capabilities**: Self-directed analysis, autonomous recommendations
- **Backend**: AGI-level models
- **Status**: Visionary

## Directory Structure

```
pic-core/
├── README.md                 # This overview
├── pic-mini/                 # PIC-mini (Active)
│   ├── config/              # Configuration files
│   ├── reasoning/           # Core reasoning logic
│   ├── prompts/             # System prompts
│   └── tests/               # Test suites
├── pic-1/                   # PIC-1 (Planned)
├── pic-2/                   # PIC-2 (Future)
├── pic-3/                   # PIC-3 (Future)
├── pic-4/                   # PIC-4 (Future)
└── pic-5/                   # PIC-5 (Future)
```

## Development Principles

### Modular Design

Each PIC version is self-contained with its own configuration, reasoning logic, and tests.

### Backward Compatibility

New PIC versions maintain compatibility with previous versions for smooth transitions.

### Progressive Enhancement

Each version builds upon the previous, adding capabilities without breaking existing functionality.

### Configuration-Driven

All PIC behaviour is defined through JSON configuration files, allowing dynamic switching between versions.

## Integration

PIC engines integrate with AcronIQ Veritus through:

1. **Configuration Loading**: Dynamic profile loading from JSON
2. **Prompt Generation**: Context-aware system prompt creation
3. **Reasoning Execution**: Strategic analysis and response generation
4. **Output Formatting**: Consistent, branded response formatting

## Getting Started

### Current (PIC-mini)
```typescript
import { getPICProfile } from './pic-mini/config/pic_config';
import { StrategicAnalysisEngine } from './pic-mini/reasoning/strategic_analysis';

const picMini = getPICProfile('pic-mini');
const engine = new StrategicAnalysisEngine();
```

### Future (PIC-1)
```typescript
// Available Mid 2026
import { getPICProfile } from './pic-1/config/pic_config';
import { AdvancedAnalysisEngine } from './pic-1/reasoning/advanced_analysis';
```

---

**Intelligence With Purpose** - AcronIQ Development Team
