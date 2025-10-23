'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { lecturerAcademicInfoSchema, type LecturerAcademicInfoData } from '@/lib/validations/lecturer-registration'
import { Plus, X } from 'lucide-react'

interface LecturerAcademicInfoStepProps {
  data: Partial<LecturerAcademicInfoData>
  onNext: (data: LecturerAcademicInfoData) => void
  onBack: () => void
}

const ACADEMIC_RANKS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Senior Lecturer',
  'Lecturer',
  'Assistant Lecturer',
  'Teaching Assistant',
  'Other'
] as const

const COMMON_DEPARTMENTS = [
  'Computer Science',
  'Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Business Administration',
  'Economics',
  'Psychology',
  'English',
  'History',
  'Political Science',
  'Sociology',
  'Education',
  'Medicine',
  'Law',
  'Other'
]

export function LecturerAcademicInfoStep({ data, onNext, onBack }: LecturerAcademicInfoStepProps) {
  const [newSpecialization, setNewSpecialization] = useState('')
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LecturerAcademicInfoData>({
    resolver: zodResolver(lecturerAcademicInfoSchema),
    defaultValues: {
      ...data,
      specializations: data.specializations || [],
      affiliatedDepartments: data.affiliatedDepartments || []
    }
  })

  const { fields: specializationFields, append: appendSpecialization, remove: removeSpecialization } = useFieldArray({
    control,
    name: 'specializations'
  })

  const { fields: departmentFields, append: appendDepartment, remove: removeDepartment } = useFieldArray({
    control,
    name: 'affiliatedDepartments'
  })

  const watchedRank = watch('rank')
  const currentYear = new Date().getFullYear()

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      appendSpecialization(newSpecialization.trim())
      setNewSpecialization('')
    }
  }

  const addDepartment = (department: string) => {
    if (department && !departmentFields.find(field => field.value === department)) {
      appendDepartment(department)
    }
  }

  const onSubmit = (formData: LecturerAcademicInfoData) => {
    onNext(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Information</CardTitle>
        <CardDescription>
          Please provide details about your academic position and expertise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="department">
              Primary Department <span className="text-red-500">*</span>
            </Label>
            <Select onValueChange={(value) => setValue('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your primary department" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && (
              <Alert variant="destructive">
                <AlertDescription>{errors.department.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>Affiliated Departments (Optional)</Label>
            <div className="space-y-2">
              <Select onValueChange={addDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Add affiliated departments" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departmentFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {departmentFields.map((field, index) => (
                    <div key={field.id} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      <span>{field.value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-4 w-4 p-0 hover:bg-blue-200"
                        onClick={() => removeDepartment(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rank">
                Academic Rank <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={(value) => setValue('rank', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your academic rank" />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_RANKS.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rank && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.rank.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentYear">
                Employment Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="employmentYear"
                type="number"
                min="1950"
                max={currentYear}
                {...register('employmentYear', { valueAsNumber: true })}
                placeholder="e.g., 2015"
              />
              {errors.employmentYear && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.employmentYear.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Areas of Specialization <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  placeholder="Enter area of specialization"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                />
                <Button type="button" onClick={addSpecialization} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {specializationFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specializationFields.map((field, index) => (
                    <div key={field.id} className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      <span>{field.value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-4 w-4 p-0 hover:bg-green-200"
                        onClick={() => removeSpecialization(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.specializations && (
              <Alert variant="destructive">
                <AlertDescription>{errors.specializations.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="officeLocation">
                Office Location (Optional)
              </Label>
              <Input
                id="officeLocation"
                {...register('officeLocation')}
                placeholder="e.g., Building A, Room 205"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeHours">
                Office Hours (Optional)
              </Label>
              <Input
                id="officeHours"
                {...register('officeHours')}
                placeholder="e.g., Mon-Wed 2-4 PM"
              />
            </div>
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