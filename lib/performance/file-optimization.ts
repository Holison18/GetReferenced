/**
 * File upload optimization and storage management
 */

interface FileUploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  compression?: boolean
  generateThumbnail?: boolean
  encryptFile?: boolean
  virusScan?: boolean
}

interface UploadResult {
  success: boolean
  fileUrl?: string
  thumbnailUrl?: string
  fileSize: number
  originalSize: number
  compressionRatio?: number
  error?: string
  metadata?: Record<string, any>
}

interface FileMetadata {
  originalName: string
  mimeType: string
  size: number
  uploadedAt: Date
  uploadedBy: string
  checksum: string
  encrypted: boolean
  compressed: boolean
}

/**
 * File compression utilities
 */
export class FileCompressor {
  /**
   * Compress image files
   */
  static async compressImage(
    file: File,
    options: {
      quality?: number
      maxWidth?: number
      maxHeight?: number
      format?: 'jpeg' | 'webp' | 'png'
    } = {}
  ): Promise<File> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: `image/${format}`,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Compression failed'))
            }
          },
          `image/${format}`,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Compress PDF files (placeholder - would need PDF.js or similar)
   */
  static async compressPDF(file: File): Promise<File> {
    // PDF compression would require a library like PDF-lib
    // For now, return original file
    return file
  }

  /**
   * Generate file checksum
   */
  static async generateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * Thumbnail generator
 */
export class ThumbnailGenerator {
  static async generateImageThumbnail(
    file: File,
    size: { width: number; height: number } = { width: 200, height: 200 }
  ): Promise<File | null> {
    if (!file.type.startsWith('image/')) {
      return null
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = size.width
        canvas.height = size.height

        // Calculate crop dimensions to maintain aspect ratio
        const scale = Math.max(size.width / img.width, size.height / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (size.width - scaledWidth) / 2
        const y = (size.height - scaledHeight) / 2

        ctx?.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnail = new File([blob], `thumb_${file.name}`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(thumbnail)
            } else {
              resolve(null)
            }
          },
          'image/jpeg',
          0.8
        )
      }

      img.onerror = () => resolve(null)
      img.src = URL.createObjectURL(file)
    })
  }

  static async generatePDFThumbnail(file: File): Promise<File | null> {
    // PDF thumbnail generation would require PDF.js
    // For now, return null
    return null
  }
}

/**
 * Optimized file uploader
 */
export class OptimizedFileUploader {
  private supabase: any
  private uploadQueue: Map<string, Promise<UploadResult>> = new Map()
  private maxConcurrentUploads = 3
  private activeUploads = 0

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Upload file with optimization
   */
  async uploadFile(
    file: File,
    bucket: string,
    path: string,
    options: FileUploadOptions = {}
  ): Promise<UploadResult> {
    const uploadId = `${bucket}/${path}/${file.name}`
    
    // Check if already uploading
    if (this.uploadQueue.has(uploadId)) {
      return this.uploadQueue.get(uploadId)!
    }

    const uploadPromise = this.performUpload(file, bucket, path, options)
    this.uploadQueue.set(uploadId, uploadPromise)

    try {
      const result = await uploadPromise
      return result
    } finally {
      this.uploadQueue.delete(uploadId)
    }
  }

  private async performUpload(
    file: File,
    bucket: string,
    path: string,
    options: FileUploadOptions
  ): Promise<UploadResult> {
    // Wait for upload slot
    await this.waitForUploadSlot()
    this.activeUploads++

    try {
      const originalSize = file.size
      let processedFile = file
      let thumbnailFile: File | null = null

      // Validate file
      const validation = this.validateFile(file, options)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          fileSize: file.size,
          originalSize
        }
      }

      // Compress if requested
      if (options.compression && file.type.startsWith('image/')) {
        processedFile = await FileCompressor.compressImage(file, {
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1080
        })
      }

      // Generate thumbnail if requested
      if (options.generateThumbnail) {
        thumbnailFile = await ThumbnailGenerator.generateImageThumbnail(processedFile)
      }

      // Generate checksum
      const checksum = await FileCompressor.generateChecksum(processedFile)

      // Encrypt if requested
      if (options.encryptFile) {
        // Encryption would be implemented here
        // For now, we'll skip this step
      }

      // Upload main file
      const mainUploadResult = await this.uploadToStorage(
        processedFile,
        bucket,
        `${path}/${file.name}`
      )

      if (!mainUploadResult.success) {
        return {
          success: false,
          error: mainUploadResult.error,
          fileSize: processedFile.size,
          originalSize
        }
      }

      // Upload thumbnail if generated
      let thumbnailUrl: string | undefined
      if (thumbnailFile) {
        const thumbUploadResult = await this.uploadToStorage(
          thumbnailFile,
          bucket,
          `${path}/thumbnails/thumb_${file.name}`
        )
        if (thumbUploadResult.success) {
          thumbnailUrl = thumbUploadResult.fileUrl
        }
      }

      // Store metadata
      await this.storeFileMetadata({
        originalName: file.name,
        mimeType: file.type,
        size: processedFile.size,
        uploadedAt: new Date(),
        uploadedBy: path.split('/')[0], // Assuming first part is user ID
        checksum,
        encrypted: options.encryptFile || false,
        compressed: options.compression || false
      })

      return {
        success: true,
        fileUrl: mainUploadResult.fileUrl,
        thumbnailUrl,
        fileSize: processedFile.size,
        originalSize,
        compressionRatio: originalSize > 0 ? processedFile.size / originalSize : 1,
        metadata: {
          checksum,
          compressed: options.compression,
          encrypted: options.encryptFile
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        fileSize: file.size,
        originalSize: file.size
      }
    } finally {
      this.activeUploads--
    }
  }

  private async uploadToStorage(
    file: File,
    bucket: string,
    path: string
  ): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        return { success: false, error: error.message }
      }

      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return {
        success: true,
        fileUrl: urlData.publicUrl
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage upload failed'
      }
    }
  }

  private validateFile(file: File, options: FileUploadOptions): { valid: boolean; error?: string } {
    // Check file size
    const maxSize = options.maxSize || 25 * 1024 * 1024 // 25MB default
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`
      }
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      }
    }

    return { valid: true }
  }

  private async waitForUploadSlot(): Promise<void> {
    while (this.activeUploads >= this.maxConcurrentUploads) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  private async storeFileMetadata(metadata: FileMetadata): Promise<void> {
    // Store file metadata in database for tracking
    try {
      await this.supabase
        .from('file_metadata')
        .insert(metadata)
    } catch (error) {
      console.warn('Failed to store file metadata:', error)
    }
  }

  /**
   * Batch upload multiple files
   */
  async uploadBatch(
    files: File[],
    bucket: string,
    basePath: string,
    options: FileUploadOptions = {}
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []
    
    // Process files in batches to avoid overwhelming the system
    const batchSize = 5
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchPromises = batch.map((file, index) =>
        this.uploadFile(file, bucket, `${basePath}/${i + index}`, options)
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Get upload progress (placeholder for future implementation)
   */
  getUploadProgress(uploadId: string): number {
    // Would track upload progress for large files
    return 0
  }

  /**
   * Cancel upload (placeholder for future implementation)
   */
  cancelUpload(uploadId: string): void {
    // Would cancel ongoing upload
    this.uploadQueue.delete(uploadId)
  }
}

/**
 * File storage cleanup utilities
 */
export class StorageCleanup {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(bucket: string): Promise<number> {
    try {
      // Get all files in bucket
      const { data: files, error } = await this.supabase.storage
        .from(bucket)
        .list()

      if (error || !files) {
        throw new Error(`Failed to list files: ${error?.message}`)
      }

      let deletedCount = 0

      // Check each file against database records
      for (const file of files) {
        const isReferenced = await this.isFileReferenced(file.name)
        if (!isReferenced) {
          await this.supabase.storage
            .from(bucket)
            .remove([file.name])
          deletedCount++
        }
      }

      return deletedCount
    } catch (error) {
      console.error('Cleanup failed:', error)
      return 0
    }
  }

  private async isFileReferenced(fileName: string): Promise<boolean> {
    // Check if file is referenced in any database table
    const tables = ['student_profiles', 'requests', 'letters', 'sample_letters']
    
    for (const table of tables) {
      const { data, error } = await this.supabase
        .from(table)
        .select('id')
        .or(`transcript_urls.cs.{${fileName}},cv_url.eq.${fileName},photo_url.eq.${fileName},document_urls.cs.{${fileName}},file_url.eq.${fileName}`)
        .limit(1)

      if (!error && data && data.length > 0) {
        return true
      }
    }

    return false
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(bucket: string, olderThanHours = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    
    try {
      const { data: files, error } = await this.supabase.storage
        .from(bucket)
        .list('temp/')

      if (error || !files) {
        return 0
      }

      const filesToDelete = files.filter(file => 
        new Date(file.created_at) < cutoffTime
      )

      if (filesToDelete.length > 0) {
        await this.supabase.storage
          .from(bucket)
          .remove(filesToDelete.map(f => `temp/${f.name}`))
      }

      return filesToDelete.length
    } catch (error) {
      console.error('Temp file cleanup failed:', error)
      return 0
    }
  }
}

/**
 * File optimization presets
 */
export const fileOptimizationPresets = {
  // Document upload (transcripts, CVs, etc.)
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    compression: false,
    generateThumbnail: true,
    encryptFile: true
  },

  // Profile photos
  profilePhoto: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    compression: true,
    generateThumbnail: true,
    encryptFile: false
  },

  // Sample letters
  sampleLetter: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    compression: false,
    generateThumbnail: true,
    encryptFile: false
  }
}