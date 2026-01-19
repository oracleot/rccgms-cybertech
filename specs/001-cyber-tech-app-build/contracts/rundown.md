# API Contracts: Rundown Builder

**Module**: Rundown  
**Base Path**: Supabase queries + `/api/rundowns/*`  
**Date**: 2025-12-21

## Overview

The Rundown Builder provides service planning with drag-and-drop reordering, real-time collaboration, and live service tracking.

---

## Supabase Queries

### List Rundowns

```typescript
const { data: rundowns } = await supabase
  .from('rundowns')
  .select(`
    id,
    title,
    service_date,
    service_type,
    status,
    items:rundown_items(count),
    created_by:profiles(id, name)
  `)
  .order('service_date', { ascending: false })
  .limit(20)
```

### Get Rundown by ID

```typescript
const { data: rundown } = await supabase
  .from('rundowns')
  .select(`
    *,
    items:rundown_items(
      *,
      assigned_to:profiles(id, name, avatar_url)
    ),
    created_by:profiles(id, name)
  `)
  .eq('id', rundownId)
  .order('items(sort_order)', { ascending: true })
  .single()
```

### Get Rundown by Date

```typescript
const { data: rundown } = await supabase
  .from('rundowns')
  .select(`
    *,
    items:rundown_items(
      *,
      assigned_to:profiles(id, name, avatar_url)
    )
  `)
  .eq('service_date', dateString)
  .order('items(sort_order)', { ascending: true })
  .maybeSingle()
```

### Create Rundown

```typescript
const { data: rundown, error } = await supabase
  .from('rundowns')
  .insert({
    title: 'Sunday Service - Dec 22',
    service_date: '2024-12-22',
    service_type: 'sunday_service',
    status: 'draft',
    created_by: userId
  })
  .select()
  .single()
```

### Update Rundown

```typescript
const { error } = await supabase
  .from('rundowns')
  .update({
    title: 'Sunday Service - Christmas Eve',
    status: 'final'
  })
  .eq('id', rundownId)
```

### Delete Rundown

```typescript
// Only delete draft rundowns
const { error } = await supabase
  .from('rundowns')
  .delete()
  .eq('id', rundownId)
  .eq('status', 'draft')
```

---

## Rundown Items

### Add Item

```typescript
// Get max sort_order first
const { data: lastItem } = await supabase
  .from('rundown_items')
  .select('sort_order')
  .eq('rundown_id', rundownId)
  .order('sort_order', { ascending: false })
  .limit(1)
  .single()

const nextOrder = (lastItem?.sort_order ?? 0) + 1

const { data: item, error } = await supabase
  .from('rundown_items')
  .insert({
    rundown_id: rundownId,
    title: 'Worship Set',
    description: '3 songs with full band',
    start_time: '09:30:00',
    duration: 20,
    item_type: 'worship',
    sort_order: nextOrder,
    assigned_to: worshipLeaderId
  })
  .select()
  .single()
```

### Update Item

```typescript
const { error } = await supabase
  .from('rundown_items')
  .update({
    title: 'Extended Worship',
    duration: 25,
    notes: 'Include hymn medley'
  })
  .eq('id', itemId)
```

### Delete Item

```typescript
const { error } = await supabase
  .from('rundown_items')
  .delete()
  .eq('id', itemId)
```

### Reorder Items (Drag & Drop)

```typescript
// Batch update sort_order after drag
async function reorderItems(rundownId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, index) => ({
    id,
    sort_order: index + 1
  }))

  // Use upsert for batch update
  const { error } = await supabase
    .from('rundown_items')
    .upsert(
      updates.map(u => ({
        id: u.id,
        rundown_id: rundownId,
        sort_order: u.sort_order
      })),
      { onConflict: 'id', ignoreDuplicates: false }
    )

  return { error }
}
```

### Bulk Insert Items (From Template)

```typescript
async function createFromTemplate(
  rundownId: string,
  templateItems: Array<Omit<RundownItem, 'id' | 'rundown_id'>>
) {
  const { error } = await supabase
    .from('rundown_items')
    .insert(
      templateItems.map((item, index) => ({
        ...item,
        rundown_id: rundownId,
        sort_order: index + 1
      }))
    )

  return { error }
}
```

---

## Custom API Routes

### POST /api/rundowns/:id/duplicate

Duplicate an existing rundown.

**Authorization**: Leader or Admin required

**Request**:
```typescript
{
  newDate: string,  // ISO date for new service
  newTitle?: string
}
```

**Response 200**:
```typescript
{
  success: true,
  rundown: Rundown
}
```

---

### POST /api/rundowns/:id/export

Export rundown to printable format.

**Authorization**: Authenticated

**Request**:
```typescript
{
  format: 'pdf' | 'docx' | 'html'
}
```

**Response**: Binary file or HTML content

---

### POST /api/rundowns/:id/share

Generate shareable link for rundown.

**Authorization**: Leader or Admin required

**Response 200**:
```typescript
{
  shareUrl: string,  // Public URL
  expiresAt: string  // 24 hours by default
}
```

---

## Real-time Collaboration

### Subscribe to Rundown Changes

```typescript
// In rundown editor component
useEffect(() => {
  const channel = supabase
    .channel(`rundown:${rundownId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rundown_items',
        filter: `rundown_id=eq.${rundownId}`
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          // Add new item to local state
        } else if (payload.eventType === 'UPDATE') {
          // Update existing item
        } else if (payload.eventType === 'DELETE') {
          // Remove item from local state
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [rundownId])
```

---

## Live Service Mode

### Start Live Mode

```typescript
const { error } = await supabase
  .from('rundowns')
  .update({
    status: 'live',
    live_started_at: new Date().toISOString()
  })
  .eq('id', rundownId)
```

### Update Current Item

```typescript
const { error } = await supabase
  .from('rundowns')
  .update({
    current_item_id: itemId
  })
  .eq('id', rundownId)
```

### Track Item Timing

```typescript
// Mark item as started
const { error } = await supabase
  .from('rundown_items')
  .update({
    actual_start_time: new Date().toISOString()
  })
  .eq('id', itemId)

// Mark item as completed
const { error: completeError } = await supabase
  .from('rundown_items')
  .update({
    actual_end_time: new Date().toISOString()
  })
  .eq('id', itemId)
```

### End Live Mode

```typescript
const { error } = await supabase
  .from('rundowns')
  .update({
    status: 'completed',
    live_ended_at: new Date().toISOString(),
    current_item_id: null
  })
  .eq('id', rundownId)
```

---

## Validation Schemas

```typescript
// lib/validations/rundown.ts
import { z } from 'zod'

export const serviceTypeEnum = z.enum([
  'sunday_service',
  'wednesday_service',
  'special_event',
  'conference',
  'rehearsal',
  'other'
])

export const rundownStatusEnum = z.enum([
  'draft',
  'final',
  'live',
  'completed'
])

export const itemTypeEnum = z.enum([
  'worship',
  'sermon',
  'prayer',
  'announcement',
  'offering',
  'scripture',
  'special',
  'transition',
  'video',
  'other'
])

export const createRundownSchema = z.object({
  title: z.string().min(1).max(200),
  serviceDate: z.string().date(),
  serviceType: serviceTypeEnum,
  notes: z.string().max(2000).optional(),
})

export const updateRundownSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  serviceDate: z.string().date().optional(),
  serviceType: serviceTypeEnum.optional(),
  status: rundownStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
})

export const createItemSchema = z.object({
  rundownId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), // HH:mm or HH:mm:ss
  duration: z.number().int().min(1).max(480), // max 8 hours
  itemType: itemTypeEnum,
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
})

export const reorderItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
})

export const duplicateRundownSchema = z.object({
  newDate: z.string().date(),
  newTitle: z.string().min(1).max(200).optional(),
})

export type CreateRundownInput = z.infer<typeof createRundownSchema>
export type UpdateRundownInput = z.infer<typeof updateRundownSchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>
export type DuplicateRundownInput = z.infer<typeof duplicateRundownSchema>
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| rundowns | All authenticated | leader/admin | leader/admin | admin only (draft only) |
| rundown_items | All authenticated | leader/admin | leader/admin | leader/admin |

---

## TypeScript Types

```typescript
// types/rundown.ts
export type ServiceType = 
  | 'sunday_service'
  | 'wednesday_service'
  | 'special_event'
  | 'conference'
  | 'rehearsal'
  | 'other'

export type RundownStatus = 'draft' | 'final' | 'live' | 'completed'

export type ItemType =
  | 'worship'
  | 'sermon'
  | 'prayer'
  | 'announcement'
  | 'offering'
  | 'scripture'
  | 'special'
  | 'transition'
  | 'video'
  | 'other'

export interface Rundown {
  id: string
  title: string
  serviceDate: string
  serviceType: ServiceType
  status: RundownStatus
  notes: string | null
  currentItemId: string | null
  liveStartedAt: string | null
  liveEndedAt: string | null
  items: RundownItem[]
  createdBy: Profile
  createdAt: string
  updatedAt: string
}

export interface RundownItem {
  id: string
  rundownId: string
  title: string
  description: string | null
  startTime: string | null
  duration: number
  itemType: ItemType
  sortOrder: number
  assignedTo: Profile | null
  notes: string | null
  actualStartTime: string | null
  actualEndTime: string | null
}

// For live view
export interface LiveRundownState {
  rundown: Rundown
  currentItem: RundownItem | null
  nextItem: RundownItem | null
  elapsedTime: number // seconds since item started
  totalElapsed: number // seconds since service started
  isOvertime: boolean
}
```

---

## @dnd-kit Integration Example

```typescript
// components/rundown-editor.tsx
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

function RundownEditor({ rundown }: { rundown: Rundown }) {
  const [items, setItems] = useState(rundown.items)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)

      // Persist to database
      await reorderItems(rundown.id, newItems.map((i) => i.id))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableRundownItem key={item.id} item={item} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```
