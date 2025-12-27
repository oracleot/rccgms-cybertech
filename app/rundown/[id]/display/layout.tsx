import { ReactNode } from "react"
import "@/app/globals.css"

/**
 * Minimal layout for the projection display
 * No navigation, sidebar, or other chrome - just the display content
 */
export default function DisplayLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full overflow-hidden bg-black">
      {children}
    </main>
  )
}
