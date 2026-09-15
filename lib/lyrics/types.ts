/**
 * Fusion Worship Library — data model.
 *
 * A song, hymn or prayer set is never sent to OBS as one block of text. It is
 * an ordered list of small display groups (cues); the operator steps through
 * them and only the current cue is ever broadcast to the display.
 *
 * Structure vs projection
 * -----------------------
 * `sections` is the authoring model: Verse 1, Chorus, Bridge, each with its
 * own lines, and a verse number kept as a *number* rather than baked into the
 * text (the same separation the Bible module keeps between a verse and its
 * number, so the presentation layer decides how — or whether — it shows).
 *
 * `groups` stays the flat projection list, in order, exactly as before. Every
 * cue carries a back-reference to the section it came from, so the dock can
 * tell the operator "Chorus" and the hymn renderer can print a verse number,
 * without the realtime payload or the OBS display needing a new shape.
 *
 * That split is deliberate: a set authored before sections existed has no
 * `sections` at all and still projects perfectly from `groups`.
 */

/**
 * "song" and "hymn" project differently (phrase cues vs whole verses), so
 * they are distinct types rather than a flag. "lyrics" is the pre-V2 spelling
 * of "song" and is still read — see normalizeContentType.
 */
export type ContentType = "song" | "hymn" | "prayer"
export type StoredContentType = ContentType | "lyrics"

export type SectionType =
  | "intro"
  | "verse"
  | "prechorus"
  | "chorus"
  | "bridge"
  | "refrain"
  | "interlude"
  | "outro"
  | "tag"
  | "ending"
  | "other"

export const SECTION_LABELS: Record<SectionType, string> = {
  intro: "Intro",
  verse: "Verse",
  prechorus: "Pre-Chorus",
  chorus: "Chorus",
  bridge: "Bridge",
  refrain: "Refrain",
  interlude: "Interlude",
  outro: "Outro",
  tag: "Tag",
  ending: "Ending",
  other: "Other",
}

/** How a hymn's verse number is presented. The number itself is never in the text. */
export type VerseNumberStyle = "heading" | "inline" | "superscript" | "none"

/** Section labels are operator metadata; songs never put them on screen. */
export type SectionLabelMode = "off" | "numbers" | "all"

export interface Presentation {
  sectionLabels: SectionLabelMode
  verseNumberStyle: VerseNumberStyle
}

/** Songs project phrase cues with nothing but the words; hymns show the verse number. */
export const SONG_PRESENTATION: Presentation = { sectionLabels: "off", verseNumberStyle: "none" }
export const HYMN_PRESENTATION: Presentation = { sectionLabels: "numbers", verseNumberStyle: "heading" }

export function defaultPresentation(type: ContentType): Presentation {
  return type === "hymn" ? { ...HYMN_PRESENTATION } : { ...SONG_PRESENTATION }
}

/** Where a cue sits in the song, carried on the cue so the payload needs no new field. */
export interface SectionRef {
  type: SectionType
  /** Verse/section number, structural — "1", not "1. " glued to the lyric. */
  number?: number
  /** Only for type "other": the operator's own name for the section. */
  label?: string
}

export interface LyricGroup {
  id: string
  primary: string
  /** Optional second line — a translation, a response, a sub-point. Own colour on screen. */
  secondary?: string
  /** "We are going higher x2" becomes one cue with repeat: 2, not two duplicate cues. */
  repeat?: number
  /** Which section this cue belongs to. Absent on pre-V2 flat sets. */
  section?: SectionRef
}

export interface LyricSection {
  id: string
  type: SectionType
  /** Structural number — verse 1, verse 2. Absent for a chorus, usually. */
  number?: number
  /** Only for type "other". */
  label?: string
  /** "Chorus x2" — how many times the section is sung, kept off the text. */
  repeat?: number
  groups: LyricGroup[]
}

export interface LyricSet {
  id: string
  type: ContentType
  title: string
  /**
   * The flat, ordered cue list — what the dock steps through and what goes to
   * OBS. Derived from `sections` when a set has them (see flattenSections), so
   * this stays the single projection source of truth for every set, structured
   * or not.
   */
  groups: LyricGroup[]
  /** The authoring structure. Absent on sets created before V2 or pasted without recognisable headings. */
  sections?: LyricSection[]
  /** Free text — "English", "Yoruba". Only set when it's actually known. */
  language?: string
  presentation?: Presentation
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
  /** Per-set display rules, so the display doesn't need to look the set up. */
  presentation?: Presentation
  /** Replaying what is already live (scene switch, reconnect) rather than changing it. */
  restore?: boolean
}

/**
 * Reads any stored type, including the pre-V2 "lyrics". Rows written before
 * songs and hymns were distinguished stay valid and read as songs — nothing
 * is rewritten in the database on our account.
 */
export function normalizeContentType(raw: unknown): ContentType {
  if (raw === "hymn" || raw === "prayer" || raw === "song") return raw
  return "song"
}

export function isMusical(type: ContentType): boolean {
  return type === "song" || type === "hymn"
}

export function sectionTitle(section: Pick<LyricSection, "type" | "number" | "label">): string {
  if (section.type === "other") return section.label?.trim() || "Section"
  const base = SECTION_LABELS[section.type]
  return section.number ? `${base} ${section.number}` : base
}

/**
 * The flat cue list for a structured set: every section's cues in order, each
 * stamped with where it came from. This is what keeps one representation —
 * the dock, the OBS display and every pre-V2 set all consume `groups`.
 */
export function flattenSections(sections: LyricSection[]): LyricGroup[] {
  const out: LyricGroup[] = []
  for (const section of sections) {
    const ref: SectionRef = { type: section.type }
    if (section.number !== undefined) ref.number = section.number
    if (section.label) ref.label = section.label
    for (const g of section.groups) {
      out.push({ ...g, section: ref })
    }
  }
  return out
}

/** The next free number for a section type, so a second verse defaults to 2. */
export function nextSectionNumber(sections: LyricSection[], type: SectionType): number {
  const used = sections.filter((s) => s.type === type).map((s) => s.number ?? 0)
  return used.length ? Math.max(...used) + 1 : 1
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

export function newSectionId(): string {
  counter += 1
  return `sec${Date.now().toString(36)}${counter.toString(36)}`
}
