import { NextResponse } from 'next/server'
import { monitoring } from './monitoring'

export interface APIError extends Error {
  statusCode?: number
  code?: string
  context?: Record<string, any>
}

export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'
  
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  statusCode = 401
  code = 'AUTHENTICATION_ERROR'
  
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  statusCode = 403
  code = 'AUTHORIZATION_ERROR'
  
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  code = 'NOT_FOUND'
  
  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends Error {
  statusCode = 429
  code = 'RATE_LIMIT_EXCEEDED'
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends Error {
  statusCode = 502
  code = 'EXTERNAL_SERVICE_ERROR'
  
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`)
    this.name = 'ExternalServiceError'
    this.cause = originalError
  }
}

export class DatabaseError extends Error {
  statusCode = 500
  code = 'DATABASE_ERROR'
  
  constructor(operation: string, originalError?: Error) {
    super(`Database operation failed: ${operation}`)
    this.name = 'DatabaseError'
    this.cause = originalError
  }
}

// Global error handler for API routes
export async function handleAPIError(
  error: unknown,
  context?: {
    endpoint?: string
    method?: string
    userId?: string
    requestId?: string
  }
): Promise<NextResponse> {
  // Generate request ID if not provided
  const requestId = context?.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  let statusCode = 500
  let errorCode = 'INTERNAL_SERVER_ERROR'
  let message = 'An unexpected error occurred'
  let details: any = undefined

  if (error instanceof APIError) {
    statusCode = error.statusCode || 500
    errorCode = error.code || 'API_ERROR'
    message = error.message
    details = error.context
  } else if (error instanceof Error) {
    message = error.message
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400
      errorCode = 'VALIDATION_ERROR'
    } else if (error.message.includes('JWT') || error.message.includes('auth')) {
      statusCode = 401
      errorCode = 'AUTHENTICATION_ERROR'
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      statusCode = 403
      errorCode = 'AUTHORIZATION_ERROR'
    } else if (error.message.includes('not found')) {
      statusCode = 404
      errorCode = 'NOT_FOUND'
    }
  }

  // Track error in monitoring
  await monitoring.trackError({
    message,
    stack: error instanceof Error ? error.stack : undefined,
    context: {
      statusCode,
      errorCode,
      endpoint: context?.endpoint,
      method: context?.method,
      userId: context?.userId,
      requestId,
      details
    },
    request_id: requestId,
    user_id: context?.userId
  })

  // Log error for debugging
  console.error(`[${requestId}] API Error:`, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context
  })

  // Return appropriate error response
  const errorResponse = {
    error: {
      code: errorCode,
      message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined,
        details 
      })
    }
  }

  return NextResponse.json(errorResponse, { status: statusCode })
}

// Wrapper for API route handlers with automatic error handling
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: { endpoint?: string; method?: string }
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleAPIError(error, context)
    }
  }
}

// Database operation wrapper with error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new DatabaseError(operationName, error instanceof Error ? error : undefined)
  }
}

// External service call wrapper with error handling
export async function withExternalServiceErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new ExternalServiceError(serviceName, error instanceof Error ? error : undefined)
  }
}

// Validation helper
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email')
  }
}

export function validatePassword(password: string): void {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!passwordRegex.test(password)) {
    throw new ValidationError(
      'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'password'
    )
  }
}

export function validateFileType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(
      `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      'file'
    )
  }
}

export function validateFileSize(size: number, maxSize: number): void {
  if (size > maxSize) {
    throw new ValidationError(
      `File size ${Math.round(size / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
      'file'
    )
  }
}