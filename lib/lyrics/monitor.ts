/**
 * Read-only monitor contract for the Lyrics OBS system.
 *
 * A monitor (e.g. a leader watching from a phone) observes the live channel
 * but must never change it. It exchanges its OWN pair of events with the dock —
 * never `request-state`/`item`, which the display listens to and which carry
 * the Lock-bypassing `restore` flag. The dock answers `request-monitor-state`
 * with a `monitor-state` snapshot and re-broadcasts `monitor-state` on every
 * change; the display ignores both, so nothing a monitor does can reach the
 * on-screen output.
 */

import type { ContentType } from "./types"

/** Events used only between the dock and monitors. The display never handles these. */
export const MONITOR_REQUEST_EVENT = "request-monitor-state"
export const MONITOR_STATE_EVENT = "monitor-state"

/** A pure snapshot of what the operator is doing — no handles that could mutate anything. */
export interface LyricsMonitorState {
  setTitle: string | null
  type: ContentType | null
  /** 0-based position of the cue that is actually live; -1 when nothing is on screen. */
  index: number
  total: number
  /** The text currently on the display, or null when the screen is cleared. */
  currentPrimary: string | null
  currentSecondary: string | null
  currentRepeat: number | null
  /** The cue that would come next in the current set, for a "coming up" preview. */
  nextPrimary: string | null
  locked: boolean
  previewFirst: boolean
  /** With preview-before-live on, the cue staged but not yet sent. */
  stagedPrimary: string | null
  autoOn: boolean
  autoPaused: boolean
  autoInterval: number
}

export const EMPTY_MONITOR_STATE: LyricsMonitorState = {
  setTitle: null,
  type: null,
  index: -1,
  total: 0,
  currentPrimary: null,
  currentSecondary: null,
  currentRepeat: null,
  nextPrimary: null,
  locked: false,
  previewFirst: false,
  stagedPrimary: null,
  autoOn: false,
  autoPaused: false,
  autoInterval: 5,
}

export interface MonitorStateInput {
  activeSet: { id: string; title: string; type: ContentType; groups: Array<{ primary: string }> } | null
  onScreen: {
    setId: string
    setTitle: string
    type: ContentType
    group: { primary: string; secondary?: string; repeat?: number }
    index: number
    total: number
  } | null
  staged: { group: { primary: string } } | null
  locked: boolean
  previewFirst: boolean
  autoOn: boolean
  autoPaused: boolean
  autoInterval: number
}

/**
 * Builds a monitor snapshot from the dock's own live state. Pure, so the dock
 * can call it from either its request handler (reading refs) or its broadcast
 * effect (reading state) and get the same result.
 */
export function buildMonitorState(input: MonitorStateInput): LyricsMonitorState {
  const { activeSet, onScreen, staged } = input
  let nextPrimary: string | null = null
  // "Next" is only meaningful relative to the cue that is actually live, and
  // only when the live cue belongs to the set the operator currently has open.
  if (onScreen && activeSet && onScreen.setId === activeSet.id) {
    nextPrimary = activeSet.groups[onScreen.index + 1]?.primary ?? null
  }

  return {
    setTitle: onScreen?.setTitle ?? activeSet?.title ?? null,
    type: onScreen?.type ?? activeSet?.type ?? null,
    index: onScreen?.index ?? -1,
    total: onScreen?.total ?? activeSet?.groups.length ?? 0,
    currentPrimary: onScreen?.group.primary ?? null,
    currentSecondary: onScreen?.group.secondary ?? null,
    currentRepeat: onScreen?.group.repeat ?? null,
    nextPrimary,
    locked: input.locked,
    previewFirst: input.previewFirst,
    stagedPrimary: staged?.group.primary ?? null,
    autoOn: input.autoOn,
    autoPaused: input.autoPaused,
    autoInterval: input.autoInterval,
  }
}
