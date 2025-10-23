'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { academicInfoSchema, type AcademicInfoData } from '@/lib/validations/student-registration'

interface AcademicInfoStepProps {
  data: Partial<AcademicInfoData>
  onNext: (data: AcademicInfoData) => void
  onBack: () => void
}

export function AcademicInfoStep({ data, onNext, onBack }: AcademicInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AcademicInfoData>({
    resolver: zodResolver(academicInfoSchema),
    defaultValues: data
  })

  const onSubmit = (formData: AcademicInfoData) => {
    onNext(formData)
  }

  const currentYear = new Date().getFullYear()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Information</CardTitle>
        <CardDescription>
          Please provide details about your academic background and institution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="institution">
              Institution/University <span className="text-red-500">*</span>
            </Label>
            <Input
              id="institution"
              {...register('institution')}
              placeholder="Enter your institution name"
            />
            {errors.institution && (
              <Alert variant="destructive">
                <AlertDescription>{errors.institution.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">
              Program/Degree <span className="text-red-500">*</span>
            </Label>
            <Input
              id="program"
              {...register('program')}
              placeholder="e.g., Bachelor of Science in Computer Science"
            />
            {errors.program && (
              <Alert variant="destructive">
                <AlertDescription>{errors.program.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enrollmentYear">
                Enrollment Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="enrollmentYear"
                type="number"
                min="1950"
                max={currentYear}
                {...register('enrollmentYear', { valueAsNumber: true })}
                placeholder="e.g., 2020"
              />
              {errors.enrollmentYear && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.enrollmentYear.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="completionYear">
                Completion Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="completionYear"
                type="number"
                min="1950"
                max={currentYear + 10}
                {...register('completionYear', { valueAsNumber: true })}
                placeholder="e.g., 2024"
              />
              {errors.completionYear && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.completionYear.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gpa">
              GPA (Optional)
            </Label>
            <Input
              id="gpa"
              type="number"
              step="0.01"
              min="0"
              max="4"
              {...register('gpa', { valueAsNumber: true })}
              placeholder="e.g., 3.75"
            />
            <p className="text-sm text-muted-foreground">
              Enter your GPA on a 4.0 scale (optional)
            </p>
            {errors.gpa && (
              <Alert variant="destructive">
                <AlertDescription>{errors.gpa.message}</AlertDescription>
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