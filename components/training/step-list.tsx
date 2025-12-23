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
  Wrench
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

export function StepList({ trackId, steps, currentStepIndex = 0 }: StepListProps) {
  return (
    <div className="space-y-2">
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
              "flex items-center gap-4 p-4 rounded-lg border transition-colors",
              isLocked && "opacity-50 cursor-not-allowed",
              !isLocked && "hover:bg-muted/50",
              isCurrent && "border-primary bg-primary/5",
              isCompleted && "bg-muted/30"
            )}
            onClick={(e) => isLocked && e.preventDefault()}
          >
            <div className="flex-shrink-0">
              {isLocked ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className={cn(
                  "h-5 w-5",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium",
                  isCompleted && "line-through text-muted-foreground"
                )}>
                  {step.order}. {step.title}
                </span>
                {step.required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {step.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{stepTypeLabels[step.type]}</span>
              </div>
              {isCompleted && !isVerified && step.type === "practical" && (
                <Badge variant="secondary" className="text-xs">Awaiting Verification</Badge>
              )}
              {isVerified && (
                <Badge variant="default" className="text-xs bg-green-600">Verified</Badge>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
