import { requireRole } from '@/lib/server-auth'
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent'

export default async function AdminDashboard() {
  // Server-side authentication check
  await requireRole('admin')

  return <AdminDashboardContent />
}