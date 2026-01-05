import { Metadata } from "next"
import { Palette, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DesignRequestList } from "@/components/designs/design-request-list"

export const metadata: Metadata = {
  title: "Design Requests | Cyber Tech",
  description: "View and manage design requests",
}

export default function DesignsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Design Requests</h1>
            <p className="text-sm text-muted-foreground">
              View and manage design requests from the congregation
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/designs/request" target="_blank">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* List */}
      <DesignRequestList />
    </div>
  )
}
