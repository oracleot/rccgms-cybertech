"use client"

import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

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
import { BorderBeam } from "@/components/ui/border-beam"
import { BlurFade } from "@/components/ui/blur-fade"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { Ripple } from "@/components/ui/ripple"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"
import { ROUTES } from "@/lib/constants"
import { requestPasswordReset } from "./actions"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true)
    try {
      const result = await requestPasswordReset(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setIsSubmitted(true)
      toast.success("Check your email for reset instructions")
    } catch (_error) {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <BlurFade delay={0.1} inView>
        <Card
          className="relative w-full overflow-hidden border-white/10 bg-zinc-950/80 backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <BorderBeam 
            size={250} 
            duration={12} 
            colorFrom="#22c55e" 
            colorTo="#10b981"
            delay={0}
          />
          <CardHeader className="space-y-1 text-center pb-4">
            <BlurFade delay={0.2} inView>
              <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-600/20 to-emerald-600/20" />
                <Ripple 
                  mainCircleSize={80} 
                  mainCircleOpacity={0.15}
                  numCircles={3}
                />
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg shadow-green-500/25">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
              </div>
            </BlurFade>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Check your inbox
            </CardTitle>
            <BlurFade delay={0.4} inView>
              <CardDescription className="text-zinc-400">
                If an account exists for that email, a secure password link is on its way.
              </CardDescription>
            </BlurFade>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <BlurFade delay={0.5} inView>
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20">
                  <Mail className="h-8 w-8 text-violet-400" />
                </div>
              </div>
            </BlurFade>
            <BlurFade delay={0.55} inView className="w-full">
              <div className="space-y-3 text-center">
                <p className="text-sm leading-6 text-zinc-400">
                  Delivery can take a minute. Check your spam folder if it does not appear.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSubmitted(false)}
                  className="w-full text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                >
                  Use a different email address
                </Button>
              </div>
            </BlurFade>
          </CardContent>
          <CardFooter>
            <BlurFade delay={0.6} inView className="w-full">
              <Link href={ROUTES.LOGIN} className="w-full block">
                <Button 
                  variant="outline" 
                  className="w-full border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
              </Link>
            </BlurFade>
          </CardFooter>
        </Card>
      </BlurFade>
    )
  }

  return (
    <BlurFade delay={0.1} inView>
      <Card className="relative w-full overflow-hidden border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <BorderBeam 
          size={250} 
          duration={12} 
          colorFrom="#8b5cf6" 
          colorTo="#6366f1"
          delay={0}
        />
        <CardHeader className="space-y-1 text-center pb-4">
          <BlurFade delay={0.2} inView>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
          </BlurFade>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Create or reset your password
          </CardTitle>
          <BlurFade delay={0.4} inView>
            <CardDescription className="text-zinc-400">
              We&apos;ll email you a secure link to choose a password
            </CardDescription>
          </BlurFade>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <BlurFade delay={0.5} inView>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </BlurFade>
              <BlurFade delay={0.55} inView className="pt-2">
                <ShimmerButton 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  shimmerColor="#a78bfa"
                  background="linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
                >
                  <span className="text-sm font-medium text-white">
                    {isLoading ? "Sending..." : "Email me a password link"}
                  </span>
                </ShimmerButton>
              </BlurFade>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <BlurFade delay={0.6} inView className="w-full">
            <Link href={ROUTES.LOGIN} className="w-full block">
              <Button 
                variant="outline" 
                className="w-full border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </BlurFade>
        </CardFooter>
      </Card>
    </BlurFade>
  )
}
