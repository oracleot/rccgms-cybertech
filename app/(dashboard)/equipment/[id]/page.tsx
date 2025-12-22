import { notFound } from "next/navigation"

import { EquipmentDetail } from "@/components/equipment/equipment-detail"
import { createClient } from "@/lib/supabase/server"
import type { EquipmentStatus, MaintenanceType } from "@/lib/constants"
import type { CheckoutEntry } from "@/components/equipment/checkout-history"
import type { MaintenanceEntry } from "@/components/equipment/maintenance-history"

interface EquipmentPageProps {
  params: Promise<{ id: string }>
}

export default async function EquipmentDetailPage({ params }: EquipmentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: equipmentData } = await supabase
    .from("equipment")
    .select(
      "id, name, status, location, serial_number, model, manufacturer, purchase_date, purchase_price, warranty_expires, is_borrowed, equipment_categories(name)"
    )
    .eq("id", id)
    .single()

  if (!equipmentData) {
    notFound()
  }

  const equipment = equipmentData as unknown as {
    id: string
    name: string
    status: EquipmentStatus
    location: string | null
    serial_number: string | null
    model: string | null
    manufacturer: string | null
    purchase_date: string | null
    purchase_price: number | null
    warranty_expires: string | null
    is_borrowed: boolean | null
    equipment_categories: { name: string | null } | null
  }

  const { data: checkoutData } = await supabase
    .from("equipment_checkouts")
    .select(
      "id, checked_out_at, expected_return, returned_at, condition_on_return, notes, checked_out_by:profiles(id, name)"
    )
    .eq("equipment_id", id)
    .order("checked_out_at", { ascending: false })
    .limit(20)

  const checkouts: CheckoutEntry[] = (checkoutData || []).map((row) => {
    const typed = row as unknown as {
      id: string
      checked_out_at: string
      expected_return: string
      returned_at: string | null
      condition_on_return: string | null
      notes: string | null
      checked_out_by: { id: string; name: string }
    }

    return {
      id: typed.id,
      checkedOutAt: typed.checked_out_at,
      expectedReturn: typed.expected_return,
      returnedAt: typed.returned_at,
      conditionOnReturn: typed.condition_on_return,
      notes: typed.notes,
      checkedOutBy: typed.checked_out_by,
    }
  })

  const { data: maintenanceData } = await supabase
    .from("equipment_maintenance")
    .select("id, type, description, performed_at, next_due, cost, vendor, performed_by:profiles(id, name)")
    .eq("equipment_id", id)
    .order("performed_at", { ascending: false })
    .limit(20)

  const maintenance: MaintenanceEntry[] = (maintenanceData || []).map((row) => {
    const typed = row as unknown as {
      id: string
      type: MaintenanceType
      description: string
      performed_at: string
      next_due: string | null
      cost: number | null
      vendor: string | null
      performed_by: { id: string; name: string } | null
    }

    return {
      id: typed.id,
      type: typed.type,
      description: typed.description,
      performedAt: typed.performed_at,
      nextDue: typed.next_due,
      cost: typed.cost,
      vendor: typed.vendor,
      performedBy: typed.performed_by,
    }
  })

  return (
    <EquipmentDetail
      equipment={{
        id: equipment.id,
        name: equipment.name,
        status: equipment.status,
        category: equipment.equipment_categories?.name ?? null,
        location: equipment.location,
        serialNumber: equipment.serial_number,
        model: equipment.model,
        manufacturer: equipment.manufacturer,
        purchaseDate: equipment.purchase_date,
        purchasePrice: equipment.purchase_price,
        warrantyExpires: equipment.warranty_expires,
        isBorrowed: equipment.is_borrowed ?? false,
      }}
      checkouts={checkouts}
      maintenance={maintenance}
    />
  )
}
