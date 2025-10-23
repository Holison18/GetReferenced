import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { studentRegistrationSchema } from '@/lib/validations/student-registration'
import { Database } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const formData = await request.formData()
    
    // Parse form data
    const basicInfo = JSON.parse(formData.get('basicInfo') as string)
    const academicInfo = JSON.parse(formData.get('academicInfo') as string)
    const agreement = JSON.parse(formData.get('agreement') as string)
    
    // Get uploaded files
    const transcripts = formData.getAll('transcripts') as File[]
    const cv = formData.get('cv') as File | null
    const photo = formData.get('photo') as File | null

    // Validate the data
    const validationResult = studentRegistrationSchema.safeParse({
      basicInfo,
      academicInfo,
      documents: {
        transcripts,
        cv: cv || undefined,
        photo: photo || undefined,
      },
      agreement,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { data: validatedData } = validationResult

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.basicInfo.email,
      password: validatedData.basicInfo.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email`,
        data: {
          first_name: validatedData.basicInfo.firstName,
          last_name: validatedData.basicInfo.lastName,
          role: 'student',
        },
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create account', details: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Upload files to Supabase Storage
    const uploadFile = async (file: File, bucket: string, path: string) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error(`Error uploading ${path}:`, error)
        
        // If bucket doesn't exist, provide a helpful error message
        if (error.message.includes('Bucket not found')) {
          throw new Error(`Storage bucket '${bucket}' not found. Please contact support to set up file storage.`)
        }
        
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }

      return data.path
    }

    try {
      // For now, store file names instead of uploading (until storage buckets are set up)
      const transcriptUrls: string[] = []
      for (let i = 0; i < validatedData.documents.transcripts.length; i++) {
        const file = validatedData.documents.transcripts[i]
        // Store file name as placeholder until storage is properly configured
        transcriptUrls.push(`pending_upload_${file.name}`)
      }

      // Store CV filename if provided
      let cvUrl: string | null = null
      if (validatedData.documents.cv) {
        cvUrl = `pending_upload_${validatedData.documents.cv.name}`
      }

      // Store photo filename if provided
      let photoUrl: string | null = null
      if (validatedData.documents.photo) {
        photoUrl = `pending_upload_${validatedData.documents.photo.name}`
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'student',
          first_name: validatedData.basicInfo.firstName,
          last_name: validatedData.basicInfo.lastName,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error('Failed to create profile')
      }

      // Create student profile
      const { error: studentProfileError } = await supabase
        .from('student_profiles')
        .insert({
          id: userId,
          enrollment_year: validatedData.academicInfo.enrollmentYear,
          completion_year: validatedData.academicInfo.completionYear,
          contact_info: validatedData.academicInfo.contactInfo,
          date_of_birth: validatedData.academicInfo.dateOfBirth,
          transcript_urls: transcriptUrls,
          cv_url: cvUrl,
          photo_url: photoUrl,
        })

      if (studentProfileError) {
        console.error('Student profile creation error:', studentProfileError)
        throw new Error('Failed to create student profile')
      }

      return NextResponse.json({
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          id: userId,
          email: validatedData.basicInfo.email,
          emailConfirmed: false,
        },
      })

    } catch (profileError) {
      console.error('Profile creation error:', profileError)
      
      // Clean up: delete the user account if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (cleanupError) {
        console.error('Failed to cleanup user after profile error:', cleanupError)
      }
      
      return NextResponse.json(
        { error: 'Failed to create user profile', details: profileError instanceof Error ? profileError.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}