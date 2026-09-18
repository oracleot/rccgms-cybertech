"use client"

/** One editable cue — shared by the set editor and the DOCX import review screen. */

import { ChevronDown, ChevronUp, Combine, Plus, Scissors, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import type { LyricGroup } from "@/lib/lyrics/types"

export function GroupRow({
  group,
  index,
  total,
  disabled,
  onChange,
  onMove,
  onSplit,
  onMerge,
  onDelete,
  onAddAbove,
  onAddBelow,
}: {
  group: LyricGroup
  index: number
  total: number
  disabled: boolean
  onChange: (patch: Partial<LyricGroup>) => void
  onMove: (dir: -1 | 1) => void
  onSplit: () => void
  onMerge: () => void
  onDelete: () => void
  onAddAbove?: () => void
  onAddBelow?: () => void
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 py-3">
        <div className="w-6 flex-shrink-0 pt-2 text-center text-xs font-mono text-muted-foreground">{index + 1}</div>
        <div className="flex-1 space-y-2">
          <Textarea
            rows={2}
            value={group.primary}
            onChange={(e) => onChange({ primary: e.target.value })}
            className="font-medium"
            disabled={disabled}
          />
          {group.secondary != null ? (
            <div className="flex gap-1.5">
              <Textarea
                rows={1}
                value={group.secondary}
                placeholder="Secondary line — translation, response, sub-point…"
                onChange={(e) => onChange({ secondary: e.target.value })}
                className="flex-1 text-sm text-muted-foreground"
                disabled={disabled}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ secondary: undefined })}
                disabled={disabled}
                title="Remove secondary line"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange({ secondary: "" })} disabled={disabled}>
              + Add secondary line
            </Button>
          )}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Repeat
            <input
              type="number"
              min={1}
              max={20}
              placeholder="1"
              value={group.repeat ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value)
                onChange({ repeat: e.target.value && n > 1 ? n : undefined })
              }}
              disabled={disabled}
              className="h-6 w-14 rounded border bg-transparent px-1.5 text-xs"
            />
            <span>× — shown as a small badge, never duplicated cues</span>
          </label>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-0.5">
          {onAddAbove && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddAbove} disabled={disabled} title="Add cue above">
              <Plus className="h-3 w-3" />
              <ChevronUp className="h-3 w-3 -ml-1" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(-1)} disabled={disabled || index === 0} title="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(1)} disabled={disabled || index === total - 1} title="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSplit} disabled={disabled} title="Split into two">
            <Scissors className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMerge} disabled={disabled || index === total - 1} title="Merge with next">
            <Combine className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={disabled} title="Delete cue">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          {onAddBelow && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddBelow} disabled={disabled} title="Add cue below">
              <Plus className="h-3 w-3" />
              <ChevronDown className="h-3 w-3 -ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
