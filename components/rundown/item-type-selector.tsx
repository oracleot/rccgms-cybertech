"use client"

import { Music, BookOpen, Video, Mic2, ScrollText, HandCoins, Repeat2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { RundownItemType } from "@/types/rundown"

const ITEM_TYPES: Array<{ value: RundownItemType; label: string; icon: React.ReactNode }> = [
  { value: "song", label: "Song", icon: <Music className="h-4 w-4" /> },
  { value: "sermon", label: "Sermon", icon: <BookOpen className="h-4 w-4" /> },
  { value: "announcement", label: "Announcement", icon: <ScrollText className="h-4 w-4" /> },
  { value: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { value: "prayer", label: "Prayer", icon: <Mic2 className="h-4 w-4" /> },
  { value: "transition", label: "Transition", icon: <Repeat2 className="h-4 w-4" /> },
  { value: "offering", label: "Offering", icon: <HandCoins className="h-4 w-4" /> },
]

interface ItemTypeSelectorProps {
  value: RundownItemType
  onChange: (value: RundownItemType) => void
}

export function ItemTypeSelector({ value, onChange }: ItemTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ITEM_TYPES.map((type) => (
        <Button
          key={type.value}
          type="button"
          variant={value === type.value ? "default" : "outline"}
          className="justify-start gap-2"
          onClick={() => onChange(type.value)}
        >
          {type.icon}
          <span>{type.label}</span>
        </Button>
      ))}
    </div>
  )
}
