"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { FusionProductStory } from "@/components/landing/fusion-product-story"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    async function handleAuthHash() {
      const hash = window.location.hash
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        const type = params.get("type")

        if (accessToken && refreshToken) {
          const supabase = createClient()
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (!error) {
            window.history.replaceState(null, "", "/")
            if (type === "invite" || type === "signup" || type === "magiclink") {
              router.push("/accept-invite")
              return
            }
            if (type === "recovery") {
              router.push("/reset-password")
              return
            }
            router.push("/dashboard")
            return
          }
        }
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
        return
      }
      setIsProcessing(false)
    }

    void handleAuthHash()
  }, [router])

  if (isProcessing) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070709] text-white">
        <div className="flex items-center gap-3 text-sm text-white/60" role="status">
          <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-lg" priority />
          Opening Fusion…
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070709] text-white selection:bg-violet-400/30">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-22rem] h-[42rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <nav className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12" aria-label="Primary navigation">
        <Link href="/" className="flex items-center gap-3 rounded-lg outline-none ring-violet-400 focus-visible:ring-2">
          <Image src="/icons/icon-192.png" alt="" width={38} height={38} className="rounded-xl" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">FUSION</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-5">
          <a href="#how-it-works" className="hidden text-sm text-white/60 transition hover:text-white sm:block">How it works</a>
          <a href="#capabilities" className="hidden text-sm text-white/60 transition hover:text-white md:block">Capabilities</a>
          <Link href="/login" className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
            Sign in
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-12 px-5 pb-16 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-16 lg:px-12 lg:pb-24 lg:pt-24">
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/[0.08] px-3 py-1.5 text-xs font-medium tracking-wide text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Built for the people behind the service
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
            Prepare once.
            <span className="mt-2 block bg-gradient-to-r from-violet-300 via-white to-cyan-200 bg-clip-text text-transparent">Present with confidence.</span>
          </h1>
          <p className="mt-7 max-w-lg text-pretty text-base leading-7 text-white/70 sm:text-lg">
            Fusion brings scripture, worship lyrics, service planning and team coordination into one dependable workspace—then carries what you prepare straight into OBS.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070709]">
              Open Fusion <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
              See how it works
            </a>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/55">Invite-only access · Managed by your church team</p>
        </div>
        <FusionProductStory />
      </section>

      <section id="how-it-works" className="relative z-10 border-t border-white/[0.08] bg-white/[0.025]">
        <div className="mx-auto grid max-w-[1440px] gap-4 px-5 py-14 sm:px-8 md:grid-cols-3 lg:px-12 lg:py-20">
          {[
            ["01", "Prepare", "Build the service with the Bible, worship library, rotas, meetings and rundowns in one place."],
            ["02", "Preview", "See exactly what the congregation will see before anything goes live."],
            ["03", "Present", "Send the selected content to a clean OBS surface while the operator stays in control."],
          ].map(([number, title, copy]) => (
            <article key={number} className="rounded-2xl border border-white/[0.08] bg-black/20 p-6 transition hover:-translate-y-1 hover:border-violet-300/20 hover:bg-white/[0.04]">
              <p className="font-mono text-xs text-violet-300/70">{number}</p>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className="relative z-10 border-t border-white/[0.08]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/70">One connected workspace</p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">From preparation to the live room, the team stays in sync.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-white/60 lg:justify-self-end">Plan services, coordinate people, prepare content and operate live displays without moving the work between disconnected tools.</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Bible & lyrics", "Prepare scripture and worship content for display."],
              ["Rundowns", "Keep every service moment in a shared running order."],
              ["Rotas", "Coordinate availability, assignments and team coverage."],
              ["Meetings", "Invite the right people and keep the link with the event."],
              ["Training", "Guide teams through learning and verification."],
              ["OBS control", "Send clean, operator-controlled output to the live production."],
            ].map(([title, copy]) => (
              <article key={title} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-cyan-200/20 hover:bg-cyan-200/[0.035]">
                <div className="mb-5 h-px w-10 bg-gradient-to-r from-violet-400 to-cyan-300 transition-all group-hover:w-16" />
                <h3 className="font-semibold text-white/90">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl border border-violet-300/15 bg-gradient-to-r from-violet-500/10 to-cyan-400/[0.06] p-6 sm:flex-row sm:items-center lg:p-8">
            <div><h2 className="text-xl font-semibold">Ready for the next service?</h2><p className="mt-1 text-sm text-white/60">Open the workspace your church team already shares.</p></div>
            <Link href="/login" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">Open Fusion <span className="ml-2" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </main>
  )
}
