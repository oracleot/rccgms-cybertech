# PIC-mini - Polaris Intelligence Core (Mini)

**Version:** 1.0.0  
**Status:** Active  
**Release Date:** November 2025

## Overview

PIC-mini is the foundational reasoning layer of the Polaris Intelligence Core (PIC) family, designed for strategic business analysis and founder-friendly communication.

## Architecture

```
PIC-mini/
├── config/           # Configuration files
│   ├── pic_profiles.json    # Complete PIC-mini profile
│   ├── pic_types.ts         # TypeScript interfaces
│   └── pic_config.ts        # Configuration loader
├── reasoning/        # Core reasoning logic
│   ├── strategic_analysis.ts
│   ├── founder_communication.ts
│   └── output_formatting.ts
├── prompts/          # System prompts and templates
│   ├── system_prompt.ts
│   ├── reasoning_templates.ts
│   └── brand_identity.ts
└── tests/            # Test suites
    ├── reasoning.test.ts
    ├── prompts.test.ts
    └── integration.test.ts
```

## Core Capabilities

### 🎯 **Strategic Business Analysis**
- Market research optimization
- Competitive intelligence analysis
- Investment thesis development
- Business model evaluation

### 🤝 **Founder-Focused Communication**
- Collaborative advisor tone
- High emotional intelligence
- Acknowledges founder challenges
- Turns complexity into clarity

### 📊 **Structured Output Formatting**
- Emoji-driven visual anchors
- Bullet-point structure
- Insight-driven responses
- Professional yet warm tone

## Configuration

PIC-mini uses a JSON-based configuration system that defines:

- **Reasoning Style**: Strategic business analysis approach
- **Personality**: Professional warm, collaborative advisor
- **Output Formatting**: Emoji-led, structured responses
- **Backend Model**: GPT-4o-mini with optimized parameters
- **Brand Identity**: AcronIQ Veritus integration

## Integration

PIC-mini integrates with AcronIQ Veritus through:

1. **Frontend**: React components load PIC-mini as default mode
2. **Backend**: System prompts use PIC-mini reasoning instructions
3. **API**: Model mapping routes requests to GPT-4o-mini
4. **Configuration**: Dynamic loading of PIC-mini profile

## Future Evolution

PIC-mini serves as the foundation for:
- **PIC-1** (Mid 2026): Enhanced structured strategic reasoning
- **PIC-2** (Future): Predictive analytics capabilities
- **PIC-3** (Future): Multi-agent collaboration
- **PIC-4** (Future): Enterprise intelligence
- **PIC-5** (Future): Autonomous strategic planning

---

**Intelligence With Purpose** - AcronIQ Development Team
