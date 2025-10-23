import { Sidebar } from '@/components/Sidebar'
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ResponsiveLayout 
      sidebar={<Sidebar userRole="student" />}
      className="bg-muted/30"
    >
      {children}
    </ResponsiveLayout>
  )
}