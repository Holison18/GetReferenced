import crypto from 'crypto'

/**
 * Data encryption utilities for sensitive information
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  
  // If key is hex-encoded, decode it
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }
  
  // Otherwise, hash the key to get consistent 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Encrypt sensitive data
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from('getreference-app', 'utf8'))
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Combine IV, tag, and encrypted data
    const result = iv.toString('hex') + tag.toString('hex') + encrypted
    return result
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    
    // Extract IV, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex')
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex')
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2)
    
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(Buffer.from('getreference-app', 'utf8'))
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex')
  
  return { hash, salt: actualSalt }
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashData(data, salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate cryptographically secure random string
 */
export function generateSecureString(length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = ''
  const charsetLength = charset.length
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charsetLength)
    result += charset[randomIndex]
  }
  
  return result
}

/**
 * Encrypt object data
 */
export function encryptObject(obj: Record<string, any>): string {
  const jsonString = JSON.stringify(obj)
  return encrypt(jsonString)
}

/**
 * Decrypt object data
 */
export function decryptObject<T = Record<string, any>>(encryptedData: string): T {
  const jsonString = decrypt(encryptedData)
  return JSON.parse(jsonString) as T
}

/**
 * Encrypt file content
 */
export function encryptFile(fileBuffer: Buffer): Buffer {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from('getreference-file', 'utf8'))
    
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ])
    
    const tag = cipher.getAuthTag()
    
    // Combine IV, tag, and encrypted data
    return Buffer.concat([iv, tag, encrypted])
  } catch (error) {
    throw new Error(`File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decrypt file content
 */
export function decryptFile(encryptedBuffer: Buffer): Buffer {
  try {
    const key = getEncryptionKey()
    
    // Extract IV, tag, and encrypted data
    const iv = encryptedBuffer.slice(0, IV_LENGTH)
    const tag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = encryptedBuffer.slice(IV_LENGTH + TAG_LENGTH)
    
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(Buffer.from('getreference-file', 'utf8'))
    decipher.setAuthTag(tag)
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    
    return decrypted
  } catch (error) {
    throw new Error(`File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Secure data masking for logging
 */
export function maskSensitiveData(data: any, sensitiveFields: string[] = ['password', 'token', 'key', 'secret', 'ssn', 'credit_card']): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, sensitiveFields))
  }
  
  const masked: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field))
    
    if (isSensitive && typeof value === 'string') {
      // Mask sensitive string data
      if (value.length <= 4) {
        masked[key] = '***'
      } else {
        masked[key] = value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2)
      }
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value, sensitiveFields)
    } else {
      masked[key] = value
    }
  }
  
  return masked
}

/**
 * Generate HMAC signature for data integrity
 */
export function generateHMAC(data: string, secret?: string): string {
  const actualSecret = secret || process.env.HMAC_SECRET || 'default-secret'
  return crypto.createHmac('sha256', actualSecret).update(data).digest('hex')
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = generateHMAC(data, secret)
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))
}

/**
 * Secure comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return generateSecureToken(32)
}

/**
 * Encrypt sensitive fields in database records
 */
export function encryptSensitiveFields<T extends Record<string, any>>(
  record: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const encrypted = { ...record }
  
  for (const field of fieldsToEncrypt) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field] as string) as T[keyof T]
    }
  }
  
  return encrypted
}

/**
 * Decrypt sensitive fields in database records
 */
export function decryptSensitiveFields<T extends Record<string, any>>(
  record: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const decrypted = { ...record }
  
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decrypt(decrypted[field] as string) as T[keyof T]
      } catch (error) {
        // If decryption fails, the field might not be encrypted
        console.warn(`Failed to decrypt field ${String(field)}:`, error)
      }
    }
  }
  
  return decrypted
}

/**
 * Key derivation for different purposes
 */
export function deriveKey(purpose: string, salt?: string): Buffer {
  const masterKey = getEncryptionKey()
  const actualSalt = salt || crypto.createHash('sha256').update(purpose).digest()
  
  return crypto.pbkdf2Sync(masterKey, actualSalt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Secure random number generation
 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1
  const bytesNeeded = Math.ceil(Math.log2(range) / 8)
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1
  
  let randomValue: number
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded)
    randomValue = randomBytes.readUIntBE(0, bytesNeeded)
  } while (randomValue > maxValid)
  
  return min + (randomValue % range)
}