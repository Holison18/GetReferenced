import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
}

export const rateLimitConfigs = {
  auth: { windowMs: 900000, max: 5 }, // 15 minutes, 5 attempts
  payment: { windowMs: 900000, max: 3 }, // 15 minutes, 3 attempts
  upload: { windowMs: 900000, max: 10 }, // 15 minutes, 10 uploads
  ai: { windowMs: 900000, max: 20 }, // 15 minutes, 20 AI requests
  notification: { windowMs: 900000, max: 50 }, // 15 minutes, 50 notifications
  api: { windowMs: 900000, max: 100 } // 15 minutes, 100 API calls
}

// Simple in-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const key = `${ip}:${req.nextUrl.pathname}`
    const now = Date.now()
    
    const record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null // Allow request
    }
    
    if (record.count >= config.max) {
      // Rate limit exceeded
      return NextResponse.json(
        { error: config.message || 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Increment count
    record.count++
    rateLimitStore.set(key, record)
    
    return null // Allow request
  }
}