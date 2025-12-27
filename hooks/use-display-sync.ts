"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DisplaySyncMessage } from "@/types/rundown"

const CHANNEL_NAME = "rundown-display"

interface UseDisplaySyncOptions {
  rundownId: string
  onMessage?: (message: DisplaySyncMessage) => void
}

interface UseDisplaySyncReturn {
  sendMessage: (message: DisplaySyncMessage) => void
  isDisplayConnected: boolean
  displayCount: number
}

/**
 * Hook for syncing rundown display state via BroadcastChannel
 * Used for communication between the live view (operator) and display windows (projection)
 */
export function useDisplaySync({
  rundownId,
  onMessage,
}: UseDisplaySyncOptions): UseDisplaySyncReturn {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [displayCount, setDisplayCount] = useState(0)
  const onMessageRef = useRef(onMessage)

  // Keep onMessage ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    const handleMessage = (event: MessageEvent<DisplaySyncMessage>) => {
      const message = event.data

      // Track display connections
      if (message.type === "DISPLAY_READY" && message.payload.rundownId === rundownId) {
        setDisplayCount((prev) => prev + 1)
      } else if (message.type === "DISPLAY_CLOSED" && message.payload.rundownId === rundownId) {
        setDisplayCount((prev) => Math.max(0, prev - 1))
      }

      // Forward message to handler
      if (onMessageRef.current) {
        onMessageRef.current(message)
      }
    }

    channel.addEventListener("message", handleMessage)

    return () => {
      channel.removeEventListener("message", handleMessage)
      channel.close()
      channelRef.current = null
    }
  }, [rundownId])

  // Send message to all connected displays
  const sendMessage = useCallback((message: DisplaySyncMessage) => {
    if (channelRef.current) {
      channelRef.current.postMessage(message)
    }
  }, [])

  return {
    sendMessage,
    isDisplayConnected: displayCount > 0,
    displayCount,
  }
}

/**
 * Hook for receiving display sync messages (used by display windows)
 */
export function useDisplayReceiver(
  rundownId: string,
  onMessage: (message: DisplaySyncMessage) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const onMessageRef = useRef(onMessage)

  // Keep onMessage ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  // Initialize BroadcastChannel and announce ready
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    // Announce that display is ready
    channel.postMessage({
      type: "DISPLAY_READY",
      payload: { rundownId },
    } as DisplaySyncMessage)

    const handleMessage = (event: MessageEvent<DisplaySyncMessage>) => {
      if (onMessageRef.current) {
        onMessageRef.current(event.data)
      }
    }

    channel.addEventListener("message", handleMessage)

    // Cleanup: announce display closed
    return () => {
      channel.postMessage({
        type: "DISPLAY_CLOSED",
        payload: { rundownId },
      } as DisplaySyncMessage)
      channel.removeEventListener("message", handleMessage)
      channel.close()
      channelRef.current = null
    }
  }, [rundownId])

  // Send message back to operator (e.g., for acknowledgments)
  const sendMessage = useCallback((message: DisplaySyncMessage) => {
    if (channelRef.current) {
      channelRef.current.postMessage(message)
    }
  }, [])

  return { sendMessage }
}
