"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseReferenceInput } from "@/lib/bible/parse-reference"
import { loadPassage, PassageUnavailableError } from "@/lib/bible/passage-store"
import type { FetchedPassage } from "@/lib/bible/fetch-passage"

const EXAMPLES = ["John 3:16", "Psalm 23", "Romans 8:28", "Matthew 5:3-12"]

export function PublicBibleReader() {
  const [query, setQuery] = useState("")
  const [passage, setPassage] = useState<FetchedPassage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function read(reference: string) {
    const parsed = parseReferenceInput(reference.trim())
    if (!parsed.best || parsed.best.confidence === "low") {
      setError("Enter a Bible reference such as John 3:16 or Psalm 23.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      setPassage(await loadPassage(parsed.best.apiPath, "kjv", "high"))
    } catch (cause) {
      setError(
        cause instanceof PassageUnavailableError
          ? "That passage is not available right now."
          : "We could not load that passage. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#08080b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
            <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-xl" priority />
            <span className="text-sm font-semibold tracking-[0.16em]">FUSION BIBLE</span>
          </Link>
          <Link href="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white">
            Church sign in
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.2),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl px-5 py-14 text-center sm:px-8 sm:py-20">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10">
            <BookOpen className="h-6 w-6 text-violet-200" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-violet-200/70">Free public reader</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Read a Bible passage</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/60">
            Search by reference and read the King James Version. Live presentation and operator tools remain inside your parish workspace.
          </p>

          <form
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault()
              void read(query)
            }}
          >
            <label htmlFor="bible-reference" className="sr-only">Bible reference</label>
            <Input
              id="bible-reference"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try John 3:16 or Psalm 23"
              autoComplete="off"
              className="h-12 flex-1 border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
            />
            <Button type="submit" disabled={loading} className="h-12 bg-violet-600 px-6 text-white hover:bg-violet-500">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Read passage
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Example references">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => { setQuery(example); void read(example) }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition hover:border-violet-300/30 hover:text-white">
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14" aria-live="polite">
        {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100">{error}</div>}
        {passage ? (
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-9">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-5">
              <h2 className="text-2xl font-semibold tracking-tight">{passage.reference}</h2>
              <span className="text-xs uppercase tracking-[0.16em] text-white/45">King James Version</span>
            </div>
            <div className="mt-6 space-y-4 text-lg leading-8 text-white/80">
              {passage.verses.map((verse) => (
                <p key={`${verse.book}-${verse.chapter}-${verse.verse}`}>
                  <sup className="mr-2 text-xs font-semibold text-violet-300">{verse.verse}</sup>
                  {verse.text}
                </p>
              ))}
            </div>
          </article>
        ) : !error && (
          <div className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-white/40">
            Your passage will appear here.
          </div>
        )}
      </section>
    </main>
  )
}
