'use client'

import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Loader2, User, Mail, Phone, MapPin } from 'lucide-react'
import { BasicInfoData } from '@/lib/validations/student-registration'

interface BasicInfoStepProps {
  form: UseFormReturn<BasicInfoData>
  onNext: (data: BasicInfoData) => void
  loading: boolean
  defaultEmail: string
}

export function BasicInfoStep({ form, onNext, loading, defaultEmail }: BasicInfoStepProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form

  // Set default email
  if (defaultEmail && !watch('email')) {
    setValue('email', defaultEmail)
  }

  const onSubmit = (data: BasicInfoData) => {
    const basicInfoData: BasicInfoData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      contactInfo: {
        phone: data.phone,
        whatsapp: data.whatsapp || '',
        address: data.address,
        city: data.city,
        country: data.country
      }
    }
    onNext(basicInfoData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Personal Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Enter your first name"
                disabled={loading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message as string}</p>
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
                disabled={loading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName.message as string}</p>
              )}
            </div>
          </div>

          {/* Email and Date of Birth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-1">
                <Mail className="h-4 w-4" />
                <span>Email Address <span className="text-red-500">*</span></span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter your email address"
                disabled={loading}
                readOnly={!!defaultEmail}
                className={defaultEmail ? 'bg-muted' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message as string}</p>
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
                disabled={loading}
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-red-500">{errors.dateOfBirth.message as string}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Contact Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+1234567890"
                  disabled={loading}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number (Optional)</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  {...register('whatsapp')}
                  placeholder="+1234567890"
                  disabled={loading}
                />
                {errors.whatsapp && (
                  <p className="text-sm text-red-500">{errors.whatsapp.message as string}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Address Information</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="Enter your full address"
                  disabled={loading}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address.message as string}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="Enter your city"
                    disabled={loading}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city.message as string}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    {...register('country')}
                    placeholder="Enter your country"
                    disabled={loading}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500">{errors.country.message as string}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Next Step
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}