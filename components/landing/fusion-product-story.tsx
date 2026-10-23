"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { BookOpen, Check, ChevronRight, MonitorUp, Music2, Pause, Play, Radio } from "lucide-react"

import { cn } from "@/lib/utils"

const stages = [
  { label: "Prepare", note: "Select the exact passage" },
  { label: "Preview", note: "Check the congregation view" },
  { label: "On air", note: "Send it to OBS" },
] as const

export function FusionProductStory() {
  const reduceMotion = useReducedMotion()
  const [stage, setStage] = useState(0)
  const [paused, setPaused] = useState(Boolean(reduceMotion))

  useEffect(() => {
    if (paused || reduceMotion) return
    const timer = window.setInterval(() => setStage((current) => (current + 1) % stages.length), 3600)
    return () => window.clearInterval(timer)
  }, [paused, reduceMotion])

  return (
    <div className="relative mx-auto w-full max-w-[760px]" aria-label="Fusion workflow demonstration">
      <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-500/12 via-transparent to-cyan-400/10 blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/[0.12] bg-[#0d0d12]/95 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300/70" />
            <span className="ml-2 text-xs font-medium text-white/60">Fusion workspace</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">Product demonstration</span>
        </div>

        <div className="grid min-h-[410px] lg:grid-cols-[0.94fr_1.06fr]">
          <div className="border-b border-white/[0.08] p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-violet-300/70">Bible operator</p><h2 className="mt-1 text-lg font-semibold">Psalm 121</h2></div>
              <BookOpen className="h-5 w-5 text-white/55" aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-2">
              {["I lift up my eyes to the mountains—", "where does my help come from?", "My help comes from the Lord,"].map((line, index) => {
                const selected = index < 2
                return (
                  <div key={line} className={cn("flex gap-3 rounded-xl border px-3 py-3 text-sm leading-5 transition-colors", selected ? "border-violet-400/25 bg-violet-400/10 text-white/85" : "border-white/[0.06] text-white/55")}>
                    <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border", selected ? "border-violet-300/40 bg-violet-400/20" : "border-white/10")}>{selected && <Check className="h-3 w-3 text-violet-200" aria-hidden="true" />}</span>
                    <span>{line}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
              <div><p className="text-xs font-medium text-white/80">2 verses selected</p><p className="mt-0.5 text-[11px] text-white/55">Room: Main service</p></div>
              <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors", stage === 2 ? "bg-cyan-300 text-slate-950" : "bg-violet-500 text-white")}>
                {stage === 2 ? <Radio className="h-3.5 w-3.5" /> : <MonitorUp className="h-3.5 w-3.5" />}{stage === 2 ? "On air" : "Send to display"}
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[300px] flex-col bg-black p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/55"><span className={cn("h-1.5 w-1.5 rounded-full", stage === 2 ? "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]" : "bg-white/40")} />OBS output</div>
              <span className="text-[10px] text-white/45">1920 × 1080</span>
            </div>
            <div className="relative mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,.24),transparent_42%),linear-gradient(150deg,#17131f,#08080a_68%)] px-7 text-center">
              <AnimatePresence mode="wait">
                <motion.div key={stage} initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }} transition={{ duration: reduceMotion ? 0.1 : 0.42, ease: [0.22, 1, 0.36, 1] }} className="max-w-sm">
                  {stage === 0 ? <><p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-200/70">Ready to preview</p><p className="mt-4 text-xl font-medium leading-snug text-white/55">Selected scripture will appear here.</p></> : stage === 1 ? <><p className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">I lift up my eyes to the mountains—</p><p className="mt-3 text-base text-white/70">where does my help come from?</p><p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-violet-200/70">Psalm 121:1–2</p></> : <><div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-100/80"><Music2 className="h-3 w-3" /> Next: Worship lyrics</div><p className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">I lift up my eyes to the mountains—</p><p className="mt-3 text-base text-white/70">where does my help come from?</p></>}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-1" role="tablist" aria-label="Demonstration step">
            {stages.map((item, index) => <button key={item.label} type="button" role="tab" aria-selected={stage === index} onClick={() => { setStage(index); setPaused(true) }} className={cn("rounded-lg px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400", stage === index ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white/80")}><span className="block text-xs font-medium">{item.label}</span><span className="hidden text-[10px] text-white/55 xl:block">{item.note}</span></button>)}
          </div>
          <button type="button" onClick={() => setPaused((value) => !value)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label={paused ? "Play demonstration" : "Pause demonstration"}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}{paused ? "Play" : "Pause"}<ChevronRight className="h-3.5 w-3.5 text-white/45" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">Demonstration step: {stages[stage].label}. {stages[stage].note}</p>
    </div>
  )
}
