"use client"

import React, { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Database, 
  Key, 
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  Download,
  Loader2
} from "lucide-react"
import { privacyService } from "@/lib/services/privacyService"
import { useAuth } from "./AuthProvider"
import {
  fetchCollections,
  fetchSnapshots,
  fetchUserPreferences
} from "@/lib/services/cachedDataService"
import { supabase } from "@/lib/supabaseClient"

interface PrivacySettingsProps {
  onClose: () => void
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ onClose }) => {
  const { user, session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [encryptionStatus, setEncryptionStatus] = useState<"testing" | "working" | "failed" | null>(null)
  const [privacyFeatures, setPrivacyFeatures] = useState({
    dataEncryption: true,
    searchPrivacy: true,
    metadataMinimization: true,
    automaticCleanup: false
  })
  
  // New state for export and delete operations
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Ref to store AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null)

  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple toast implementation - you can replace with your preferred toast library
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white text-sm font-medium ${
      type === 'success' ? 'bg-green-600' : 
      type === 'error' ? 'bg-red-600' : 
      'bg-blue-600'
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 3000)
  }

  // Helper function to create a timeout promise
  const createTimeout = (ms: number, abortController: AbortController): Promise<never> => {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`))
      }, ms)
      
      // Clean up timeout if aborted
      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId)
        reject(new Error('Operation was aborted'))
      })
    })
  }

  // Helper function to retry with exponential backoff
  const retryWithBackoff = async (
    operation: () => Promise<boolean>,
    maxAttempts: number = 3,
    abortController: AbortController
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Race the operation against timeout
        const result = await Promise.race([
          operation(),
          createTimeout(5000, abortController) // 5 second timeout
        ])
        
        if (result) {
          console.log(`Encryption test succeeded on attempt ${attempt}`)
          return true
        } else {
          throw new Error('Encryption test returned false')
        }
      } catch (error) {
        console.error(`Encryption test attempt ${attempt} failed:`, error)
        
        // If this is the last attempt or operation was aborted, throw the error
        if (attempt === maxAttempts || abortController.signal.aborted) {
          throw error
        }
        
        // Calculate delay with exponential backoff: 500ms, 1000ms
        const delay = 500 * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay}ms... (attempt ${attempt}/${maxAttempts})`)
        
        // Wait before retry, but check for abort
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, delay)
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            resolve(undefined)
          })
        })
        
        // Check if aborted during delay
        if (abortController.signal.aborted) {
          throw new Error('Operation was aborted during retry delay')
        }
      }
    }
    
    throw new Error(`All ${maxAttempts} attempts failed`)
  }

  const testEncryption = async () => {
    if (!user) return
    
    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new AbortController for this operation
    abortControllerRef.current = new AbortController()
    const abortController = abortControllerRef.current
    
    setIsLoading(true)
    setEncryptionStatus("testing")
    
    try {
      const isWorking = await retryWithBackoff(
        () => privacyService.testEncryption(user.id),
        3, // 3 attempts
        abortController
      )
      
      setEncryptionStatus(isWorking ? "working" : "failed")
    } catch (error) {
      console.error("Encryption test failed after all retries:", error)
      setEncryptionStatus("failed")
    } finally {
      setIsLoading(false)
      // Clean up AbortController
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  // Export all user data
  const handleExportData = async () => {
    if (!user) return
    
    setIsExporting(true)
    
    try {
      // Fetch all user data from the database
      const [collections, snapshots, userPreferences] = await Promise.all([
        fetchCollections(user.id, true), // Include archived collections
        fetchSnapshots(user.id),
        fetchUserPreferences(user.id)
      ])

      // Create clean export data with decrypted, user-readable content
      const cleanCollections = collections.map((collection) => ({
        id: collection.id,
        name: collection.name, // Already decrypted
        status: collection.status,
        archived_at: collection.archived_at,
        deleted_at: collection.deleted_at,
        dots: collection.dots.map(dot => ({
          id: dot.id,
          label: dot.label, // Already decrypted
          x: dot.x,
          y: dot.y,
          color: dot.color,
          size: dot.size,
          archived: Boolean(dot.archived)
        }))
      }))

      // Clean snapshots data
      const cleanSnapshots = snapshots.map(snapshot => ({
        date: snapshot.date,
        collectionId: snapshot.collectionId,
        collectionName: snapshot.collectionName, // Already decrypted
        dots: snapshot.dots.map(dot => ({
          id: dot.id,
          label: dot.label, // Already decrypted
          x: dot.x,
          y: dot.y,
          color: dot.color,
          size: dot.size,
          archived: Boolean(dot.archived)
        })),
        timestamp: snapshot.timestamp
      }))

      // Create comprehensive export data
      const exportData = {
        userId: user.id,
        userEmail: user.email,
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        collections: cleanCollections,
        snapshots: cleanSnapshots,
        userPreferences: userPreferences || {
          selectedCollectionId: null,
          collectionInput: '',
          hideCollectionName: false,
          copyFormat: 'PNG',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        privacyFeatures: privacyFeatures,
        metadata: {
          totalCollections: collections.length,
          totalDots: collections.reduce((sum, c) => sum + c.dots.length, 0),
          totalSnapshots: snapshots.length,
          activeCollections: collections.filter(c => c.status === 'active').length,
          archivedCollections: collections.filter(c => c.status === 'archived').length
        }
      }
      
      // Serialize to JSON
      const jsonData = JSON.stringify(exportData, null, 2)
      
      // Create blob and trigger download
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `over-the-hill-complete-data-${user.id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showToast('Complete data exported successfully!', 'success')
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Failed to export data. Please try again.', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  // Delete all user data
  const handleDeleteData = async () => {
    if (!user) return
    
    setIsDeleting(true)
    
    try {
      // Step 1: Export all data before deletion
      showToast('Exporting your data before deletion...', 'info')
      
      const [collections, snapshots, userPreferences] = await Promise.all([
        fetchCollections(user.id, true), // Include archived collections
        fetchSnapshots(user.id),
        fetchUserPreferences(user.id)
      ])

      // Create comprehensive export data
      const exportData = {
        userId: user.id,
        userEmail: user.email,
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        collections: collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          status: collection.status,
          archived_at: collection.archived_at,
          deleted_at: collection.deleted_at,
          dots: collection.dots.map(dot => ({
            id: dot.id,
            label: dot.label,
            x: dot.x,
            y: dot.y,
            color: dot.color,
            size: dot.size,
            archived: Boolean(dot.archived)
          }))
        })),
        snapshots: snapshots.map(snapshot => ({
          date: snapshot.date,
          collectionId: snapshot.collectionId,
          collectionName: snapshot.collectionName,
          dots: snapshot.dots.map(dot => ({
            id: dot.id,
            label: dot.label,
            x: dot.x,
            y: dot.y,
            color: dot.color,
            size: dot.size,
            archived: Boolean(dot.archived)
          })),
          timestamp: snapshot.timestamp
        })),
        userPreferences: userPreferences || {
          selectedCollectionId: null,
          collectionInput: '',
          hideCollectionName: false,
          copyFormat: 'PNG',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        privacyFeatures: privacyFeatures,
        metadata: {
          totalCollections: collections.length,
          totalDots: collections.reduce((sum, c) => sum + c.dots.length, 0),
          totalSnapshots: snapshots.length,
          activeCollections: collections.filter(c => c.status === 'active').length,
          archivedCollections: collections.filter(c => c.status === 'archived').length
        }
      }

      // Download the complete data export
      const jsonData = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `over-the-hill-complete-data-backup-${user.id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Step 2: Export collections as separate JSON (for compatibility)
      const collectionsExport = {
        collections: collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          status: collection.status,
          archived_at: collection.archived_at,
          deleted_at: collection.deleted_at,
          dots: collection.dots.map(dot => ({
            id: dot.id,
            label: dot.label,
            x: dot.x,
            y: dot.y,
            color: dot.color,
            size: dot.size,
            archived: Boolean(dot.archived)
          }))
        })),
        snapshots: snapshots.map(snapshot => ({
          date: snapshot.date,
          collectionId: snapshot.collectionId,
          collectionName: snapshot.collectionName,
          dots: snapshot.dots.map(dot => ({
            id: dot.id,
            label: dot.label,
            x: dot.x,
            y: dot.y,
            color: dot.color,
            size: dot.size,
            archived: Boolean(dot.archived)
          })),
          timestamp: snapshot.timestamp
        })),
        exportDate: new Date().toISOString(),
        version: "1.0.0",
      }

      const collectionsJsonData = JSON.stringify(collectionsExport, null, 2)
      const collectionsBlob = new Blob([collectionsJsonData], { type: 'application/json' })
      const collectionsUrl = URL.createObjectURL(collectionsBlob)
      const collectionsA = document.createElement('a')
      collectionsA.href = collectionsUrl
      collectionsA.download = `hill-chart-collections-${user.id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(collectionsA)
      collectionsA.click()
      document.body.removeChild(collectionsA)
      URL.revokeObjectURL(collectionsUrl)

      showToast('Data backup completed. Proceeding with deletion...', 'info')

      // Step 3: Delete all user data from database
      const { error: deleteDataError } = await supabase
        .from("collections")
        .delete()
        .eq("user_id", user.id)

      if (deleteDataError) {
        throw new Error(`Failed to delete user data: ${deleteDataError.message}`)
      }

      // Step 4: Delete user account
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        throw new Error(`Failed to delete user account: ${response.statusText}`)
      }

      showToast('All data deleted successfully. Logging out...', 'success')
      
      // Step 5: Clear client state and logout
      setTimeout(() => {
        // Clear local storage, cookies, etc.
        localStorage.clear()
        sessionStorage.clear()
        
        // Redirect to home page
        window.location.href = '/'
      }, 2000)
      
    } catch (error) {
      console.error('Delete failed:', error)
      showToast(`Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handlePrivacyFeatureToggle = (feature: keyof typeof privacyFeatures) => {
    setPrivacyFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }))
  }

  const getEncryptionStatusIcon = () => {
    switch (encryptionStatus) {
      case "working":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "failed":
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case "testing":
        return <div className="w-5 h-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getEncryptionStatusText = () => {
    switch (encryptionStatus) {
      case "working":
        return "Encryption working properly"
      case "failed":
        return "Encryption test failed"
      case "testing":
        return "Testing encryption..."
      default:
        return "Click to test encryption"
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Privacy Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="space-y-6">
          {/* Encryption Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Data Encryption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Your sensitive data (collection names, dot labels) is encrypted at rest using AES-256 encryption.
                  </p>
                  <div className="flex items-center gap-2">
                    {getEncryptionStatusIcon()}
                    <span className="text-sm">{getEncryptionStatusText()}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testEncryption}
                  disabled={isLoading}
                >
                  Test Encryption
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span>End-to-end encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>Encrypted at rest</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  <span>User-specific keys</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" />
                  <span>Row-level security</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Privacy Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="data-encryption">Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt all sensitive data before storing
                    </p>
                  </div>
                  <Switch
                    id="data-encryption"
                    checked={privacyFeatures.dataEncryption}
                    onCheckedChange={() => handlePrivacyFeatureToggle("dataEncryption")}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="search-privacy">Private Search</Label>
                    <p className="text-sm text-muted-foreground">
                      Use hashed search to avoid decryption
                    </p>
                  </div>
                  <Switch
                    id="search-privacy"
                    checked={privacyFeatures.searchPrivacy}
                    onCheckedChange={() => handlePrivacyFeatureToggle("searchPrivacy")}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="metadata-minimization">Metadata Minimization</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize stored metadata
                    </p>
                  </div>
                  <Switch
                    id="metadata-minimization"
                    checked={privacyFeatures.metadataMinimization}
                    onCheckedChange={() => handlePrivacyFeatureToggle("metadataMinimization")}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="automatic-cleanup">Automatic Cleanup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete old data
                    </p>
                  </div>
                  <Switch
                    id="automatic-cleanup"
                    checked={privacyFeatures.automaticCleanup}
                    onCheckedChange={() => handlePrivacyFeatureToggle("automaticCleanup")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2" 
                  onClick={handleExportData} 
                  disabled={isExporting}
                  aria-label={isExporting ? 'Exporting data...' : 'Export all user data'}
                  aria-busy={isExporting}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExporting ? 'Exporting...' : 'Export All Data'}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-destructive" 
                  onClick={() => setShowDeleteConfirm(true)} 
                  disabled={isDeleting}
                  aria-label={isDeleting ? 'Deleting data...' : 'Delete all user data'}
                  aria-busy={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isDeleting ? 'Deleting...' : 'Delete All Data'}
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>• Export includes all your collections, dots, and snapshots</p>
                <p>• Data is exported in encrypted format for security</p>
                <p>• Deletion is permanent and cannot be undone</p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Privacy Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">What We Store</Badge>
                  <div className="text-sm">
                    <p>• Collection names (encrypted)</p>
                    <p>• Dot labels and positions (encrypted)</p>
                    <p>• User preferences (minimal)</p>
                    <p>• Authentication data (handled by Supabase)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">What We Don't Store</Badge>
                  <div className="text-sm">
                    <p>• Plain text content</p>
                    <p>• Personal identifying information</p>
                    <p>• Analytics or tracking data</p>
                    <p>• Third-party cookies</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">Security Measures</Badge>
                  <div className="text-sm">
                    <p>• AES-256 encryption at rest</p>
                    <p>• User-specific encryption keys</p>
                    <p>• Row-level security policies</p>
                    <p>• HTTPS-only connections</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

             {/* Delete Confirmation Dialog */}
       {showDeleteConfirm && (
         <div 
           className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           role="dialog"
           aria-modal="true"
           aria-labelledby="delete-confirm-title"
           aria-describedby="delete-confirm-description"
         >
           <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
             <h3 id="delete-confirm-title" className="text-lg font-semibold mb-4 text-destructive">⚠️ Confirm Complete Data Deletion</h3>
             <div id="delete-confirm-description" className="text-sm text-muted-foreground mb-6 space-y-3">
               <p className="font-medium">This action will:</p>
               <div className="space-y-2">
                 <p>• <span className="text-green-600 font-medium">Automatically download a complete backup</span> of all your data (collections, dots, snapshots, preferences)</p>
                 <p>• <span className="text-green-600 font-medium">Download a collections-compatible JSON file</span> for easy re-import</p>
                 <p>• <span className="text-red-600 font-medium">Permanently delete ALL your data</span> from our servers</p>
                 <p>• <span className="text-red-600 font-medium">Delete your user account</span> completely</p>
                 <p>• <span className="text-red-600 font-medium">Log you out</span> and redirect to home page</p>
               </div>
               <p className="text-red-600 font-semibold mt-3">⚠️ This action is NOT RECOVERABLE and will permanently remove all your data!</p>
             </div>
             <div className="flex justify-end gap-2">
               <Button 
                 variant="outline" 
                 onClick={() => setShowDeleteConfirm(false)}
                 aria-label="Cancel deletion"
               >
                 Cancel
               </Button>
               <Button 
                 variant="destructive" 
                 onClick={handleDeleteData} 
                 disabled={isDeleting}
                 aria-label={isDeleting ? 'Deleting data...' : 'Delete all user data'}
                 aria-busy={isDeleting}
               >
                 {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                 {isDeleting ? 'Deleting...' : 'Delete Data'}
               </Button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}
