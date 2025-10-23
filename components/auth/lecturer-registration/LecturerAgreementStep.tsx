'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { lecturerAgreementSchema, type LecturerAgreementData } from '@/lib/validations/lecturer-registration'

interface LecturerAgreementStepProps {
  data: Partial<LecturerAgreementData>
  onNext: (data: LecturerAgreementData) => void
  onBack: () => void
}

export function LecturerAgreementStep({ data, onNext, onBack }: LecturerAgreementStepProps) {
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LecturerAgreementData>({
    resolver: zodResolver(lecturerAgreementSchema),
    defaultValues: data
  })

  const watchedValues = watch()

  const onSubmit = (formData: LecturerAgreementData) => {
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms and Agreements</CardTitle>
        <CardDescription>
          Please read and accept the following terms to complete your registration as a lecturer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Letter Delivery Policy */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900">Letter Delivery Policy</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                By checking this box, you understand and agree that:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You will deliver completed recommendation letters directly to the intended recipients</li>
                <li>Letters must be submitted within the agreed timeframe (typically 1-2 weeks)</li>
                <li>You will maintain confidentiality of student information and letter content</li>
                <li>You may decline requests that you cannot fulfill in good faith</li>
                <li>You will provide honest and accurate assessments of students</li>
              </ul>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="letterDeliveryPolicy"
                checked={watchedValues.letterDeliveryPolicy || false}
                onCheckedChange={(checked) => setValue('letterDeliveryPolicy', checked as boolean)}
              />
              <Label htmlFor="letterDeliveryPolicy" className="text-sm font-medium leading-relaxed">
                I understand and agree to the letter delivery policy
                <span className="text-red-500 ml-1">*</span>
              </Label>
            </div>
            {errors.letterDeliveryPolicy && (
              <Alert variant="destructive">
                <AlertDescription>{errors.letterDeliveryPolicy.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Payment Policy */}
          <div className="space-y-4 p-4 border rounded-lg bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900">Payment Policy</h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>
                By checking this box, you understand and agree that:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You will receive $22.50 (75% of $30) for each completed recommendation letter</li>
                <li>Payment is processed automatically upon letter submission and confirmation</li>
                <li>GetReference retains $7.50 (25%) per letter for platform maintenance and services</li>
                <li>Payments are transferred to your specified account within 3-5 business days</li>
                <li>You are responsible for any applicable taxes on your earnings</li>
                <li>Refunds may be issued to students if you decline their request</li>
              </ul>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="paymentPolicy"
                checked={watchedValues.paymentPolicy || false}
                onCheckedChange={(checked) => setValue('paymentPolicy', checked as boolean)}
              />
              <Label htmlFor="paymentPolicy" className="text-sm font-medium leading-relaxed">
                I understand and agree to the payment policy
                <span className="text-red-500 ml-1">*</span>
              </Label>
            </div>
            {errors.paymentPolicy && (
              <Alert variant="destructive">
                <AlertDescription>{errors.paymentPolicy.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Terms and Conditions</h3>
            <div className="text-sm text-muted-foreground space-y-2 max-h-40 overflow-y-auto">
              <p><strong>1. Service Description:</strong> GetReference provides a platform for managing recommendation letter requests between students and lecturers.</p>
              
              <p><strong>2. Lecturer Responsibilities:</strong> You agree to respond to requests promptly and provide quality recommendation letters when accepted.</p>
              
              <p><strong>3. AI Assistance:</strong> The platform provides AI tools to help draft letters, but final content and approval remain your responsibility.</p>
              
              <p><strong>4. Quality Standards:</strong> Letters should meet professional standards and accurately reflect your assessment of the student.</p>
              
              <p><strong>5. Dispute Resolution:</strong> Any disputes will be handled through our internal resolution process.</p>
              
              <p><strong>6. Account Termination:</strong> Either party may terminate this agreement with appropriate notice.</p>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="termsAndConditions"
                checked={watchedValues.termsAndConditions || false}
                onCheckedChange={(checked) => setValue('termsAndConditions', checked as boolean)}
              />
              <Label htmlFor="termsAndConditions" className="text-sm font-medium">
                I have read and agree to the Terms and Conditions
                <span className="text-red-500 ml-1">*</span>
              </Label>
            </div>
            {errors.termsAndConditions && (
              <Alert variant="destructive">
                <AlertDescription>{errors.termsAndConditions.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Privacy Policy */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Privacy Policy</h3>
            <div className="text-sm text-muted-foreground space-y-2 max-h-32 overflow-y-auto">
              <p><strong>Data Collection:</strong> We collect professional and contact information necessary to facilitate recommendation letters.</p>
              
              <p><strong>Data Protection:</strong> Your data is encrypted and stored securely. We comply with applicable data protection regulations.</p>
              
              <p><strong>Data Sharing:</strong> Information is shared only with students who request letters and relevant administrative staff.</p>
              
              <p><strong>Communication:</strong> We may contact you regarding platform updates, requests, and payment information.</p>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="privacyPolicy"
                checked={watchedValues.privacyPolicy || false}
                onCheckedChange={(checked) => setValue('privacyPolicy', checked as boolean)}
              />
              <Label htmlFor="privacyPolicy" className="text-sm font-medium">
                I have read and agree to the Privacy Policy
                <span className="text-red-500 ml-1">*</span>
              </Label>
            </div>
            {errors.privacyPolicy && (
              <Alert variant="destructive">
                <AlertDescription>{errors.privacyPolicy.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !watchedValues.letterDeliveryPolicy || !watchedValues.paymentPolicy || !watchedValues.termsAndConditions || !watchedValues.privacyPolicy}
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}