export default function DesignRequestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
