import type { MetadataRoute } from "next"

/**
 * PWA Manifest for Cyber Tech
 * Defines the app's appearance when installed on devices
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cyber Tech - Church Tech Management",
    short_name: "Cyber Tech",
    description: "Church tech department management app for scheduling, equipment tracking, and service coordination",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-256.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/icons/icon-384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide" as const,
        label: "Dashboard overview showing upcoming duties and quick actions",
      },
      {
        src: "/screenshots/rota.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow" as const,
        label: "Rota calendar view on mobile",
      },
    ],
    shortcuts: [
      {
        name: "My Schedule",
        short_name: "Schedule",
        description: "View your upcoming duties",
        url: "/rota/my-schedule",
        icons: [{ src: "/icons/calendar.png", sizes: "96x96" }],
      },
      {
        name: "Scan Equipment",
        short_name: "Scan",
        description: "Scan equipment QR code",
        url: "/equipment/scan",
        icons: [{ src: "/icons/qr-scan.png", sizes: "96x96" }],
      },
    ],
  }
}
