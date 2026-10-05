export const metadata = {
  title: "Maintenance | Fusion",
}

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-semibold text-foreground">
          Scheduled Maintenance
        </h1>
        <p className="text-muted-foreground">
          Fusion is undergoing a scheduled upgrade. We&apos;ll be back shortly.
        </p>
      </div>
    </div>
  )
}
