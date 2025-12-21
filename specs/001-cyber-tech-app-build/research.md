# Research: Cyber Tech Implementation

**Feature**: 001-cyber-tech-app-build  
**Date**: 2025-12-21  
**Status**: Complete

## Overview

This document consolidates research findings for key technology decisions and implementation patterns for the Cyber Tech church management application.

---

## 1. Supabase Authentication & RLS

### Decision
Use Supabase Auth with Row Level Security (RLS) policies for all database access.

### Rationale
- **Integrated auth + database**: Single platform reduces complexity and ensures auth state is available in RLS policies
- **Built-in email verification**: Handles signup flow without custom email infrastructure
- **Session management**: Automatic token refresh, secure cookie handling via `@supabase/ssr`
- **RLS at database level**: Security enforced even if API has bugs—defense in depth per constitution V

### Implementation Pattern

```typescript
// lib/supabase/server.ts - Server-side client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### RLS Policy Pattern

```sql
-- Example: Volunteers see only published rotas, Leaders/Admins see all
CREATE POLICY "view_rotas" ON rotas FOR SELECT USING (
  status = 'published' 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = auth.uid() 
    AND profiles.role IN ('admin', 'leader')
  )
);

-- Example: Only assigned user can view their own availability
CREATE POLICY "view_own_availability" ON availability FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = auth.uid() 
    AND profiles.role IN ('admin', 'leader')
  )
);
```

### Alternatives Considered
- **NextAuth.js + Prisma**: More flexibility but requires managing two systems; Supabase's integration is simpler for this scale
- **Custom JWT auth**: Over-engineering for 50 users; security risk of rolling our own

---

## 2. Vercel AI SDK for Streaming Responses

### Decision
Use Vercel AI SDK 3.x with `streamText` for all AI generation features.

### Rationale
- **Native streaming**: Real-time text generation visible to user (FR-020)
- **Edge-compatible**: Can run on Vercel Edge for low latency
- **Rate limiting built-in**: Via `ai` package configuration
- **OpenAI provider**: Direct GPT-4 integration with consistent API

### Implementation Pattern

```typescript
// app/api/ai/generate-description/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { serviceDate, title, speaker, scripture, platform } = await req.json()
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: platform === 'youtube' 
          ? YOUTUBE_PROMPT_TEMPLATE 
          : FACEBOOK_PROMPT_TEMPLATE
      },
      {
        role: 'user',
        content: `Generate a description for: ${title} on ${serviceDate} by ${speaker}. Scripture: ${scripture}`
      }
    ],
    maxTokens: 1000,
  })
  
  return result.toDataStreamResponse()
}
```

### Client Usage

```typescript
// components/livestream/description-form.tsx
import { useCompletion } from 'ai/react'

export function DescriptionForm() {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/generate-description',
  })
  
  // completion updates in real-time as tokens arrive
}
```

### Alternatives Considered
- **Direct OpenAI SDK**: No streaming abstraction, more boilerplate
- **LangChain**: Over-engineered for simple prompt → response flows

---

## 3. Progressive Web App (PWA) Strategy

### Decision
Use `next-pwa` (or `serwist`) with selective caching for offline capability.

### Rationale
- **Mobile-first requirement**: Constitution II mandates installable PWA
- **Offline reads**: Schedule and rundown views must work offline
- **Selective caching**: Don't cache write operations or real-time data

### Implementation Pattern

```typescript
// next.config.ts
import withPWA from 'next-pwa'

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/rotas/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'rota-cache', expiration: { maxAgeSeconds: 3600 } }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/rundowns/,
      handler: 'StaleWhileRevalidate', 
      options: { cacheName: 'rundown-cache', expiration: { maxAgeSeconds: 3600 } }
    },
    {
      urlPattern: /\/api\/ai\/.*/,
      handler: 'NetworkOnly', // Never cache AI responses
    }
  ]
})({
  // Next.js config
})
```

### Manifest Configuration

```typescript
// app/manifest.ts
export default function manifest() {
  return {
    name: 'Cyber Tech',
    short_name: 'CyberTech',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
}
```

### Alternatives Considered
- **Native app (React Native)**: Overkill for phase 1; PWA covers 90% of use cases
- **No offline**: Violates constitution II; services happen in low-connectivity areas

---

## 4. Notification Delivery (Email + SMS)

### Decision
Use Resend for email (with React Email templates) and Telnyx for SMS.

### Rationale
- **Resend**: Free tier (3,000/mo), React Email support, Vercel integration
- **Telnyx**: Cost-effective (~$0.004/SMS), reliable API, webhook support
- **Failure handling**: Log failures to `notifications` table with manual retry (per clarification)

### Implementation Pattern

```typescript
// lib/notifications/email.ts
import { Resend } from 'resend'
import { RotaReminderEmail } from '@/emails/rota-reminder'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRotaReminder(to: string, rota: RotaWithAssignments) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: `Reminder: You're serving on ${rota.date}`,
      react: RotaReminderEmail({ rota }),
    })
    
    if (error) throw error
    return { success: true, messageId: data?.id }
  } catch (error) {
    // Log to notifications table for admin retry
    await logNotificationFailure('email', to, error)
    return { success: false, error }
  }
}
```

```typescript
// lib/notifications/sms.ts
import Telnyx from 'telnyx'

const telnyx = new Telnyx(process.env.TELNYX_API_KEY)

export async function sendSmsReminder(to: string, message: string) {
  try {
    const response = await telnyx.messages.create({
      from: process.env.TELNYX_PHONE_NUMBER,
      to,
      text: message,
    })
    return { success: true, messageId: response.data.id }
  } catch (error) {
    await logNotificationFailure('sms', to, error)
    return { success: false, error }
  }
}
```

### Alternatives Considered
- **Twilio**: More expensive (~$0.0079/SMS); Telnyx is half the cost
- **AWS SES**: Requires AWS setup; Resend is purpose-built for transactional email
- **Firebase Cloud Messaging**: Push notifications are phase 2 consideration

---

## 5. Form Validation with Zod

### Decision
Use Zod schemas for all form validation, shared between client and server.

### Rationale
- **Type inference**: Schema defines TypeScript type automatically
- **Reusable**: Same schema validates React Hook Form and API routes
- **Constitution IV**: Enforces type safety at boundaries

### Implementation Pattern

```typescript
// lib/validations/rota.ts
import { z } from 'zod'

export const createRotaSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().date(),
  assignments: z.array(z.object({
    positionId: z.string().uuid(),
    userId: z.string().uuid(),
  })).min(1, 'At least one assignment required'),
})

export type CreateRotaInput = z.infer<typeof createRotaSchema>
```

```typescript
// In React Hook Form
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createRotaSchema, CreateRotaInput } from '@/lib/validations/rota'

const form = useForm<CreateRotaInput>({
  resolver: zodResolver(createRotaSchema),
})
```

```typescript
// In API route
import { createRotaSchema } from '@/lib/validations/rota'

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = createRotaSchema.safeParse(body)
  
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  
  // parsed.data is fully typed
}
```

---

## 6. Drag & Drop with @dnd-kit

### Decision
Use @dnd-kit for rundown reordering and rota assignment drag-drop.

### Rationale
- **Accessible**: Built-in keyboard support, ARIA announcements
- **Flexible**: Works for both sortable lists (rundown) and droppable areas (rota)
- **Performance**: Virtualized for large lists if needed

### Implementation Pattern

```typescript
// components/rundown/rundown-editor.tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

export function RundownEditor({ items, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      onReorder(arrayMove(items, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => <SortableItem key={item.id} item={item} />)}
      </SortableContext>
    </DndContext>
  )
}
```

---

## 7. QR Code Generation & Scanning

### Decision
Use `qrcode` for generation and `html5-qrcode` for mobile scanning.

### Rationale
- **Lightweight**: No heavy dependencies
- **Cross-platform**: Works on iOS Safari and Chrome
- **Camera access**: html5-qrcode handles permissions gracefully

### Implementation Pattern

```typescript
// lib/equipment/qr.ts
import QRCode from 'qrcode'

export async function generateEquipmentQR(equipmentId: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/equipment/${equipmentId}`
  return QRCode.toDataURL(url, { width: 200, margin: 2 })
}
```

```typescript
// components/equipment/qr-scanner.tsx
'use client'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef } from 'react'

export function QRScanner({ onScan }: { onScan: (id: string) => void }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false)

    scannerRef.current.render(
      (decodedText) => {
        const equipmentId = extractIdFromUrl(decodedText)
        if (equipmentId) onScan(equipmentId)
      },
      (error) => console.warn('QR scan error:', error)
    )

    return () => scannerRef.current?.clear()
  }, [onScan])

  return <div id="qr-reader" />
}
```

---

## 8. Calendar Integration

### Decision
Use FullCalendar for rota calendar views, React DayPicker for date inputs.

### Rationale
- **FullCalendar**: Rich week/month views, event drag-drop support
- **DayPicker**: Lightweight for simple date selection (availability)
- **shadcn/ui integration**: DayPicker is the default in shadcn calendar component

### Alternatives Considered
- **Custom calendar**: Significant development time; FullCalendar is battle-tested
- **react-big-calendar**: Less polished than FullCalendar

---

## Summary of Key Dependencies

| Purpose | Package | Version |
|---------|---------|---------|
| Framework | next | 14.x |
| Database | @supabase/supabase-js, @supabase/ssr | latest |
| AI | ai, @ai-sdk/openai | 3.x |
| Forms | react-hook-form, zod, @hookform/resolvers | latest |
| UI | @radix-ui/*, class-variance-authority, tailwind-merge | latest |
| Calendar | @fullcalendar/react, react-day-picker | latest |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable | latest |
| Email | resend, @react-email/* | latest |
| SMS | telnyx | latest |
| QR | qrcode, html5-qrcode | latest |
| PWA | next-pwa or serwist | latest |
| Toasts | sonner | latest |

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Initial admin creation | Pre-seeded via database seed script (per clarification) |
| Notification failures | Logged to DB, shown in admin dashboard with retry (per clarification) |
| Data retention | Admin-configurable, default 1 year (per clarification) |
