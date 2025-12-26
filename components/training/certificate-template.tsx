"use client"

import { Award, Calendar, GraduationCap, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CertificateData } from "@/types/training"

interface CertificateTemplateProps {
  data: CertificateData
  className?: string
}

export function CertificateTemplate({ data, className }: CertificateTemplateProps) {
  const formattedDate = new Date(data.completedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div 
      className={cn(
        "relative aspect-[1.4/1] w-full max-w-3xl mx-auto bg-gradient-to-br from-white via-white to-green-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-green-950/30 rounded-2xl border-4 border-green-200 dark:border-green-900/50 p-8 md:p-12 shadow-2xl shadow-green-500/10",
        "flex flex-col items-center justify-between text-center",
        "print:border-2 print:shadow-none print:bg-white",
        className
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(34,197,94,0.08),transparent_50%)] rounded-2xl pointer-events-none print:hidden" />
      
      {/* Decorative corners with gradient */}
      <div className="absolute top-4 left-4 w-20 h-20 border-t-4 border-l-4 border-green-400/40 dark:border-green-600/40 rounded-tl-xl" />
      <div className="absolute top-4 right-4 w-20 h-20 border-t-4 border-r-4 border-green-400/40 dark:border-green-600/40 rounded-tr-xl" />
      <div className="absolute bottom-4 left-4 w-20 h-20 border-b-4 border-l-4 border-green-400/40 dark:border-green-600/40 rounded-bl-xl" />
      <div className="absolute bottom-4 right-4 w-20 h-20 border-b-4 border-r-4 border-green-400/40 dark:border-green-600/40 rounded-br-xl" />

      {/* Decorative stars */}
      <Star className="absolute top-8 left-1/4 h-4 w-4 text-yellow-400/60 fill-yellow-400/60 print:hidden" />
      <Star className="absolute top-12 right-1/3 h-3 w-3 text-yellow-400/40 fill-yellow-400/40 print:hidden" />
      <Star className="absolute bottom-16 left-1/3 h-3 w-3 text-yellow-400/40 fill-yellow-400/40 print:hidden" />
      <Star className="absolute bottom-10 right-1/4 h-4 w-4 text-yellow-400/60 fill-yellow-400/60 print:hidden" />

      {/* Header */}
      <div className="relative space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Cyber Tech
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-green-300 dark:to-green-700" />
          <p className="text-muted-foreground uppercase tracking-[0.2em] text-xs font-medium">
            Certificate of Completion
          </p>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-green-300 dark:to-green-700" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative space-y-5 flex-1 flex flex-col justify-center">
        <p className="text-lg text-muted-foreground">This is to certify that</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground relative">
          <span className="relative">
            {data.userName}
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent" />
          </span>
        </h2>
        <p className="text-lg text-muted-foreground">has successfully completed</p>
        <h3 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
          {data.trackName}
        </h3>
        <p className="text-muted-foreground">
          in the <span className="font-semibold text-foreground">{data.departmentName}</span> department
        </p>
      </div>

      {/* Footer */}
      <div className="relative w-full flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-green-200 dark:border-green-900/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
            <Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
            {data.certificateId.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
