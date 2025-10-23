import { Sidebar } from '@/components/Sidebar'
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout'

export default function LecturerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ResponsiveLayout 
      sidebar={<Sidebar userRole="lecturer" />}
      className="bg-muted/30"
    >
      {children}
    </ResponsiveLayout>
  )
}