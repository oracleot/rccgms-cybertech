"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { MonitorPlay, Mail, CheckCircle2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
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
import { BorderBeam } from "@/components/ui/border-beam"
import { BlurFade } from "@/components/ui/blur-fade"
import { TextAnimate } from "@/components/ui/text-animate"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { magicLinkSchema } from "@/lib/validations/auth"
import { z } from "zod"
import { ROUTES } from "@/lib/constants"
import { sendMagicLink } from "./actions"

// Form input type inferred from schema (before defaults applied)
type MagicLinkFormInput = z.input<typeof magicLinkSchema>

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || ROUTES.DASHBOARD
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [notInvited, setNotInvited] = useState(false)
  const [sentEmail, setSentEmail] = useState("")

  const form = useForm<MagicLinkFormInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
      redirectTo: redirectTo,
    },
  })

  async function onSubmit(data: MagicLinkFormInput) {
    setIsLoading(true)
    try {
      const result = await sendMagicLink({ ...data, redirectTo })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setSentEmail(data.email)
      
      // Check if user was not invited (no email sent)
      if (result?.notInvited) {
        setNotInvited(true)
      } else {
        setEmailSent(true)
        toast.success("Magic link sent! Check your email.")
      }
    } catch (_error) {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Not invited state - user doesn't have an account
  if (notInvited) {
    return (
      <BlurFade delay={0.1} direction="up">
        <Card className="relative w-full overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl">
          <BorderBeam 
            size={200} 
            duration={10} 
            colorFrom="#f59e0b" 
            colorTo="#d97706"
            borderWidth={1}
          />
          
          <CardHeader className="space-y-4 text-center pb-2">
            <BlurFade delay={0.2} direction="down">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Mail className="h-7 w-7 text-white" />
              </div>
            </BlurFade>
            
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                <TextAnimate animation="blurInUp" by="word" delay={0.3}>
                  Account not found
                </TextAnimate>
              </CardTitle>
              <CardDescription className="text-white/50 mt-2">
                No account exists for
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4 text-center space-y-6">
            <BlurFade delay={0.4} direction="up">
              <div className="py-3 px-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium">{sentEmail}</p>
              </div>
            </BlurFade>
            
            <BlurFade delay={0.5} direction="up">
              <div className="space-y-3 text-sm text-white/60">
                <p>This platform is invite-only.</p>
                <p>Please contact your team admin to request an invitation.</p>
              </div>
            </BlurFade>

            <BlurFade delay={0.6} direction="up">
              <button
                type="button"
                onClick={() => {
                  setNotInvited(false)
                  form.reset()
                }}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Try a different email
              </button>
            </BlurFade>
          </CardContent>
        </Card>
      </BlurFade>
    )
  }

  // Success state - email sent
  if (emailSent) {
    return (
      <BlurFade delay={0.1} direction="up">
        <Card className="relative w-full overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl">
          <BorderBeam 
            size={200} 
            duration={10} 
            colorFrom="#22c55e" 
            colorTo="#10b981"
            borderWidth={1}
          />
          
          <CardHeader className="space-y-4 text-center pb-2">
            <BlurFade delay={0.2} direction="down">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
            </BlurFade>
            
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                <TextAnimate animation="blurInUp" by="word" delay={0.3}>
                  Check your email
                </TextAnimate>
              </CardTitle>
              <CardDescription className="text-white/50 mt-2">
                We sent a magic link to
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4 text-center space-y-6">
            <BlurFade delay={0.4} direction="up">
              <div className="py-3 px-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium">{sentEmail}</p>
              </div>
            </BlurFade>
            
            <BlurFade delay={0.5} direction="up">
              <div className="space-y-3 text-sm text-white/60">
                <p>Click the link in the email to sign in.</p>
                <p>The link expires in 1 hour.</p>
              </div>
            </BlurFade>

            <BlurFade delay={0.6} direction="up">
              <button
                type="button"
                onClick={() => {
                  setEmailSent(false)
                  form.reset()
                }}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Use a different email
              </button>
            </BlurFade>
          </CardContent>
        </Card>
      </BlurFade>
    )
  }

  return (
    <BlurFade delay={0.1} direction="up">
      <Card className="relative w-full overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl">
        <BorderBeam 
          size={200} 
          duration={10} 
          colorFrom="#8b5cf6" 
          colorTo="#6366f1"
          borderWidth={1}
        />
        
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Logo */}
          <BlurFade delay={0.2} direction="down">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <MonitorPlay className="h-7 w-7 text-white" />
            </div>
          </BlurFade>
          
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              <TextAnimate animation="blurInUp" by="word" delay={0.3}>
                Welcome back
              </TextAnimate>
            </CardTitle>
            <CardDescription className="text-white/50 mt-2">
              Sign in to your Cyber Tech account
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <BlurFade delay={0.4} direction="up">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </BlurFade>
              
              <BlurFade delay={0.5} direction="up">
                <p className="text-sm text-white/40">
                  We&apos;ll send you a magic link to sign in instantly.
                </p>
              </BlurFade>
              
              <BlurFade delay={0.6} direction="up">
                <ShimmerButton 
                  type="submit" 
                  className="w-full h-11 mt-2 font-medium"
                  disabled={isLoading}
                  shimmerColor="#ffffff"
                  shimmerSize="0.1em"
                  background="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending link...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send magic link
                    </span>
                  )}
                </ShimmerButton>
              </BlurFade>
            </form>
          </Form>
        </CardContent>
      </Card>
    </BlurFade>
  )
}
