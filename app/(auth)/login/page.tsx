"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { LogIn, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

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
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { ROUTES } from "@/lib/constants"
import { sanitizeNext } from "@/lib/auth/next-url"
import { signInWithPassword } from "./actions"

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = sanitizeNext(
    searchParams.get("next") ?? searchParams.get("redirectTo"),
    ROUTES.DASHBOARD,
  )
  const isObsDock = next === "/bible/obs/dock" || next === "/lyrics/obs/dock"
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const error = searchParams.get("error")
    const reason = searchParams.get("reason")
    if (error === "auth_callback_error") {
      if (reason === "pkce_mismatch") {
        toast.error(
          "Sign-in failed: the link was opened in a different browser. Please try again.",
          { duration: 10000 },
        )
      } else {
        toast.error("Sign-in failed. Please try again.", { duration: 6000 })
      }
    }
    const msg = searchParams.get("message")
    if (msg === "confirm_email") {
      toast.success("Account created! Please check your email to confirm, then sign in.", { duration: 8000 })
    }
  }, [searchParams])

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginInput) {
    setIsLoading(true)
    try {
      const result = await signInWithPassword(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
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
          <BlurFade delay={0.2} direction="down">
            <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-violet-500/25">
              <Image
                src="/icons/fusion-logo.webp"
                alt="Fusion Worship"
                width={80}
                height={80}
                className="object-cover"
                priority
              />
            </div>
          </BlurFade>

          <div>
            <CardTitle className="text-2xl font-bold text-white">
              <TextAnimate animation="blurInUp" by="word" delay={0.3}>
                Welcome back
              </TextAnimate>
            </CardTitle>
            <CardDescription className="text-white/50 mt-2">
              {isObsDock ? "Sign in once to trust this OBS computer" : "Sign in to your Fusion account"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

              <BlurFade delay={0.45} direction="up">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-white/70">Password</FormLabel>
                        <Link
                          href={ROUTES.FORGOT_PASSWORD}
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            disabled={isLoading}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </BlurFade>

              <BlurFade delay={0.5} direction="up" className="pt-1">
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
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </span>
                  )}
                </ShimmerButton>
              </BlurFade>
            </form>
          </Form>

          {isObsDock && (
            <p className="mt-4 text-center text-xs leading-5 text-white/45">
              Fusion keeps this device signed in across services and restarts for up to 90 days, unless you sign out.
            </p>
          )}

          <BlurFade delay={0.52} direction="up">
            <div className="mt-5 rounded-xl border border-violet-400/15 bg-violet-500/[0.06] px-4 py-3 text-center">
              <p className="text-xs leading-5 text-white/50">
                Previously signed in with an email link?{" "}
                <Link
                  href={`${ROUTES.FORGOT_PASSWORD}?reason=magic_link_retired`}
                  className="font-medium text-violet-300 transition-colors hover:text-violet-200"
                >
                  Create your password
                </Link>
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.55} direction="up">
            <p className="text-center text-sm text-white/40 mt-4">
              Don&apos;t have an account?{" "}
              <Link
                href={ROUTES.SIGNUP}
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                Sign up
              </Link>
            </p>
          </BlurFade>

        </CardContent>
      </Card>
    </BlurFade>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="w-full border-white/10 bg-black/40 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-12">
          <span className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </CardContent>
      </Card>
    }>
      <LoginContent />
    </Suspense>
  )
}
