"use client"

/**
 * OBS Full-Screen Bible Scene — /bible/obs/scene
 *
 * Designed to fill an entire OBS scene dedicated to showing Bible passages.
 * Use this when you want the Bible to take the whole screen, not just a
 * lower-third overlay.
 *
 * OBS Setup:
 *   1. Create a new OBS Scene called "Bible"
 *   2. Add → Browser Source
 *   3. URL: https://<your-domain>/bible/obs/scene
 *   4. Width: 1920, Height: 1080
 *   5. Custom CSS:  body { background: #0d0d1a !important; }
 *   6. Check "Shutdown source when not visible"
 *
 * Switch to the Bible scene when the pastor reads from scripture.
 * Switch away when done — the scene clears automatically.
 */

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const OBS_CHANNEL = "bible-obs"

interface PassagePayload {
  reference: string
  text: string
  translation: string
  translationName: string
  verseNumber?: number
  verses?: Array<{ verse: number; text: string }>
}

export default function BibleObsScenePage() {
  const [passage, setPassage] = useState<PassagePayload | null>(null)
  const [visible, setVisible] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(OBS_CHANNEL, {
      config: { broadcast: { self: false } },
    })
    channel
      .on("broadcast", { event: "passage" }, ({ payload }: { payload: PassagePayload }) => {
        setPassage(payload)
        setVisible(true)
      })
      .on("broadcast", { event: "clear" }, () => {
        setVisible(false)
      })
      .subscribe()
    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [])

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          background: #0d0d1a;
          width: 1920px;
          height: 1080px;
          overflow: hidden;
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        .scene {
          width: 1920px;
          height: 1080px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 160px;
          position: relative;
          background: radial-gradient(ellipse at 50% 30%, rgba(80,40,160,0.18) 0%, transparent 70%);
        }
        .content {
          width: 100%;
          max-width: 1440px;
          text-align: center;
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .content.hidden {
          opacity: 0;
          transform: translateY(24px);
          pointer-events: none;
        }
        .verse-number {
          font-size: 28px;
          font-weight: 700;
          color: #7c6af7;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 24px;
          font-family: Arial, sans-serif;
          opacity: 0.9;
        }
        .verse-text {
          font-size: 64px;
          line-height: 1.45;
          color: #f0ecff;
          font-style: italic;
          text-shadow: 0 4px 32px rgba(0,0,0,0.6);
          margin-bottom: 48px;
        }
        .reference-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        .accent-line {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #7c6af7);
          border-radius: 1px;
        }
        .accent-line.right {
          background: linear-gradient(90deg, #7c6af7, transparent);
        }
        .reference {
          font-size: 32px;
          font-weight: 700;
          color: #c4a6ff;
          letter-spacing: 0.06em;
          font-family: Arial, sans-serif;
        }
        .translation {
          font-size: 20px;
          font-weight: 600;
          color: rgba(196,166,255,0.45);
          letter-spacing: 0.12em;
          font-family: Arial, sans-serif;
          margin-top: 12px;
        }
        .idle {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.6s ease;
        }
        .idle.hidden { opacity: 0; pointer-events: none; }
        .cross {
          width: 3px;
          height: 80px;
          background: rgba(124,106,247,0.12);
          position: relative;
          border-radius: 2px;
        }
        .cross::before {
          content: '';
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 3px;
          background: rgba(124,106,247,0.12);
          border-radius: 2px;
        }
      `}</style>

      <div className="scene">
        {/* Idle state — subtle cross when nothing is on screen */}
        <div className={`idle${visible ? " hidden" : ""}`}>
          <div className="cross" />
        </div>

        {/* Passage */}
        <div className={`content${visible ? "" : " hidden"}`}>
          {passage && (
            <>
              {passage.verseNumber && (
                <div className="verse-number">verse {passage.verseNumber}</div>
              )}
              <div className="verse-text">&ldquo;{passage.text}&rdquo;</div>
              <div className="reference-row">
                <div className="accent-line" />
                <div>
                  <div className="reference">{passage.reference}</div>
                  <div className="translation">{passage.translationName}</div>
                </div>
                <div className="accent-line right" />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
