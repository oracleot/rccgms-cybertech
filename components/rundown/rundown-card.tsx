"use client"

import Link from "next/link"
import { Calendar, Clock, ListOrdered } from "lucide-react"

import { formatDate, formatDuration } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RundownStatus } from "@/types/rundown"

interface RundownCardProps {
  id: string
  title: string
  date: string
  status: RundownStatus
  serviceName?: string | null
  itemCount: number
  totalDuration: number
  createdBy?: string | null
}

function RundownStatusBadge({ status }: { status: RundownStatus }) {
  const variant =
    status === "published"
      ? "default"
      : status === "draft"
        ? "secondary"
        : "outline"

  return <Badge variant={variant}>{status}</Badge>
}

export function RundownCard({
  id,
  title,
  date,
  status,
  serviceName,
  itemCount,
  totalDuration,
  createdBy,
}: RundownCardProps) {
  return (
    <Link href={`/rundown/${id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(date, "EEEE, MMM d")}</span>
              {serviceName && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ListOrdered className="h-3 w-3" />
                  {serviceName}
                </span>
              )}
            </CardDescription>
          </div>
          <RundownStatusBadge status={status} />
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            <span>{itemCount} items</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(totalDuration)}</span>
          </div>
          {createdBy && <span>Created by {createdBy}</span>}
        </CardContent>
      </Card>
    </Link>
  )
}
