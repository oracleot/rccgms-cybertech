import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/constants"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LiveSessionBanner } from "@/components/rundown/live-session-banner"
import { RundownLiveProvider } from "@/components/rundown/rundown-live-provider"
import { Toaster } from "@/components/ui/sonner"
import { getFusionContext } from "@/lib/parish/context"
import { getParishFeatures } from "@/lib/features/guards"
import { ParishChooser } from "@/components/parish/parish-chooser"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getFusionContext()

  if (!ctx) {
    redirect(ROUTES.LOGIN)
  }

  const userRole = (ctx.profile.role ?? "member") as "admin" | "lead_developer" | "developer" | "leader" | "member"
  const parishRole = ctx.activeParish?.parishRole ?? null
  const parishId = ctx.activeParish?.parish.id ?? null

  // Parish resolution never guesses: with no active parish we either need the
  // user to choose (2+ memberships) or they are pending (0 memberships).
  // Platform developers keep dashboard access without a parish.
  const isPlatformDeveloper = userRole === "lead_developer" || userRole === "developer"
  const needsParishChoice = !ctx.activeParish && ctx.memberships.length > 1
  const isParishPending = !ctx.activeParish && ctx.memberships.length === 0 && !isPlatformDeveloper

  let enabledFeatures: string[] = []
  if (parishId) {
    const features = await getParishFeatures(parishId)
    enabledFeatures = features.filter((f) => f.enabled).map((f) => f.slug)
  }

  return (
    <RundownLiveProvider>
      <SidebarProvider>
        <AppSidebar userRole={userRole} parishRole={parishRole} enabledFeatures={enabledFeatures} />
        <SidebarInset>
          <Header
            user={{
              name: ctx.profile.name,
              email: ctx.user.email ?? "",
              avatarUrl: ctx.profile.avatar_url,
            }}
          />
          <LiveSessionBanner />
          <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
            {needsParishChoice ? (
              <ParishChooser
                options={ctx.memberships
                  .filter((m) => m.parish)
                  .map((m) => ({
                    parishId: m.parish_id,
                    parishName: m.parish!.name,
                    locality: m.parish!.locality,
                    role: m.role,
                  }))}
              />
            ) : isParishPending ? (
              <div className="mx-auto mt-16 max-w-md rounded-xl border p-6 text-center">
                <h1 className="text-lg font-semibold">Waiting for parish access</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your account is not linked to an active parish yet. A parish
                  administrator needs to approve your membership before you can
                  use Fusion.
                </p>
              </div>
            ) : (
              children
            )}
          </main>
          <MobileNav enabledFeatures={enabledFeatures} isDeveloper={isPlatformDeveloper} />
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </RundownLiveProvider>
  )
}
