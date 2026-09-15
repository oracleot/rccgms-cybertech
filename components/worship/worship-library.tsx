"use client"

/**
 * Worship Library — where staff prepare songs, hymns and prayer points.
 *
 * The page is a library first: a searchable, filterable list that stays
 * usable at hundreds of items. Authoring happens in an editor you open by
 * clicking an item, not in a permanent form taking up half the screen, which
 * is what made the old page feel like a prototype.
 *
 * The live OBS controller stays separate and deliberately much simpler — none
 * of this belongs in the dock.
 */

import { useMemo, useState } from "react"
import { Music2, Plus, Search, Upload, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { DocxImportPanel } from "@/components/lyrics/editor/docx-import"
import type { ContentType, LyricSet } from "@/lib/lyrics/types"
import { useWorshipLibrary } from "./use-library"
import { LibraryRow } from "./library-row"
import { NewSetDialog } from "./new-set-dialog"
import { SetEditor } from "./set-editor"

type Filter = "all" | ContentType

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "song", label: "Songs" },
  { value: "hymn", label: "Hymns" },
  { value: "prayer", label: "Prayer Points" },
]

export function WorshipLibrary() {
  const library = useWorshipLibrary()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)

  const editing = library.sets.find((s) => s.id === editingId) ?? null

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library.sets
      .filter((s) => filter === "all" || s.type === filter)
      .filter((s) => {
        if (!q) return true
        // Searching the cue text too, because an operator usually remembers a
        // line from the song rather than exactly how the title was typed.
        if (s.title.toLowerCase().includes(q)) return true
        return s.groups.some((g) => g.primary.toLowerCase().includes(q))
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [library.sets, filter, query])

  if (editing) {
    return (
      <SetEditor
        set={editing}
        disabled={library.offline}
        onChange={(mutate) => library.update(editing.id, mutate)}
        onClose={() => setEditingId(null)}
        onDelete={() => {
          library.remove(editing.id)
          setEditingId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Worship Library</h1>
            <p className="text-sm text-muted-foreground">
              Prepare songs, hymns and prayer points for live display.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImporting(true)} disabled={library.offline}>
            <Upload className="mr-2 h-4 w-4" />
            Import .docx
          </Button>
          <Button onClick={() => setCreating(true)} disabled={library.offline}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {library.error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          {library.error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search worship library..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {library.loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Music2 className="h-10 w-10" />}
          title={query || filter !== "all" ? "Nothing matches" : "The library is empty"}
          description={
            query || filter !== "all"
              ? "Try a different search or filter."
              : "Add a song, hymn or prayer set, or import a Word document."
          }
          action={
            query || filter !== "all" ? undefined : (
              <Button onClick={() => setCreating(true)} disabled={library.offline}>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </p>
          <div className="divide-y rounded-lg border bg-card">
            {visible.map((set) => (
              <LibraryRow
                key={set.id}
                set={set}
                disabled={library.offline}
                onOpen={() => setEditingId(set.id)}
                onDuplicate={() => library.create(duplicate(set))}
                onDelete={() => library.remove(set.id)}
              />
            ))}
          </div>
        </div>
      )}

      {creating && (
        <NewSetDialog
          onClose={() => setCreating(false)}
          onCreate={(set) => {
            library.create(set)
            setCreating(false)
            setEditingId(set.id)
          }}
        />
      )}

      {importing && (
        <div className="rounded-lg border p-4">
          {/* The panel writes the reviewed songs itself; the library's realtime
              subscription picks them up, so nothing is created twice here. */}
          <DocxImportPanel onClose={() => setImporting(false)} onImported={() => setImporting(false)} />
        </div>
      )}
    </div>
  )
}

/** A copy is a starting point, so it lands as an editable draft rather than silently shadowing the original. */
function duplicate(set: LyricSet): LyricSet {
  return {
    ...set,
    id: crypto.randomUUID(),
    title: `${set.title} (copy)`,
    updatedAt: Date.now(),
  }
}
