'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { 
  StudentRegistrationData,
  BasicInfoData,
  AcademicInfoData,
  DocumentsData,
  AgreementData,
  basicInfoSchema,
  academicInfoSchema,
  documentsSchema,
  agreementSchema
} from '@/lib/validations/student-registration'

// Step components
import { BasicInfoStep } from './steps/BasicInfoStep'
import { AcademicInfoStep } from './steps/AcademicInfoStep'
import { DocumentsStep } from './steps/DocumentsStep'
import { AgreementStep } from './steps/AgreementStep'
import { ConfirmationStep } from './steps/ConfirmationStep'

interface StudentRegistrationWizardProps {
  email: string
  password: string
}

type StepData = BasicInfoData | AcademicInfoData | DocumentsData | AgreementData

const steps = [
  { id: 'basic', title: 'Basic Information', description: 'Personal details and contact information' },
  { id: 'academic', title: 'Academic Information', description: 'Education background and timeline' },
  { id: 'documents', title: 'Document Uploads', description: 'Transcripts, CV, and photo' },
  { id: 'agreement', title: 'Terms & Agreement', description: 'Privacy policy and letter viewing rights' },
  { id: 'confirmation', title: 'Confirmation', description: 'Review and submit registration' }
]

export function StudentRegistrationWizard({ email, password }: StudentRegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading] = useState(false)
  const [error, setError] = useState('')
  const [registrationData, setRegistrationData] = useState<Partial<StudentRegistrationData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const router = useRouter()

  // Form for current step
  const getFormSchema = () => {
    switch (currentStep) {
      case 0: return basicInfoSchema
      case 1: return academicInfoSchema
      case 2: return documentsSchema
      case 3: return agreementSchema
      default: return basicInfoSchema
    }
  }

  const form = useForm({
    resolver: zodResolver(getFormSchema()),
    mode: 'onChange'
  })

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = async (data: StepData) => {
    setError('')
    
    // Update registration data
    const stepKey = steps[currentStep].id as keyof StudentRegistrationData
    setRegistrationData(prev => ({
      ...prev,
      [stepKey]: data
    }))

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      form.reset() // Reset form for next step
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicUrl
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email?type=student`
        }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      const userId = authData.user.id

      // 2. Upload documents
      const documentUrls: string[] = []
      let cvUrl: string | null = null
      let photoUrl: string | null = null

      // Upload transcripts
      if (registrationData.documents?.transcripts) {
        for (const [index, transcript] of registrationData.documents.transcripts.entries()) {
          const path = `${userId}/transcripts/transcript_${index + 1}_${Date.now()}.${transcript.name.split('.').pop()}`
          const url = await uploadFile(transcript, 'documents', path)
          documentUrls.push(url)
        }
      }

      // Upload CV if provided
      if (registrationData.documents?.cv) {
        const path = `${userId}/cv/cv_${Date.now()}.${registrationData.documents.cv.name.split('.').pop()}`
        cvUrl = await uploadFile(registrationData.documents.cv, 'documents', path)
      }

      // Upload photo if provided
      if (registrationData.documents?.photo) {
        const path = `${userId}/photos/photo_${Date.now()}.${registrationData.documents.photo.name.split('.').pop()}`
        photoUrl = await uploadFile(registrationData.documents.photo, 'photos', path)
      }

      // 3. Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'student',
          first_name: registrationData.basicInfo!.firstName,
          last_name: registrationData.basicInfo!.lastName
        })

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`)
      }

      // 4. Create student profile record
      const { error: studentProfileError } = await supabase
        .from('student_profiles')
        .insert({
          id: userId,
          enrollment_year: registrationData.academicInfo!.enrollmentYear,
          completion_year: registrationData.academicInfo!.completionYear,
          contact_info: {
            ...registrationData.basicInfo!.contactInfo,
            institution: registrationData.academicInfo!.institution,
            program: registrationData.academicInfo!.program,
            gpa: registrationData.academicInfo!.gpa
          },
          date_of_birth: registrationData.basicInfo!.dateOfBirth,
          transcript_urls: documentUrls,
          cv_url: cvUrl,
          photo_url: photoUrl
        })

      if (studentProfileError) {
        throw new Error(`Failed to create student profile: ${studentProfileError.message}`)
      }

      // 5. Redirect to email verification page
      router.push('/verify-email?type=student&email=' + encodeURIComponent(email))

    } catch (error) {
      console.error('Registration error:', error)
      setError(error instanceof Error ? error.message : 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            form={form}
            onNext={handleNext}
            loading={loading}
            defaultEmail={email}
          />
        )
      case 1:
        return (
          <AcademicInfoStep
            form={form}
            onNext={handleNext}
            onPrevious={handlePrevious}
            loading={loading}
          />
        )
      case 2:
        return (
          <DocumentsStep
            form={form}
            onNext={handleNext}
            onPrevious={handlePrevious}
            loading={loading}
          />
        )
      case 3:
        return (
          <AgreementStep
            form={form}
            onNext={handleNext}
            onPrevious={handlePrevious}
            loading={loading}
          />
        )
      case 4:
        return (
          <ConfirmationStep
            registrationData={registrationData}
            onSubmit={handleSubmit}
            onPrevious={handlePrevious}
            loading={isSubmitting}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center space-x-2 ${
              index < currentStep 
                ? 'text-green-600' 
                : index === currentStep 
                ? 'text-blue-600' 
                : 'text-gray-400'
            }`}>
              {index < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : index === currentStep ? (
                <div className="h-5 w-5 rounded-full border-2 border-current bg-current/20" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-current" />
              )}
              <span className="text-sm font-medium hidden sm:block">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                index < currentStep ? 'bg-green-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Step Content */}
      {renderStep()}
    </div>
  )
}