"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth"
import { ROUTES } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userName, setUserName] = useState<string>("")

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    const code = searchParams.get("code")
    
    const verifyInvitation = async () => {
      const supabase = createClient()
      
      if (code) {
        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error("Invitation verification error:", error)
          setIsVerifying(false)
          return
        }
      }

      // Check session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsValid(true)
        // Get user metadata for personalization
        const name = session.user.user_metadata?.name || ""
        setUserName(name)
      }
      
      setIsVerifying(false)
    }

    verifyInvitation()
  }, [searchParams])

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        toast.error("Failed to set password. Please try again.")
        return
      }

      toast.success("Welcome to Cyber Tech! Your account is ready.")
      router.push(ROUTES.DASHBOARD)
    } catch (_error) {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying invitation...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isValid) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Invalid or expired invitation</CardTitle>
          <CardDescription>
            This invitation link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <p className="text-center text-sm text-muted-foreground">
            Please contact your administrator for a new invitation.
          </p>
        </CardContent>
        <CardFooter>
          <Link href={ROUTES.LOGIN} className="w-full">
            <Button variant="outline" className="w-full">
              Go to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Welcome{userName ? `, ${userName}` : ""}!
        </CardTitle>
        <CardDescription>
          Set your password to complete your account setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Setting up..." : "Complete setup"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
