"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { MonitorPlay } from "lucide-react"

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
import { TextAnimate } from "@/components/ui/text-animate"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { ROUTES } from "@/lib/constants"
import { login } from "./actions"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || ROUTES.DASHBOARD
  const [isLoading, setIsLoading] = useState(false)

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
      const result = await login(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success("Welcome back!")
      router.push(redirectTo)
      router.refresh()
    } catch (_error) {
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-white/70">Password</FormLabel>
                        <Link
                          href={ROUTES.FORGOT_PASSWORD}
                          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
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
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </ShimmerButton>
              </BlurFade>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <BlurFade delay={0.7} direction="up">
            <div className="text-center text-sm text-white/40">
              Don&apos;t have an account?{" "}
              <Link
                href={ROUTES.REGISTER}
                className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </BlurFade>
        </CardFooter>
      </Card>
    </BlurFade>
  )
}
