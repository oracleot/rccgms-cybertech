/**
 * EasyWorship 7 → Fusion parser (TypeScript port of scripts/ew-import.py).
 *
 * Reads Songs.db + SongWords.db (SQLite) via sql.js loaded from CDN,
 * parses RTF blobs into plain-text slides, classifies song/hymn, and
 * maps into Fusion's LyricSet structure. Runs entirely client-side —
 * the database files never leave the browser.
 */

import type {
  ContentType,
  LyricGroup,
  LyricSection,
  LyricSet,
  Presentation,
  SectionType,
} from "./types"
import { newGroupId, newSectionId, newSetId } from "./types"

// ---------------------------------------------------------------------------
// sql.js CDN loader — avoid npm dependency
// ---------------------------------------------------------------------------

type SqlJsStatic = {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabase
}
type SqlJsDatabase = {
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>
  close: () => void
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise
  sqlJsPromise = (async () => {
    const cdnBase = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(globalThis as any).initSqlJs) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script")
        s.src = `${cdnBase}/sql-wasm.js`
        s.onload = () => resolve()
        s.onerror = () => reject(new Error("Failed to load sql.js from CDN"))
        document.head.appendChild(s)
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = (globalThis as any).initSqlJs as (config: {
      locateFile: (file: string) => string
    }) => Promise<SqlJsStatic>
    return init({ locateFile: (file: string) => `${cdnBase}/${file}` })
  })()
  return sqlJsPromise
}

// ---------------------------------------------------------------------------
// RTF → plain-text slides
// ---------------------------------------------------------------------------

const SKIP_GROUPS = [
  "\\fonttbl",
  "\\colortbl",
  "\\stylesheet",
  "\\info",
  "\\*\\",
  "\\pntext",
  "\\pgdsctbl",
  "\\listtable",
  "\\listoverridetable",
  "\\revtbl",
]

async function decompressBlobAsync(raw: Uint8Array): Promise<string> {
  // Check for zlib header (0x78)
  if (raw.length > 2 && raw[0] === 0x78) {
    try {
      const ds = new DecompressionStream("deflate")
      const writer = ds.writable.getWriter()
      writer.write(new Uint8Array(raw))
      writer.close()
      const reader = ds.readable.getReader()
      const chunks: Uint8Array[] = []
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      const total = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
      let offset = 0
      for (const c of chunks) {
        total.set(c, offset)
        offset += c.length
      }
      return new TextDecoder("utf-8").decode(total)
    } catch {
      // fall through to raw text
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw)
  } catch {
    return new TextDecoder("windows-1252").decode(raw)
  }
}

function rtfToSlides(text: string): string[] {
  if (!text.trimStart().startsWith("{\\rtf")) {
    const t = text.trim()
    return t ? [t] : []
  }

  const slides: string[] = []
  const buf: string[] = []
  let i = 0
  let depth = 0
  let skipDepth = 0

  while (i < text.length) {
    const ch = text[i]

    if (ch === "{") {
      depth++
      const ahead = text.slice(i + 1, i + 30)
      if (SKIP_GROUPS.some((sg) => ahead.startsWith(sg))) {
        skipDepth = depth
      }
      i++
      continue
    }

    if (ch === "}") {
      if (skipDepth === depth) skipDepth = 0
      depth--
      i++
      continue
    }

    if (skipDepth) {
      i++
      continue
    }

    if (ch === "\\") {
      if (i + 1 >= text.length) {
        i++
        continue
      }
      const nc = text[i + 1]
      if (nc === "\\" || nc === "{" || nc === "}") {
        buf.push(nc)
        i += 2
        continue
      }
      if (nc === "~") {
        buf.push(" ")
        i += 2
        continue
      }
      if (nc === "-") {
        i += 2
        continue
      }
      if (nc === "_") {
        buf.push("‑")
        i += 2
        continue
      }
      if (nc === "'") {
        const hx = text.slice(i + 2, i + 4)
        try {
          const code = parseInt(hx, 16)
          if (!isNaN(code)) buf.push(String.fromCharCode(code))
        } catch {
          /* skip */
        }
        i += 4
        continue
      }
      // Read control word
      let j = i + 1
      while (j < text.length && /[a-zA-Z]/.test(text[j])) j++
      const word = text.slice(i + 1, j)
      let param = ""
      while (j < text.length && (/\d/.test(text[j]) || text[j] === "-")) {
        param += text[j]
        j++
      }
      if (j < text.length && text[j] === " ") j++

      if (word === "page") {
        const slide = buf.join("").trim()
        if (slide) slides.push(slide)
        buf.length = 0
      } else if (word === "par" || word === "line") {
        buf.push("\n")
      } else if (word === "tab") {
        buf.push("\t")
      } else if (word === "u" && param) {
        let code = parseInt(param)
        if (code < 0) code += 65536
        buf.push(String.fromCharCode(code))
        if (j < text.length && text[j] !== "\\" && text[j] !== "{" && text[j] !== "}") j++
      } else if (word === "lquote") {
        buf.push("‘")
      } else if (word === "rquote") {
        buf.push("’")
      } else if (word === "ldblquote") {
        buf.push("“")
      } else if (word === "rdblquote") {
        buf.push("”")
      } else if (word === "emdash") {
        buf.push("—")
      } else if (word === "endash") {
        buf.push("–")
      } else if (word === "bullet") {
        buf.push("•")
      }
      i = j
      continue
    }

    if (ch === "\r" || ch === "\n") {
      i++
      continue
    }

    buf.push(ch)
    i++
  }

  const lastSlide = buf.join("").trim()
  if (lastSlide) slides.push(lastSlide)

  if (slides.length === 1) {
    return splitInlineSections(slides[0])
  }
  return slides
}

// ---------------------------------------------------------------------------
// Inline section splitting
// ---------------------------------------------------------------------------

function splitInlineSections(text: string): string[] {
  const lines = text.split("\n")
  const chunks: string[] = []
  let current: string[] = []

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "" && current.length) {
      let nextNonBlank: string | null = null
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          nextNonBlank = lines[j]
          break
        }
      }
      if (nextNonBlank && parseHeading(nextNonBlank)) {
        const chunk = current.join("\n").trim()
        if (chunk) chunks.push(chunk)
        current = []
        continue
      }
    }
    current.push(lines[i])
  }

  const chunk = current.join("\n").trim()
  if (chunk) chunks.push(chunk)
  return chunks.length > 1 ? chunks : [text]
}

// ---------------------------------------------------------------------------
// Heading detection
// ---------------------------------------------------------------------------

const HEADING_PATTERNS: Array<[RegExp, SectionType]> = [
  [/^pre[-\s]?chorus$/i, "prechorus"],
  [/^(chorus|ch)$/i, "chorus"],
  [/^(verse|vs?)$/i, "verse"],
  [/^(bridge|br)$/i, "bridge"],
  [/^refrain$/i, "refrain"],
  [/^intro(duction)?$/i, "intro"],
  [/^interlude$/i, "interlude"],
  [/^outro$/i, "outro"],
  [/^tag$/i, "tag"],
  [/^ending$/i, "ending"],
]

const REPEAT_RES = [
  /^(.*?)\s*\(\s*[x×]\s*(\d+)\s*\)\s*$/i,
  /^(.*?)\s+(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*$/i,
]

function stripRepeat(text: string): { text: string; repeat: number | undefined } {
  for (const pat of REPEAT_RES) {
    const m = pat.exec(text)
    if (m) return { text: m[1].trim(), repeat: parseInt(m[2] || m[3]) }
  }
  return { text, repeat: undefined }
}

export function parseHeading(
  line: string,
): { type: SectionType; number: number | undefined; repeat: number | undefined } | null {
  const raw = line.trim()
  if (!raw || raw.length > 40) return null
  const withoutColon = raw.replace(/[:.;–—-]\s*$/, "").trim()
  if (!withoutColon) return null
  const { text, repeat } = stripRepeat(withoutColon)
  if (!text) return null

  if (/^\d{1,2}$/.test(text)) {
    return { type: "verse", number: parseInt(text), repeat }
  }

  const m = /^([A-Za-z][A-Za-z\s-]*?)\s*(\d{1,2})?$/.exec(text)
  if (!m) return null
  const word = m[1].trim()
  const number = m[2] ? parseInt(m[2]) : undefined

  for (const [pat, stype] of HEADING_PATTERNS) {
    if (pat.test(word)) return { type: stype, number, repeat }
  }
  return null
}

// ---------------------------------------------------------------------------
// Classify song vs hymn
// ---------------------------------------------------------------------------

export function classifyType(title: string, slides: string[]): ContentType {
  const t = title.toLowerCase()
  if (t.includes("hymn")) return "hymn"
  if (/^\d+[.\s]/.test(title.trim())) return "hymn"
  const headings = slides
    .map((s) => parseHeading(s.split("\n")[0]))
    .filter((h): h is NonNullable<typeof h> => h !== null)
  if (headings.length >= 2 && headings.every((h) => h.type === "verse")) return "hymn"
  return "song"
}

// ---------------------------------------------------------------------------
// Slides → Fusion sections + groups
// ---------------------------------------------------------------------------

export function slidesToFusion(
  slides: string[],
  contentType: ContentType,
): { sections: LyricSection[] | undefined; groups: LyricGroup[] } {
  const sections: LyricSection[] = []
  let flatGroups: LyricGroup[] = []
  const verseCounter: Record<string, number> = {}
  let recognised = false

  for (const slideText of slides) {
    if (!slideText.trim()) continue
    const lines = slideText.trim().split("\n")
    const first = lines[0]?.trim() ?? ""
    let heading = parseHeading(first)

    let content: string
    if (heading) {
      recognised = true
      const contentLines = lines.slice(1)
      content = contentLines.map((l) => l.trim()).join("\n").trim()
      if (!content) {
        content = first
        heading = null
      }
    } else {
      content = lines.map((l) => l.trim()).join("\n").trim()
    }

    if (!content) continue

    const gid = newGroupId()

    if (heading) {
      let { type: stype, number: snum, repeat: srep } = heading
      if (snum == null && stype === "verse") {
        snum = (verseCounter["verse"] ?? 0) + 1
      }
      if (snum != null) {
        verseCounter[stype] = Math.max(verseCounter[stype] ?? 0, snum)
      }

      const secRef: LyricGroup["section"] = { type: stype }
      if (snum != null) secRef.number = snum

      const group: LyricGroup = { id: gid, primary: content, section: secRef }
      if (srep) group.repeat = srep
      flatGroups.push(group)

      const sec: LyricSection = {
        id: newSectionId(),
        type: stype,
        groups: [{ id: gid, primary: content }],
      }
      if (snum != null) sec.number = snum
      if (srep) sec.repeat = srep
      sections.push(sec)
    } else {
      flatGroups.push({ id: gid, primary: content })
      sections.push({
        id: newSectionId(),
        type: "other",
        groups: [{ id: gid, primary: content }],
      })
    }
  }

  // Hymn consolidation
  if (contentType === "hymn" && recognised) {
    for (const sec of sections) {
      if (sec.groups.length > 1) {
        const combined = sec.groups.map((g) => g.primary).join("\n")
        sec.groups = [{ id: sec.groups[0].id, primary: combined }]
      }
    }
    flatGroups = []
    for (const sec of sections) {
      const ref: LyricGroup["section"] = { type: sec.type }
      if (sec.number != null) ref.number = sec.number
      for (const g of sec.groups) {
        const fg: LyricGroup = { ...g, section: ref }
        if (sec.repeat) fg.repeat = sec.repeat
        flatGroups.push(fg)
      }
    }
  }

  return { sections: recognised ? sections : undefined, groups: flatGroups }
}

// ---------------------------------------------------------------------------
// Normalise title for duplicate detection
// ---------------------------------------------------------------------------

export function normaliseTitle(t: string): string {
  return t.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim()
}

// ---------------------------------------------------------------------------
// EW song record (parsed from database)
// ---------------------------------------------------------------------------

export interface EwSong {
  ewId: number
  title: string
  author: string
  copyright: string
  slides: string[]
}

export interface EwAnalysisRecord {
  ewSong: EwSong
  fusionRecord: LyricSet
  status: "new" | "duplicate" | "conflict"
  existingTitle?: string
  existingId?: string
  selected: boolean
}

export interface EwAnalysisResult {
  totalSource: number
  records: EwAnalysisRecord[]
  newCount: number
  duplicateCount: number
  conflictCount: number
}

// ---------------------------------------------------------------------------
// Build a Fusion record from an EW song
// ---------------------------------------------------------------------------

export function buildFusionRecord(ewSong: EwSong): LyricSet | null {
  if (!ewSong.slides.length) return null

  const contentType = classifyType(ewSong.title, ewSong.slides)
  const { sections, groups } = slidesToFusion(ewSong.slides, contentType)
  if (!groups.length) return null

  const presentation: Presentation =
    contentType === "hymn"
      ? { sectionLabels: "numbers", verseNumberStyle: "heading" }
      : { sectionLabels: "off", verseNumberStyle: "none" }

  return {
    id: newSetId(),
    type: contentType,
    title: ewSong.title,
    groups,
    sections: sections ?? undefined,
    presentation,
    updatedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Read EW SQLite databases
// ---------------------------------------------------------------------------

export async function readEwDatabases(
  songsFile: File | ArrayBuffer,
  songWordsFile: File | ArrayBuffer,
): Promise<EwSong[]> {
  const SQL = await loadSqlJs()

  const songsBuf =
    songsFile instanceof File ? new Uint8Array(await songsFile.arrayBuffer()) : new Uint8Array(songsFile)
  const wordsBuf =
    songWordsFile instanceof File
      ? new Uint8Array(await songWordsFile.arrayBuffer())
      : new Uint8Array(songWordsFile)

  const songsDb = new SQL.Database(songsBuf)
  const wordsDb = new SQL.Database(wordsBuf)

  try {
    const songRows = songsDb.exec(
      "SELECT rowid, title, author, copyright FROM song",
    )
    const wordRows = wordsDb.exec("SELECT song_id, words FROM word")

    if (!songRows.length || !wordRows.length) return []

    const wordsMap = new Map<number, Uint8Array | string>()
    for (const row of wordRows[0].values) {
      wordsMap.set(row[0] as number, row[1] as Uint8Array | string)
    }

    const results: EwSong[] = []
    for (const row of songRows[0].values) {
      const rowid = row[0] as number
      const title = ((row[1] as string) ?? "").trim()
      const author = ((row[2] as string) ?? "").trim()
      const copyright = ((row[3] as string) ?? "").trim()

      const rawWords = wordsMap.get(rowid)
      let text: string
      if (rawWords instanceof Uint8Array) {
        text = await decompressBlobAsync(rawWords)
      } else if (typeof rawWords === "string") {
        text = rawWords
      } else {
        text = ""
      }

      const slides = rtfToSlides(text)
      results.push({ ewId: rowid, title, author, copyright, slides })
    }

    return results
  } finally {
    songsDb.close()
    wordsDb.close()
  }
}

// ---------------------------------------------------------------------------
// Analyse: compare EW songs against existing Fusion library
// ---------------------------------------------------------------------------

export function analyseEwSongs(
  ewSongs: EwSong[],
  existingLibrary: LyricSet[],
): EwAnalysisResult {
  const existingByNormTitle = new Map<string, LyricSet>()
  for (const set of existingLibrary) {
    existingByNormTitle.set(normaliseTitle(set.title), set)
  }

  const records: EwAnalysisRecord[] = []
  let newCount = 0
  let duplicateCount = 0
  let conflictCount = 0

  for (const ew of ewSongs) {
    const fusion = buildFusionRecord(ew)
    if (!fusion) continue

    const normTitle = normaliseTitle(ew.title)
    const existing = existingByNormTitle.get(normTitle)

    let status: EwAnalysisRecord["status"]
    if (!existing) {
      status = "new"
      newCount++
    } else if (existing.type !== fusion.type) {
      status = "conflict"
      conflictCount++
    } else {
      status = "duplicate"
      duplicateCount++
    }

    records.push({
      ewSong: ew,
      fusionRecord: fusion,
      status,
      existingTitle: existing?.title,
      existingId: existing?.id,
      selected: status === "new",
    })
  }

  return {
    totalSource: ewSongs.length,
    records,
    newCount,
    duplicateCount,
    conflictCount,
  }
}
