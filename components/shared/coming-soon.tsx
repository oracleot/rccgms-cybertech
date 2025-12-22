"use client"

import { Construction, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ComingSoonProps {
  title: string
  description: string
  features?: string[]
  icon?: React.ReactNode
  backHref?: string
  className?: string
}

export function ComingSoon({
  title,
  description,
  features = [],
  icon,
  backHref = "/dashboard",
  className,
}: ComingSoonProps) {
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center p-4", className)}>
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {icon ?? <Construction className="h-8 w-8 text-primary" />}
            </div>

            {/* Title */}
            <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>

            {/* Description */}
            <p className="mb-6 text-muted-foreground">{description}</p>

            {/* Features list */}
            {features.length > 0 && (
              <div className="mb-6 w-full space-y-2 rounded-lg bg-muted/50 p-4 text-left">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Coming features:</span>
                </div>
                <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
                  {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Back button */}
            <Button asChild>
              <Link href={backHref}>Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
