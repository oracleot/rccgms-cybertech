"use client"

import { GripVertical, Pencil, Trash2, Timer, Music2, Video, MessageSquare } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn, formatDuration } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { RundownItemType } from "@/types/rundown"
import type { RundownEditorItem } from "./types"

const TYPE_ICONS: Record<RundownItemType, React.ReactNode> = {
  song: <Music2 className="h-4 w-4" />,
  sermon: <MessageSquare className="h-4 w-4" />,
  announcement: <MessageSquare className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  prayer: <Timer className="h-4 w-4" />,
  transition: <Timer className="h-4 w-4" />,
  offering: <Timer className="h-4 w-4" />,
}

interface SortableItemProps {
  item: RundownEditorItem
  onEdit: (item: RundownEditorItem) => void
  onDelete: (id: string) => void
  isDraggable?: boolean
  canEdit?: boolean
}

export function SortableItem({ item, onEdit, onDelete, isDraggable = true, canEdit = true }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 flex items-start gap-3 border",
        isDragging && "ring-2 ring-primary/40 shadow-lg"
      )}
    >
      <button
        className={cn("mt-1 text-muted-foreground", !isDraggable && "cursor-default opacity-40")}
        {...(isDraggable ? { ...attributes, ...listeners } : {})}
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {TYPE_ICONS[item.type]}
            <span className="capitalize">{item.type}</span>
          </Badge>
          <span className="font-medium">{item.title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4" />
            <span>{formatDuration(item.durationSeconds)}</span>
          </div>
          {item.assignedTo && (
            <span>Assigned to {item.assignedTo.name}</span>
          )}
        </div>
        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        {canEdit && (
          <>
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
