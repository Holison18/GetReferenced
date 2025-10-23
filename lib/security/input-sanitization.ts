import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

/**
 * Input sanitization utilities for security
 */

// HTML sanitization options
const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['class'],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: SANITIZE_OPTIONS.ALLOWED_TAGS,
    ALLOWED_ATTR: SANITIZE_OPTIONS.ALLOWED_ATTR,
    FORBID_TAGS: SANITIZE_OPTIONS.FORBID_TAGS,
    FORBID_ATTR: SANITIZE_OPTIONS.FORBID_ATTR
  })
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 10000) // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '') // Only allow word chars, @, ., -
    .substring(0, 254) // RFC 5321 limit
}

/**
 * Sanitize phone number input
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[^\d+()-\s]/g, '') // Only allow digits, +, (), -, space
    .trim()
    .substring(0, 20)
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[^a-zA-Z0-9.-_]/g, '_') // Replace invalid chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .substring(0, 255) // Limit length
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  try {
    const url = new URL(input)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return ''
    }
    return url.toString()
  } catch {
    return ''
  }
}

/**
 * Sanitize SQL input to prevent injection
 */
export function sanitizeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[';--]/g, '') // Remove SQL comment and statement terminators
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '') // Remove dangerous SQL keywords
    .trim()
}

/**
 * Comprehensive input sanitizer
 */
export function sanitizeInput(input: any, type: 'text' | 'html' | 'email' | 'phone' | 'url' | 'filename' = 'text'): string {
  if (input === null || input === undefined) return ''
  
  const stringInput = String(input)
  
  switch (type) {
    case 'html':
      return sanitizeHtml(stringInput)
    case 'email':
      return sanitizeEmail(stringInput)
    case 'phone':
      return sanitizePhone(stringInput)
    case 'url':
      return sanitizeUrl(stringInput)
    case 'filename':
      return sanitizeFileName(stringInput)
    case 'text':
    default:
      return sanitizeText(stringInput)
  }
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: Record<string, any>, schema?: Record<string, 'text' | 'html' | 'email' | 'phone' | 'url' | 'filename'>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {}
  
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = value
      continue
    }
    
    if (typeof value === 'string') {
      const sanitizeType = schema?.[key] || 'text'
      sanitized[key] = sanitizeInput(value, sanitizeType)
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, schema)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' 
          ? sanitizeInput(item, schema?.[key] || 'text')
          : typeof item === 'object' 
            ? sanitizeObject(item, schema)
            : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Validation schemas for common inputs
 */
export const secureValidationSchemas = {
  // Safe string with length limits
  safeString: (min = 1, max = 1000) => z.string()
    .min(min, `Must be at least ${min} characters`)
    .max(max, `Must be at most ${max} characters`)
    .transform(sanitizeText),
    
  // Safe email
  safeEmail: z.string()
    .email('Invalid email format')
    .transform(sanitizeEmail),
    
  // Safe phone number
  safePhone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .transform(sanitizePhone),
    
  // Safe HTML content
  safeHtml: (maxLength = 10000) => z.string()
    .max(maxLength, `Content too long (max ${maxLength} characters)`)
    .transform(sanitizeHtml),
    
  // Safe URL
  safeUrl: z.string()
    .url('Invalid URL format')
    .transform(sanitizeUrl),
    
  // Safe filename
  safeFilename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .transform(sanitizeFileName),
    
  // Safe ID (UUID or nanoid)
  safeId: z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')
    .min(1)
    .max(50),
    
  // Safe numeric string
  safeNumericString: z.string()
    .regex(/^\d+$/, 'Must contain only numbers')
    .transform(val => val.replace(/[^\d]/g, '')),
    
  // Safe alphanumeric
  safeAlphanumeric: z.string()
    .regex(/^[a-zA-Z0-9\s]+$/, 'Must contain only letters, numbers, and spaces')
    .transform(val => val.replace(/[^a-zA-Z0-9\s]/g, '').trim())
}

/**
 * File upload security validation
 */
export const fileSecurityValidation = {
  // Allowed file types for documents
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  
  // Allowed image types
  allowedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  
  // Maximum file sizes (in bytes)
  maxFileSizes: {
    document: 10 * 1024 * 1024, // 10MB
    image: 5 * 1024 * 1024, // 5MB
    general: 25 * 1024 * 1024 // 25MB
  },
  
  // Validate file type and size
  validateFile: (file: File, type: 'document' | 'image' | 'general' = 'general') => {
    const errors: string[] = []
    
    // Check file size
    const maxSize = fileSecurityValidation.maxFileSizes[type]
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
    }
    
    // Check file type
    let allowedTypes: string[] = []
    if (type === 'document') {
      allowedTypes = fileSecurityValidation.allowedDocumentTypes
    } else if (type === 'image') {
      allowedTypes = fileSecurityValidation.allowedImageTypes
    } else {
      allowedTypes = [...fileSecurityValidation.allowedDocumentTypes, ...fileSecurityValidation.allowedImageTypes]
    }
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`)
    }
    
    // Check filename
    const sanitizedName = sanitizeFileName(file.name)
    if (sanitizedName !== file.name) {
      errors.push('Filename contains invalid characters')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName
    }
  }
}