/**
 * Bible reference detection — scans a string and returns all Bible references found.
 * Handles standard formats (John 3:16), ordinal books (1 Corinthians 13:4),
 * and chapter-only references (Psalm 23). Sorted longest-match-first so
 * "Song of Solomon" is preferred over plain "Song".
 */

interface BookEntry {
  canonical: string   // API path fragment, e.g. "john", "1+corinthians"
  displayName: string // Human-readable, e.g. "1 Corinthians"
  aliases: string[]   // All accepted forms, lowercased
}

const BOOKS: BookEntry[] = [
  // Old Testament
  { canonical: "genesis", displayName: "Genesis", aliases: ["genesis", "gen", "ge", "gn"] },
  { canonical: "exodus", displayName: "Exodus", aliases: ["exodus", "exod", "ex"] },
  { canonical: "leviticus", displayName: "Leviticus", aliases: ["leviticus", "lev", "le", "lv"] },
  { canonical: "numbers", displayName: "Numbers", aliases: ["numbers", "num", "nu", "nm", "nb"] },
  { canonical: "deuteronomy", displayName: "Deuteronomy", aliases: ["deuteronomy", "deut", "de", "dt"] },
  { canonical: "joshua", displayName: "Joshua", aliases: ["joshua", "josh", "jos", "jsh"] },
  { canonical: "judges", displayName: "Judges", aliases: ["judges", "judg", "jdg", "jg"] },
  { canonical: "ruth", displayName: "Ruth", aliases: ["ruth", "ru"] },
  { canonical: "1+samuel", displayName: "1 Samuel", aliases: ["1 samuel", "1samuel", "1 sam", "1sam", "1sa", "first samuel", "i samuel"] },
  { canonical: "2+samuel", displayName: "2 Samuel", aliases: ["2 samuel", "2samuel", "2 sam", "2sam", "2sa", "second samuel", "ii samuel"] },
  { canonical: "1+kings", displayName: "1 Kings", aliases: ["1 kings", "1kings", "1 kgs", "1kgs", "1ki", "first kings", "i kings"] },
  { canonical: "2+kings", displayName: "2 Kings", aliases: ["2 kings", "2kings", "2 kgs", "2kgs", "2ki", "second kings", "ii kings"] },
  { canonical: "1+chronicles", displayName: "1 Chronicles", aliases: ["1 chronicles", "1chronicles", "1 chr", "1chr", "1ch", "first chronicles", "i chronicles"] },
  { canonical: "2+chronicles", displayName: "2 Chronicles", aliases: ["2 chronicles", "2chronicles", "2 chr", "2chr", "2ch", "second chronicles", "ii chronicles"] },
  { canonical: "ezra", displayName: "Ezra", aliases: ["ezra", "ezr"] },
  { canonical: "nehemiah", displayName: "Nehemiah", aliases: ["nehemiah", "neh", "ne"] },
  { canonical: "esther", displayName: "Esther", aliases: ["esther", "esth", "est"] },
  { canonical: "job", displayName: "Job", aliases: ["job", "jb"] },
  { canonical: "psalms", displayName: "Psalm", aliases: ["psalms", "psalm", "pss", "ps"] },
  { canonical: "proverbs", displayName: "Proverbs", aliases: ["proverbs", "prov", "pr", "prv"] },
  { canonical: "ecclesiastes", displayName: "Ecclesiastes", aliases: ["ecclesiastes", "eccles", "eccl", "ec"] },
  { canonical: "song+of+solomon", displayName: "Song of Solomon", aliases: ["song of solomon", "song of songs", "song", "sos", "ss", "cant"] },
  { canonical: "isaiah", displayName: "Isaiah", aliases: ["isaiah", "isa"] },
  { canonical: "jeremiah", displayName: "Jeremiah", aliases: ["jeremiah", "jer", "je", "jr"] },
  { canonical: "lamentations", displayName: "Lamentations", aliases: ["lamentations", "lam", "la"] },
  { canonical: "ezekiel", displayName: "Ezekiel", aliases: ["ezekiel", "ezek", "eze", "ezk"] },
  { canonical: "daniel", displayName: "Daniel", aliases: ["daniel", "dan", "da", "dn"] },
  { canonical: "hosea", displayName: "Hosea", aliases: ["hosea", "hos", "ho"] },
  { canonical: "joel", displayName: "Joel", aliases: ["joel", "jl"] },
  { canonical: "amos", displayName: "Amos", aliases: ["amos", "am"] },
  { canonical: "obadiah", displayName: "Obadiah", aliases: ["obadiah", "obad", "ob"] },
  { canonical: "jonah", displayName: "Jonah", aliases: ["jonah", "jon", "jnh"] },
  { canonical: "micah", displayName: "Micah", aliases: ["micah", "mic", "mi"] },
  { canonical: "nahum", displayName: "Nahum", aliases: ["nahum", "nah", "na"] },
  { canonical: "habakkuk", displayName: "Habakkuk", aliases: ["habakkuk", "hab"] },
  { canonical: "zephaniah", displayName: "Zephaniah", aliases: ["zephaniah", "zeph", "zep", "zp"] },
  { canonical: "haggai", displayName: "Haggai", aliases: ["haggai", "hag", "hg"] },
  { canonical: "zechariah", displayName: "Zechariah", aliases: ["zechariah", "zech", "zec", "zc"] },
  { canonical: "malachi", displayName: "Malachi", aliases: ["malachi", "mal"] },
  // New Testament
  { canonical: "matthew", displayName: "Matthew", aliases: ["matthew", "matt", "mt"] },
  { canonical: "mark", displayName: "Mark", aliases: ["mark", "mk", "mrk"] },
  { canonical: "luke", displayName: "Luke", aliases: ["luke", "lk", "luk"] },
  { canonical: "john", displayName: "John", aliases: ["john", "jn", "jhn"] },
  { canonical: "acts", displayName: "Acts", aliases: ["acts", "ac"] },
  { canonical: "romans", displayName: "Romans", aliases: ["romans", "rom", "ro", "rm"] },
  { canonical: "1+corinthians", displayName: "1 Corinthians", aliases: ["1 corinthians", "1corinthians", "1 cor", "1cor", "1co", "first corinthians", "i corinthians"] },
  { canonical: "2+corinthians", displayName: "2 Corinthians", aliases: ["2 corinthians", "2corinthians", "2 cor", "2cor", "2co", "second corinthians", "ii corinthians"] },
  { canonical: "galatians", displayName: "Galatians", aliases: ["galatians", "gal", "ga"] },
  { canonical: "ephesians", displayName: "Ephesians", aliases: ["ephesians", "eph"] },
  { canonical: "philippians", displayName: "Philippians", aliases: ["philippians", "phil", "php"] },
  { canonical: "colossians", displayName: "Colossians", aliases: ["colossians", "col"] },
  { canonical: "1+thessalonians", displayName: "1 Thessalonians", aliases: ["1 thessalonians", "1thessalonians", "1 thess", "1thess", "1th", "first thessalonians", "i thessalonians"] },
  { canonical: "2+thessalonians", displayName: "2 Thessalonians", aliases: ["2 thessalonians", "2thessalonians", "2 thess", "2thess", "2th", "second thessalonians", "ii thessalonians"] },
  { canonical: "1+timothy", displayName: "1 Timothy", aliases: ["1 timothy", "1timothy", "1 tim", "1tim", "1ti", "first timothy", "i timothy"] },
  { canonical: "2+timothy", displayName: "2 Timothy", aliases: ["2 timothy", "2timothy", "2 tim", "2tim", "2ti", "second timothy", "ii timothy"] },
  { canonical: "titus", displayName: "Titus", aliases: ["titus", "tit"] },
  { canonical: "philemon", displayName: "Philemon", aliases: ["philemon", "phlm", "phm"] },
  { canonical: "hebrews", displayName: "Hebrews", aliases: ["hebrews", "heb"] },
  { canonical: "james", displayName: "James", aliases: ["james", "jas", "jm"] },
  { canonical: "1+peter", displayName: "1 Peter", aliases: ["1 peter", "1peter", "1 pet", "1pet", "1pe", "first peter", "i peter"] },
  { canonical: "2+peter", displayName: "2 Peter", aliases: ["2 peter", "2peter", "2 pet", "2pet", "2pe", "second peter", "ii peter"] },
  { canonical: "1+john", displayName: "1 John", aliases: ["1 john", "1john", "1 jn", "1jn", "1jo", "first john", "i john"] },
  { canonical: "2+john", displayName: "2 John", aliases: ["2 john", "2john", "2 jn", "2jn", "2jo", "second john", "ii john"] },
  { canonical: "3+john", displayName: "3 John", aliases: ["3 john", "3john", "3 jn", "3jn", "3jo", "third john", "iii john"] },
  { canonical: "jude", displayName: "Jude", aliases: ["jude", "jud"] },
  { canonical: "revelation", displayName: "Revelation", aliases: ["revelation", "revelations", "rev", "rv", "apocalypse"] },
]

// Build alias -> book lookup, and collect all patterns sorted longest first
const BOOK_BY_ALIAS = new Map<string, { canonical: string; displayName: string }>()
interface AliasPattern { escaped: string; canonical: string; displayName: string }
const ALL_PATTERNS: AliasPattern[] = []

for (const book of BOOKS) {
  for (const alias of book.aliases) {
    const key = alias.trim()
    BOOK_BY_ALIAS.set(key, { canonical: book.canonical, displayName: book.displayName })
    ALL_PATTERNS.push({
      escaped: key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      canonical: book.canonical,
      displayName: book.displayName,
    })
  }
}
ALL_PATTERNS.sort((a, b) => b.escaped.length - a.escaped.length)

// Master regex:
// (book alias) whitespace (chapter) optional ([:space] verse optional (-endVerse))
const BIBLE_REF_RE = new RegExp(
  `\\b(${ALL_PATTERNS.map((p) => p.escaped).join("|")})` +
  `[.\\s]+` +
  `(\\d{1,3})` +
  `(?:[:\\s]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?`,
  "gi"
)

export interface BibleReference {
  raw: string
  displayBook: string
  chapter: number
  verse?: number
  endVerse?: number
  reference: string // "John 3:16"
  apiPath: string   // "john+3:16" for bible-api.com
}

export function detectBibleReferences(text: string): BibleReference[] {
  const results: BibleReference[] = []
  const seen = new Set<string>()

  // Reset lastIndex before exec loop
  BIBLE_REF_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = BIBLE_REF_RE.exec(text)) !== null) {
    const [raw, bookAlias, chapterStr, verseStr, endVerseStr] = match
    const aliasKey = bookAlias.toLowerCase().trim()
    const bookEntry = BOOK_BY_ALIAS.get(aliasKey)
    if (!bookEntry) continue

    const chapter = parseInt(chapterStr, 10)
    const verse = verseStr ? parseInt(verseStr, 10) : undefined
    const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : undefined

    const reference = verse
      ? endVerse
        ? `${bookEntry.displayName} ${chapter}:${verse}-${endVerse}`
        : `${bookEntry.displayName} ${chapter}:${verse}`
      : `${bookEntry.displayName} ${chapter}`

    if (seen.has(reference)) continue
    seen.add(reference)

    const apiPath = verse
      ? endVerse
        ? `${bookEntry.canonical}+${chapter}:${verse}-${endVerse}`
        : `${bookEntry.canonical}+${chapter}:${verse}`
      : `${bookEntry.canonical}+${chapter}`

    results.push({ raw, displayBook: bookEntry.displayName, chapter, verse, endVerse, reference, apiPath })
  }

  return results
}
