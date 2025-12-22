import { EquipmentList } from "@/components/equipment/equipment-list"
import { OverdueWidget } from "@/components/equipment/overdue-widget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { EquipmentStatus } from "@/lib/constants"
import type { OverdueCheckout } from "@/types/equipment"

export const metadata = {
  title: "Equipment | Cyber Tech",
  description: "Track and manage tech equipment",
}

export default async function EquipmentPage() {
  const supabase = await createClient()

  const { data: equipmentData } = await supabase
    .from("equipment")
    .select("id, name, status, location, serial_number, equipment_categories(name)")
    .order("name", { ascending: true })

  const items = (equipmentData || []).map((item) => {
    const typed = item as unknown as {
      id: string
      name: string
      status: EquipmentStatus
      location: string | null
      serial_number: string | null
      equipment_categories: { name: string | null } | null
    }

    return {
      id: typed.id,
      name: typed.name,
      status: typed.status,
      location: typed.location,
      serialNumber: typed.serial_number,
      category: typed.equipment_categories?.name ?? null,
    }
  })

  const nowIso = new Date().toISOString()
  const { data: overdueData } = await supabase
    .from("equipment_checkouts")
    .select("id, expected_return, equipment:equipment(id, name), checked_out_by:profiles(id, name)")
    .is("returned_at", null)
    .lt("expected_return", nowIso)

  const overdue: OverdueCheckout[] = (overdueData || []).map((row) => {
    const typed = row as unknown as {
      id: string
      expected_return: string
      equipment: { id: string; name: string }
      checked_out_by: { id: string; name: string }
    }

    const daysOverdue = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(typed.expected_return).getTime()) / (1000 * 60 * 60 * 24)
      )
    )

    return {
      id: typed.id,
      equipmentId: typed.equipment.id,
      equipmentName: typed.equipment.name,
      checkedOutBy: typed.checked_out_by,
      expectedReturn: typed.expected_return,
      daysOverdue,
    }
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Browse, filter, and manage tech equipment across departments.
            </p>
          </CardContent>
        </Card>
        <OverdueWidget items={overdue} />
      </div>

      <EquipmentList items={items} />
    </div>
  )
}
