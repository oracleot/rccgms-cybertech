# API Contracts: Social Media Content

**Module**: Social  
**Base Path**: `/api/social/*`  
**Date**: 2025-12-21

## Overview

Social media content management integrates with Google Drive for asset storage and uses AI for caption generation. Supports preview rendering for multiple platforms.

---

## Custom API Routes

### POST /api/social/connect/google

Initiate Google OAuth flow for Drive access.

**Authorization**: Leader or Admin role required

**Response 302**: Redirect to Google OAuth consent page

**Callback**: `/api/social/callback/google`

---

### GET /api/social/callback/google

OAuth callback handler.

**Query Parameters**:
- `code`: OAuth authorization code
- `state`: CSRF token

**Response 302**: Redirect to `/social?connected=true`

**Side Effects**: 
- Stores refresh token in `social_integrations` table
- Creates `google_drive` integration record

---

### GET /api/social/drive/folders

List folders from connected Google Drive.

**Authorization**: Authenticated with Google Drive connected

**Query Parameters**:
- `parentId` (optional): Parent folder ID (default: root)

**Response 200**:
```typescript
{
  folders: Array<{
    id: string,
    name: string,
    hasChildren: boolean
  }>
}
```

---

### GET /api/social/drive/files

List media files from Google Drive folder.

**Authorization**: Authenticated with Google Drive connected

**Query Parameters**:
- `folderId`: Google Drive folder ID
- `limit` (optional): Max results (default: 50)
- `pageToken` (optional): For pagination

**Response 200**:
```typescript
{
  files: Array<{
    id: string,
    name: string,
    mimeType: string,
    thumbnailUrl: string,
    size: number,
    createdAt: string
  }>,
  nextPageToken: string | null
}
```

---

### POST /api/social/content

Create new social content post.

**Authorization**: Leader or Admin required

**Request**:
```typescript
{
  title: string,
  driveFileId?: string,  // From Google Drive
  uploadedFileUrl?: string,  // Direct upload
  caption?: string,
  hashtags?: string[],
  scheduledFor?: string,  // ISO datetime
  platforms: ('facebook' | 'instagram' | 'twitter' | 'youtube')[],
  status: 'draft' | 'scheduled' | 'posted'
}
```

**Response 201**:
```typescript
{
  success: true,
  content: SocialContent
}
```

---

### PATCH /api/social/content/:id

Update social content.

**Authorization**: Creator or Admin

**Request**:
```typescript
{
  title?: string,
  caption?: string,
  hashtags?: string[],
  scheduledFor?: string,
  platforms?: string[],
  status?: 'draft' | 'scheduled' | 'posted'
}
```

**Response 200**:
```typescript
{
  success: true,
  content: SocialContent
}
```

---

### DELETE /api/social/content/:id

Delete social content.

**Authorization**: Creator or Admin

**Response 204**: No content

---

### POST /api/ai/generate-caption

Generate AI caption for social media post.

**Authorization**: Authenticated

**Request**:
```typescript
{
  platform: 'facebook' | 'instagram' | 'twitter' | 'youtube',
  context: string,  // Description of image/video
  tone?: 'inspirational' | 'informative' | 'casual' | 'formal',
  includeEmojis?: boolean,
  includeHashtags?: boolean,
  maxLength?: number  // Character limit
}
```

**Response 200** (streaming):
```typescript
{
  caption: string,
  hashtags: string[],
  characterCount: number
}
```

**Implementation**:
```typescript
// app/api/ai/generate-caption/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

const platformLimits = {
  twitter: 280,
  facebook: 2000,
  instagram: 2200,
  youtube: 5000
}

const platformPrompts = {
  facebook: `Create an engaging Facebook post caption. Include a hook at the start, 
    use a conversational tone, and encourage comments/shares.`,
  
  instagram: `Create an Instagram caption that's visually descriptive. 
    Start with an attention-grabbing first line (shows in preview).
    Use line breaks for readability. Include a call to action.`,
  
  twitter: `Create a concise, impactful tweet. Be direct and engaging.
    Consider thread potential if topic is complex.`,
  
  youtube: `Create a YouTube video description. Include:
    - Opening hook (first 2 lines show in search)
    - Video summary
    - Key timestamps placeholder
    - Call to subscribe`
}

export async function POST(req: Request) {
  const { platform, context, tone, includeEmojis, includeHashtags, maxLength } = 
    await req.json()

  const limit = maxLength || platformLimits[platform] || 500

  const prompt = `
    ${platformPrompts[platform]}
    
    Content context: ${context}
    Tone: ${tone || 'inspirational'}
    ${includeEmojis ? 'Include relevant emojis.' : 'No emojis.'}
    ${includeHashtags ? 'Include 3-5 relevant hashtags at the end.' : 'No hashtags.'}
    Maximum length: ${limit} characters
    
    For a church/religious organization context.
    Be authentic and welcoming.
  `

  const result = streamText({
    model: openai('gpt-4o-mini'),
    prompt,
    maxTokens: 500,
  })

  return result.toDataStreamResponse()
}
```

---

### GET /api/social/content/:id/preview/:platform

Get platform-specific preview rendering.

**Authorization**: Authenticated

**Response 200**:
```typescript
{
  previewHtml: string,  // Rendered preview HTML
  characterCount: number,
  warnings: string[]  // e.g., "Caption exceeds recommended length"
}
```

---

### POST /api/social/upload

Direct file upload for social content.

**Authorization**: Leader or Admin

**Request**: `multipart/form-data`
- `file`: Image or video file
- `type`: `'image' | 'video'`

**Response 200**:
```typescript
{
  success: true,
  fileUrl: string,  // Supabase Storage URL
  thumbnailUrl: string
}
```

---

### GET /api/social/calendar

Get content calendar view.

**Authorization**: Authenticated

**Query Parameters**:
- `month`: YYYY-MM format
- `platform` (optional): Filter by platform

**Response 200**:
```typescript
{
  items: Array<{
    id: string,
    title: string,
    scheduledFor: string,
    platforms: string[],
    status: string,
    thumbnailUrl: string | null
  }>
}
```

---

## Supabase Queries

### List Content

```typescript
const { data: content } = await supabase
  .from('social_content')
  .select(`
    *,
    created_by:profiles(id, name, avatar_url)
  `)
  .order('scheduled_for', { ascending: false })
  .limit(20)
```

### Get Content by ID

```typescript
const { data: content } = await supabase
  .from('social_content')
  .select(`
    *,
    created_by:profiles(id, name, avatar_url)
  `)
  .eq('id', contentId)
  .single()
```

### Get Scheduled Content

```typescript
const { data: scheduled } = await supabase
  .from('social_content')
  .select('*')
  .eq('status', 'scheduled')
  .gte('scheduled_for', new Date().toISOString())
  .order('scheduled_for', { ascending: true })
```

### Check Integration Status

```typescript
const { data: integration } = await supabase
  .from('social_integrations')
  .select('*')
  .eq('platform', 'google_drive')
  .eq('created_by', userId)
  .single()

const isConnected = integration?.access_token != null
```

---

## Validation Schemas

```typescript
// lib/validations/social.ts
import { z } from 'zod'

export const platformEnum = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'youtube'
])

export const contentStatusEnum = z.enum([
  'draft',
  'scheduled',
  'posted'
])

export const toneEnum = z.enum([
  'inspirational',
  'informative',
  'casual',
  'formal'
])

export const createContentSchema = z.object({
  title: z.string().min(1).max(200),
  driveFileId: z.string().optional(),
  uploadedFileUrl: z.string().url().optional(),
  caption: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(50)).max(30).optional(),
  scheduledFor: z.string().datetime().optional(),
  platforms: z.array(platformEnum).min(1),
  status: contentStatusEnum.default('draft'),
}).refine(
  (data) => data.driveFileId || data.uploadedFileUrl,
  { message: 'Either driveFileId or uploadedFileUrl is required' }
)

export const updateContentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  caption: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(50)).max(30).optional(),
  scheduledFor: z.string().datetime().optional(),
  platforms: z.array(platformEnum).min(1).optional(),
  status: contentStatusEnum.optional(),
})

export const generateCaptionSchema = z.object({
  platform: platformEnum,
  context: z.string().min(10).max(1000),
  tone: toneEnum.optional(),
  includeEmojis: z.boolean().default(true),
  includeHashtags: z.boolean().default(true),
  maxLength: z.number().int().min(50).max(5000).optional(),
})

export type CreateContentInput = z.infer<typeof createContentSchema>
export type UpdateContentInput = z.infer<typeof updateContentSchema>
export type GenerateCaptionInput = z.infer<typeof generateCaptionSchema>
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| social_content | All authenticated | leader/admin | creator or admin | creator or admin |
| social_integrations | Own records | admin only | own records | own records |

---

## TypeScript Types

```typescript
// types/social.ts
export type Platform = 'facebook' | 'instagram' | 'twitter' | 'youtube'
export type ContentStatus = 'draft' | 'scheduled' | 'posted'
export type CaptionTone = 'inspirational' | 'informative' | 'casual' | 'formal'

export interface SocialContent {
  id: string
  title: string
  driveFileId: string | null
  uploadedFileUrl: string | null
  thumbnailUrl: string | null
  caption: string | null
  hashtags: string[]
  platforms: Platform[]
  scheduledFor: string | null
  postedAt: string | null
  status: ContentStatus
  createdBy: Profile
  createdAt: string
  updatedAt: string
}

export interface SocialIntegration {
  id: string
  platform: 'google_drive' | 'facebook' | 'instagram'
  accessToken: string  // Encrypted
  refreshToken: string  // Encrypted
  expiresAt: string
  createdBy: string
  createdAt: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailUrl: string
  size: number
  createdAt: string
}

export interface DriveFolder {
  id: string
  name: string
  hasChildren: boolean
}

export interface ContentPreview {
  platform: Platform
  previewHtml: string
  characterCount: number
  warnings: string[]
}

// Platform character limits
export const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  facebook: 2000,
  instagram: 2200,
  youtube: 5000
}
```

---

## Google Drive Integration Example

```typescript
// lib/google-drive.ts
import { google } from 'googleapis'

export async function getDriveClient(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return google.drive({ version: 'v3', auth: oauth2Client })
}

export async function listFiles(refreshToken: string, folderId: string) {
  const drive = await getDriveClient(refreshToken)

  const response = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/')`,
    fields: 'files(id, name, mimeType, thumbnailLink, size, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 50
  })

  return response.data.files?.map(file => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    thumbnailUrl: file.thumbnailLink!,
    size: Number(file.size) || 0,
    createdAt: file.createdTime!
  })) || []
}
```
