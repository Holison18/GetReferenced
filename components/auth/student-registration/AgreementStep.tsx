'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { agreementSchema, type AgreementData } from '@/lib/validations/student-registration'

interface AgreementStepProps {
  data: Partial<AgreementData>
  onNext: (data: AgreementData) => void
  onBack: () => void
}

export function AgreementStep({ data, onNext, onBack }: AgreementStepProps) {
  const {

    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<AgreementData>({
    resolver: zodResolver(agreementSchema),
    defaultValues: data
  })

  const watchedValues = watch()

  const onSubmit = (formData: AgreementData) => {
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms and Agreements</CardTitle>
        <CardDescription>
          Please read and accept the following terms to complete your registration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Letter Viewing Rights Waiver */}
          <div className="space-y-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <h3 className="font-semibold text-yellow-900">Letter Viewing Rights Waiver</h3>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>
                By checking this box, you understand and agree that:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You waive your right to view the final recommendation letters written about you</li>
                <li>Letters will be sent directly to the intended recipients or institutions</li>
                <li>This waiver helps ensure the confidentiality and authenticity of recommendations</li>
                <li>You will receive confirmation when letters are submitted but not their content</li>
              </ul>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="waiveViewingRights"
                checked={watchedValues.waiveViewingRights || false}
                onCheckedChange={(checked) => setValue('waiveViewingRights', checked as boolean)}
              />
              <Label htmlFor="waiveViewingRights" className="text-sm font-medium leading-relaxed">
                I understand and agree to waive my rights to view recommendation letters written about me
                <span className="text-red-500 ml-1">*</span>
              </Label>
            </div>
            {errors.waiveViewingRights && (
              <Alert variant="destructive">
                <AlertDescription>{errors.waiveViewingRights.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Terms and Conditions</h3>
            <div className="text-sm text-muted-foreground space-y-2 max-h-40 overflow-y-auto">
              <p><strong>1. Service Description:</strong> GetReference provides a platform for requesting and managing recommendation letters between students and lecturers.</p>
              
              <p><strong>2. Payment Terms:</strong> A fee of $30 per recommendation letter request is required. Payments are processed securely through Stripe.</p>
              
              <p><strong>3. User Responsibilities:</strong> You agree to provide accurate information and use the service in good faith.</p>
              
              <p><strong>4. Lecturer Discretion:</strong> Lecturers have the right to accept or decline recommendation requests at their discretion.</p>
              
              <p><strong>5. Refund Policy:</strong> Refunds may be issued if a lecturer declines your request or if the service cannot be fulfilled.</p>
              
              <p><strong>6. Data Usage:</strong> Your information will be used solely for the purpose of facilitating recommendation letters and improving our service.</p>
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
              <p><strong>Data Collection:</strong> We collect personal and academic information necessary to facilitate recommendation letters.</p>
              
              <p><strong>Data Protection:</strong> Your data is encrypted and stored securely. We comply with applicable data protection regulations.</p>
              
              <p><strong>Data Sharing:</strong> Information is shared only with selected lecturers and intended recipients of recommendation letters.</p>
              
              <p><strong>Data Retention:</strong> Your data is retained for as long as necessary to provide our services and comply with legal obligations.</p>
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
              disabled={isSubmitting || !watchedValues.waiveViewingRights || !watchedValues.termsAndConditions || !watchedValues.privacyPolicy}
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}