#!/usr/bin/env node

/**
 * Backup and Restore Script for GetReference
 * Handles database backups, file storage backups, and disaster recovery
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')

// Configuration
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  backup: {
    directory: './backups',
    retention: {
      daily: 7,    // Keep 7 daily backups
      weekly: 4,   // Keep 4 weekly backups
      monthly: 12  // Keep 12 monthly backups
    }
  }
}

class BackupManager {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey)
    this.backupDir = config.backup.directory
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create backup directory:', error)
      throw error
    }
  }

  async createDatabaseBackup() {
    console.log('Creating database backup...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(this.backupDir, `db-backup-${timestamp}.json`)
    
    try {
      // Tables to backup
      const tables = [
        'profiles',
        'student_profiles', 
        'lecturer_profiles',
        'requests',
        'letters',
        'payments',
        'tokens',
        'notifications',
        'complaints',
        'audit_logs'
      ]
      
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: {}
      }
      
      // Backup each table
      for (const table of tables) {
        console.log(`Backing up table: ${table}`)
        
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
        
        if (error) {
          console.error(`Error backing up ${table}:`, error)
          continue
        }
        
        backup.tables[table] = data || []
        console.log(`Backed up ${data?.length || 0} records from ${table}`)
      }
      
      // Write backup to file
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2))
      console.log(`Database backup created: ${backupFile}`)
      
      return backupFile
      
    } catch (error) {
      console.error('Database backup failed:', error)
      throw error
    }
  }

  async createStorageBackup() {
    console.log('Creating storage backup...')
    
    try {
      // List all files in storage
      const { data: files, error } = await this.supabase.storage
        .from('documents')
        .list('', { limit: 1000 })
      
      if (error) {
        console.error('Error listing storage files:', error)
        return
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const storageBackupDir = path.join(this.backupDir, `storage-backup-${timestamp}`)
      
      await fs.mkdir(storageBackupDir, { recursive: true })
      
      // Download each file
      for (const file of files || []) {
        try {
          const { data: fileData, error: downloadError } = await this.supabase.storage
            .from('documents')
            .download(file.name)
          
          if (downloadError) {
            console.error(`Error downloading ${file.name}:`, downloadError)
            continue
          }
          
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const filePath = path.join(storageBackupDir, file.name)
          
          await fs.writeFile(filePath, buffer)
          console.log(`Backed up file: ${file.name}`)
          
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError)
        }
      }
      
      console.log(`Storage backup created: ${storageBackupDir}`)
      return storageBackupDir
      
    } catch (error) {
      console.error('Storage backup failed:', error)
      throw error
    }
  }

  async restoreDatabase(backupFile) {
    console.log(`Restoring database from: ${backupFile}`)
    
    try {
      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'))
      
      console.log(`Restoring backup from: ${backupData.timestamp}`)
      
      // Restore each table
      for (const [tableName, records] of Object.entries(backupData.tables)) {
        if (!Array.isArray(records) || records.length === 0) {
          console.log(`Skipping empty table: ${tableName}`)
          continue
        }
        
        console.log(`Restoring ${records.length} records to ${tableName}`)
        
        // Clear existing data (be careful!)
        const { error: deleteError } = await this.supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
        
        if (deleteError) {
          console.error(`Error clearing ${tableName}:`, deleteError)
          continue
        }
        
        // Insert backup data in batches
        const batchSize = 100
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          
          const { error: insertError } = await this.supabase
            .from(tableName)
            .insert(batch)
          
          if (insertError) {
            console.error(`Error inserting batch to ${tableName}:`, insertError)
          }
        }
        
        console.log(`Restored ${records.length} records to ${tableName}`)
      }
      
      console.log('Database restore completed')
      
    } catch (error) {
      console.error('Database restore failed:', error)
      throw error
    }
  }

  async cleanupOldBackups() {
    console.log('Cleaning up old backups...')
    
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(file => file.startsWith('db-backup-'))
      
      // Sort by creation time (newest first)
      backupFiles.sort((a, b) => {
        const timeA = a.match(/db-backup-(.+)\.json/)?.[1]
        const timeB = b.match(/db-backup-(.+)\.json/)?.[1]
        return timeB?.localeCompare(timeA || '') || 0
      })
      
      // Keep only the specified number of backups
      const retention = config.backup.retention.daily
      if (backupFiles.length > retention) {
        const filesToDelete = backupFiles.slice(retention)
        
        for (const file of filesToDelete) {
          const filePath = path.join(this.backupDir, file)
          await fs.unlink(filePath)
          console.log(`Deleted old backup: ${file}`)
        }
      }
      
      console.log('Backup cleanup completed')
      
    } catch (error) {
      console.error('Backup cleanup failed:', error)
    }
  }

  async createFullBackup() {
    console.log('Creating full system backup...')
    
    await this.ensureBackupDirectory()
    
    const results = {
      database: null,
      storage: null,
      timestamp: new Date().toISOString()
    }
    
    try {
      results.database = await this.createDatabaseBackup()
      results.storage = await this.createStorageBackup()
      
      // Create backup manifest
      const manifestFile = path.join(this.backupDir, `backup-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
      await fs.writeFile(manifestFile, JSON.stringify(results, null, 2))
      
      console.log('Full backup completed successfully')
      console.log('Backup manifest:', manifestFile)
      
      // Cleanup old backups
      await this.cleanupOldBackups()
      
      return results
      
    } catch (error) {
      console.error('Full backup failed:', error)
      throw error
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir)
      const backups = files
        .filter(file => file.startsWith('db-backup-') || file.startsWith('backup-manifest-'))
        .sort()
        .reverse()
      
      console.log('Available backups:')
      backups.forEach(backup => {
        console.log(`  ${backup}`)
      })
      
      return backups
      
    } catch (error) {
      console.error('Error listing backups:', error)
      return []
    }
  }

  async validateBackup(backupFile) {
    console.log(`Validating backup: ${backupFile}`)
    
    try {
      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'))
      
      // Check backup structure
      if (!backupData.timestamp || !backupData.tables) {
        throw new Error('Invalid backup format')
      }
      
      // Check table data
      let totalRecords = 0
      for (const [tableName, records] of Object.entries(backupData.tables)) {
        if (Array.isArray(records)) {
          totalRecords += records.length
        }
      }
      
      console.log(`Backup validation passed:`)
      console.log(`  Timestamp: ${backupData.timestamp}`)
      console.log(`  Tables: ${Object.keys(backupData.tables).length}`)
      console.log(`  Total records: ${totalRecords}`)
      
      return true
      
    } catch (error) {
      console.error('Backup validation failed:', error)
      return false
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2]
  const backupManager = new BackupManager()
  
  try {
    switch (command) {
      case 'backup':
        await backupManager.createFullBackup()
        break
        
      case 'restore':
        const backupFile = process.argv[3]
        if (!backupFile) {
          console.error('Please specify backup file to restore')
          process.exit(1)
        }
        await backupManager.restoreDatabase(backupFile)
        break
        
      case 'list':
        await backupManager.listBackups()
        break
        
      case 'validate':
        const validateFile = process.argv[3]
        if (!validateFile) {
          console.error('Please specify backup file to validate')
          process.exit(1)
        }
        await backupManager.validateBackup(validateFile)
        break
        
      case 'cleanup':
        await backupManager.cleanupOldBackups()
        break
        
      default:
        console.log('Usage: node backup-restore.js <command> [options]')
        console.log('Commands:')
        console.log('  backup              Create full system backup')
        console.log('  restore <file>      Restore from backup file')
        console.log('  list                List available backups')
        console.log('  validate <file>     Validate backup file')
        console.log('  cleanup             Clean up old backups')
        process.exit(1)
    }
    
  } catch (error) {
    console.error('Operation failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = BackupManager