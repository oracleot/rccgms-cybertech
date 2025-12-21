# Cyber Tech - AI Coding Instructions

Church tech department management app built with Next.js 16, Supabase, and Vercel AI SDK.

## Architecture Overview

This is a **Next.js App Router monolith** with 7 feature modules: Auth, Rota, Livestream, Equipment, Rundown, Social, Training. Each module follows a consistent structure:

- **Routes**: `app/(dashboard)/{feature}/` for protected pages, `app/(auth)/` for public auth pages
- **Components**: `components/{feature}/` for feature-specific, `components/ui/` for shadcn
- **API**: `app/api/{feature}/` for server endpoints
- **Validation**: `lib/validations/{feature}.ts` with Zod schemas (shared client/server)

Data flows through **Supabase with Row Level Security (RLS)**—all authorization happens at the database layer via RLS policies, not in application code.

## Key Conventions

### File Naming & Structure
- Use lowercase-kebab-case for directories and files: `rota-calendar.tsx`, `equipment-checkout.ts`
- Feature components go in `components/{feature}/`, not directly in `components/`
- Colocate route-specific components in `app/(dashboard)/{feature}/_components/`

### TypeScript Patterns
- Always use path aliases: `@/components/ui/button`, `@/lib/supabase/server`
- Database types generated from Supabase go in `types/database.ts`
- Custom types per feature: `types/{feature}.ts`
- All form inputs validated with Zod schemas from `lib/validations/`

### Component Patterns
```typescript
// Use shadcn/ui components from @/components/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Class merging utility for conditional styles
import { cn } from "@/lib/utils"
<div className={cn("base-class", isActive && "active-class")} />
```

### Supabase Client Usage
```typescript
// Server Components & API Routes - use server client
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client Components - use browser client  
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Admin operations (bypass RLS) - service role client
import { createAdminClient } from "@/lib/supabase/admin"
```

### Form Validation Pattern
```typescript
// 1. Define schema in lib/validations/{feature}.ts
import { z } from "zod"
export const createRotaSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().date(),
})
export type CreateRotaInput = z.infer<typeof createRotaSchema>

// 2. Use in React Hook Form
import { zodResolver } from "@hookform/resolvers/zod"
const form = useForm<CreateRotaInput>({ resolver: zodResolver(createRotaSchema) })

// 3. Validate in API routes
const parsed = createRotaSchema.safeParse(body)
if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
```

### AI Generation Pattern
```typescript
// Streaming responses with Vercel AI SDK
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

const result = streamText({
  model: openai("gpt-4o"),
  messages: [...],
})
return result.toDataStreamResponse()

// Client-side consumption
import { useCompletion } from "ai/react"
const { completion, complete, isLoading } = useCompletion({ api: "/api/ai/..." })
```

## Database Conventions

### User Roles
Three roles with distinct permissions: `admin` > `leader` > `volunteer`
- **Admin**: Full access, user management, system settings
- **Leader**: Create/edit rotas, approve swaps, manage team
- **Volunteer**: View schedules, submit availability, request swaps

### Key Entities
- `profiles` (linked to `auth.users`) → `departments` → `positions`
- `rotas` → `rota_assignments` (links volunteers to positions)
- `equipment` → `equipment_checkouts` (auto-updates status via trigger)
- `rundowns` → `rundown_items` (ordered by `order` column)

### RLS Policy Pattern
All tables use RLS. Policies check `profiles.role` via `auth.uid()`:
```sql
-- Typical pattern: volunteers see published only, leaders see all
CREATE POLICY "view_rotas" ON rotas FOR SELECT USING (
  status = 'published' 
  OR EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('admin', 'leader'))
);
```

## Development Commands

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm db:push          # Apply Supabase migrations
pnpm db:generate      # Generate types from database schema
pnpm dlx shadcn@latest add {component}  # Add shadcn component
```

## Critical Implementation Notes

1. **Auth is Supabase-managed**: Use `@supabase/ssr` for session handling. Profiles auto-created via database trigger on `auth.users` insert.

2. **Offline-first for reads**: Rotas and rundowns must be cached for PWA. Use Service Worker with `StaleWhileRevalidate` strategy.

3. **AI content is always editable**: Never auto-submit AI-generated descriptions. User must review and explicitly save.

4. **Equipment status is trigger-managed**: Don't manually update `equipment.status`—the `on_checkout_change` trigger handles it based on checkouts.

5. **Notifications log failures**: On email/SMS failure, log to `notifications` table with `status: 'failed'` for admin retry.

## Specifications

Detailed specifications live in `specs/001-cyber-tech-app-build/`:
- [spec.md](specs/001-cyber-tech-app-build/spec.md) - User stories and requirements
- [data-model.md](specs/001-cyber-tech-app-build/data-model.md) - Database schema with all RLS policies
- [contracts/](specs/001-cyber-tech-app-build/contracts/) - API endpoint specifications per module
- [quickstart.md](specs/001-cyber-tech-app-build/quickstart.md) - Developer setup guide
