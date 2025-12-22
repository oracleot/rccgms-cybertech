"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  ArrowRight,
  CalendarDays,
  ArrowRightLeft,
  Package,
  GraduationCap,
  Check,
  X,
  AlertCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { NotificationItem, NotificationType } from "@/types/notification"

interface NotificationFeedProps {
  notifications: NotificationItem[]
  maxItems?: number
  onMarkAsRead?: (id: string) => void
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  rota_reminder: <CalendarDays className="h-4 w-4" />,
  rota_published: <CalendarDays className="h-4 w-4" />,
  swap_request: <ArrowRightLeft className="h-4 w-4" />,
  swap_accepted: <Check className="h-4 w-4 text-green-600" />,
  swap_approved: <Check className="h-4 w-4 text-green-600" />,
  swap_rejected: <X className="h-4 w-4 text-destructive" />,
  training_assigned: <GraduationCap className="h-4 w-4" />,
  training_completed: <GraduationCap className="h-4 w-4 text-green-600" />,
  equipment_overdue: <Package className="h-4 w-4 text-destructive" />,
}

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  rota_reminder: "bg-blue-100 text-blue-600",
  rota_published: "bg-green-100 text-green-600",
  swap_request: "bg-amber-100 text-amber-600",
  swap_accepted: "bg-green-100 text-green-600",
  swap_approved: "bg-green-100 text-green-600",
  swap_rejected: "bg-red-100 text-red-600",
  training_assigned: "bg-purple-100 text-purple-600",
  training_completed: "bg-green-100 text-green-600",
  equipment_overdue: "bg-red-100 text-red-600",
}

export function NotificationFeed({
  notifications,
  maxItems = 8,
  onMarkAsRead,
}: NotificationFeedProps) {
  const displayedNotifications = notifications.slice(0, maxItems)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {notifications.length > 0
              ? "Recent updates and alerts"
              : "No notifications yet"}
          </CardDescription>
        </div>
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/notifications">
              Settings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <ul className="space-y-3">
              {displayedNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex gap-3 rounded-lg border p-3 transition-colors ${
                    !notification.isRead ? "bg-muted/50" : ""
                  }`}
                  onClick={() => onMarkAsRead?.(notification.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onMarkAsRead?.(notification.id)
                    }
                  }}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                      NOTIFICATION_COLORS[notification.type] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {NOTIFICATION_ICONS[notification.type] || (
                      <AlertCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium truncate ${
                          !notification.isRead ? "" : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        {notifications.length > maxItems && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications">
                View all {notifications.length} notifications
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
