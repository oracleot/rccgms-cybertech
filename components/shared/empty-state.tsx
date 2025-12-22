import { FileQuestion, Inbox, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateVariant = "default" | "search" | "error"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  variant?: EmptyStateVariant
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const variantIcons = {
  default: Inbox,
  search: Search,
  error: FileQuestion,
}

export function EmptyState({
  title,
  description,
  icon,
  variant = "default",
  action,
  className,
}: EmptyStateProps) {
  const Icon = variantIcons[variant]

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon ?? <Icon className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
