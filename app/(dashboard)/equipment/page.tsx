import { Package } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Equipment | Cyber Tech",
  description: "Track and manage tech equipment",
}

export default function EquipmentPage() {
  return (
    <ComingSoon
      title="Equipment Tracker"
      description="Track, check out, and manage all your tech department equipment in one place."
      icon={<Package className="h-8 w-8 text-primary" />}
      features={[
        "Equipment inventory management",
        "Check-in/check-out system",
        "QR code scanning for quick lookup",
        "Maintenance scheduling and logs",
        "Equipment condition tracking",
      ]}
    />
  )
}
