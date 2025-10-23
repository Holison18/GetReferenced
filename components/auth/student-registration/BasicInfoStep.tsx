'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { basicInfoSchema, type BasicInfoData } from '@/lib/validations/student-registration'

interface BasicInfoStepProps {
  data: Partial<BasicInfoData>
  onNext: (data: BasicInfoData) => void
  onBack?: () => void
}

export function BasicInfoStep({ data, onNext, onBack }: BasicInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: data
  })

  const onSubmit = (formData: BasicInfoData) => {
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
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <Alert variant="destructive">
                <AlertDescription>{errors.email.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">
              Date of Birth <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
            />
            {errors.dateOfBirth && (
              <Alert variant="destructive">
                <AlertDescription>{errors.dateOfBirth.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactInfo.phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactInfo.phone"
                  {...register('contactInfo.phone')}
                  placeholder="Enter your phone number"
                />
                {errors.contactInfo?.phone && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.contactInfo.phone.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo.whatsapp">
                  WhatsApp Number (Optional)
                </Label>
                <Input
                  id="contactInfo.whatsapp"
                  {...register('contactInfo.whatsapp')}
                  placeholder="Enter your WhatsApp number"
                />
                {errors.contactInfo?.whatsapp && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.contactInfo.whatsapp.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactInfo.address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactInfo.address"
                {...register('contactInfo.address')}
                placeholder="Enter your full address"
              />
              {errors.contactInfo?.address && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.contactInfo.address.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactInfo.city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactInfo.city"
                  {...register('contactInfo.city')}
                  placeholder="Enter your city"
                />
                {errors.contactInfo?.city && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.contactInfo.city.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo.country">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactInfo.country"
                  {...register('contactInfo.country')}
                  placeholder="Enter your country"
                />
                {errors.contactInfo?.country && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.contactInfo.country.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
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