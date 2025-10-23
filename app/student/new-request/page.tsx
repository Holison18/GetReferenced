'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Stepper from '@/components/Stepper'
import Sidebar from '@/components/Sidebar'
import FileUpload from '@/components/student/request/FileUpload'
import LecturerSelection from '@/components/student/request/LecturerSelection'
import RichTextEditor from '@/components/RichTextEditor'
import { 
  requestPurposeSchema, 
  requestDetailsSchema, 
  lecturerSelectionSchema, 
  documentsSchema, 
  additionalDetailsSchema,
  type CompleteRequest 
} from '@/lib/validations/request'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const steps = ['Purpose', 'Details', 'Lecturers', 'Documents', 'Draft Letter', 'Review & Submit']

export default function NewRequest() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  // Form state for each step
  const [formData, setFormData] = useState<Partial<CompleteRequest>>({})

  // Step 1: Purpose Selection
  const purposeForm = useForm({
    resolver: zodResolver(requestPurposeSchema),
    defaultValues: { purpose: formData.purpose }
  })

  // Step 2: Details
  const detailsForm = useForm({
    resolver: zodResolver(requestDetailsSchema),
    defaultValues: {
      recipientName: formData.recipientName || '',
      recipientAddress: formData.recipientAddress || '',
      programName: formData.programName || '',
      organizationName: formData.organizationName || '',
      deadline: formData.deadline || '',
      deliveryMethod: formData.deliveryMethod
    }
  })

  // Step 3: Lecturer Selection
  const lecturerForm = useForm({
    resolver: zodResolver(lecturerSelectionSchema),
    defaultValues: { lecturerIds: formData.lecturerIds || [] }
  })

  // Step 4: Documents
  const documentsForm = useForm({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      documents: formData.documents || [],
      draftLetter: formData.draftLetter || ''
    }
  })

  // Step 5: Additional Details
  const additionalForm = useForm({
    resolver: zodResolver(additionalDetailsSchema),
    defaultValues: { additionalNotes: formData.additionalNotes || '' }
  })

  const nextStep = async () => {
    let isValid = false
    let stepData = {}

    switch (currentStep) {
      case 0:
        isValid = await purposeForm.trigger()
        if (isValid) {
          stepData = purposeForm.getValues()
        }
        break
      case 1:
        isValid = await detailsForm.trigger()
        if (isValid) {
          stepData = detailsForm.getValues()
        }
        break
      case 2:
        isValid = await lecturerForm.trigger()
        if (isValid) {
          stepData = lecturerForm.getValues()
        }
        break
      case 3:
        isValid = await documentsForm.trigger()
        if (isValid) {
          stepData = documentsForm.getValues()
        }
        break
      case 4:
        isValid = await additionalForm.trigger()
        if (isValid) {
          stepData = additionalForm.getValues()
        }
        break
      default:
        isValid = true
    }

    if (isValid) {
      setFormData(prev => ({ ...prev, ...stepData }))
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const submitRequest = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          student_id: user.id,
          purpose: formData.purpose!,
          details: {
            recipientName: formData.recipientName,
            recipientAddress: formData.recipientAddress!,
            programName: formData.programName,
            organizationName: formData.organizationName!,
            deliveryMethod: formData.deliveryMethod!
          },
          lecturer_ids: formData.lecturerIds!,
          document_urls: formData.documents!,
          draft_letter: formData.draftLetter,
          additional_notes: formData.additionalNotes,
          deadline: formData.deadline!,
          status: 'pending_acceptance'
        })

      if (error) throw error

      router.push('/student/dashboard?success=request-created')
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Error creating request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <CardHeader>
              <CardTitle>What is this recommendation letter for?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {[
                  { value: 'school', label: 'School/University Application', description: 'For admission to academic programs' },
                  { value: 'scholarship', label: 'Scholarship Application', description: 'For scholarship or grant applications' },
                  { value: 'job', label: 'Job Application', description: 'For employment opportunities' }
                ].map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      purposeForm.watch('purpose') === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => purposeForm.setValue('purpose', option.value as any)}
                  >
                    <h3 className="font-medium">{option.label}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                ))}
              </div>
              {purposeForm.formState.errors.purpose && (
                <p className="text-red-500 text-sm">{purposeForm.formState.errors.purpose.message}</p>
              )}
            </CardContent>
          </Card>
        )

      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                  <Input
                    id="recipientName"
                    placeholder="e.g., Dr. John Smith"
                    {...detailsForm.register('recipientName')}
                  />
                </div>
                <div>
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    placeholder="e.g., Harvard University"
                    {...detailsForm.register('organizationName')}
                  />
                  {detailsForm.formState.errors.organizationName && (
                    <p className="text-red-500 text-sm">{detailsForm.formState.errors.organizationName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="programName">Program/Position Name (Optional)</Label>
                <Input
                  id="programName"
                  placeholder="e.g., Master's in Computer Science"
                  {...detailsForm.register('programName')}
                />
              </div>

              <div>
                <Label htmlFor="recipientAddress">Recipient Address *</Label>
                <Textarea
                  id="recipientAddress"
                  placeholder="Full address where the letter should be sent"
                  {...detailsForm.register('recipientAddress')}
                />
                {detailsForm.formState.errors.recipientAddress && (
                  <p className="text-red-500 text-sm">{detailsForm.formState.errors.recipientAddress.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    {...detailsForm.register('deadline')}
                  />
                  {detailsForm.formState.errors.deadline && (
                    <p className="text-red-500 text-sm">{detailsForm.formState.errors.deadline.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="deliveryMethod">Delivery Method *</Label>
                  <Select
                    value={detailsForm.watch('deliveryMethod')}
                    onValueChange={(value) => detailsForm.setValue('deliveryMethod', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self_upload">I'll upload myself</SelectItem>
                      <SelectItem value="lecturer_upload">Lecturer uploads directly</SelectItem>
                      <SelectItem value="email">Email to recipient</SelectItem>
                    </SelectContent>
                  </Select>
                  {detailsForm.formState.errors.deliveryMethod && (
                    <p className="text-red-500 text-sm">{detailsForm.formState.errors.deliveryMethod.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Lecturers</CardTitle>
            </CardHeader>
            <CardContent>
              <LecturerSelection
                selectedLecturers={lecturerForm.watch('lecturerIds') || []}
                onSelectionChange={(lecturerIds) => lecturerForm.setValue('lecturerIds', lecturerIds)}
                requestPurpose={formData.purpose}
                maxSelection={2}
              />
              {lecturerForm.formState.errors.lecturerIds && (
                <p className="text-red-500 text-sm mt-2">{lecturerForm.formState.errors.lecturerIds.message}</p>
              )}
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Upload Supporting Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Supporting Documents *</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Upload transcripts, certificates, CV, or other relevant documents
                </p>
                <FileUpload
                  onFilesUploaded={(urls) => documentsForm.setValue('documents', urls)}
                  existingFiles={documentsForm.watch('documents') || []}
                  maxFiles={5}
                />
                {documentsForm.formState.errors.documents && (
                  <p className="text-red-500 text-sm mt-2">{documentsForm.formState.errors.documents.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Draft Letter (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Provide a draft letter or key points you'd like the lecturer to include. This helps them understand your goals and write a more personalized letter.
              </p>
              <div>
                <Label htmlFor="draftLetter">Draft Letter or Key Points</Label>
                <RichTextEditor
                  value={documentsForm.watch('draftLetter') || ''}
                  onChange={(value) => documentsForm.setValue('draftLetter', value)}
                />
              </div>
              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any additional information or special requests..."
                  {...additionalForm.register('additionalNotes')}
                />
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <h3 className="font-medium">Purpose</h3>
                  <p className="text-gray-600 capitalize">{formData.purpose}</p>
                </div>
                <div>
                  <h3 className="font-medium">Organization</h3>
                  <p className="text-gray-600">{formData.organizationName}</p>
                </div>
                <div>
                  <h3 className="font-medium">Deadline</h3>
                  <p className="text-gray-600">{formData.deadline}</p>
                </div>
                <div>
                  <h3 className="font-medium">Selected Lecturers</h3>
                  <p className="text-gray-600">{formData.lecturerIds?.length || 0} lecturer(s) selected</p>
                </div>
                <div>
                  <h3 className="font-medium">Documents</h3>
                  <p className="text-gray-600">{formData.documents?.length || 0} document(s) uploaded</p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your request will be sent to the selected lecturers</li>
                  <li>• You'll receive notifications about their responses</li>
                  <li>• Payment of $30 will be processed upon submission</li>
                  <li>• You can track progress in your dashboard</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" />
      <div className="flex-1 p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Request</h1>
          <p className="text-gray-600">Request a recommendation letter from your lecturers</p>
        </div>

        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <div className="mb-8">
          {renderStepContent()}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={submitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}