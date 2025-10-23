'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, FileText, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { AgreementData } from '@/lib/validations/student-registration'

interface AgreementStepProps {
  form: UseFormReturn<AgreementData>
  onNext: (data: AgreementData) => void
  onPrevious: () => void
  loading: boolean
}

export function AgreementStep({ onNext, onPrevious, loading }: AgreementStepProps) {
  const [waiveViewingRights, setWaiveViewingRights] = useState(false)
  const [termsAndConditions, setTermsAndConditions] = useState(false)
  const [privacyPolicy, setPrivacyPolicy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateAndSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!waiveViewingRights) {
      newErrors.waiveViewingRights = 'You must agree to waive letter viewing rights to proceed'
    }
    if (!termsAndConditions) {
      newErrors.termsAndConditions = 'You must accept the terms and conditions'
    }
    if (!privacyPolicy) {
      newErrors.privacyPolicy = 'You must accept the privacy policy'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      const agreementData: AgreementData = {
        waiveViewingRights,
        termsAndConditions,
        privacyPolicy
      }
      onNext(agreementData)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Terms & Agreement</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Letter Viewing Rights Waiver */}
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> By proceeding, you agree to waive your right to view the final recommendation letters written by lecturers. This policy ensures honest and candid recommendations.
            </AlertDescription>
          </Alert>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <EyeOff className="h-5 w-5 text-orange-600" />
                <span>Letter Viewing Rights Waiver</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3">
                <p>
                  <strong>What this means:</strong> You will not be able to view, read, or access the final recommendation letters written by your lecturers.
                </p>
                <p>
                  <strong>Why this policy exists:</strong> This ensures that lecturers can write honest, candid recommendations without concern about student reactions, which ultimately benefits your applications.
                </p>
                <p>
                  <strong>What you can see:</strong> You will receive confirmation when letters are completed and submitted, but not the content itself.
                </p>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="waiveViewingRights"
                  checked={waiveViewingRights}
                  onCheckedChange={(checked) => {
                    setWaiveViewingRights(checked as boolean)
                    if (checked) {
                      setErrors(prev => ({ ...prev, waiveViewingRights: '' }))
                    }
                  }}
                />
                <label 
                  htmlFor="waiveViewingRights" 
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  I understand and agree to waive my right to view the final recommendation letters. I acknowledge that this policy ensures honest recommendations that benefit my applications.
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {errors.waiveViewingRights && (
                <p className="text-sm text-red-500 ml-6">{errors.waiveViewingRights}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Terms and Conditions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3 max-h-40 overflow-y-auto border rounded p-3 bg-muted/50">
                <h4 className="font-medium">GetReference Terms of Service</h4>
                <p>
                  <strong>1. Service Description:</strong> GetReference facilitates recommendation letter requests between students and lecturers with AI assistance and payment processing.
                </p>
                <p>
                  <strong>2. Payment Terms:</strong> Students pay $30 per request. Lecturers receive 75% ($22.50) upon completion. Platform retains 25% ($7.50) for operational costs.
                </p>
                <p>
                  <strong>3. User Responsibilities:</strong> Provide accurate information, respect lecturer time, and comply with academic integrity standards.
                </p>
                <p>
                  <strong>4. Refund Policy:</strong> Refunds available if lecturer declines or fails to complete within agreed timeframe.
                </p>
                <p>
                  <strong>5. Data Usage:</strong> Your academic documents and information will be shared with selected lecturers for letter writing purposes only.
                </p>
                <p>
                  <strong>6. Limitation of Liability:</strong> GetReference is not responsible for letter content, admission outcomes, or lecturer availability.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="termsAndConditions"
                  checked={termsAndConditions}
                  onCheckedChange={(checked) => {
                    setTermsAndConditions(checked as boolean)
                    if (checked) {
                      setErrors(prev => ({ ...prev, termsAndConditions: '' }))
                    }
                  }}
                />
                <label 
                  htmlFor="termsAndConditions" 
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  I have read and agree to the Terms and Conditions
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {errors.termsAndConditions && (
                <p className="text-sm text-red-500 ml-6">{errors.termsAndConditions}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Privacy Policy */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy Policy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3 max-h-40 overflow-y-auto border rounded p-3 bg-muted/50">
                <h4 className="font-medium">Privacy Policy Summary</h4>
                <p>
                  <strong>Data Collection:</strong> We collect personal information, academic records, and documents you provide during registration and usage.
                </p>
                <p>
                  <strong>Data Usage:</strong> Information is used to facilitate letter requests, process payments, and improve our services.
                </p>
                <p>
                  <strong>Data Sharing:</strong> Academic information is shared with selected lecturers for letter writing. Payment information is processed by Stripe.
                </p>
                <p>
                  <strong>Data Security:</strong> All data is encrypted and stored securely. Access is restricted to authorized personnel and selected lecturers only.
                </p>
                <p>
                  <strong>Data Retention:</strong> Academic documents are retained for the duration of your account plus 2 years for record-keeping purposes.
                </p>
                <p>
                  <strong>Your Rights:</strong> You can request data access, correction, or deletion by contacting support@getreference.com.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacyPolicy"
                  checked={privacyPolicy}
                  onCheckedChange={(checked) => {
                    setPrivacyPolicy(checked as boolean)
                    if (checked) {
                      setErrors(prev => ({ ...prev, privacyPolicy: '' }))
                    }
                  }}
                />
                <label 
                  htmlFor="privacyPolicy" 
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  I have read and agree to the Privacy Policy
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {errors.privacyPolicy && (
                <p className="text-sm text-red-500 ml-6">{errors.privacyPolicy}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agreement Summary */}
        {(waiveViewingRights && termsAndConditions && privacyPolicy) && (
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              ✓ All agreements accepted. You can proceed to review and submit your registration.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <div className="flex justify-between pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            disabled={loading}
          >
            Previous
          </Button>
          <Button 
            type="button" 
            onClick={validateAndSubmit}
            disabled={loading || !waiveViewingRights || !termsAndConditions || !privacyPolicy}
            className="min-w-32"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Review & Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}