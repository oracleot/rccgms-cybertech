"use client"

import { useEffect, useRef } from "react"

interface QRScannerProps {
  onScan: (text: string) => void
  className?: string
}

export function QRScanner({ onScan, className }: QRScannerProps) {
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null)

  useEffect(() => {
    let isMounted = true

    async function setup() {
      const { Html5QrcodeScanner } = await import("html5-qrcode")
      if (!isMounted) return

      const scanner = new Html5QrcodeScanner(
        "equipment-qr-reader",
        { fps: 8, qrbox: { width: 240, height: 240 } },
        false
      )

      scannerRef.current = scanner

      scanner.render(
        (decodedText: string) => {
          onScan(decodedText)
        },
        () => {
          // ignore scan errors
        }
      )
    }

    setup()

    return () => {
      isMounted = false
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => null)
      }
    }
  }, [onScan])

  return <div id="equipment-qr-reader" className={className} />
}
