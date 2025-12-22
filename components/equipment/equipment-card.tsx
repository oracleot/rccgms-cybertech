import Link from "next/link"
import { ArrowRight, MapPin, ScanQrCode, Tag } from "lucide-react"

import { EquipmentStatusBadge } from "@/components/equipment/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { type EquipmentStatus } from "@/lib/constants"

export interface EquipmentCardItem {
  id: string
  name: string
  status: EquipmentStatus
  category?: string | null
  location?: string | null
  serialNumber?: string | null
  qrCode?: string | null
}

interface EquipmentCardProps {
  item: EquipmentCardItem
}

export function EquipmentCard({ item }: EquipmentCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold leading-tight">{item.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {item.category && (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {item.category}
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {item.location}
              </span>
            )}
          </div>
        </div>
        <EquipmentStatusBadge status={item.status} />
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
        {item.serialNumber && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Serial:</span>
            <span>{item.serialNumber}</span>
          </div>
        )}
        {item.qrCode && (
          <div className="flex items-center gap-2">
            <ScanQrCode className="h-4 w-4" />
            <span>QR ready</span>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/equipment/${item.id}`} className="flex items-center gap-2">
            View details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
