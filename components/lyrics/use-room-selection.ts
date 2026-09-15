"use client"

/**
 * Resolves the Broadcast room for a surface (display, dock or monitor) without
 * the room ever needing to live in the URL.
 *
 * The OBS Browser Source and Dock URLs are permanent — `/lyrics/obs` and
 * `/lyrics/obs/dock`, no `?room=`. Each surface remembers its room in its own
 * localStorage and reconnects to it after a reload or OBS restart. An operator
 * enters a Broadcast ID once per surface; switching rooms happens in the UI,
 * never by editing an OBS URL.
 *
 * `?room=` is still honoured for backward compatibility: a valid one joins that
 * room, saves it locally, and is then stripped from the URL so the permanent
 * URL is what remains.
 *
 * Surfaces may sit in separate storage profiles (OBS's browser vs Chrome), so
 * one surface never assumes another's room — each joins independently.
 */

import { useCallback, useEffect, useState } from "react"
import { forgetRoom, rememberedRoom, rememberRoom, roomFromSearch } from "@/lib/lyrics/room"

export interface RoomSelection {
  room: string | null
  /** False until the initial resolve has run, so a surface doesn't flash the join screen before checking storage. */
  ready: boolean
  join: (id: string) => void
  leave: () => void
}

export function useRoomSelection(): RoomSelection {
  const [room, setRoom] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const fromUrl = roomFromSearch(window.location.search)
    const resolved = fromUrl ?? rememberedRoom()
    if (resolved) {
      rememberRoom(resolved)
      // Strip ?room= so the address bar / saved OBS URL stays the permanent one.
      const url = new URL(window.location.href)
      if (url.searchParams.has("room")) {
        url.searchParams.delete("room")
        window.history.replaceState(null, "", url.toString())
      }
      setRoom(resolved)
    }
    setReady(true)
  }, [])

  const join = useCallback((id: string) => {
    rememberRoom(id)
    setRoom(id)
  }, [])

  const leave = useCallback(() => {
    forgetRoom()
    setRoom(null)
  }, [])

  return { room, ready, join, leave }
}
