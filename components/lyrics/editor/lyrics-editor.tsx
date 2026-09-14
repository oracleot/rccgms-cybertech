"use client"

/**
 * /lyrics — the full Lyrics & Prayer Points management page. Paste a whole
 * song or a numbered list of prayer points, get ordered display groups back,
 * then edit, split, merge, reorder or delete them. This page never talks to
 * the realtime channel directly — it only edits what's in lib/lyrics/store,
 * and the dock (/lyrics/obs/dock) picks up changes via the storage event.
 */

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Combine, ExternalLink, Music2, Plus, Scissors, Trash2, Tv2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loadSets, removeSet, upsertSet, SETS_KEY } from "@/lib/lyrics/store"
import { mergeGroups, splitContent, splitGroup } from "@/lib/lyrics/parse"
import { newGroupId, newSetId, type ContentType, type LyricGroup, type LyricSet } from "@/lib/lyrics/types"
import { cn } from "@/lib/utils"

function NewSetForm({ onCreate }: { onCreate: (set: LyricSet) => void }) {
  const [title, setTitle] = useState("")
  const [type, setType] = useState<ContentType>("lyrics")
  const [raw, setRaw] = useState("")
  const [pairTranslation, setPairTranslation] = useState(false)

  const groups = splitContent(raw, type, { pairTranslation })

  const create = () => {
    if (!groups.length) return
    onCreate({
      id: newSetId(),
      type,
      title: title.trim() || (type === "prayer" ? "Untitled prayer set" : "Untitled song"),
      groups,
      updatedAt: Date.now(),
    })
    setTitle("")
    setRaw("")
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <Input placeholder="Song or set title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Tabs value={type} onValueChange={(v) => setType(v as ContentType)}>
            <TabsList>
              <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
              <TabsTrigger value="prayer">Prayer Points</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {type === "lyrics" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={pairTranslation} onChange={(e) => setPairTranslation(e.target.checked)} />
            Every other line is a translation of the line above (e.g. Yoruba, then English)
          </label>
        )}

        <Textarea
          rows={10}
          placeholder={
            type === "prayer"
              ? "Paste a numbered or bulleted list of prayer points — each becomes one item.\n\n1. Thanksgiving for the new week\n2. Prayer for the sick\n3. ..."
              : "Paste the whole song. A blank line starts a new slide; short consecutive lines are kept together.\n\nSO GI BU ONYE INYE AKA M\nYOU ALONE ARE MY HELPER\n\nSO GI BU ONYE MMEME IHE\n..."
          }
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {groups.length ? `${groups.length} item${groups.length === 1 ? "" : "s"} will be created` : "Paste content above"}
          </p>
          <Button onClick={create} disabled={!groups.length}>
            <Plus className="mr-1.5 h-4 w-4" />
            Split into items
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function GroupRow({
  group,
  index,
  total,
  onChange,
  onMove,
  onSplit,
  onMerge,
  onDelete,
}: {
  group: LyricGroup
  index: number
  total: number
  onChange: (patch: Partial<LyricGroup>) => void
  onMove: (dir: -1 | 1) => void
  onSplit: () => void
  onMerge: () => void
  onDelete: () => void
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
          />
          {group.secondary != null ? (
            <Textarea
              rows={1}
              value={group.secondary}
              placeholder="Secondary line — translation, response, sub-point…"
              onChange={(e) => onChange({ secondary: e.target.value })}
              className="text-sm text-muted-foreground"
            />
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange({ secondary: "" })}>
              + Add secondary line
            </Button>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(-1)} disabled={index === 0} title="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSplit} title="Split into two">
            <Scissors className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMerge} disabled={index === total - 1} title="Merge with next">
            <Combine className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} title="Delete item">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SetEditor({
  set,
  onUpdate,
  onDelete,
}: {
  set: LyricSet
  onUpdate: (mutate: (s: LyricSet) => LyricSet) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(set.title)
  const [appendOpen, setAppendOpen] = useState(false)
  const [appendRaw, setAppendRaw] = useState("")
  const [appendPair, setAppendPair] = useState(false)

  const commitTitle = () => {
    const t = title.trim()
    if (t && t !== set.title) onUpdate((s) => ({ ...s, title: t }))
    else setTitle(set.title)
  }

  const updateGroup = (id: string, patch: Partial<LyricGroup>) =>
    onUpdate((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))

  const moveGroup = (id: string, dir: -1 | 1) =>
    onUpdate((s) => {
      const i = s.groups.findIndex((g) => g.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.groups.length) return s
      const groups = [...s.groups]
      const tmp = groups[i]
      groups[i] = groups[j]
      groups[j] = tmp
      return { ...s, groups }
    })

  const deleteGroup = (id: string) => onUpdate((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) }))

  const addGroup = () => onUpdate((s) => ({ ...s, groups: [...s.groups, { id: newGroupId(), primary: "" }] }))

  const mergeWithNext = (id: string) =>
    onUpdate((s) => {
      const i = s.groups.findIndex((g) => g.id === id)
      if (i < 0 || i === s.groups.length - 1) return s
      const groups = [...s.groups]
      groups.splice(i, 2, mergeGroups(groups[i], groups[i + 1]))
      return { ...s, groups }
    })

  const splitOne = (id: string) =>
    onUpdate((s) => {
      const i = s.groups.findIndex((g) => g.id === id)
      if (i < 0) return s
      const result = splitGroup(s.groups[i])
      if (!result) return s
      const groups = [...s.groups]
      groups.splice(i, 1, ...result)
      return { ...s, groups }
    })

  const appendFromPaste = () => {
    const groups = splitContent(appendRaw, set.type, { pairTranslation: appendPair })
    if (!groups.length) return
    onUpdate((s) => ({ ...s, groups: [...s.groups, ...groups] }))
    setAppendRaw("")
    setAppendOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={set.type === "prayer" ? "secondary" : "default"}>
            {set.type === "prayer" ? "Prayer Points" : "Lyrics"}
          </Badge>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            className="w-64 font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAppendOpen((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Append from paste
          </Button>
          <Button variant="outline" size="sm" onClick={addGroup}>
            + Blank item
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete set
          </Button>
        </div>
      </div>

      {appendOpen && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {set.type === "lyrics" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={appendPair} onChange={(e) => setAppendPair(e.target.checked)} />
                Every other line is a translation
              </label>
            )}
            <Textarea rows={6} value={appendRaw} onChange={(e) => setAppendRaw(e.target.value)} placeholder="Paste more content to add to the end…" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAppendOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={appendFromPaste} disabled={!appendRaw.trim()}>
                Append
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {set.groups.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No items yet — append content above.</p>}
        {set.groups.map((g, i) => (
          <GroupRow
            key={g.id}
            group={g}
            index={i}
            total={set.groups.length}
            onChange={(patch) => updateGroup(g.id, patch)}
            onMove={(dir) => moveGroup(g.id, dir)}
            onSplit={() => splitOne(g.id)}
            onMerge={() => mergeWithNext(g.id)}
            onDelete={() => deleteGroup(g.id)}
          />
        ))}
      </div>
    </div>
  )
}

export function LyricsEditor() {
  const [sets, setSets] = useState<LyricSet[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | ContentType>("all")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setSets(loadSets())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETS_KEY) setSets(loadSets())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const selected = sets.find((s) => s.id === selectedId) ?? null
  const visible = sets.filter((s) => filter === "all" || s.type === filter)

  const handleCreate = (set: LyricSet) => {
    const next = upsertSet(sets, set)
    setSets(next)
    setSelectedId(set.id)
    setCreating(false)
  }

  const updateSelected = (mutate: (s: LyricSet) => LyricSet) => {
    if (!selected) return
    const next = upsertSet(sets, { ...mutate(selected), updatedAt: Date.now() })
    setSets(next)
  }

  const deleteSet = (id: string) => {
    const next = removeSet(sets, id)
    setSets(next)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Songs & Prayer Sets</h2>
          <Button size="sm" onClick={() => { setCreating(true); setSelectedId(null) }}>
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | ContentType)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="lyrics" className="flex-1">Lyrics</TabsTrigger>
            <TabsTrigger value="prayer" className="flex-1">Prayer</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-1.5">
          {visible.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nothing here yet</p>}
          {visible.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedId(s.id); setCreating(false) }}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                selectedId === s.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {s.type === "prayer" ? <Badge variant="secondary" className="h-4 px-1 text-[10px]">PRAYER</Badge> : <Music2 className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="truncate">{s.title}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.groups.length} items</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t pt-3">
          <a href="/lyrics/obs/dock" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open OBS dock
            </Button>
          </a>
          <a href="/lyrics/obs?preview=1" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Tv2 className="mr-1.5 h-3.5 w-3.5" />
              Preview OBS display
            </Button>
          </a>
        </div>
      </div>

      <div>
        {creating ? (
          <NewSetForm onCreate={handleCreate} />
        ) : selected ? (
          <SetEditor key={selected.id} set={selected} onUpdate={updateSelected} onDelete={() => deleteSet(selected.id)} />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Pick a set on the left, or create a new one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
