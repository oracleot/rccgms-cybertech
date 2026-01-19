"use client"

import Link from "next/link"
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Play, 
  FileText, 
  HelpCircle, 
  Users, 
  Wrench,
  ChevronRight,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { StepWithCompletion } from "@/types/training"
import type { StepType } from "@/types/training"

interface StepListProps {
  trackId: string
  steps: StepWithCompletion[]
  currentStepIndex?: number
}

const stepTypeIcons: Record<StepType, React.ComponentType<{ className?: string }>> = {
  video: Play,
  document: FileText,
  quiz: HelpCircle,
  shadowing: Users,
  practical: Wrench,
}

const stepTypeLabels: Record<StepType, string> = {
  video: "Video",
  document: "Document",
  quiz: "Quiz",
  shadowing: "Shadowing",
  practical: "Practical",
}

const stepTypeColors: Record<StepType, string> = {
  video: "text-red-500 bg-red-500/10",
  document: "text-blue-500 bg-blue-500/10",
  quiz: "text-purple-500 bg-purple-500/10",
  shadowing: "text-orange-500 bg-orange-500/10",
  practical: "text-green-500 bg-green-500/10",
}

export function StepList({ trackId, steps, currentStepIndex = 0 }: StepListProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isCompleted = step.isComplete
        const isVerified = step.isVerified
        const isLocked = index > 0 && !steps[index - 1].isComplete
        const isCurrent = index === currentStepIndex && !isCompleted && !isLocked
        const Icon = stepTypeIcons[step.type] || Circle

        return (
          <Link
            key={step.id}
            href={isLocked ? "#" : `/training/${trackId}/step/${step.id}`}
            className={cn(
              "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
              isLocked && "opacity-50 cursor-not-allowed",
              !isLocked && "hover:shadow-lg hover:-translate-y-0.5",
              isCurrent && "border-primary bg-gradient-to-r from-primary/10 to-primary/5 shadow-md shadow-primary/10",
              isCompleted && "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50",
              !isCompleted && !isCurrent && !isLocked && "hover:border-primary/50 hover:bg-muted/50"
            )}
            onClick={(e) => isLocked && e.preventDefault()}
            style={{ 
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Step number indicator */}
            <div className={cn(
              "relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
              isLocked && "bg-muted text-muted-foreground",
              isCompleted && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
              isCurrent && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
              !isCompleted && !isCurrent && !isLocked && "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : isCurrent ? (
                <span className="relative">
                  {step.order}
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-ping" />
                </span>
              ) : (
                step.order
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "font-medium transition-colors",
                  isCompleted && "text-green-700 dark:text-green-400",
                  isCurrent && "text-primary",
                  !isCompleted && !isCurrent && !isLocked && "group-hover:text-primary"
                )}>
                  {step.title}
                </span>
                {step.required && (
                  <Badge variant="outline" className="text-xs h-5 px-1.5">Required</Badge>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5 max-w-lg">
                  {step.description}
                </p>
              )}
            </div>

            {/* Right side: type badge and status */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Step type badge */}
              <div className={cn(
                "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                stepTypeColors[step.type]
              )}>
                <Icon className="h-3.5 w-3.5" />
                <span>{stepTypeLabels[step.type]}</span>
              </div>
              
              {/* Status badges */}
              {isCompleted && !isVerified && step.type === "practical" && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  Awaiting Verification
                </Badge>
              )}
              {isVerified && (
                <Badge className="text-xs bg-green-600 hover:bg-green-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              
              {/* Arrow indicator for unlocked steps */}
              {!isLocked && (
                <ChevronRight className={cn(
                  "h-5 w-5 text-muted-foreground transition-all duration-300",
                  "group-hover:text-primary group-hover:translate-x-1",
                  isCurrent && "text-primary"
                )} />
              )}
            </div>

            {/* Current step glow effect */}
            {isCurrent && (
              <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse pointer-events-none" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
