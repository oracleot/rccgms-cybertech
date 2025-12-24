import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { Toaster } from "@/components/ui/sonner"
import { Particles } from "@/components/ui/particles"

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-black to-indigo-950/30" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Particles */}
      <Particles
        className="absolute inset-0"
        quantity={50}
        staticity={40}
        ease={60}
        size={0.5}
        color="#8b5cf6"
      />
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-600/20 blur-[100px]" />
      
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
      <Toaster />
    </div>
  )
}
