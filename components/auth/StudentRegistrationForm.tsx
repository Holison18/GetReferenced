'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { FileUpload } from '@/components/ui/file-upload'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Stepper from '@/components/Stepper'
import { 
  basicInfoSchema, 
  academicInfoSchema, 
  documentUploadSchema, 
  agreementSchema,
  type BasicInfo,
  type AcademicInfo,
  type DocumentUpload,
  type Agreement
} from '@/lib/validations/student-registration'
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const steps = ['Basic Info', 'Academic Info', 'Documents', 'Agreement']

export function StudentRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const router = useRouter()

  // Form data state
  const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null)
  const [academicInfo, setAcademicInfo] = useState<AcademicInfo | null>(null)
  const [documents, setDocuments] = useState<DocumentUpload | null>(null)
  const [agreement, setAgreement] = useState<Agreement | null>(null)

  // Step 1: Basic Information Form
  const basicInfoForm = useForm<BasicInfo>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: basicInfo || {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Step 2: Academic Information Form
  const academicInfoForm = useForm<AcademicInfo>({
    resolver: zodResolver(academicInfoSchema),
    defaultValues: academicInfo || {
      enrollmentYear: new Date().getFullYear() - 4,
      completionYear: new Date().getFullYear(),
      dateOfBirth: '',
      contactInfo: {
        phone: '',
        whatsapp: '',
        address: '',
      },
    },
  })

  // Step 3: Document Upload Form
  const documentForm = useForm<DocumentUpload>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: documents || {
      transcripts: [],
      cv: undefined,
      photo: undefined,
    },
  })

  // Step 4: Agreement Form
  const agreementForm = useForm<Agreement>({
    resolver: zodResolver(agreementSchema),
    defaultValues: agreement || {
      agreeToTerms: false,
      waiveViewingRights: false,
    },
  })

  const handleNext = async () => {
    let isValid = false

    switch (currentStep) {
      case 0:
        isValid = await basicInfoForm.trigger()
        if (isValid) {
          setBasicInfo(basicInfoForm.getValues())
        }
        break
      case 1:
        isValid = await academicInfoForm.trigger()
        if (isValid) {
          setAcademicInfo(academicInfoForm.getValues())
        }
        break
      case 2:
        isValid = await documentForm.trigger()
        if (isValid) {
          setDocuments(documentForm.getValues())
        }
        break
      case 3:
        isValid = await agreementForm.trigger()
        if (isValid) {
          setAgreement(agreementForm.getValues())
          await handleSubmit()
          return
        }
        break
    }

    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!basicInfo || !academicInfo || !documents || !agreement) {
      setSubmitError('Please complete all steps')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const formData = new FormData()
      
      // Add JSON data
      formData.append('basicInfo', JSON.stringify(basicInfo))
      formData.append('academicInfo', JSON.stringify(academicInfo))
      formData.append('agreement', JSON.stringify(agreement))
      
      // Add files
      documents.transcripts.forEach((file) => {
        formData.append('transcripts', file)
      })
      
      if (documents.cv) {
        formData.append('cv', documents.cv)
      }
      
      if (documents.photo) {
        formData.append('photo', documents.photo)
      }

      const response = await fetch('/api/auth/register/student', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      setSubmitSuccess(true)
      
      // Redirect to verification page after a short delay
      setTimeout(() => {
        router.push('/verify-email?email=' + encodeURIComponent(basicInfo.email))
      }, 2000)

    } catch (error) {
      console.error('Registration error:', error)
      setSubmitError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Registration Successful!</h2>
          <p className="text-muted-foreground mb-4">
            Please check your email to verify your account before signing in.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to verification page...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Student Registration</CardTitle>
        <CardDescription>
          Create your account to start requesting recommendation letters
        </CardDescription>
        <div className="mt-6">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 0 && (
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...basicInfoForm.register('firstName')}
                  placeholder="Enter your first name"
                />
                {basicInfoForm.formState.errors.firstName && (
                  <p className="text-sm text-red-500">
                    {basicInfoForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...basicInfoForm.register('lastName')}
                  placeholder="Enter your last name"
                />
                {basicInfoForm.formState.errors.lastName && (
                  <p className="text-sm text-red-500">
                    {basicInfoForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...basicInfoForm.register('email')}
                placeholder="Enter your email address"
              />
              {basicInfoForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {basicInfoForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  {...basicInfoForm.register('password')}
                  placeholder="Create a password"
                />
                {basicInfoForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {basicInfoForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...basicInfoForm.register('confirmPassword')}
                  placeholder="Confirm your password"
                />
                {basicInfoForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {basicInfoForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Academic Information */}
        {currentStep === 1 && (
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enrollmentYear">Enrollment Year *</Label>
                <Input
                  id="enrollmentYear"
                  type="number"
                  {...academicInfoForm.register('enrollmentYear', { valueAsNumber: true })}
                  placeholder="2020"
                />
                {academicInfoForm.formState.errors.enrollmentYear && (
                  <p className="text-sm text-red-500">
                    {academicInfoForm.formState.errors.enrollmentYear.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionYear">Completion Year *</Label>
                <Input
                  id="completionYear"
                  type="number"
                  {...academicInfoForm.register('completionYear', { valueAsNumber: true })}
                  placeholder="2024"
                />
                {academicInfoForm.formState.errors.completionYear && (
                  <p className="text-sm text-red-500">
                    {academicInfoForm.formState.errors.completionYear.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...academicInfoForm.register('dateOfBirth')}
                />
                {academicInfoForm.formState.errors.dateOfBirth && (
                  <p className="text-sm text-red-500">
                    {academicInfoForm.formState.errors.dateOfBirth.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    {...academicInfoForm.register('contactInfo.phone')}
                    placeholder="+1234567890"
                  />
                  {academicInfoForm.formState.errors.contactInfo?.phone && (
                    <p className="text-sm text-red-500">
                      {academicInfoForm.formState.errors.contactInfo.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp (Optional)</Label>
                  <Input
                    id="whatsapp"
                    {...academicInfoForm.register('contactInfo.whatsapp')}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  {...academicInfoForm.register('contactInfo.address')}
                  placeholder="Enter your full address"
                />
                {academicInfoForm.formState.errors.contactInfo?.address && (
                  <p className="text-sm text-red-500">
                    {academicInfoForm.formState.errors.contactInfo.address.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Document Upload */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <FileUpload
              label="Academic Transcripts / Certificates"
              description="Upload your official transcripts or academic certificates (PDF, DOC, DOCX)"
              required
              multiple
              maxFiles={5}
              onFilesChange={(files) => {
                documentForm.setValue('transcripts', files)
                documentForm.trigger('transcripts')
              }}
              error={documentForm.formState.errors.transcripts?.message}
            />

            <FileUpload
              label="CV / Resume (Optional)"
              description="Upload your CV or resume (PDF, DOC, DOCX)"
              multiple={false}
              maxFiles={1}
              onFilesChange={(files) => {
                documentForm.setValue('cv', files[0] || undefined)
              }}
            />

            <FileUpload
              label="Profile Photo (Optional)"
              description="Upload a professional photo (JPG, PNG)"
              acceptedFileTypes={['image/jpeg', 'image/png', 'image/jpg']}
              multiple={false}
              maxFiles={1}
              maxFileSize={5 * 1024 * 1024} // 5MB
              onFilesChange={(files) => {
                documentForm.setValue('photo', files[0] || undefined)
              }}
            />
          </div>
        )}

        {/* Step 4: Agreement */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Terms and Agreements</h3>
              
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeToTerms"
                    checked={agreementForm.watch('agreeToTerms')}
                    onCheckedChange={(checked) => {
                      agreementForm.setValue('agreeToTerms', checked as boolean)
                      agreementForm.trigger('agreeToTerms')
                    }}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="agreeToTerms" className="text-sm font-medium">
                      I agree to the Terms and Conditions *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you agree to our terms of service, privacy policy, and user agreement.
                    </p>
                  </div>
                </div>
                {agreementForm.formState.errors.agreeToTerms && (
                  <p className="text-sm text-red-500">
                    {agreementForm.formState.errors.agreeToTerms.message}
                  </p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="waiveViewingRights"
                    checked={agreementForm.watch('waiveViewingRights')}
                    onCheckedChange={(checked) => {
                      agreementForm.setValue('waiveViewingRights', checked as boolean)
                      agreementForm.trigger('waiveViewingRights')
                    }}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="waiveViewingRights" className="text-sm font-medium">
                      I waive my right to view recommendation letters *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you agree that you will not request to view the content of recommendation letters written for you. This allows lecturers to write more honest and detailed recommendations.
                    </p>
                  </div>
                </div>
                {agreementForm.formState.errors.waiveViewingRights && (
                  <p className="text-sm text-red-500">
                    {agreementForm.formState.errors.waiveViewingRights.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {currentStep === steps.length - 1 ? 'Creating Account...' : 'Processing...'}
              </>
            ) : (
              <>
                {currentStep === steps.length - 1 ? 'Create Account' : 'Next'}
                {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}