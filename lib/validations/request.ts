import { z } from 'zod'

export const requestPurposeSchema = z.object({
  purpose: z.enum(['school', 'scholarship', 'job'], {
    required_error: 'Please select a purpose for your request'
  })
})

export const requestDetailsSchema = z.object({
  recipientName: z.string().optional(),
  recipientAddress: z.string().min(1, 'Recipient address is required'),
  programName: z.string().optional(),
  organizationName: z.string().min(1, 'Organization name is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  deliveryMethod: z.enum(['self_upload', 'lecturer_upload', 'email'], {
    required_error: 'Please select a delivery method'
  })
})

export const lecturerSelectionSchema = z.object({
  lecturerIds: z.array(z.string()).min(1, 'Please select at least one lecturer').max(2, 'You can select up to 2 lecturers')
})

export const documentsSchema = z.object({
  documents: z.array(z.string()).min(1, 'Please upload at least one supporting document'),
  draftLetter: z.string().optional()
})

export const additionalDetailsSchema = z.object({
  additionalNotes: z.string().optional()
})

export const completeRequestSchema = requestPurposeSchema
  .merge(requestDetailsSchema)
  .merge(lecturerSelectionSchema)
  .merge(documentsSchema)
  .merge(additionalDetailsSchema)

export type RequestPurpose = z.infer<typeof requestPurposeSchema>
export type RequestDetails = z.infer<typeof requestDetailsSchema>
export type LecturerSelection = z.infer<typeof lecturerSelectionSchema>
export type Documents = z.infer<typeof documentsSchema>
export type AdditionalDetails = z.infer<typeof additionalDetailsSchema>
export type CompleteRequest = z.infer<typeof completeRequestSchema>