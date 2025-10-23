'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LecturerBasicInfoStep } from './LecturerBasicInfoStep'
import { LecturerAcademicInfoStep } from './LecturerAcademicInfoStep'
import { LecturerVerificationStep } from './LecturerVerificationStep'
import { LecturerPreferencesStep } from './LecturerPreferencesStep'
import { LecturerAgreementStep } from './LecturerAgreementStep'
import { 
  type LecturerRegistrationData,
  type LecturerBasicInfoData,
  type LecturerAcademicInfoData,
  type LecturerVerificationData,
  type LecturerPreferencesData,
  type LecturerAgreementData
} from '@/lib/validations/lecturer-registration'

const STEPS = [
  'Basic Information',
  'Academic Details',
  'Email Verification',
  'Preferences & Payment',
  'Terms & Agreement'
]

interface LecturerRegistrationWizardProps {
  email: string
  password: string
}

export function LecturerRegistrationWizard({ email, password }: LecturerRegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [registrationData, setRegistrationData] = useState<Partial<LecturerRegistrationData>>({})
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationCodeSent, setVerificationCodeSent] = useState(false)
  const router = useRouter()

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const sendVerificationEmail = async (staffEmail: string, code: string) => {
    // In a real implementation, this would send an email via SendGrid or similar service
    // For now, we'll simulate this and log the code
    console.log(`Verification code for ${staffEmail}: ${code}`)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Store the code temporarily (in production, this would be stored in database with expiry)
    sessionStorage.setItem('verification_code', code)
    sessionStorage.setItem('verification_email', staffEmail)
    
    return true
  }

  const handleBasicInfoNext = async (data: LecturerBasicInfoData) => {
    setError('')
    setIsSubmitting(true)

    try {
      // Generate and send verification code
      const verificationCode = generateVerificationCode()
      await sendVerificationEmail(data.staffEmail, verificationCode)
      
      setRegistrationData(prev => ({ ...prev, basicInfo: data }))
      setVerificationCodeSent(true)
      setCurrentStep(1)
    } catch (err) {
      setError('Failed to send verification email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcademicInfoNext = (data: LecturerAcademicInfoData) => {
    setRegistrationData(prev => ({ ...prev, academicInfo: data }))
    setCurrentStep(2)
  }

  const handleVerificationNext = (data: LecturerVerificationData) => {
    // Verify the code
    const storedCode = sessionStorage.getItem('verification_code')
    const storedEmail = sessionStorage.getItem('verification_email')
    
    if (data.verificationCode !== storedCode) {
      setError('Invalid verification code. Please try again.')
      return
    }

    if (registrationData.basicInfo?.staffEmail !== storedEmail) {
      setError('Verification email mismatch. Please restart the process.')
      return
    }

    setRegistrationData(prev => ({ ...prev, verification: data }))
    setCurrentStep(3)
  }

  const handlePreferencesNext = (data: LecturerPreferencesData) => {
    setRegistrationData(prev => ({ ...prev, preferences: data }))
    setCurrentStep(4)
  }

  const handleResendVerificationCode = async () => {
    if (!registrationData.basicInfo?.staffEmail) {
      throw new Error('No staff email found')
    }

    const newCode = generateVerificationCode()
    await sendVerificationEmail(registrationData.basicInfo.staffEmail, newCode)
  }

  const handleFinalSubmit = async (agreementData: LecturerAgreementData) => {
    setIsSubmitting(true)
    setError('')

    try {
      const { basicInfo, academicInfo, preferences } = registrationData

      if (!basicInfo || !academicInfo || !preferences) {
        throw new Error('Missing registration data')
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: basicInfo.firstName,
            last_name: basicInfo.lastName,
            role: 'lecturer'
          }
        }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      const userId = authData.user.id

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'lecturer',
          first_name: basicInfo.firstName,
          last_name: basicInfo.lastName
        })

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`)
      }

      // Create lecturer profile
      const { error: lecturerProfileError } = await supabase
        .from('lecturer_profiles')
        .insert({
          id: userId,
          staff_number: basicInfo.staffNumber,
          department: academicInfo.department,
          affiliated_departments: academicInfo.affiliatedDepartments || [],
          employment_year: academicInfo.employmentYear,
          rank: academicInfo.rank,
          notification_preferences: {
            email: preferences.notificationPreferences.email,
            sms: preferences.notificationPreferences.sms,
            whatsapp: preferences.notificationPreferences.whatsapp,
            phone: basicInfo.phone,
            whatsapp_number: basicInfo.whatsappNumber,
            max_requests_per_month: preferences.maxRequestsPerMonth,
            auto_accept_departments: preferences.autoAcceptFromDepartments || [],
            specializations: academicInfo.specializations,
            office_location: academicInfo.officeLocation,
            office_hours: academicInfo.officeHours
          },
          payment_details: preferences.paymentDetails
        })

      if (lecturerProfileError) {
        throw new Error(`Failed to create lecturer profile: ${lecturerProfileError.message}`)
      }

      // Clean up verification data
      sessionStorage.removeItem('verification_code')
      sessionStorage.removeItem('verification_email')

      // Redirect to email verification
      router.push(`/verify-email?email=${encodeURIComponent(email)}&role=lecturer`)

    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during registration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-center font-medium">{STEPS[currentStep]}</p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {currentStep === 0 && (
        <LecturerBasicInfoStep
          data={registrationData.basicInfo || {}}
          onNext={handleBasicInfoNext}
        />
      )}

      {currentStep === 1 && (
        <LecturerAcademicInfoStep
          data={registrationData.academicInfo || {}}
          onNext={handleAcademicInfoNext}
          onBack={handleBack}
        />
      )}

      {currentStep === 2 && registrationData.basicInfo && (
        <LecturerVerificationStep
          data={registrationData.verification || {}}
          staffEmail={registrationData.basicInfo.staffEmail}
          onNext={handleVerificationNext}
          onBack={handleBack}
          onResendCode={handleResendVerificationCode}
        />
      )}

      {currentStep === 3 && (
        <LecturerPreferencesStep
          data={registrationData.preferences || {}}
          onNext={handlePreferencesNext}
          onBack={handleBack}
        />
      )}

      {currentStep === 4 && (
        <LecturerAgreementStep
          data={registrationData.agreement || {}}
          onNext={handleFinalSubmit}
          onBack={handleBack}
        />
      )}
    </div>
  )
}