import { TestModeProvider } from "@/contexts/test-mode-context"
import { TestModeBanner } from "@/components/admin/test-mode-banner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TestModeProvider>
      <TestModeBanner />
      {children}
    </TestModeProvider>
  )
}
