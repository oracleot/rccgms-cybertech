import { Video, History } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DescriptionForm } from "@/components/livestream/description-form"

export const metadata = {
  title: "Livestream Generator | Cyber Tech",
  description: "Generate livestream descriptions for YouTube and Facebook",
}

export default async function LivestreamPage() {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Livestream Description Generator
            </h1>
          </div>
          <p className="text-muted-foreground">
            Generate professional YouTube and Facebook descriptions for your services
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/livestream/history">
            <History className="mr-2 h-4 w-4" />
            View History
          </Link>
        </Button>
      </div>

      {/* Description Form */}
      <DescriptionForm />
    </div>
  )
}
