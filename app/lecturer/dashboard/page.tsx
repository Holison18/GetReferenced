import { requireRole } from '@/lib/server-auth-utils'
import { RouteGuard } from '@/components/auth/RouteGuard'
import LecturerDashboardContent from '@/components/lecturer/LecturerDashboardContent'

export default async function LecturerDashboard() {
  // Server-side authentication check
  const auth = await requireRole('lecturer')

  return (
    <RouteGuard requiredRole="lecturer">
      <LecturerDashboardContent user={auth} />
    </RouteGuard>
  )
}