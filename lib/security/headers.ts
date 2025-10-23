import { NextRequest, NextResponse } from 'next/server'

export interface SecurityConfig {
  enforceHTTPS?: boolean
  contentSecurityPolicy?: string
  frameOptions?: string
}

export function createSecurityMiddleware(config: SecurityConfig = {}) {
  return function securityMiddleware(req: NextRequest) {
    const response = NextResponse.next()

    // Enforce HTTPS in production
    if (config.enforceHTTPS && req.nextUrl.protocol === 'http:') {
      const httpsUrl = new URL(req.url)
      httpsUrl.protocol = 'https:'
      return NextResponse.redirect(httpsUrl)
    }

    // Set security headers
    response.headers.set('X-Frame-Options', config.frameOptions || 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    if (config.contentSecurityPolicy) {
      response.headers.set('Content-Security-Policy', config.contentSecurityPolicy)
    }

    return response
  }
}