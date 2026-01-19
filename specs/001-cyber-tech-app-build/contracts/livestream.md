# API Contracts: Livestream Description Generator

**Module**: Livestream  
**Base Path**: `/api/ai/generate-description`  
**Date**: 2025-12-21

## Overview

The livestream module provides AI-powered generation of YouTube and Facebook descriptions using Vercel AI SDK with GPT-4 streaming.

---

## API Routes

### POST /api/ai/generate-description

Generate a service description with streaming response.

**Authorization**: Leader or Admin role required

**Request**:
```typescript
{
  serviceDate: string,     // Required: ISO date "2025-12-29"
  serviceType: 'sunday' | 'special' | 'midweek',  // Required
  title: string,           // Required: Service title
  speaker: string,         // Required: Speaker name
  scripture?: string,      // Optional: Scripture reference
  keyPoints?: string[],    // Optional: Bullet points
  specialNotes?: string,   // Optional: Additional notes
  platform: 'youtube' | 'facebook'  // Required: Target platform
}
```

**Response**: `text/event-stream` (Server-Sent Events)

```
data: {"text": "Join us this"}
data: {"text": " Sunday for an inspiring"}
data: {"text": " message..."}
...
data: [DONE]
```

**Error Responses**:

```typescript
// 400 Bad Request
{ error: 'VALIDATION_ERROR', details: [...] }

// 403 Forbidden
{ error: 'FORBIDDEN', message: 'Leader or Admin access required' }

// 429 Too Many Requests
{ error: 'RATE_LIMIT', message: 'Too many requests. Try again in 60 seconds.' }

// 500 Internal Server Error
{ error: 'AI_ERROR', message: 'Failed to generate description' }
```

---

### POST /api/ai/generate-description/save

Save a generated description to history.

**Authorization**: Leader or Admin role required

**Request**:
```typescript
{
  rotaId?: string,         // Optional: Link to rota
  title: string,           // Required
  platform: 'youtube' | 'facebook',
  content: string,         // The generated/edited description
  speaker?: string,
  scripture?: string,
  metadata?: {
    keyPoints?: string[],
    specialNotes?: string
  }
}
```

**Response 200**:
```typescript
{
  success: true,
  livestream: {
    id: string,
    title: string,
    youtubeDescription: string | null,
    facebookDescription: string | null,
    createdAt: string
  }
}
```

---

### GET /api/livestream/history

Get history of generated descriptions.

**Authorization**: Leader or Admin role required

**Query Parameters**:
- `limit`: number (default: 20, max: 100)
- `offset`: number (default: 0)
- `platform`: 'youtube' | 'facebook' (optional filter)

**Response 200**:
```typescript
{
  livestreams: Array<{
    id: string,
    title: string,
    speaker: string | null,
    youtubeDescription: string | null,
    facebookDescription: string | null,
    createdAt: string,
    rota: {
      id: string,
      date: string
    } | null
  }>,
  total: number,
  hasMore: boolean
}
```

---

### GET /api/livestream/templates

Get saved prompt templates.

**Authorization**: Admin role required

**Response 200**:
```typescript
{
  templates: {
    youtube: {
      systemPrompt: string,
      updatedAt: string,
      updatedBy: string
    },
    facebook: {
      systemPrompt: string,
      updatedAt: string,
      updatedBy: string
    }
  }
}
```

---

### PUT /api/livestream/templates/:platform

Update a prompt template.

**Authorization**: Admin role required

**Request**:
```typescript
{
  systemPrompt: string  // The new prompt template
}
```

**Response 200**:
```typescript
{
  success: true,
  template: {
    systemPrompt: string,
    updatedAt: string
  }
}
```

---

## Prompt Templates

### YouTube Default Template

```text
You are a skilled church communications writer. Generate a YouTube video description for a church service.

Guidelines:
- Start with an engaging hook about the message
- Include the service details (date, speaker, title)
- Add the scripture reference if provided
- Include key points as bullet points
- End with a call to action (like, subscribe, share)
- Add relevant hashtags for discoverability
- Keep total length under 5000 characters
- Use emoji sparingly for visual appeal

Church: RCCG Morning Star
Service Type: {serviceType}
Date: {serviceDate}
Title: {title}
Speaker: {speaker}
Scripture: {scripture}
Key Points: {keyPoints}
Special Notes: {specialNotes}
```

### Facebook Default Template

```text
You are a skilled church communications writer. Generate a Facebook post description for a church service livestream.

Guidelines:
- Start with a warm, inviting opening
- Include the service details clearly
- Use a conversational, friendly tone
- Include a call to action (watch, share, comment)
- Add 3-5 relevant hashtags at the end
- Keep total length under 500 characters for best engagement
- Use emoji for warmth and visual appeal

Church: RCCG Morning Star
Service Type: {serviceType}
Date: {serviceDate}
Title: {title}
Speaker: {speaker}
Scripture: {scripture}
Key Points: {keyPoints}
Special Notes: {specialNotes}
```

---

## Validation Schemas

```typescript
// lib/validations/livestream.ts
import { z } from 'zod'

export const generateDescriptionSchema = z.object({
  serviceDate: z.string().date(),
  serviceType: z.enum(['sunday', 'special', 'midweek']),
  title: z.string().min(1).max(200),
  speaker: z.string().min(1).max(100),
  scripture: z.string().max(200).optional(),
  keyPoints: z.array(z.string().max(200)).max(10).optional(),
  specialNotes: z.string().max(500).optional(),
  platform: z.enum(['youtube', 'facebook']),
})

export const saveDescriptionSchema = z.object({
  rotaId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  platform: z.enum(['youtube', 'facebook']),
  content: z.string().min(1).max(10000),
  speaker: z.string().max(100).optional(),
  scripture: z.string().max(200).optional(),
  metadata: z.object({
    keyPoints: z.array(z.string()).optional(),
    specialNotes: z.string().optional(),
  }).optional(),
})

export const updateTemplateSchema = z.object({
  systemPrompt: z.string().min(100).max(5000),
})

export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>
export type SaveDescriptionInput = z.infer<typeof saveDescriptionSchema>
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/ai/generate-description | 10 requests | 1 minute |
| POST /api/ai/generate-description/save | 30 requests | 1 minute |
| GET /api/livestream/* | 60 requests | 1 minute |

---

## Client Usage

```typescript
// components/livestream/description-form.tsx
import { useCompletion } from 'ai/react'

export function DescriptionGenerator() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/ai/generate-description',
  })

  const [formData, setFormData] = useState<GenerateDescriptionInput>({
    serviceDate: '',
    serviceType: 'sunday',
    title: '',
    speaker: '',
    platform: 'youtube',
  })

  const handleGenerate = async () => {
    await complete('', { body: formData })
  }

  return (
    <div>
      {/* Form inputs */}
      <Button onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate'}
      </Button>
      
      {/* Preview with streaming text */}
      <div className="prose">
        {completion}
      </div>
      
      {error && <ErrorMessage error={error} />}
    </div>
  )
}
```

---

## TypeScript Types

```typescript
// types/livestream.ts
export interface Livestream {
  id: string
  rotaId: string | null
  title: string
  youtubeDescription: string | null
  facebookDescription: string | null
  speaker: string | null
  scripture: string | null
  metadata: {
    keyPoints?: string[]
    specialNotes?: string
  }
  createdBy: string
  createdAt: string
}

export interface PromptTemplate {
  platform: 'youtube' | 'facebook'
  systemPrompt: string
  updatedAt: string
  updatedBy: string
}
```
