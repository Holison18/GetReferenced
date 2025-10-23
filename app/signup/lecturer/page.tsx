'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LecturerRegistrationWizard } from '@/components/auth/lecturer-registration/LecturerRegistrationWizard'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LecturerSignupPage() {
  const [step, setStep] = useState<'credentials' | 'registration'>('credentials')
  const [credentials, setCredentials] = useState({ email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  // Check if email is provided in URL params
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setCredentials(prev => ({ ...prev, email: emailParam }))
    }
  }, [searchParams])

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!credentials.email || !credentials.password || !credentials.confirmPassword) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (credentials.password !== credentials.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (credentials.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    // Proceed to registration wizard
    setStep('registration')
    setLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  if (step === 'registration') {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Lecturer Registration</h1>
            <p className="text-muted-foreground mt-2">
              Complete your profile to start receiving and managing recommendation letter requests
            </p>
          </div>
          
          <LecturerRegistrationWizard 
            email={credentials.email} 
            password={credentials.password} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Lecturer Registration
          </CardTitle>
          <CardDescription className="text-center">
            Create your account to start writing recommendation letters and earning compensation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Lecturer Benefits:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Earn $22.50 per completed recommendation letter</li>
                <li>• Use AI assistance to draft personalized letters efficiently</li>
                <li>• Manage requests through an intuitive dashboard</li>
                <li>• Set your own availability and preferences</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={credentials.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            <p>
              Are you a student?{' '}
              <Link 
                href="/signup/student" 
                className="text-primary hover:underline font-medium"
              >
                Register as Student
              </Link>
            </p>
            <p>
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}