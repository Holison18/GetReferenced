'use client'

import Link from 'next/link'
import { StudentRegistrationForm } from '@/components/auth/StudentRegistrationForm'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StudentSignupPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/signup">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to role selection
            </Link>
          </Button>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Student Registration</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join GetReference to request personalized recommendation letters from your lecturers. 
              Complete the registration process to get started.
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <StudentRegistrationForm />

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="text-primary hover:underline font-medium"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}