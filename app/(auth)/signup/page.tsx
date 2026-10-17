"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  User,
  Building2,
  Church,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Search,
  Loader2,
} from "lucide-react"
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
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
import { ROUTES } from "@/lib/constants"
import { signUp } from "./actions"

type Organisation = { id: string; name: string; short_name: string | null }
type Parish = {
  id: string
  name: string
  spiritual_expression: string | null
  locality: string | null
  region: string | null
}

const STEPS = [
  { label: "Account", icon: User },
  { label: "Organisation", icon: Building2 },
  { label: "Parish", icon: Church },
  { label: "Confirm", icon: CheckCircle2 },
] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = i === current
        const isDone = i < current
        return (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-6 transition-colors ${
                  isDone ? "bg-violet-500" : "bg-white/10"
                }`}
              />
            )}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-violet-600 text-white ring-2 ring-violet-500/30"
                  : isDone
                    ? "bg-violet-600/20 text-violet-400"
                    : "bg-white/5 text-white/30"
              }`}
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SignupContent() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Organisation search state
  const [orgQuery, setOrgQuery] = useState("")
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [orgsLoading, setOrgsLoading] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null)

  // Parish search state
  const [parishQuery, setParishQuery] = useState("")
  const [parishes, setParishes] = useState<Parish[]>([])
  const [parishesLoading, setParishesLoading] = useState(false)
  const [selectedParish, setSelectedParish] = useState<Parish | null>(null)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      organisationId: "",
      parishId: "",
    },
  })

  // Search organisations
  const searchOrgs = useCallback(async (q: string) => {
    setOrgsLoading(true)
    try {
      const res = await fetch(`/api/organisations/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setOrgs(data.organisations ?? [])
    } catch {
      setOrgs([])
    } finally {
      setOrgsLoading(false)
    }
  }, [])

  // Search parishes
  const searchParishes = useCallback(
    async (q: string) => {
      if (!selectedOrg) return
      setParishesLoading(true)
      try {
        const res = await fetch(
          `/api/parishes/search?org=${selectedOrg.id}&q=${encodeURIComponent(q)}`,
        )
        const data = await res.json()
        setParishes(data.parishes ?? [])
      } catch {
        setParishes([])
      } finally {
        setParishesLoading(false)
      }
    },
    [selectedOrg],
  )

  // Debounced org search
  useEffect(() => {
    if (step !== 1) return
    const t = setTimeout(() => searchOrgs(orgQuery), 300)
    return () => clearTimeout(t)
  }, [orgQuery, step, searchOrgs])

  // Debounced parish search
  useEffect(() => {
    if (step !== 2 || !selectedOrg) return
    const t = setTimeout(() => searchParishes(parishQuery), 300)
    return () => clearTimeout(t)
  }, [parishQuery, step, selectedOrg, searchParishes])

  // Load initial orgs when entering step 1
  useEffect(() => {
    if (step === 1 && orgs.length === 0 && !selectedOrg) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
      searchOrgs("")
    }
  }, [step, orgs.length, selectedOrg, searchOrgs])

  // Load initial parishes when entering step 2
  useEffect(() => {
    if (step === 2 && selectedOrg && parishes.length === 0 && !selectedParish) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
      searchParishes("")
    }
  }, [step, selectedOrg, parishes.length, selectedParish, searchParishes])

  function canAdvance(): boolean {
    if (step === 0) {
      const { firstName, lastName, email, password, confirmPassword } = form.getValues()
      return (
        firstName.length >= 1 &&
        lastName.length >= 1 &&
        email.includes("@") &&
        password.length >= 8 &&
        confirmPassword === password
      )
    }
    if (step === 1) return !!selectedOrg
    if (step === 2) return !!selectedParish
    return true
  }

  async function handleNext() {
    if (step === 0) {
      const valid = await form.trigger(["firstName", "lastName", "email", "password", "confirmPassword"])
      if (!valid) return
    }
    if (step < 3) setStep(step + 1)
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  async function onSubmit() {
    setIsLoading(true)
    try {
      const values = form.getValues()
      const result = await signUp(values)

      if (result?.error) {
        toast.error(result.reference ? `${result.error} (Reference: ${result.reference.slice(0, 8)})` : result.error)
        return
      }

      router.push(`${ROUTES.LOGIN}?message=confirm_email`)
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
            <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-violet-500/25">
              <Image
                src="/icons/fusion-logo.webp"
                alt="Fusion Worship"
                width={64}
                height={64}
                className="object-cover"
                priority
              />
            </div>
          </BlurFade>

          <div>
            <CardTitle className="text-2xl font-bold text-white">
              <TextAnimate animation="blurInUp" by="word" delay={0.3}>
                {step === 0
                  ? "Create your account"
                  : step === 1
                    ? "Select your organisation"
                    : step === 2
                      ? "Choose your parish"
                      : "Review & confirm"}
              </TextAnimate>
            </CardTitle>
            <CardDescription className="text-white/50 mt-2">
              {step === 0
                ? "Enter your details to get started"
                : step === 1
                  ? "Search for your church organisation"
                  : step === 2
                    ? "Find your local parish"
                    : "Check your details before creating your account"}
            </CardDescription>
          </div>

          <StepIndicator current={step} />
        </CardHeader>

        <CardContent className="pt-2">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (step === 3) onSubmit()
                else handleNext()
              }}
              className="space-y-4"
            >
              {/* Step 0: Account Details */}
              {step === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/70">First name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              autoComplete="given-name"
                              disabled={isLoading}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/70">Last name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              autoComplete="family-name"
                              disabled={isLoading}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Min 8 chars, uppercase, lowercase, number"
                              autoComplete="new-password"
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
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
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
                        <FormLabel className="text-white/70">Confirm password</FormLabel>
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            disabled={isLoading}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 1: Organisation Search */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="Search organisations..."
                      value={orgQuery}
                      onChange={(e) => {
                        setOrgQuery(e.target.value)
                        setSelectedOrg(null)
                        form.setValue("organisationId", "")
                      }}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pl-9"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                    {orgsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                      </div>
                    ) : orgs.length === 0 ? (
                      <p className="text-center text-sm text-white/40 py-6">
                        No organisations found
                      </p>
                    ) : (
                      orgs.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrg(org)
                            form.setValue("organisationId", org.id)
                            setSelectedParish(null)
                            form.setValue("parishId", "")
                            setParishes([])
                            setParishQuery("")
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                            selectedOrg?.id === org.id
                              ? "bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30"
                              : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <span className="font-medium">{org.name}</span>
                          {org.short_name && (
                            <span className="ml-2 text-white/40">({org.short_name})</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {selectedOrg && (
                    <p className="text-xs text-violet-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected: {selectedOrg.name}
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Parish Search */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="Search parishes..."
                      value={parishQuery}
                      onChange={(e) => {
                        setParishQuery(e.target.value)
                        setSelectedParish(null)
                        form.setValue("parishId", "")
                      }}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pl-9"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                    {parishesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                      </div>
                    ) : parishes.length === 0 ? (
                      <p className="text-center text-sm text-white/40 py-6">
                        No parishes found in this organisation
                      </p>
                    ) : (
                      parishes.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedParish(p)
                            form.setValue("parishId", p.id)
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                            selectedParish?.id === p.id
                              ? "bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30"
                              : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <span className="font-medium">{p.name}</span>
                          {p.spiritual_expression && (
                            <span className="block text-xs text-white/40 mt-0.5">
                              {p.spiritual_expression}
                            </span>
                          )}
                          {p.locality && (
                            <span className="block text-xs text-white/30 mt-0.5">
                              {p.locality}
                              {p.region ? `, ${p.region}` : ""}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {selectedParish && (
                    <p className="text-xs text-violet-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected: {selectedParish.name}
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Name</p>
                      <p className="text-white font-medium">
                        {form.getValues("firstName")} {form.getValues("lastName")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Email</p>
                      <p className="text-white font-medium">{form.getValues("email")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Organisation</p>
                      <p className="text-white font-medium">{selectedOrg?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Parish</p>
                      <p className="text-white font-medium">{selectedParish?.name}</p>
                      {selectedParish?.locality && (
                        <p className="text-white/50 text-sm">
                          {selectedParish.locality}
                          {selectedParish.region ? `, ${selectedParish.region}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/40 text-center">
                    Your membership will be pending until a parish admin approves it.
                    You&apos;ll receive a confirmation email to verify your account.
                  </p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex-1 h-11 rounded-md border border-white/10 bg-white/5 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                )}

                {step < 3 ? (
                  <ShimmerButton
                    type="button"
                    onClick={handleNext}
                    className="flex-1 h-11 font-medium"
                    disabled={!canAdvance()}
                    shimmerColor="#ffffff"
                    shimmerSize="0.1em"
                    background="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                  >
                    <span className="flex items-center gap-2">
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </ShimmerButton>
                ) : (
                  <ShimmerButton
                    type="submit"
                    className="flex-1 h-11 font-medium"
                    disabled={isLoading}
                    shimmerColor="#ffffff"
                    shimmerSize="0.1em"
                    background="linear-gradient(135deg, #22c55e 0%, #10b981 100%)"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Create account
                      </span>
                    )}
                  </ShimmerButton>
                )}
              </div>
            </form>
          </Form>

          <p className="text-center text-sm text-white/40 mt-4">
            Already have an account?{" "}
            <Link
              href={ROUTES.LOGIN}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </BlurFade>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full border-white/10 bg-black/40 backdrop-blur-xl">
          <CardContent className="flex items-center justify-center py-12">
            <span className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </CardContent>
        </Card>
      }
    >
      <SignupContent />
    </Suspense>
  )
}
