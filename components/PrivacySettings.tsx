"use client"

import React, { useState } from "react"
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
  Download
} from "lucide-react"
import { privacyService } from "@/lib/services/privacyService"
import { useAuth } from "./AuthProvider"

interface PrivacySettingsProps {
  onClose: () => void
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ onClose }) => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [encryptionStatus, setEncryptionStatus] = useState<"testing" | "working" | "failed" | null>(null)
  const [privacyFeatures, setPrivacyFeatures] = useState({
    dataEncryption: true,
    searchPrivacy: true,
    metadataMinimization: true,
    automaticCleanup: false
  })

  const testEncryption = async () => {
    if (!user) return
    
    setIsLoading(true)
    setEncryptionStatus("testing")
    
    try {
      const isWorking = await privacyService.testEncryption(user.id)
      setEncryptionStatus(isWorking ? "working" : "failed")
    } catch (error) {
      console.error("Encryption test failed:", error)
      setEncryptionStatus("failed")
    } finally {
      setIsLoading(false)
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
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export All Data
                </Button>
                <Button variant="outline" className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Delete All Data
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
    </div>
  )
}
