'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { lecturerBasicInfoSchema, type LecturerBasicInfoData } from '@/lib/validations/lecturer-registration'

interface LecturerBasicInfoStepProps {
  data: Partial<LecturerBasicInfoData>
  onNext: (data: LecturerBasicInfoData) => void
  onBack?: () => void
}

export function LecturerBasicInfoStep({ data, onNext, onBack }: LecturerBasicInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LecturerBasicInfoData>({
    resolver: zodResolver(lecturerBasicInfoSchema),
    defaultValues: data
  })

  const onSubmit = (formData: LecturerBasicInfoData) => {
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Please provide your personal details and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.firstName.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.lastName.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Personal Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter your personal email address"
            />
            {errors.email && (
              <Alert variant="destructive">
                <AlertDescription>{errors.email.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffEmail">
              Staff/Institutional Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="staffEmail"
              type="email"
              {...register('staffEmail')}
              placeholder="Enter your institutional email address"
            />
            <p className="text-sm text-muted-foreground">
              This will be used for verification purposes
            </p>
            {errors.staffEmail && (
              <Alert variant="destructive">
                <AlertDescription>{errors.staffEmail.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffNumber">
              Staff Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="staffNumber"
              {...register('staffNumber')}
              placeholder="Enter your staff number"
            />
            {errors.staffNumber && (
              <Alert variant="destructive">
                <AlertDescription>{errors.staffNumber.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.phone.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">
                WhatsApp Number (Optional)
              </Label>
              <Input
                id="whatsappNumber"
                {...register('whatsappNumber')}
                placeholder="Enter your WhatsApp number"
              />
              {errors.whatsappNumber && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.whatsappNumber.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Verification Process:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A verification code will be sent to your staff email</li>
              <li>• You'll need to enter this code in the next step</li>
              <li>• This ensures you are a legitimate faculty member</li>
            </ul>
          </div>

          <div className="flex justify-between">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="ml-auto">
              {isSubmitting ? 'Processing...' : 'Next'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}