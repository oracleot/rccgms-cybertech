"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"

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
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"
import { ROUTES } from "@/lib/constants"
import { register } from "./actions"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  })

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true)
    try {
      const result = await register(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        "Account created! Please check your email to verify your account."
      )
      router.push(ROUTES.LOGIN)
    } catch (_error) {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
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
              <UserPlus className="h-7 w-7 text-white" />
            </div>
          </BlurFade>
          <CardTitle className="text-2xl font-bold text-white">
            <TextAnimate animation="blurInUp" by="character" delay={0.3}>
              Join the Team
            </TextAnimate>
          </CardTitle>
          <BlurFade delay={0.4} inView>
            <CardDescription className="text-zinc-400">
              Create your Cyber Tech account
            </CardDescription>
          </BlurFade>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <BlurFade delay={0.45} inView>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          autoComplete="name"
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
              <BlurFade delay={0.55} inView>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
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
              <BlurFade delay={0.6} inView>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
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
              <BlurFade delay={0.65} inView className="pt-2">
                <ShimmerButton 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  shimmerColor="#a78bfa"
                  background="linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
                >
                  <span className="text-sm font-medium text-white">
                    {isLoading ? "Creating account..." : "Create account"}
                  </span>
                </ShimmerButton>
              </BlurFade>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <BlurFade delay={0.7} inView>
            <div className="text-center text-sm text-zinc-400">
              Already have an account?{" "}
              <Link
                href={ROUTES.LOGIN}
                className="font-medium text-violet-400 transition-colors hover:text-violet-300"
              >
                Sign in
              </Link>
            </div>
          </BlurFade>
        </CardFooter>
      </Card>
    </BlurFade>
  )
}
