'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUpload } from '@/components/ui/file-upload'
import { Loader2, FileText, User, Camera, Info } from 'lucide-react'
import { DocumentsData } from '@/lib/validations/student-registration'

interface DocumentsStepProps {
  form: UseFormReturn<DocumentsData>
  onNext: (data: DocumentsData) => void
  onPrevious: () => void
  loading: boolean
}

export function DocumentsStep({ onNext, onPrevious, loading }: DocumentsStepProps) {
  const [transcripts, setTranscripts] = useState<File[]>([])
  const [cv, setCv] = useState<File | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleTranscriptsChange = (files: File[]) => {
    setTranscripts(files)
    if (files.length > 0) {
      setErrors(prev => ({ ...prev, transcripts: '' }))
    }
  }

  const handleCvChange = (files: File[]) => {
    setCv(files[0] || null)
  }

  const handlePhotoChange = (files: File[]) => {
    setPhoto(files[0] || null)
  }

  const validateAndSubmit = () => {
    const newErrors: Record<string, string> = {}

    // Validate required transcripts
    if (transcripts.length === 0) {
      newErrors.transcripts = 'At least one transcript is required'
    }

    // Validate file sizes and types
    transcripts.forEach((file, index) => {
      if (file.size > 10 * 1024 * 1024) {
        newErrors.transcripts = `Transcript ${index + 1} is too large (max 10MB)`
      }
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        newErrors.transcripts = `Transcript ${index + 1} must be PDF or Word document`
      }
    })

    if (cv) {
      if (cv.size > 10 * 1024 * 1024) {
        newErrors.cv = 'CV is too large (max 10MB)'
      }
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(cv.type)) {
        newErrors.cv = 'CV must be PDF or Word document'
      }
    }

    if (photo) {
      if (photo.size > 5 * 1024 * 1024) {
        newErrors.photo = 'Photo is too large (max 5MB)'
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
        newErrors.photo = 'Photo must be JPEG, PNG, or WebP'
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      const documentsData: DocumentsData = {
        transcripts,
        cv: cv || undefined,
        photo: photo || undefined
      }
      onNext(documentsData)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Document Uploads</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upload clear, legible documents. All files will be securely stored and only accessible to you and assigned lecturers.
          </AlertDescription>
        </Alert>

        {/* Transcripts Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Academic Transcripts</span>
            <span className="text-red-500">*</span>
          </h3>
          
          <FileUpload
            onFilesChange={handleTranscriptsChange}
            acceptedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
            maxFileSize={10 * 1024 * 1024}
            maxFiles={5}
            multiple={true}
            required={true}
            label="Upload Transcripts"
            description="Upload your official academic transcripts. You can upload multiple files if needed."
            error={errors.transcripts}
          />
          
          <p className="text-sm text-muted-foreground">
            • Upload official transcripts from all institutions attended
            • Accepted formats: PDF, DOC, DOCX
            • Maximum file size: 10MB per file
            • You can upload up to 5 transcript files
          </p>
        </div>

        {/* CV Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Curriculum Vitae (CV)</span>
            <span className="text-sm text-muted-foreground font-normal">(Optional)</span>
          </h3>
          
          <FileUpload
            onFilesChange={handleCvChange}
            acceptedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
            maxFileSize={10 * 1024 * 1024}
            maxFiles={1}
            multiple={false}
            required={false}
            label="Upload CV"
            description="Upload your current CV or resume (optional but recommended)."
            error={errors.cv}
          />
          
          <p className="text-sm text-muted-foreground">
            • Upload your most recent CV or resume
            • Helps lecturers write more personalized letters
            • Accepted formats: PDF, DOC, DOCX
            • Maximum file size: 10MB
          </p>
        </div>

        {/* Photo Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Profile Photo</span>
            <span className="text-sm text-muted-foreground font-normal">(Optional)</span>
          </h3>
          
          <FileUpload
            onFilesChange={handlePhotoChange}
            acceptedFileTypes={['image/jpeg', 'image/png', 'image/webp']}
            maxFileSize={5 * 1024 * 1024}
            maxFiles={1}
            multiple={false}
            required={false}
            label="Upload Photo"
            description="Upload a professional headshot or profile photo (optional)."
            error={errors.photo}
          />
          
          <p className="text-sm text-muted-foreground">
            • Upload a professional headshot or recent photo
            • Helps lecturers identify and remember you
            • Accepted formats: JPEG, PNG, WebP
            • Maximum file size: 5MB
          </p>
        </div>

        {/* Upload Summary */}
        {(transcripts.length > 0 || cv || photo) && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Upload Summary:</h4>
            <ul className="text-sm space-y-1">
              <li>✓ Transcripts: {transcripts.length} file(s) selected</li>
              {cv && <li>✓ CV: {cv.name}</li>}
              {photo && <li>✓ Photo: {photo.name}</li>}
            </ul>
          </div>
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
            disabled={loading || transcripts.length === 0}
            className="min-w-32"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Next Step
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}