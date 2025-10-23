'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'
import RequestStatusTracker from '@/components/student/request/RequestStatusTracker'

export default function RequestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const handleStatusUpdate = () => {
    // Refresh the page or update parent component
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" />
      <div className="flex-1 p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold mb-2">Request Details</h1>
            <p className="text-gray-600">
              Track the progress of your recommendation letter request
            </p>
          </div>
        </div>

        <RequestStatusTracker 
          requestId={requestId} 
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </div>
  )
}