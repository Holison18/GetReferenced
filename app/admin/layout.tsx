import { Sidebar } from '@/components/Sidebar'
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ResponsiveLayout 
      sidebar={<Sidebar userRole="admin" />}
      className="bg-muted/30"
    >
      {children}
    </ResponsiveLayout>
  )
}