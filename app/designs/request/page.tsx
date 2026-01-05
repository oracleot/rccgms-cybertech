import { Metadata } from "next"
import { Palette } from "lucide-react"
import { DesignRequestForm } from "@/components/designs/design-request-form"

export const metadata: Metadata = {
  title: "Request a Design | RCCG Morning Star",
  description: "Submit a design request for banners, flyers, social graphics, and more.",
}

export default function DesignRequestPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
            <Palette className="h-8 w-8" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Request a Design
        </h1>
        <p className="text-muted-foreground">
          Need a banner, flyer, or graphic? Fill out the form below and our design team will get started.
        </p>
      </div>

      {/* Form */}
      <DesignRequestForm />

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          You&apos;ll receive email updates as your design progresses. Questions?{" "}
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
