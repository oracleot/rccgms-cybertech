"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    // Handle Supabase auth hash fragments (from invite/magic links)
    // These come as /#access_token=...&type=invite...
    const handleAuthHash = async () => {
      const hash = window.location.hash
      
      if (hash && hash.includes("access_token")) {
        // Parse the hash fragment
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        const type = params.get("type")
        
        // Debug: log the type to understand what Supabase sends
        console.log("Auth hash type:", type)
        
        if (accessToken && refreshToken) {
          const supabase = createClient()
          
          // Set the session from the tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (!error) {
            // Clear the hash from URL
            window.history.replaceState(null, "", "/")
            
            // Redirect based on auth type
            // Supabase uses different type values:
            // - "signup" or "invite" for new user invitations
            // - "recovery" for password reset
            // - "magiclink" for passwordless login
            if (type === "invite" || type === "signup" || type === "magiclink") {
              // New user needs to set password
              router.push("/accept-invite")
              return
            } else if (type === "recovery") {
              // Password reset flow - go to reset password page
              router.push("/reset-password")
              return
            } else {
              // Unknown type or email confirmation - go to dashboard
              router.push("/dashboard")
              return
            }
          }
        }
      }
      
      // No auth hash - check if user is already logged in
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push("/dashboard")
        return
      }
      
      // Not logged in, show the landing page
      setIsProcessing(false)
    }
    
    handleAuthHash()
  }, [router])

  // Show loading while processing auth
  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Landing page for non-authenticated users
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Cyber Tech</CardTitle>
          <CardDescription className="text-base">
            Tech Department Management for RCCG Morningstar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Manage rotas, equipment, rundowns, and more. Sign in to access your dashboard.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/login" className="w-full">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account? Contact your team leader for an invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
