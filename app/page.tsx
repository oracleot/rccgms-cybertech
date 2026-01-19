"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Particles } from "@/components/ui/particles"
import { TextAnimate } from "@/components/ui/text-animate"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { OrbitingCircles } from "@/components/ui/orbiting-circles"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { Meteors } from "@/components/ui/meteors"
import { 
  MonitorPlay, 
  Calendar, 
  Package, 
  FileText, 
  Users,
  Wifi,
  Mic,
  Camera,
  Headphones,
  Radio
} from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleAuthHash = async () => {
      const hash = window.location.hash
      
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        const type = params.get("type")
        
        console.log("Auth hash type:", type)
        
        if (accessToken && refreshToken) {
          const supabase = createClient()
          
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (!error) {
            window.history.replaceState(null, "", "/")
            
            if (type === "invite" || type === "signup" || type === "magiclink") {
              router.push("/accept-invite")
              return
            } else if (type === "recovery") {
              router.push("/reset-password")
              return
            } else {
              router.push("/dashboard")
              return
            }
          }
        }
      }
      
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push("/dashboard")
        return
      }
      
      setIsProcessing(false)
    }
    
    handleAuthHash()
  }, [router])

  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="relative h-16 w-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 animate-pulse" />
            <div className="absolute inset-1 rounded-full bg-black flex items-center justify-center">
              <MonitorPlay className="h-6 w-6 text-violet-400 animate-pulse" />
            </div>
          </div>
          <TextAnimate animation="blurInUp" by="character" className="text-white/70 text-sm tracking-widest uppercase">
            Initializing...
          </TextAnimate>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-black to-indigo-950/50" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Meteors for dramatic effect */}
      <Meteors number={15} />
      
      {/* Particles */}
      <Particles
        className="absolute inset-0"
        quantity={80}
        staticity={30}
        ease={80}
        size={0.6}
        color="#8b5cf6"
      />
      
      {/* Main content */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left side - Hero content */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <BlurFade delay={0.1} direction="up">
            <AnimatedGradientText className="mb-4 inline-flex">
              <span className="text-xs md:text-sm font-medium tracking-widest uppercase">
                ✨ RCCG Morningstar Tech Department
              </span>
            </AnimatedGradientText>
          </BlurFade>
          
          <BlurFade delay={0.2} direction="up">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6">
              <span className="bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
                Cyber
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                Tech
              </span>
            </h1>
          </BlurFade>
          
          <BlurFade delay={0.3} direction="up">
            <p className="text-lg md:text-xl text-white/60 max-w-md mb-8 leading-relaxed">
              The complete platform for managing your tech team. 
              <span className="text-violet-400"> Rotas, equipment, rundowns</span> — all in one place.
            </p>
          </BlurFade>
          
          {/* Feature pills */}
          <BlurFade delay={0.4} direction="up">
            <div className="flex flex-wrap gap-3 mb-10">
              {[
                { icon: Calendar, label: "Smart Scheduling" },
                { icon: Package, label: "Equipment Tracking" },
                { icon: FileText, label: "Service Rundowns" },
                { icon: Users, label: "Team Management" },
              ].map((feature, i) => (
                <div 
                  key={feature.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <feature.icon className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-white/70">{feature.label}</span>
                </div>
              ))}
            </div>
          </BlurFade>
          
          {/* CTA Buttons */}
          <BlurFade delay={0.5} direction="up">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <ShimmerButton 
                  className="h-14 px-8 text-lg font-semibold"
                  shimmerColor="#ffffff"
                  shimmerSize="0.15em"
                  background="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                >
                  Get Started
                  <span className="ml-2">→</span>
                </ShimmerButton>
              </Link>
            </div>
          </BlurFade>
          
          <BlurFade delay={0.6} direction="up">
            <p className="mt-6 text-sm text-white/40">
              Invite only • Contact your team leader for access
            </p>
          </BlurFade>
        </div>
        
        {/* Right side - Animated visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative">
          {/* Glowing orb in center */}
          <div className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 blur-3xl opacity-60 animate-pulse" />
          
          {/* Central icon */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <MonitorPlay className="h-12 w-12 text-white" />
              <BorderBeam 
                size={100} 
                duration={8} 
                colorFrom="#c084fc" 
                colorTo="#6366f1"
                borderWidth={2}
              />
            </div>
          </div>
          
          {/* Orbiting tech icons - inner ring */}
          <OrbitingCircles 
            radius={120} 
            duration={25} 
            path={false}
            iconSize={40}
          >
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 backdrop-blur-sm">
              <Camera className="h-5 w-5 text-violet-300" />
            </div>
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-sm">
              <Mic className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 backdrop-blur-sm">
              <Headphones className="h-5 w-5 text-purple-300" />
            </div>
          </OrbitingCircles>
          
          {/* Orbiting tech icons - outer ring */}
          <OrbitingCircles 
            radius={200} 
            duration={35} 
            reverse 
            path={false}
            iconSize={44}
          >
            <div className="p-2.5 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 backdrop-blur-sm">
              <Wifi className="h-5 w-5 text-fuchsia-300" />
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 backdrop-blur-sm">
              <Radio className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="p-2.5 rounded-xl bg-pink-600/20 border border-pink-500/30 backdrop-blur-sm">
              <Calendar className="h-5 w-5 text-pink-300" />
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 backdrop-blur-sm">
              <Package className="h-5 w-5 text-emerald-300" />
            </div>
          </OrbitingCircles>
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  )
}
