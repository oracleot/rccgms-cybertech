"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { EquipmentCard, type EquipmentCardItem } from "@/components/equipment/equipment-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EQUIPMENT_STATUS, EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from "@/lib/constants"

interface EquipmentListProps {
  items: EquipmentCardItem[]
}

export function EquipmentList({ items }: EquipmentListProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<EquipmentStatus | "all">("all")

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = status === "all" ? true : item.status === status
      const matchesSearch = search
        ? item.name.toLowerCase().includes(search.toLowerCase()) ||
          (item.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
        : true
      return matchesStatus && matchesSearch
    })
  }, [items, search, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="space-y-1">
            <Label htmlFor="equipment-search">Search</Label>
            <Input
              id="equipment-search"
              placeholder="Search by name or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72"
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as EquipmentStatus | "all")}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.values(EQUIPMENT_STATUS).map((value) => (
                  <SelectItem key={value} value={value}>
                    {EQUIPMENT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button asChild>
          <Link href="/equipment/new">
            <Plus className="mr-2 h-4 w-4" />
            Add equipment
          </Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No equipment found"
          description="Try adjusting your filters or add a new item."
          action={{
            label: "Add equipment",
            onClick: () => router.push("/equipment/new"),
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <EquipmentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
