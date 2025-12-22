import { Shield } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Admin | Cyber Tech",
  description: "System administration and management",
}

export default function AdminPage() {
  return (
    <ComingSoon
      title="Admin Dashboard"
      description="Manage users, departments, positions, and system settings."
      icon={<Shield className="h-8 w-8 text-primary" />}
      features={[
        "User management and roles",
        "Department configuration",
        "Position management",
        "Notification logs and retries",
        "System settings",
      ]}
    />
  )
}
