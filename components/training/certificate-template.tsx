"use client"

import { Award, Calendar, GraduationCap } from "lucide-react"
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
        "relative aspect-[1.4/1] w-full max-w-3xl mx-auto bg-white rounded-lg border-4 border-primary/20 p-8 md:p-12",
        "flex flex-col items-center justify-between text-center",
        "print:border-0 print:shadow-none",
        className
      )}
    >
      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-primary/30 rounded-br-lg" />

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Cyber Tech</h1>
        </div>
        <p className="text-muted-foreground uppercase tracking-widest text-sm">
          Certificate of Completion
        </p>
      </div>

      {/* Main content */}
      <div className="space-y-4 flex-1 flex flex-col justify-center">
        <p className="text-lg text-muted-foreground">This is to certify that</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {data.userName}
        </h2>
        <p className="text-lg text-muted-foreground">has successfully completed</p>
        <h3 className="text-xl md:text-2xl font-semibold text-primary">
          {data.trackName}
        </h3>
        <p className="text-muted-foreground">
          in the <span className="font-medium">{data.departmentName}</span> department
        </p>
      </div>

      {/* Footer */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <span className="text-xs text-muted-foreground font-mono">
            ID: {data.certificateId.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
