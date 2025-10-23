'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { lecturerVerificationSchema, type LecturerVerificationData } from '@/lib/validations/lecturer-registration'
import { Mail, Clock, RefreshCw } from 'lucide-react'

interface LecturerVerificationStepProps {
  data: Partial<LecturerVerificationData>
  staffEmail: string
  onNext: (data: LecturerVerificationData) => void
  onBack: () => void
  onResendCode: () => Promise<void>
}

export function LecturerVerificationStep({ 
  data, 
  staffEmail, 
  onNext, 
  onBack, 
  onResendCode 
}: LecturerVerificationStepProps) {
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LecturerVerificationData>({
    resolver: zodResolver(lecturerVerificationSchema),
    defaultValues: data
  })

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleResendCode = async () => {
    setIsResending(true)
    setResendSuccess(false)
    
    try {
      await onResendCode()
      setTimeLeft(300) // Reset timer
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to resend code:', error)
    } finally {
      setIsResending(false)
    }
  }

  const onSubmit = (formData: LecturerVerificationData) => {
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
        <CardDescription>
          We've sent a verification code to your staff email address. Please enter it below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Email Info */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Verification code sent to:</p>
              <p className="text-blue-700">{staffEmail}</p>
            </div>
          </div>

          {/* Success message for resend */}
          {resendSuccess && (
            <Alert>
              <AlertDescription>
                Verification code has been resent successfully!
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">
                Verification Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="verificationCode"
                {...register('verificationCode')}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              {errors.verificationCode && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.verificationCode.message}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Timer and Resend */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Code expires in: <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={isResending || timeLeft > 240} // Allow resend after 1 minute
              >
                {isResending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Code'
                )}
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Verification Instructions:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Check your staff email inbox for the verification code</li>
                <li>• The code is valid for 5 minutes</li>
                <li>• If you don't see the email, check your spam folder</li>
                <li>• You can request a new code after 1 minute</li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}