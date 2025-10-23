import { z } from 'zod'

// Contact info schema
export const contactInfoSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  whatsapp: z.string().optional(),
  address: z.string().min(10, 'Address must be at least 10 characters'),
})

// Step 1: Basic Information
export const basicInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Step 2: Academic Information
export const academicInfoSchema = z.object({
  enrollmentYear: z.number().min(1950, 'Invalid enrollment year').max(new Date().getFullYear(), 'Enrollment year cannot be in the future'),
  completionYear: z.number().min(1950, 'Invalid completion year').max(new Date().getFullYear() + 10, 'Completion year too far in the future'),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    return age >= 16 && age <= 100
  }, 'You must be between 16 and 100 years old'),
  contactInfo: contactInfoSchema,
})

// Step 3: Document Upload
export const documentUploadSchema = z.object({
  transcripts: z.array(z.instanceof(File)).min(1, 'At least one transcript is required'),
  cv: z.instanceof(File).optional(),
  photo: z.instanceof(File).optional(),
})

// Step 4: Agreement
export const agreementSchema = z.object({
  agreeToTerms: z.boolean().refine((val) => val === true, 'You must agree to the terms and conditions'),
  waiveViewingRights: z.boolean().refine((val) => val === true, 'You must agree to waive letter viewing rights'),
})

// Complete registration schema
export const studentRegistrationSchema = z.object({
  basicInfo: basicInfoSchema,
  academicInfo: academicInfoSchema,
  documents: documentUploadSchema,
  agreement: agreementSchema,
})

export type BasicInfo = z.infer<typeof basicInfoSchema>
export type AcademicInfo = z.infer<typeof academicInfoSchema>
export type DocumentUpload = z.infer<typeof documentUploadSchema>
export type Agreement = z.infer<typeof agreementSchema>
export type StudentRegistration = z.infer<typeof studentRegistrationSchema>