/**
 * Fusion Lyrics / Prayer Points — data model.
 *
 * A song or prayer set is never sent to OBS as one block of text. It is an
 * ordered list of small display groups; the operator steps through them and
 * only the current group is ever broadcast to the display.
 */

export type ContentType = "lyrics" | "prayer"

export interface LyricGroup {
  id: string
  primary: string
  /** Optional second line — a translation, a response, a sub-point. Own colour on screen. */
  secondary?: string
  /** "We are going higher x2" becomes one cue with repeat: 2, not two duplicate cues. */
  repeat?: number
}

export interface LyricSet {
  id: string
  type: ContentType
  title: string
  groups: LyricGroup[]
  updatedAt: number
  /**
   * Metadata only, e.g. "Psalm 100:1-5" — imported from a Word document that
   * listed a reading alongside a song. Never becomes a lyric cue: the Bible
   * module (/bible/obs) is the one place scripture is displayed.
   */
  scriptureReference?: string
}

/** What actually goes out on the realtime channel and what /lyrics/obs renders. */
export interface LyricItemPayload {
  setId: string
  setTitle: string
  type: ContentType
  group: LyricGroup
  index: number
  total: number
  /** Replaying what is already live (scene switch, reconnect) rather than changing it. */
  restore?: boolean
}

let counter = 0
export function newGroupId(): string {
  counter += 1
  return `g${Date.now().toString(36)}${counter.toString(36)}`
}

export function newSetId(): string {
  counter += 1
  return `s${Date.now().toString(36)}${counter.toString(36)}`
}
