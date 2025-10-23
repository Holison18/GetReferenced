'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Check, AlertCircle } from 'lucide-react'

interface RequestActionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  action: 'accept' | 'decline'
  studentName: string
  organizationName: string
}

const declineReasons = [
  'Too busy with current workload',
  'Not familiar with the field/program',
  'Insufficient knowledge of student',
  'Conflict of interest',
  'Timeline too short',
  'Other (please specify)'
]

export default function RequestActionDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  studentName,
  organizationName
}: RequestActionDialogProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      const reason = selectedReason === 'Other (please specify)' ? customReason : selectedReason
      await onConfirm(reason)
      onClose()
    } catch (error) {
      console.error('Error processing request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = action === 'accept' || (action === 'decline' && 
    (selectedReason && selectedReason !== 'Other (please specify)') || 
    (selectedReason === 'Other (please specify)' && customReason.trim())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {action === 'accept' ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                Accept Request
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-600" />
                Decline Request
              </>
            )}
          </CardTitle>
          <CardDescription>
            {action === 'accept' 
              ? `Confirm that you want to accept the recommendation letter request from ${studentName} for ${organizationName}.`
              : `Please provide a reason for declining the request from ${studentName} for ${organizationName}.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {action === 'decline' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for declining</Label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {declineReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReason === 'Other (please specify)' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-reason">Please specify</Label>
                  <Textarea
                    id="custom-reason"
                    placeholder="Enter your reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Note:</p>
                  <p>The student will be notified of your decision and can reassign the request to another lecturer.</p>
                </div>
              </div>
            </>
          )}

          {action === 'accept' && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">By accepting this request:</p>
                <ul className="mt-1 space-y-1">
                  <li>• You commit to writing the recommendation letter</li>
                  <li>• You'll earn $22.50 upon completion</li>
                  <li>• The student will be notified of your acceptance</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid || isSubmitting}
              className={`flex-1 ${
                action === 'accept' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : (action === 'accept' ? 'Accept Request' : 'Decline Request')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}