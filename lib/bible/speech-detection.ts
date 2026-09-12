/**
 * Bible Speech Detection Pipeline — strict mode
 *
 * This is the entry point for the AI Bible detection model. It chains:
 *   1. normalize-speech  — converts spoken forms to regex-friendly text
 *   2. detect-references — standard regex match on the normalised text
 *   3. fuzzy-books       — corrects misheard book names and re-runs regex
 *   4. Strict gate       — drops any result without a chapter number
 *
 * This file is intentionally separate from detect-references.ts to avoid
 * a circular import (fuzzy-books imports detect-references; detect-references
 * must NOT import fuzzy-books at module scope).
 *
 * Call detectBibleReferencesFromSpeech() for microphone transcripts.
 * Call detectBibleReferences() from detect-references.ts for typed text.
 */

import { detectBibleReferences, type BibleReference } from "./detect-references"
import { normalizeSpeechTranscript } from "./normalize-speech"
import { findFuzzyBooksInText } from "./fuzzy-books"

export type { BibleReference }

/**
 * Detects Bible references from a raw Web Speech API transcript.
 *
 * Strict mode rules:
 * - Spoken number words are converted before matching ("chapter three" → "3")
 * - Misheard book names are corrected via fuzzy matching (confidence ≥ 0.80)
 * - Results without a chapter number are silently dropped
 * - Prefer zero false positives over completeness
 */
export function detectBibleReferencesFromSpeech(rawTranscript: string): BibleReference[] {
  // Step 1: normalise spoken forms
  const normalised = normalizeSpeechTranscript(rawTranscript)

  // Step 2: standard regex on normalised text
  const directMatches = detectBibleReferences(normalised)
  const seenRefs = new Set(directMatches.map((r) => r.reference))

  // Step 3: fuzzy fallback for misheard book names
  const fuzzyBooks = findFuzzyBooksInText(normalised)
  const extraMatches: BibleReference[] = []

  for (const { match: fuzzyBook, index, windowText } of fuzzyBooks) {
    if (!fuzzyBook || fuzzyBook.confidence < 0.80) continue

    // Replace the misheard token with the corrected alias and re-run regex
    const correctedText =
      normalised.slice(0, index) +
      fuzzyBook.matchedAlias +
      normalised.slice(index + windowText.length)

    for (const ref of detectBibleReferences(correctedText)) {
      if (!seenRefs.has(ref.reference)) {
        seenRefs.add(ref.reference)
        extraMatches.push(ref)
      }
    }
  }

  // Step 4: strict gate — must have chapter number to avoid false positives
  return [...directMatches, ...extraMatches].filter((r) => r.chapter > 0)
}
