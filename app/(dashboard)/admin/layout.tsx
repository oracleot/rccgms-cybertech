import { TestModeProvider } from "@/contexts/test-mode-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TestModeProvider>{children}</TestModeProvider>
}
