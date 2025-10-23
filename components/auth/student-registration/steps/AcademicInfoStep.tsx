'use client'

import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, GraduationCap, Calendar, Building, BookOpen } from 'lucide-react'
import { AcademicInfoData } from '@/lib/validations/student-registration'

interface AcademicInfoStepProps {
  form: UseFormReturn<AcademicInfoData>
  onNext: (data: AcademicInfoData) => void
  onPrevious: () => void
  loading: boolean
}

export function AcademicInfoStep({ form, onNext, onPrevious, loading }: AcademicInfoStepProps) {
  const { register, handleSubmit, formState: { errors } } = form

  const onSubmit = (data: AcademicInfoData) => {
    const academicInfoData: AcademicInfoData = {
      enrollmentYear: parseInt(data.enrollmentYear),
      completionYear: parseInt(data.completionYear),
      institution: data.institution,
      program: data.program,
      gpa: data.gpa ? parseFloat(data.gpa) : undefined
    }
    onNext(academicInfoData)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i + 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5" />
          <span>Academic Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Institution and Program */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Educational Background</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="institution">
                  Institution Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="institution"
                  {...register('institution')}
                  placeholder="Enter your university/college name"
                  disabled={loading}
                />
                {errors.institution && (
                  <p className="text-sm text-red-500">{errors.institution.message as string}</p>
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
                  disabled={loading}
                />
                {errors.program && (
                  <p className="text-sm text-red-500">{errors.program.message as string}</p>
                )}
              </div>
            </div>
          </div>

          {/* Academic Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Academic Timeline</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enrollmentYear">
                  Enrollment Year <span className="text-red-500">*</span>
                </Label>
                <select
                  id="enrollmentYear"
                  {...register('enrollmentYear')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                >
                  <option value="">Select enrollment year</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.enrollmentYear && (
                  <p className="text-sm text-red-500">{errors.enrollmentYear.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionYear">
                  Completion Year <span className="text-red-500">*</span>
                </Label>
                <select
                  id="completionYear"
                  {...register('completionYear')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                >
                  <option value="">Select completion year</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.completionYear && (
                  <p className="text-sm text-red-500">{errors.completionYear.message as string}</p>
                )}
              </div>
            </div>
          </div>

          {/* Academic Performance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Academic Performance</span>
            </h3>

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
                {...register('gpa')}
                placeholder="e.g., 3.75 (on 4.0 scale)"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Enter your GPA on a 4.0 scale. Leave blank if not applicable.
              </p>
              {errors.gpa && (
                <p className="text-sm text-red-500">{errors.gpa.message as string}</p>
              )}
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