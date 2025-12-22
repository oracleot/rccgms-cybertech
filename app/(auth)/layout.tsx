import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { Toaster } from "@/components/ui/sonner"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to dashboard if already authenticated
  if (user) {
    redirect(ROUTES.HOME)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
      <Toaster />
    </div>
  )
}
