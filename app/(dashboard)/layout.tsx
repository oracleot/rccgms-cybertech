import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, avatar_url")
    .eq("auth_user_id", user.id)
    .single() as { data: { id: string; name: string; role: string; avatar_url: string | null } | null }

  const userRole = (profile?.role ?? "member") as "admin" | "developer" | "leader" | "member"

  return (
    <SidebarProvider>
      <AppSidebar userRole={userRole as "admin" | "developer" | "leader" | "member"} />
      <SidebarInset>
        <Header
          user={
            profile
              ? {
                  name: profile.name,
                  email: user.email ?? "",
                  avatarUrl: profile.avatar_url,
                }
              : null
          }
        />
        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
        <MobileNav />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
