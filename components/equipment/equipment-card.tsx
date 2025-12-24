"use client"

import Link from "next/link"
import { ArrowRight, MapPin, ScanQrCode, Tag, Sparkles } from "lucide-react"

import { EquipmentStatusBadge } from "@/components/equipment/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BorderBeam } from "@/components/ui/border-beam"
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

const STATUS_COLORS: Record<EquipmentStatus, { gradient: string; border: string; glow: string }> = {
  available: {
    gradient: "from-green-500/5 via-transparent to-transparent",
    border: "hover:border-green-500/30",
    glow: "group-hover:shadow-green-500/10",
  },
  in_use: {
    gradient: "from-blue-500/5 via-transparent to-transparent",
    border: "hover:border-blue-500/30",
    glow: "group-hover:shadow-blue-500/10",
  },
  maintenance: {
    gradient: "from-amber-500/5 via-transparent to-transparent",
    border: "hover:border-amber-500/30",
    glow: "group-hover:shadow-amber-500/10",
  },
  returned: {
    gradient: "from-purple-500/5 via-transparent to-transparent",
    border: "hover:border-purple-500/30",
    glow: "group-hover:shadow-purple-500/10",
  },
}

export function EquipmentCard({ item }: EquipmentCardProps) {
  const colors = STATUS_COLORS[item.status] || STATUS_COLORS.available
  const isAvailable = item.status === "available"

  return (
    <Card className={`relative flex h-full flex-col overflow-hidden group transition-all duration-300 ${colors.border} ${colors.glow} group-hover:shadow-lg`}>
      {/* Gradient overlay based on status */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
      
      {/* BorderBeam for available equipment */}
      {isAvailable && (
        <BorderBeam 
          size={100} 
          duration={15} 
          colorFrom="#22c55e" 
          colorTo="#10b981"
          delay={Math.random() * 5}
        />
      )}

      <CardHeader className="relative flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-violet-500 transition-colors">
            {item.name}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {item.category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
                <Tag className="h-3 w-3" />
                {item.category}
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {item.location}
              </span>
            )}
          </div>
        </div>
        <EquipmentStatusBadge status={item.status} />
      </CardHeader>
      <CardContent className="relative flex-1 space-y-3 text-sm text-muted-foreground">
        {item.serialNumber && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Serial:</span>
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
              {item.serialNumber}
            </code>
          </div>
        )}
        {item.qrCode && (
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-violet-500/10">
              <ScanQrCode className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <span className="flex items-center gap-1">
              QR ready
              <Sparkles className="h-3 w-3 text-violet-500" />
            </span>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="relative flex items-center justify-between">
        <Button variant="ghost" asChild className="group/btn">
          <Link href={`/equipment/${item.id}`} className="flex items-center gap-2">
            View details
            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </Button>
        {isAvailable && (
          <span className="text-xs text-green-500 font-medium flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Ready
          </span>
        )}
      </CardFooter>
    </Card>
  )
}
