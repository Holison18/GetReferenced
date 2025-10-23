'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUpload } from '@/components/ui/file-upload'
import { type DocumentsData } from '@/lib/validations/student-registration'

interface DocumentsStepProps {
  data: Partial<DocumentsData>
  onNext: (data: DocumentsData) => void
  onBack: () => void
}

export function DocumentsStep({ data, onNext, onBack }: DocumentsStepProps) {
  const [transcripts, setTranscripts] = useState<File[]>(data.transcripts || [])
  const [cv, setCv] = useState<File | undefined>(data.cv)
  const [photo, setPhoto] = useState<File | undefined>(data.photo)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      // Validate required documents
      if (transcripts.length === 0) {
        setError('At least one transcript is required')
        return
      }

      const documentsData: DocumentsData = {
        transcripts,
        cv,
        photo
      }

      onNext(documentsData)
    } catch {
      setError('An error occurred while processing your documents')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Uploads</CardTitle>
        <CardDescription>
          Please upload your academic documents. All files should be in PDF or Word format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FileUpload
          label="Academic Transcripts"
          description="Upload your official academic transcripts or certificates (required)"
          onFilesChange={setTranscripts}
          acceptedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
          maxFileSize={10 * 1024 * 1024} // 10MB
          maxFiles={5}
          multiple={true}
          required={true}
        />

        <FileUpload
          label="Curriculum Vitae (CV)"
          description="Upload your CV or resume (optional but recommended)"
          onFilesChange={(files) => setCv(files[0])}
          acceptedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
          maxFileSize={10 * 1024 * 1024} // 10MB
          maxFiles={1}
          multiple={false}
          required={false}
        />

        <FileUpload
          label="Profile Photo"
          description="Upload a professional photo (optional)"
          onFilesChange={(files) => setPhoto(files[0])}
          acceptedFileTypes={['image/jpeg', 'image/png', 'image/webp']}
          maxFileSize={5 * 1024 * 1024} // 5MB
          maxFiles={1}
          multiple={false}
          required={false}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Document Guidelines:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Transcripts must be official or certified copies</li>
            <li>• All documents should be clear and legible</li>
            <li>• Accepted formats: PDF, DOC, DOCX</li>
            <li>• Maximum file size: 10MB per document</li>
            <li>• Photos should be professional headshots</li>
          </ul>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || transcripts.length === 0}
          >
            {isSubmitting ? 'Processing...' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}