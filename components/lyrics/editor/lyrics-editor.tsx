"use client"

/**
 * /lyrics — the full Lyrics & Prayer Points management page. Paste a whole
 * song or a numbered list of prayer points, get ordered display groups back,
 * then edit, split, merge, reorder or delete them. The library lives in
 * Supabase (lib/lyrics/store.ts) — not localStorage — because this page runs
 * in the operator's normal browser while the dock (/lyrics/obs/dock) runs
 * inside OBS's own embedded Chromium, a completely separate storage profile.
 * Realtime (lib/lyrics/store.ts's subscribeToSets) keeps every open client —
 * this page, the dock, another operator's laptop — in sync automatically.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Combine, ExternalLink, Music2, Plus, Scissors, Trash2, Tv2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deleteSet as deleteSetRemote, loadCachedSets, saveSet, subscribeToSets, syncSets } from "@/lib/lyrics/store"
import { mergeGroups, splitContent, splitGroup } from "@/lib/lyrics/parse"
import { newGroupId, newSetId, type ContentType, type LyricGroup, type LyricSet } from "@/lib/lyrics/types"
import { cn } from "@/lib/utils"

function NewSetForm({ onCreate, disabled }: { onCreate: (set: LyricSet) => void; disabled: boolean }) {
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
        {disabled && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Offline — the library is read-only until the connection is back.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Input placeholder="Song or set title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled} />
          <Tabs value={type} onValueChange={(v) => setType(v as ContentType)}>
            <TabsList>
              <TabsTrigger value="lyrics" disabled={disabled}>Lyrics</TabsTrigger>
              <TabsTrigger value="prayer" disabled={disabled}>Prayer Points</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {type === "lyrics" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={pairTranslation} onChange={(e) => setPairTranslation(e.target.checked)} disabled={disabled} />
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
          disabled={disabled}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {groups.length ? `${groups.length} item${groups.length === 1 ? "" : "s"} will be created` : "Paste content above"}
          </p>
          <Button onClick={create} disabled={disabled || !groups.length}>
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
  disabled,
  onChange,
  onMove,
  onSplit,
  onMerge,
  onDelete,
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
            <Textarea
              rows={1}
              value={group.secondary}
              placeholder="Secondary line — translation, response, sub-point…"
              onChange={(e) => onChange({ secondary: e.target.value })}
              className="text-sm text-muted-foreground"
              disabled={disabled}
            />
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange({ secondary: "" })} disabled={disabled}>
              + Add secondary line
            </Button>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col gap-0.5">
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
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} disabled={disabled} title="Delete item">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SetEditor({
  set,
  disabled,
  onUpdate,
  onDelete,
}: {
  set: LyricSet
  disabled: boolean
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
      {disabled && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Offline — this set is read-only until the connection is back. It&apos;s still fine to use live from the dock.
        </p>
      )}
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
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAppendOpen((v) => !v)} disabled={disabled}>
            <Plus className="mr-1.5 h-4 w-4" />
            Append from paste
          </Button>
          <Button variant="outline" size="sm" onClick={addGroup} disabled={disabled}>
            + Blank item
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete} disabled={disabled}>
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
                <input type="checkbox" checked={appendPair} onChange={(e) => setAppendPair(e.target.checked)} disabled={disabled} />
                Every other line is a translation
              </label>
            )}
            <Textarea
              rows={6}
              value={appendRaw}
              onChange={(e) => setAppendRaw(e.target.value)}
              placeholder="Paste more content to add to the end…"
              disabled={disabled}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAppendOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={appendFromPaste} disabled={disabled || !appendRaw.trim()}>
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
            disabled={disabled}
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
  const [syncError, setSyncError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | ContentType>("all")
  const [creating, setCreating] = useState(false)
  const setsRef = useRef<LyricSet[]>([])

  // Only ever moves server → local. A failed fetch keeps the cached copy on
  // screen rather than inventing anything, and never pushes stale cache data
  // back up — the next successful fetch simply replaces it outright, so a
  // reconnect can't clobber newer data written elsewhere while this client
  // was offline.
  const refresh = useCallback(async () => {
    const { sets: fresh, source } = await syncSets()
    setsRef.current = fresh
    setSets(fresh)
    setOffline(source === "cache")
    setSyncError(source === "cache" ? "Offline — using the last cached library (read-only)" : null)
  }, [])

  // Supabase is the source of truth so this page, the dock and another
  // operator's laptop all see the same library; the cached copy just paints
  // instantly while the real fetch is in flight.
  useEffect(() => {
    const cached = loadCachedSets()
    setsRef.current = cached
    setSets(cached)
    void refresh()
    const unsubscribe = subscribeToSets(() => void refresh())
    return unsubscribe
  }, [refresh])

  const selected = sets.find((s) => s.id === selectedId) ?? null
  const visible = sets.filter((s) => filter === "all" || s.type === filter)

  // Every write below is optimistic (instant local update) then confirmed
  // against Supabase in the background; a failure rolls the local change
  // back and surfaces why, rather than silently drifting from the shared
  // copy. While offline the UI already disables these controls, but each
  // handler guards too rather than relying on that alone.
  const handleCreate = (set: LyricSet) => {
    if (offline) return
    const next = [set, ...setsRef.current]
    setsRef.current = next
    setSets(next)
    setSelectedId(set.id)
    setCreating(false)
    void saveSet(set)
      .then(() => setSyncError(null))
      .catch(() => {
        setSyncError("Couldn't save the new set — check your connection")
        const rolledBack = setsRef.current.filter((s) => s.id !== set.id)
        setsRef.current = rolledBack
        setSets(rolledBack)
        setSelectedId((id) => (id === set.id ? null : id))
      })
  }

  const updateSelected = (mutate: (s: LyricSet) => LyricSet) => {
    if (!selected || offline) return
    const previous = setsRef.current
    const updated = { ...mutate(selected), updatedAt: Date.now() }
    const next = [updated, ...previous.filter((s) => s.id !== updated.id)]
    setsRef.current = next
    setSets(next)
    void saveSet(updated)
      .then(() => setSyncError(null))
      .catch(() => {
        setSyncError("Couldn't save changes — check your connection")
        setsRef.current = previous
        setSets(previous)
      })
  }

  const deleteSet = (id: string) => {
    if (offline) return
    const previous = setsRef.current
    const next = previous.filter((s) => s.id !== id)
    setsRef.current = next
    setSets(next)
    if (selectedId === id) setSelectedId(null)
    void deleteSetRemote(id)
      .then(() => setSyncError(null))
      .catch(() => {
        setSyncError("Couldn't delete the set — check your connection")
        setsRef.current = previous
        setSets(previous)
      })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Songs & Prayer Sets</h2>
          <Button size="sm" onClick={() => { setCreating(true); setSelectedId(null) }} disabled={offline}>
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>

        {syncError && <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{syncError}</p>}

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
          <NewSetForm onCreate={handleCreate} disabled={offline} />
        ) : selected ? (
          <SetEditor key={selected.id} set={selected} disabled={offline} onUpdate={updateSelected} onDelete={() => deleteSet(selected.id)} />
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
