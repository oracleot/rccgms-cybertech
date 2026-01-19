"use client"

import { useMemo, useState } from "react"
import { Save, Upload, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RundownEditorItem } from "./types"

interface TemplateItem {
  title: string
  type: string
  durationSeconds: number
  notes: string | null
  order: number
}

interface Template {
  name: string
  items: TemplateItem[]
}

interface TemplateSelectorProps {
  items: RundownEditorItem[]
  onApply: (items: TemplateItem[]) => void
}

const STORAGE_KEY = "rundown.templates"

function loadStoredTemplates(): Template[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Template[]
  } catch {
    return []
  }
}

export function TemplateSelector({ items, onApply }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>(() => loadStoredTemplates())
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [name, setName] = useState("")

  const sortedItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.order - b.order)
        .map((item, idx) => ({
          title: item.title,
          type: item.type,
          durationSeconds: item.durationSeconds,
          notes: item.notes,
          order: idx + 1,
        })),
    [items]
  )

  const saveTemplates = (next: Template[]) => {
    setTemplates(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const handleSave = () => {
    if (!name.trim()) return
    const existingIndex = templates.findIndex((t) => t.name === name.trim())
    const payload: Template = { name: name.trim(), items: sortedItems }

    if (existingIndex >= 0) {
      const next = [...templates]
      next[existingIndex] = payload
      saveTemplates(next)
    } else {
      saveTemplates([...templates, payload])
    }
    setName("")
  }

  const handleApply = () => {
    const template = selected ? templates.find((t) => t.name === selected) : undefined
    if (template) {
      onApply(template.items)
    }
  }

  const handleDelete = () => {
    if (!selected) return
    const next = templates.filter((t) => t.name !== selected)
    saveTemplates(next)
    setSelected(undefined)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Templates</Label>
          <p className="text-xs text-muted-foreground">Save and reuse common service flows.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleApply} disabled={!selected}>
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete} disabled={!selected}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger>
          <SelectValue placeholder="Choose template" />
        </SelectTrigger>
        <SelectContent>
          {templates.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No templates saved</div>
          ) : (
            templates.map((template) => (
              <SelectItem key={template.name} value={template.name}>
                {template.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button variant="secondary" onClick={handleSave} disabled={!name.trim()}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  )
}
