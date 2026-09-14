import { LyricsEditor } from "@/components/lyrics/editor/lyrics-editor"

export default function LyricsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lyrics & Prayer Points</h1>
        <p className="text-sm text-muted-foreground">
          Prepare songs and prayer sets here, then drive them live from the OBS dock. Output is a transparent
          Browser Source at <code className="rounded bg-muted px-1 py-0.5 text-xs">/lyrics/obs</code> — no logo, no
          watermark, text only.
        </p>
      </div>
      <LyricsEditor />
    </div>
  )
}
