import { requireRole } from '@/lib/server-auth-utils'
import { RouteGuard } from '@/components/auth/RouteGuard'
import StudentDashboardContent from '@/components/student/StudentDashboardContent'

export default async function StudentDashboard() {
  // Server-side authentication check
  const auth = await requireRole('student')

  return (
    <RouteGuard requiredRole="student">
      <StudentDashboardContent user={auth} />
    </RouteGuard>
  )
}