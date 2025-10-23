import { z } from 'zod'

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  whatsapp: z.boolean().default(false)
})

// Payment details schema
export const paymentDetailsSchema = z.object({
  accountType: z.enum(['bank', 'mobile_money']),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  routingNumber: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyNumber: z.string().optional()
}).refine((data) => {
  if (data.accountType === 'bank') {
    return data.bankName && data.accountNumber && data.accountName
  }
  if (data.accountType === 'mobile_money') {
    return data.mobileMoneyProvider && data.mobileMoneyNumber
  }
  return false
}, {
  message: 'Please provide all required payment details for your selected account type'
})

// Step 1: Basic Information
export const lecturerBasicInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  staffEmail: z.string().email('Invalid staff email address'),
  staffNumber: z.string().min(3, 'Staff number must be at least 3 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  whatsappNumber: z.string().optional()
})

// Step 2: Academic Information
export const lecturerAcademicInfoSchema = z.object({
  department: z.string().min(2, 'Department is required'),
  affiliatedDepartments: z.array(z.string()).optional(),
  rank: z.enum(['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Assistant Lecturer', 'Teaching Assistant', 'Other']),
  employmentYear: z.number().min(1950, 'Invalid employment year').max(new Date().getFullYear(), 'Employment year cannot be in the future'),
  specializations: z.array(z.string()).min(1, 'At least one specialization is required'),
  officeLocation: z.string().optional(),
  officeHours: z.string().optional()
})

// Step 3: Verification
export const lecturerVerificationSchema = z.object({
  verificationCode: z.string().length(6, 'Verification code must be 6 digits')
})

// Step 4: Preferences and Payment
export const lecturerPreferencesSchema = z.object({
  notificationPreferences: notificationPreferencesSchema,
  paymentDetails: paymentDetailsSchema,
  maxRequestsPerMonth: z.number().min(1).max(50).default(10),
  autoAcceptFromDepartments: z.array(z.string()).optional()
})

// Step 5: Agreement
export const lecturerAgreementSchema = z.object({
  letterDeliveryPolicy: z.boolean().refine((val) => val === true, 'You must agree to the letter delivery policy'),
  paymentPolicy: z.boolean().refine((val) => val === true, 'You must agree to the payment policy'),
  termsAndConditions: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
  privacyPolicy: z.boolean().refine((val) => val === true, 'You must accept the privacy policy')
})

// Complete registration schema
export const lecturerRegistrationSchema = z.object({
  basicInfo: lecturerBasicInfoSchema,
  academicInfo: lecturerAcademicInfoSchema,
  verification: lecturerVerificationSchema,
  preferences: lecturerPreferencesSchema,
  agreement: lecturerAgreementSchema
})

export type LecturerRegistrationData = z.infer<typeof lecturerRegistrationSchema>
export type LecturerBasicInfoData = z.infer<typeof lecturerBasicInfoSchema>
export type LecturerAcademicInfoData = z.infer<typeof lecturerAcademicInfoSchema>
export type LecturerVerificationData = z.infer<typeof lecturerVerificationSchema>
export type LecturerPreferencesData = z.infer<typeof lecturerPreferencesSchema>
export type LecturerAgreementData = z.infer<typeof lecturerAgreementSchema>
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>
export type PaymentDetails = z.infer<typeof paymentDetailsSchema>