"use client"

/**
 * Worship Library data layer.
 *
 * Supabase is the source of truth so this page, the OBS dock and another
 * operator's laptop all see the same library. The localStorage cache only
 * paints instantly while the real fetch is in flight — it is never a source
 * of truth, because the dock runs inside OBS's own browser profile and would
 * never see it.
 *
 * Writes are optimistic and roll back on failure, so the list reacts
 * immediately but can't quietly drift from the shared copy. When the fetch
 * falls back to cache the library goes read-only rather than queueing edits
 * we can't reconcile: pretending a save succeeded and losing it mid-service
 * is the worse failure.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { deleteSet as deleteRemote, loadCachedSets, saveSet, subscribeToSets, syncSets } from "@/lib/lyrics/store"
import type { LyricSet } from "@/lib/lyrics/types"

export interface WorshipLibrary {
  sets: LyricSet[]
  loading: boolean
  offline: boolean
  error: string | null
  create: (set: LyricSet) => void
  update: (id: string, mutate: (s: LyricSet) => LyricSet) => void
  remove: (id: string) => void
}

export function useWorshipLibrary(): WorshipLibrary {
  const [sets, setSets] = useState<LyricSet[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setsRef = useRef<LyricSet[]>([])

  // Only ever moves server -> local. A failed fetch keeps the cached copy on
  // screen rather than inventing anything, and never pushes stale cache data
  // back up, so a reconnect can't clobber newer data written elsewhere while
  // this client was offline.
  const refresh = useCallback(async () => {
    const { sets: fresh, source } = await syncSets()
    setsRef.current = fresh
    setSets(fresh)
    setOffline(source === "cache")
    setError(source === "cache" ? "Offline — showing the last cached library (read-only)" : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    const cached = loadCachedSets()
    setsRef.current = cached
    setSets(cached)
    void refresh()
    const unsubscribe = subscribeToSets(() => void refresh())
    return unsubscribe
  }, [refresh])

  const commit = useCallback((next: LyricSet[], write: Promise<void>, previous: LyricSet[], failure: string) => {
    setsRef.current = next
    setSets(next)
    void write
      .then(() => setError(null))
      .catch(() => {
        setError(failure)
        setsRef.current = previous
        setSets(previous)
      })
  }, [])

  const create = useCallback(
    (set: LyricSet) => {
      if (offline) return
      const previous = setsRef.current
      commit([set, ...previous], saveSet(set), previous, "Couldn't save — check your connection")
    },
    [offline, commit]
  )

  const update = useCallback(
    (id: string, mutate: (s: LyricSet) => LyricSet) => {
      if (offline) return
      const previous = setsRef.current
      const existing = previous.find((s) => s.id === id)
      if (!existing) return
      const updated = { ...mutate(existing), updatedAt: Date.now() }
      commit(
        previous.map((s) => (s.id === id ? updated : s)),
        saveSet(updated),
        previous,
        "Couldn't save changes — check your connection"
      )
    },
    [offline, commit]
  )

  const remove = useCallback(
    (id: string) => {
      if (offline) return
      const previous = setsRef.current
      commit(previous.filter((s) => s.id !== id), deleteRemote(id), previous, "Couldn't delete — check your connection")
    },
    [offline, commit]
  )

  return { sets, loading, offline, error, create, update, remove }
}
