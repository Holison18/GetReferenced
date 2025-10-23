import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Try to create documents bucket
    const { data: documentsData, error: documentsError } = await supabase.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: 10485760 // 10MB
    })

    // Try to create photos bucket
    const { data: photosData, error: photosError } = await supabase.storage.createBucket('photos', {
      public: false,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/jpg'
      ],
      fileSizeLimit: 5242880 // 5MB
    })

    return NextResponse.json({
      message: 'Storage setup attempted',
      documents: {
        success: !documentsError || documentsError.message.includes('already exists'),
        error: documentsError?.message
      },
      photos: {
        success: !photosError || photosError.message.includes('already exists'),
        error: photosError?.message
      }
    })

  } catch (error) {
    console.error('Storage setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup storage' },
      { status: 500 }
    )
  }
}