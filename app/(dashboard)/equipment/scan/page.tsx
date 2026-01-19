"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ScanQrCode } from "lucide-react"

import { QRScanner } from "@/components/equipment/qr-scanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function extractEquipmentId(text: string): string | null {
  try {
    const url = new URL(text)
    const parts = url.pathname.split("/").filter(Boolean)
    const index = parts.indexOf("equipment")
    if (index >= 0 && parts[index + 1]) {
      return parts[index + 1]
    }
  } catch {
    // not a URL, fall back to raw text
  }

  if (/^[0-9a-f-]{36}$/i.test(text)) {
    return text
  }

  return null
}

export default function EquipmentScanPage() {
  const router = useRouter()
  const [scanned, setScanned] = useState<string>("")
  const equipmentId = useMemo(() => (scanned ? extractEquipmentId(scanned) : null), [scanned])

  const handleScan = (text: string) => {
    setScanned(text)
    const id = extractEquipmentId(text)
    if (id) {
      router.push(`/equipment/${id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scan equipment QR</h1>
        <p className="text-muted-foreground">Use your device camera to open equipment details quickly.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanQrCode className="h-5 w-5" />
            Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QRScanner onScan={handleScan} className="overflow-hidden rounded-lg border" />
          <Separator />
          <div className="space-y-2">
            <Input value={scanned} readOnly placeholder="Scanned value will appear here" />
            {equipmentId && (
              <Button asChild>
                <Link href={`/equipment/${equipmentId}`}>Open equipment record</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
