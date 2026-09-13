"use client"

/**
 * OBS Browser Source Overlay — /bible/obs
 *
 * Add this URL as a Browser Source in OBS to show Bible passages
 * on stream in real time. The page is transparent by default so
 * it composites cleanly over any background scene.
 *
 * OBS Setup:
 *   1. Add a Browser Source
 *   2. URL: https://<your-domain>/bible/obs
 *   3. Width: 1920, Height: 1080
 *   4. Check "Shutdown source when not visible"
 *   5. In Custom CSS add:  body { background: transparent !important; }
 *
 * The overlay updates automatically whenever the Bible Reader
 * operator sends a passage to the projection screen.
 */

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { displayReference } from "@/lib/bible/format"

const OBS_CHANNEL = "bible-obs"

interface PassagePayload {
  reference: string
  text: string
  translation: string
  translationName: string
  verseNumber?: number
  verses?: Array<{ book?: string; chapter?: number; verse: number; text: string }>
}

export default function BibleObsPage() {
  const [passage, setPassage] = useState<PassagePayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [connected, setConnected] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(OBS_CHANNEL, {
      config: { broadcast: { self: false } },
    })

    channel
      .on("broadcast", { event: "passage" }, ({ payload }: { payload: PassagePayload }) => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        setPassage(payload)
        setVisible(true)
      })
      .on("broadcast", { event: "clear" }, () => {
        setVisible(false)
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED")
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          background: transparent !important;
          overflow: hidden;
          width: 1920px;
          height: 1080px;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .overlay {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 80px 64px;
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                      opacity 0.4s ease;
        }

        .overlay.hidden {
          transform: translateY(40px);
          opacity: 0;
          pointer-events: none;
        }

        .card {
          background: linear-gradient(
            135deg,
            rgba(15, 10, 30, 0.92) 0%,
            rgba(30, 20, 60, 0.88) 100%
          );
          border: 1px solid rgba(180, 140, 255, 0.25);
          border-radius: 12px;
          padding: 32px 48px;
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          backdrop-filter: blur(16px);
          max-width: 1600px;
          margin: 0 auto;
        }

        .reference {
          font-size: 28px;
          font-weight: 700;
          color: #c4a6ff;
          letter-spacing: 0.04em;
          margin-bottom: 16px;
          font-family: 'Georgia', serif;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .reference::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 32px;
          background: linear-gradient(180deg, #9f7aea, #6b46c1);
          border-radius: 2px;
          flex-shrink: 0;
        }

        .translation-badge {
          font-size: 14px;
          font-weight: 600;
          color: rgba(196, 166, 255, 0.6);
          letter-spacing: 0.1em;
          border: 1px solid rgba(196, 166, 255, 0.25);
          border-radius: 4px;
          padding: 2px 8px;
          font-family: 'Arial', sans-serif;
        }

        .verse-text {
          font-size: 38px;
          line-height: 1.5;
          color: #f0ecff;
          font-style: italic;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .status-dot {
          position: fixed;
          top: 16px;
          right: 16px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          opacity: 0.6;
        }
      `}</style>

      <div className={`overlay ${visible ? "" : "hidden"}`}>
        {passage && (
          <div className="card">
            <div className="reference">
              {displayReference(passage.reference, passage.verseNumber, passage.verses)}
              <span className="translation-badge">{passage.translationName}</span>
            </div>
            <div className="verse-text">&ldquo;{passage.text}&rdquo;</div>
          </div>
        )}
      </div>

      {/* Tiny connection indicator — visible only when OBS preview is open */}
      <div
        className="status-dot"
        title={connected ? "Connected" : "Reconnecting…"}
        style={{
          background: connected ? "#4ade80" : "#ef4444",
          boxShadow: `0 0 6px ${connected ? "#4ade80" : "#ef4444"}`,
        }}
      />
    </>
  )
}
