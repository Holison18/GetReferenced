const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorage() {
  try {
    console.log('Setting up Supabase storage buckets...')

    // Create documents bucket
    const { data: documentsData, error: documentsError } = await supabase.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: 10485760 // 10MB
    })

    if (documentsError && !documentsError.message.includes('already exists')) {
      console.error('Error creating documents bucket:', documentsError)
    } else {
      console.log('✓ Documents bucket created/exists')
    }

    // Create photos bucket
    const { data: photosData, error: photosError } = await supabase.storage.createBucket('photos', {
      public: false,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/jpg'
      ],
      fileSizeLimit: 5242880 // 5MB
    })

    if (photosError && !photosError.message.includes('already exists')) {
      console.error('Error creating photos bucket:', photosError)
    } else {
      console.log('✓ Photos bucket created/exists')
    }

    console.log('Storage setup complete!')

  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

setupStorage()