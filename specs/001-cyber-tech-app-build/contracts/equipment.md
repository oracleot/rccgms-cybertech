# API Contracts: Equipment Inventory

**Module**: Equipment  
**Base Path**: Supabase queries + `/api/equipment/*`  
**Date**: 2025-12-21

## Overview

Equipment management uses Supabase for CRUD operations with custom API routes for QR code generation.

---

## Supabase Queries

### List Equipment

```typescript
const { data: equipment } = await supabase
  .from('equipment')
  .select(`
    *,
    category:equipment_categories(id, name, icon),
    current_checkout:equipment_checkouts(
      id,
      checked_out_by:profiles(id, name, avatar_url),
      checked_out_at,
      expected_return
    )
  `)
  .eq('current_checkout.returned_at', null) // Only active checkout
  .order('name', { ascending: true })
```

### Get Equipment by ID

```typescript
const { data: equipment } = await supabase
  .from('equipment')
  .select(`
    *,
    category:equipment_categories(*),
    checkouts:equipment_checkouts(
      *,
      checked_out_by:profiles(id, name)
    ),
    maintenance:equipment_maintenance(
      *,
      performed_by:profiles(id, name)
    )
  `)
  .eq('id', equipmentId)
  .order('checkouts(checked_out_at)', { ascending: false })
  .order('maintenance(performed_at)', { ascending: false })
  .single()
```

### Create Equipment

```typescript
const { data: equipment, error } = await supabase
  .from('equipment')
  .insert({
    name: 'Sony PTZ Camera',
    category_id: categoryId,
    serial_number: 'SN123456',
    model: 'SRG-X400',
    manufacturer: 'Sony',
    status: 'available',
    location: 'Tech Closet A'
  })
  .select()
  .single()
```

### Update Equipment

```typescript
const { error } = await supabase
  .from('equipment')
  .update({
    name: 'Sony PTZ Camera (Main)',
    location: 'Sanctuary - Back',
    status: 'maintenance'
  })
  .eq('id', equipmentId)
```

### Delete Equipment (Soft Delete)

```typescript
// Prefer status change to actual delete
const { error } = await supabase
  .from('equipment')
  .update({ status: 'retired' })
  .eq('id', equipmentId)
```

---

## Checkout Flow

### Checkout Equipment

```typescript
const { data: checkout, error } = await supabase
  .from('equipment_checkouts')
  .insert({
    equipment_id: equipmentId,
    checked_out_by: userId,
    expected_return: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
    notes: 'For Sunday service'
  })
  .select()
  .single()

// Equipment status auto-updates via trigger
```

### Return Equipment

```typescript
const { error } = await supabase
  .from('equipment_checkouts')
  .update({
    returned_at: new Date().toISOString(),
    condition_on_return: 'good' // or 'damaged', 'needs_repair'
  })
  .eq('id', checkoutId)
  .is('returned_at', null) // Safety check

// Equipment status auto-updates via trigger
```

### Get My Checkouts

```typescript
const { data: myCheckouts } = await supabase
  .from('equipment_checkouts')
  .select(`
    *,
    equipment:equipment(id, name, category:equipment_categories(name))
  `)
  .eq('checked_out_by', userId)
  .is('returned_at', null)
  .order('expected_return', { ascending: true })
```

### Get Overdue Items (Dashboard)

```typescript
const { data: overdue } = await supabase
  .from('equipment_checkouts')
  .select(`
    *,
    equipment:equipment(id, name),
    checked_out_by:profiles(id, name, email, phone)
  `)
  .is('returned_at', null)
  .lt('expected_return', new Date().toISOString())
  .order('expected_return', { ascending: true })
```

---

## Maintenance

### Log Maintenance

```typescript
const { data: maintenance, error } = await supabase
  .from('equipment_maintenance')
  .insert({
    equipment_id: equipmentId,
    type: 'repair',
    description: 'Replaced HDMI port',
    performed_by: userId,
    cost: 150.00,
    vendor: 'Local Electronics',
    next_due: '2026-06-15'
  })
  .select()
  .single()
```

### Get Upcoming Maintenance

```typescript
const { data: upcoming } = await supabase
  .from('equipment_maintenance')
  .select(`
    *,
    equipment:equipment(id, name, category:equipment_categories(name))
  `)
  .gte('next_due', new Date().toISOString())
  .lte('next_due', nextMonth.toISOString())
  .order('next_due', { ascending: true })
```

---

## Issue Reporting

### Report Issue

```typescript
// Create maintenance record with type 'inspection' for issues
const { error } = await supabase
  .from('equipment_maintenance')
  .insert({
    equipment_id: equipmentId,
    type: 'inspection',
    description: 'HDMI output not working - needs repair',
    performed_by: userId,
  })

// Update equipment status if severe
if (severity === 'critical') {
  await supabase
    .from('equipment')
    .update({ status: 'maintenance' })
    .eq('id', equipmentId)
}
```

---

## Custom API Routes

### POST /api/equipment/qr/:id

Generate QR code for equipment.

**Authorization**: Leader or Admin role required

**Response 200**:
```typescript
{
  success: true,
  qrCode: string,  // Data URL (data:image/png;base64,...)
  equipmentUrl: string  // Full URL to equipment page
}
```

### GET /api/equipment/qr/:id/print

Generate printable QR label.

**Authorization**: Leader or Admin role required

**Response**: `text/html` - Printable page with QR code and equipment info

---

### GET /api/equipment/categories

Get all equipment categories.

**Authorization**: Authenticated

**Response 200**:
```typescript
{
  categories: Array<{
    id: string,
    name: string,
    icon: string | null,
    parentId: string | null,
    equipmentCount: number
  }>
}
```

---

### POST /api/equipment/bulk-import

Import equipment from CSV.

**Authorization**: Admin only

**Request**: `multipart/form-data`
```
file: CSV file with columns: name, category, serial_number, model, manufacturer, location
```

**Response 200**:
```typescript
{
  success: true,
  imported: number,
  failed: Array<{
    row: number,
    error: string
  }>
}
```

---

## Validation Schemas

```typescript
// lib/validations/equipment.ts
import { z } from 'zod'

export const createEquipmentSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
  serialNumber: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  purchaseDate: z.string().date().optional(),
  purchasePrice: z.number().positive().optional(),
  warrantyExpires: z.string().date().optional(),
  location: z.string().max(200).optional(),
})

export const checkoutEquipmentSchema = z.object({
  equipmentId: z.string().uuid(),
  expectedReturn: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

export const returnEquipmentSchema = z.object({
  checkoutId: z.string().uuid(),
  conditionOnReturn: z.enum(['good', 'fair', 'damaged', 'needs_repair']),
  notes: z.string().max(500).optional(),
})

export const logMaintenanceSchema = z.object({
  equipmentId: z.string().uuid(),
  type: z.enum(['repair', 'cleaning', 'calibration', 'inspection']),
  description: z.string().min(1).max(1000),
  cost: z.number().nonnegative().optional(),
  vendor: z.string().max(200).optional(),
  nextDue: z.string().date().optional(),
})

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>
export type CheckoutEquipmentInput = z.infer<typeof checkoutEquipmentSchema>
export type ReturnEquipmentInput = z.infer<typeof returnEquipmentSchema>
export type LogMaintenanceInput = z.infer<typeof logMaintenanceSchema>
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| equipment | All authenticated | admin/leader | admin/leader | admin only |
| equipment_categories | All authenticated | admin only | admin only | admin only |
| equipment_checkouts | All authenticated | Authenticated | Own checkout or admin/leader | admin only |
| equipment_maintenance | All authenticated | admin/leader | admin/leader | admin only |

---

## TypeScript Types

```typescript
// types/equipment.ts
export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'retired'

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  serialNumber: string | null
  model: string | null
  manufacturer: string | null
  purchaseDate: string | null
  purchasePrice: number | null
  warrantyExpires: string | null
  location: string | null
  status: EquipmentStatus
  qrCode: string | null
  currentCheckout: EquipmentCheckout | null
  createdAt: string
}

export interface EquipmentCategory {
  id: string
  name: string
  icon: string | null
  parentId: string | null
}

export interface EquipmentCheckout {
  id: string
  equipmentId: string
  checkedOutBy: Profile
  checkedOutAt: string
  expectedReturn: string
  returnedAt: string | null
  conditionOnReturn: string | null
  notes: string | null
}

export interface EquipmentMaintenance {
  id: string
  equipmentId: string
  type: 'repair' | 'cleaning' | 'calibration' | 'inspection'
  description: string
  performedBy: Profile | null
  performedAt: string
  nextDue: string | null
  cost: number | null
  vendor: string | null
}
```
