'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Mail, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailContent() {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [errorMessage, setErrorMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  useEffect(() => {
    // Handle email verification from URL hash
    const handleEmailVerification = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (type === 'signup' && accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('Session error:', error)
            setVerificationStatus('error')
            setErrorMessage('Failed to verify email. Please try again.')
            return
          }

          if (data.user) {
            setVerificationStatus('success')
            // Redirect to dashboard after successful verification
            setTimeout(() => {
              router.push('/student/dashboard')
            }, 2000)
          }
        } catch (error) {
          console.error('Verification error:', error)
          setVerificationStatus('error')
          setErrorMessage('An unexpected error occurred during verification.')
        }
      }
    }

    handleEmailVerification()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          setVerificationStatus('success')
          setTimeout(() => {
            router.push('/student/dashboard')
          }, 2000)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleResendVerification = async () => {
    if (!email) {
      setErrorMessage('Email address not found. Please try registering again.')
      return
    }

    setIsResending(true)
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (error) {
        setErrorMessage('Failed to resend verification email. Please try again.')
      } else {
        setErrorMessage('')
        // Show success message (you could add a success state if needed)
      }
    } catch (error) {
      setErrorMessage('An error occurred while resending the email.')
    } finally {
      setIsResending(false)
    }
  }

  if (verificationStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h2>
          <p className="text-muted-foreground mb-4">
            Your account has been successfully verified. You can now access your dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to your email address
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {email && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Verification email sent to:
            </p>
            <p className="font-medium text-sm bg-muted px-3 py-2 rounded">
              {email}
            </p>
          </div>
        )}

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Please check your email and click the verification link to activate your account.</p>
          <p>If you don't see the email, check your spam folder.</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {verificationStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email verification failed. Please try clicking the link again or request a new verification email.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendVerification}
            variant="outline"
            className="w-full"
            disabled={isResending || !email}
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>

          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm text-primary hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <Card className="w-full">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading...</p>
            </CardContent>
          </Card>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  )
}