# API Contracts: Design Requests Tracking

**Feature**: 018-design-requests-tracking  
**Date**: 4 January 2026

## Base URL

All endpoints are relative to `/api/designs`

## Authentication

| Endpoint | Auth Required |
|----------|---------------|
| `POST /api/designs` | ❌ No (public) |
| `GET /api/designs` | ✅ Yes |
| `GET /api/designs/[id]` | ✅ Yes |
| `PATCH /api/designs/[id]` | ✅ Yes |
| `DELETE /api/designs/[id]` | ✅ Yes (admin/leader) |
| `POST /api/designs/[id]/assign` | ✅ Yes |
| `POST /api/designs/[id]/complete` | ✅ Yes |

---

## POST /api/designs

Create a new design request (public, no auth).

### Request

```typescript
interface CreateDesignRequestBody {
  title: string           // 5-200 chars
  description: string     // 20-2000 chars
  type: DesignRequestType // enum
  priority?: DesignPriority // default: "normal"
  requesterName: string   // 2-100 chars
  requesterEmail: string  // valid email
  requesterPhone?: string // max 20 chars
  requesterMinistry?: string // max 100 chars
  neededBy?: string       // ISO date (YYYY-MM-DD)
  referenceUrls?: string[] // max 5 valid URLs
  website?: string        // honeypot - must be empty
}
```

### Response

**201 Created**
```typescript
{
  id: string
  message: "Design request submitted successfully"
}
```

**400 Bad Request**
```typescript
{
  error: string // Validation error message
}
```

**429 Too Many Requests**
```typescript
{
  error: "Too many requests. Please try again later."
  retryAfter: number // seconds
}
```

### Rate Limiting

- 3 requests per hour per IP address
- Returns 429 if exceeded

---

## GET /api/designs

List all design requests (authenticated).

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (comma-separated for multiple) |
| priority | string | Filter by priority |
| assignedTo | string | Filter by assignee profile ID |
| search | string | Search in title and requester name |
| includeArchived | boolean | Include archived requests (default: false) |
| limit | number | Max results (default: 50, max: 100) |
| offset | number | Pagination offset (default: 0) |

### Response

**200 OK**
```typescript
{
  data: DesignRequestListItem[]
  total: number
  hasMore: boolean
}

interface DesignRequestListItem {
  id: string
  title: string
  type: DesignRequestType
  priority: DesignPriority
  status: DesignRequestStatus
  requesterName: string
  requesterEmail: string
  neededBy: string | null
  assignee: {
    id: string
    name: string
  } | null
  createdAt: string
  isArchived: boolean
}
```

**401 Unauthorized**
```typescript
{
  error: "Not authenticated"
}
```

---

## GET /api/designs/[id]

Get a single design request by ID (authenticated).

### Response

**200 OK**
```typescript
interface DesignRequestDetail {
  id: string
  title: string
  description: string
  type: DesignRequestType
  priority: DesignPriority
  status: DesignRequestStatus
  requesterName: string
  requesterEmail: string
  requesterPhone: string | null
  requesterMinistry: string | null
  neededBy: string | null
  referenceUrls: string[]
  deliverableUrl: string | null
  revisionNotes: string | null
  internalNotes: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
  completedAt: string | null
  assignee: {
    id: string
    name: string
    email: string
  } | null
  assignedAt: string | null
  assignedBy: {
    id: string
    name: string
  } | null
}
```

**404 Not Found**
```typescript
{
  error: "Design request not found"
}
```

---

## PATCH /api/designs/[id]

Update a design request (authenticated).

### Request

```typescript
interface UpdateDesignRequestBody {
  status?: DesignRequestStatus
  priority?: DesignPriority
  internalNotes?: string
  revisionNotes?: string  // Will be appended with timestamp
}
```

### Response

**200 OK**
```typescript
{
  success: true
}
```

**400 Bad Request**
```typescript
{
  error: string // e.g., "Cannot change status to completed without deliverable URL"
}
```

### Status Transition Rules

| From | Allowed To |
|------|------------|
| submitted | in_progress, cancelled |
| in_progress | review, cancelled |
| review | revision_requested, completed (requires deliverable), cancelled |
| revision_requested | in_progress, cancelled |
| completed | (terminal state) |
| cancelled | (terminal state) |

**Note**: Completion is only allowed from `review` status to ensure designs are reviewed before delivery.

---

## DELETE /api/designs/[id]

Delete a design request (admin/leader only).

### Response

**200 OK**
```typescript
{
  success: true
}
```

**403 Forbidden**
```typescript
{
  error: "Only admins and leaders can delete requests"
}
```

---

## POST /api/designs/[id]/assign

Claim or unclaim a design request (authenticated).

### Request

```typescript
interface AssignRequestBody {
  action: "claim" | "unclaim"
}
```

### Response

**200 OK**
```typescript
{
  success: true
  assignedTo: string | null // Profile ID or null if unclaimed
}
```

**400 Bad Request**
```typescript
{
  error: string // e.g., "Request is already claimed by another user"
}
```

### Business Rules

- **claim**: Only works if `assigned_to` is null
- **unclaim**: Only works if current user is the assignee
- **unclaim**: Resets status to "submitted" if currently "in_progress"

---

## POST /api/designs/[id]/complete

Mark a design request as completed with deliverable (authenticated).

### Request

```typescript
interface CompleteRequestBody {
  deliverableUrl: string // Valid URL (Google Drive expected)
}
```

### Response

**200 OK**
```typescript
{
  success: true
  completedAt: string // ISO timestamp
}
```

**400 Bad Request**
```typescript
{
  error: string // e.g., "Deliverable URL is required"
}
```

### Business Rules

- Only the assignee can complete
- Status must be "review" (designs must be reviewed before completion)
- `deliverableUrl` must be a valid URL
- Sets `status` to "completed" and `completed_at` to now

---

## Enums Reference

```typescript
type DesignRequestStatus = 
  | "submitted"
  | "in_progress"
  | "review"
  | "revision_requested"
  | "completed"
  | "cancelled"

type DesignRequestType =
  | "flyer"
  | "banner"
  | "social_graphic"
  | "video_thumbnail"
  | "presentation"
  | "other"

type DesignPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent"
```

---

## Error Response Format

All errors follow this format:

```typescript
{
  error: string       // Human-readable message
  code?: string       // Optional error code
  details?: unknown   // Optional additional details
}
```

---

## Webhook/Notification Triggers

| Event | Notification Type | Recipients |
|-------|-------------------|------------|
| Request created | `design_request_new` | All team members |
| Request claimed | `design_request_claimed` | Requester email |
| Status → review | `design_request_review` | Requester email |
| Status → revision_requested | `design_request_revision` | Assigned team member |
| Status → completed | `design_request_completed` | Requester email |
