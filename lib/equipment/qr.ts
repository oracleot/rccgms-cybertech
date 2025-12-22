import QRCode from "qrcode"

const DEFAULT_APP_URL = "http://localhost:3000"

export function getEquipmentUrl(equipmentId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  return `${baseUrl.replace(/\/$/, "")}/equipment/${equipmentId}`
}

/**
 * Generate a QR code data URL for an equipment item
 */
export async function generateEquipmentQR(equipmentId: string): Promise<string> {
  const url = getEquipmentUrl(equipmentId)
  return QRCode.toDataURL(url, { width: 220, margin: 2 })
}
