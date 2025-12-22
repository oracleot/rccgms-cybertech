import { CardSkeleton } from "@/components/shared/loading-skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-[300px] animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-[250px] animate-pulse rounded-md bg-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-[100px] animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 h-8 w-[60px] animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-[80px] animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}
