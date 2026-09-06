import { Metadata } from "next"
import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { PublicAvailabilityForm } from "@/components/rota/public-availability-form"

export const metadata: Metadata = {
  title: "Set Your Availability | RCCG Morning Star",
  description: "Let your team know when you're available to serve.",
}

export default function PublicAvailabilityPage() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
            <CalendarDays className="h-8 w-8" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Set Your Availability
        </h1>
        <p className="text-muted-foreground">
          Let your team know when you can and can&apos;t serve, no sign-in required.
        </p>
      </div>

      {/* Form */}
      <PublicAvailabilityForm />

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Already signed in?{" "}
          <Link href="/rota/availability" className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
            Use the in-app calendar
          </Link>{" "}
          instead. Questions?{" "}
          <a
            href="mailto:tech@rccgmorningstar.org"
            className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
          >
            Contact the tech team
          </a>
        </p>
      </div>
    </div>
  )
}
