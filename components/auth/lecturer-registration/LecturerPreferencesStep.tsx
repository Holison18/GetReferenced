'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { lecturerPreferencesSchema, type LecturerPreferencesData } from '@/lib/validations/lecturer-registration'
import { Mail, MessageSquare, Phone, CreditCard, Building, Smartphone } from 'lucide-react'

interface LecturerPreferencesStepProps {
  data: Partial<LecturerPreferencesData>
  onNext: (data: LecturerPreferencesData) => void
  onBack: () => void
}

export function LecturerPreferencesStep({ data, onNext, onBack }: LecturerPreferencesStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LecturerPreferencesData>({
    resolver: zodResolver(lecturerPreferencesSchema),
    defaultValues: {
      notificationPreferences: {
        email: true,
        sms: false,
        whatsapp: false,
        ...data.notificationPreferences
      },
      paymentDetails: {
        accountType: 'bank',
        ...data.paymentDetails
      },
      maxRequestsPerMonth: data.maxRequestsPerMonth || 10,
      autoAcceptFromDepartments: data.autoAcceptFromDepartments || []
    }
  })

  const watchedAccountType = watch('paymentDetails.accountType')
  const watchedMaxRequests = watch('maxRequestsPerMonth')
  const watchedNotifications = watch('notificationPreferences')

  const onSubmit = (formData: LecturerPreferencesData) => {
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences & Payment Setup</CardTitle>
        <CardDescription>
          Configure your notification preferences and payment details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Notification Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Choose how you'd like to receive notifications about new requests and updates.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Mail className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Checkbox
                  id="email-notifications"
                  checked={watchedNotifications?.email || false}
                  onCheckedChange={(checked) => setValue('notificationPreferences.email', checked as boolean)}
                />
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Phone className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <Label htmlFor="sms-notifications" className="font-medium">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                </div>
                <Checkbox
                  id="sms-notifications"
                  checked={watchedNotifications?.sms || false}
                  onCheckedChange={(checked) => setValue('notificationPreferences.sms', checked as boolean)}
                />
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <Label htmlFor="whatsapp-notifications" className="font-medium">WhatsApp Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via WhatsApp</p>
                </div>
                <Checkbox
                  id="whatsapp-notifications"
                  checked={watchedNotifications?.whatsapp || false}
                  onCheckedChange={(checked) => setValue('notificationPreferences.whatsapp', checked as boolean)}
                />
              </div>
            </div>
          </div>

          {/* Request Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Request Management</h3>
            
            <div className="space-y-2">
              <Label>Maximum Requests per Month: {watchedMaxRequests}</Label>
              <Slider
                value={[watchedMaxRequests || 10]}
                onValueChange={(value) => setValue('maxRequestsPerMonth', value[0])}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Set a limit on how many requests you want to receive each month
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Details</h3>
            <p className="text-sm text-muted-foreground">
              You'll earn $22.50 for each completed recommendation letter. Set up your payment method below.
            </p>

            <div className="space-y-2">
              <Label>Account Type <span className="text-red-500">*</span></Label>
              <Select 
                value={watchedAccountType} 
                onValueChange={(value) => setValue('paymentDetails.accountType', value as 'bank' | 'mobile_money')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>Bank Account</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile_money">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile Money</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchedAccountType === 'bank' && (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Bank Account Details</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="bankName"
                      {...register('paymentDetails.bankName')}
                      placeholder="Enter bank name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="accountNumber"
                      {...register('paymentDetails.accountNumber')}
                      placeholder="Enter account number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="accountName"
                    {...register('paymentDetails.accountName')}
                    placeholder="Enter account holder name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number (Optional)</Label>
                  <Input
                    id="routingNumber"
                    {...register('paymentDetails.routingNumber')}
                    placeholder="Enter routing number if required"
                  />
                </div>
              </div>
            )}

            {watchedAccountType === 'mobile_money' && (
              <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile Money Details</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobileMoneyProvider">Provider <span className="text-red-500">*</span></Label>
                    <Select onValueChange={(value) => setValue('paymentDetails.mobileMoneyProvider', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                        <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                        <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileMoneyNumber">Mobile Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="mobileMoneyNumber"
                      {...register('paymentDetails.mobileMoneyNumber')}
                      placeholder="Enter mobile money number"
                    />
                  </div>
                </div>
              </div>
            )}

            {errors.paymentDetails && (
              <Alert variant="destructive">
                <AlertDescription>{errors.paymentDetails.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Next'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}