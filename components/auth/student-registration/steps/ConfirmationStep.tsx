'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, User, GraduationCap, FileText, Shield, CheckCircle, Mail } from 'lucide-react'
import { StudentRegistrationData } from '@/lib/validations/student-registration'

interface ConfirmationStepProps {
  registrationData: Partial<StudentRegistrationData>
  onSubmit: () => void
  onPrevious: () => void
  loading: boolean
}

export function ConfirmationStep({ registrationData, onSubmit, onPrevious, loading }: ConfirmationStepProps) {
  const { basicInfo, academicInfo, documents, agreement } = registrationData

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Review & Confirm Registration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information */}
        {basicInfo && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="font-medium">{basicInfo.firstName} {basicInfo.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-medium">{basicInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{new Date(basicInfo.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="font-medium">{basicInfo.contactInfo.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="font-medium">
                  {basicInfo.contactInfo.address}, {basicInfo.contactInfo.city}, {basicInfo.contactInfo.country}
                </p>
              </div>
              {basicInfo.contactInfo.whatsapp && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{basicInfo.contactInfo.whatsapp}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Academic Information */}
        {academicInfo && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <GraduationCap className="h-5 w-5" />
              <span>Academic Information</span>
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Institution</p>
                  <p className="font-medium">{academicInfo.institution}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Program</p>
                  <p className="font-medium">{academicInfo.program}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enrollment Year</p>
                  <p className="font-medium">{academicInfo.enrollmentYear}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Year</p>
                  <p className="font-medium">{academicInfo.completionYear}</p>
                </div>
              </div>
              {academicInfo.gpa && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">GPA</p>
                  <p className="font-medium">{academicInfo.gpa}/4.0</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Documents */}
        {documents && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Uploaded Documents</span>
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              {/* Transcripts */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Transcripts ({documents.transcripts?.length || 0} files)
                </p>
                <div className="space-y-2">
                  {documents.transcripts?.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{file.name}</span>
                      </div>
                      <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* CV */}
              {documents.cv && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">CV</p>
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{documents.cv.name}</span>
                    </div>
                    <Badge variant="secondary">{formatFileSize(documents.cv.size)}</Badge>
                  </div>
                </div>
              )}

              {/* Photo */}
              {documents.photo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Profile Photo</p>
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{documents.photo.name}</span>
                    </div>
                    <Badge variant="secondary">{formatFileSize(documents.photo.size)}</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Agreements */}
        {agreement && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Agreements</span>
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Letter viewing rights waived</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Terms and conditions accepted</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Privacy policy accepted</span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>What happens next?</span>
          </h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>1. We&apos;ll create your account and send a verification email to {basicInfo?.email}</p>
            <p>2. Click the verification link in your email to activate your account</p>
            <p>3. Once verified, you can log in and start requesting recommendation letters</p>
            <p>4. Your documents will be securely stored and accessible to selected lecturers</p>
          </div>
        </div>

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
            onClick={onSubmit}
            disabled={loading}
            className="min-w-40"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}