/**
 * Screenshot Manager for automated QA system
 * Handles screenshot capture, asset management, and optimization
 */

import { QA_CONFIG } from '../config/qaConfig';
import path from 'path';
import fs from 'fs/promises';
import { MCPPlaywrightIntegration } from './mcpPlaywrightIntegration';

export interface ScreenshotOptions {
  fullPage?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'png' | 'jpeg';
}

export interface ScreenshotMetadata {
  filename: string;
  path: string;
  stepId: string;
  specName: string;
  timestamp: Date;
  fileSize: number;
  dimensions?: { width: number; height: number };
}

export interface AssetDirectoryStructure {
  specName: string;
  assetDir: string;
  screenshotDir: string;
  errorDir: string;
  metadataFile: string;
}

export class ScreenshotManager {
  private mcpService: MCPPlaywrightIntegration;
  private defaultOptions: ScreenshotOptions;

  constructor(mcpService: MCPPlaywrightIntegration, options?: Partial<ScreenshotOptions>) {
    this.mcpService = mcpService;
    this.defaultOptions = {
      fullPage: false,
      quality: QA_CONFIG.SCREENSHOT_QUALITY,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'png',
      ...options
    };
  }

  /**
   * Create asset directory structure for a spec
   */
  async createAssetDirectoryStructure(specName: string): Promise<AssetDirectoryStructure> {
    const assetDir = path.join(QA_CONFIG.QA_ASSETS_DIR, QA_CONFIG.NAMING_PATTERNS.assetDir(specName));
    const screenshotDir = path.join(assetDir, 'screenshots');
    const errorDir = path.join(assetDir, 'errors');
    const metadataFile = path.join(assetDir, 'metadata.json');

    // Create directories
    await fs.mkdir(assetDir, { recursive: true });
    await fs.mkdir(screenshotDir, { recursive: true });
    await fs.mkdir(errorDir, { recursive: true });

    // Create initial metadata file if it doesn't exist
    try {
      await fs.access(metadataFile);
    } catch {
      const initialMetadata = {
        specName,
        createdAt: new Date().toISOString(),
        screenshots: [],
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(metadataFile, JSON.stringify(initialMetadata, null, 2));
    }

    return {
      specName,
      assetDir,
      screenshotDir,
      errorDir,
      metadataFile
    };
  }

  /**
   * Capture screenshot with step identification and optimization
   */
  async captureScreenshot(
    stepId: string, 
    specName: string, 
    options?: Partial<ScreenshotOptions>
  ): Promise<ScreenshotMetadata> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Create asset structure if it doesn't exist
    const assetStructure = await this.createAssetDirectoryStructure(specName);
    
    // Generate screenshot filename with step identification
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = this.generateScreenshotFilename(specName, stepId, timestamp);
    const screenshotPath = path.join(assetStructure.screenshotDir, filename);

    try {
      // Capture screenshot using MCP
      await this.mcpService.takeScreenshot(screenshotPath);

      // Get file stats for optimization
      const stats = await fs.stat(screenshotPath);
      
      // Optimize screenshot if needed
      await this.optimizeScreenshot(screenshotPath, mergedOptions);

      // Update file stats after optimization
      const optimizedStats = await fs.stat(screenshotPath);

      const metadata: ScreenshotMetadata = {
        filename,
        path: screenshotPath,
        stepId,
        specName,
        timestamp: new Date(),
        fileSize: optimizedStats.size
      };

      // Update metadata file
      await this.updateScreenshotMetadata(assetStructure.metadataFile, metadata);

      return metadata;

    } catch (error) {
      throw new Error(`Failed to capture screenshot for step ${stepId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Capture error screenshot with special naming
   */
  async captureErrorScreenshot(
    stepId: string, 
    specName: string, 
    errorMessage: string
  ): Promise<ScreenshotMetadata> {
    const assetStructure = await this.createAssetDirectoryStructure(specName);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = this.generateErrorScreenshotFilename(specName, stepId, timestamp);
    const screenshotPath = path.join(assetStructure.errorDir, filename);

    try {
      await this.mcpService.takeScreenshot(screenshotPath);

      const stats = await fs.stat(screenshotPath);

      const metadata: ScreenshotMetadata = {
        filename,
        path: screenshotPath,
        stepId: `${stepId}-error`,
        specName,
        timestamp: new Date(),
        fileSize: stats.size
      };

      // Also save error details
      const errorDetailsFile = path.join(assetStructure.errorDir, `${stepId}-error-details.json`);
      await fs.writeFile(errorDetailsFile, JSON.stringify({
        stepId,
        errorMessage,
        timestamp: new Date().toISOString(),
        screenshotPath
      }, null, 2));

      await this.updateScreenshotMetadata(assetStructure.metadataFile, metadata);

      return metadata;

    } catch (error) {
      throw new Error(`Failed to capture error screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate screenshot filename with step identification
   */
  private generateScreenshotFilename(specName: string, stepId: string, timestamp: string): string {
    // Clean stepId for filename safety
    const cleanStepId = stepId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const cleanSpecName = specName.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    return `${cleanSpecName}-step-${cleanStepId}-${timestamp}.png`;
  }

  /**
   * Generate error screenshot filename
   */
  private generateErrorScreenshotFilename(specName: string, stepId: string, timestamp: string): string {
    const cleanStepId = stepId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const cleanSpecName = specName.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    return `${cleanSpecName}-error-${cleanStepId}-${timestamp}.png`;
  }

  /**
   * Optimize screenshot file size and dimensions
   */
  private async optimizeScreenshot(screenshotPath: string, options: ScreenshotOptions): Promise<void> {
    try {
      // For now, we'll implement basic file size checking
      // In a full implementation, we could use image processing libraries like sharp
      const stats = await fs.stat(screenshotPath);
      const maxFileSize = 5 * 1024 * 1024; // 5MB limit

      if (stats.size > maxFileSize) {
        console.warn(`Screenshot ${screenshotPath} is ${Math.round(stats.size / 1024 / 1024)}MB, exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
        
        // In a real implementation, we would:
        // 1. Resize the image if dimensions are too large
        // 2. Compress the image quality
        // 3. Convert to more efficient format if needed
        
        // For now, just log the warning
        console.log('Image optimization would be applied here in full implementation');
      }
    } catch (error) {
      console.warn(`Failed to optimize screenshot ${screenshotPath}:`, error);
    }
  }

  /**
   * Update screenshot metadata file
   */
  private async updateScreenshotMetadata(metadataFile: string, screenshot: ScreenshotMetadata): Promise<void> {
    try {
      const metadataContent = await fs.readFile(metadataFile, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      metadata.screenshots = metadata.screenshots || [];
      metadata.screenshots.push({
        filename: screenshot.filename,
        stepId: screenshot.stepId,
        timestamp: screenshot.timestamp.toISOString(),
        fileSize: screenshot.fileSize,
        path: screenshot.path
      });

      metadata.lastUpdated = new Date().toISOString();
      metadata.totalScreenshots = metadata.screenshots.length;
      metadata.totalFileSize = metadata.screenshots.reduce((sum: number, s: any) => sum + s.fileSize, 0);

      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn(`Failed to update screenshot metadata:`, error);
    }
  }

  /**
   * Clean up old screenshots to manage disk space
   */
  async cleanupOldScreenshots(specName: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const assetStructure = await this.createAssetDirectoryStructure(specName);
      const cutoffDate = new Date(Date.now() - maxAge);

      // Clean screenshots directory
      await this.cleanupDirectory(assetStructure.screenshotDir, cutoffDate);
      
      // Clean errors directory
      await this.cleanupDirectory(assetStructure.errorDir, cutoffDate);

      console.log(`Cleaned up old screenshots for ${specName} older than ${new Date(cutoffDate).toISOString()}`);
    } catch (error) {
      console.warn(`Failed to cleanup old screenshots for ${specName}:`, error);
    }
  }

  /**
   * Clean up files in a directory older than cutoff date
   */
  private async cleanupDirectory(dirPath: string, cutoffDate: Date): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Deleted old file: ${filePath}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup directory ${dirPath}:`, error);
    }
  }

  /**
   * Get asset directory info for a spec
   */
  async getAssetDirectoryInfo(specName: string): Promise<{
    exists: boolean;
    screenshotCount: number;
    totalSize: number;
    lastUpdated?: Date;
  }> {
    try {
      const assetStructure = await this.createAssetDirectoryStructure(specName);
      
      const metadataContent = await fs.readFile(assetStructure.metadataFile, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      return {
        exists: true,
        screenshotCount: metadata.screenshots?.length || 0,
        totalSize: metadata.totalFileSize || 0,
        lastUpdated: metadata.lastUpdated ? new Date(metadata.lastUpdated) : undefined
      };
    } catch (error) {
      return {
        exists: false,
        screenshotCount: 0,
        totalSize: 0
      };
    }
  }

  /**
   * List all screenshots for a spec
   */
  async listScreenshots(specName: string): Promise<ScreenshotMetadata[]> {
    try {
      const assetStructure = await this.createAssetDirectoryStructure(specName);
      const metadataContent = await fs.readFile(assetStructure.metadataFile, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      return (metadata.screenshots || []).map((s: any) => ({
        filename: s.filename,
        path: s.path,
        stepId: s.stepId,
        specName,
        timestamp: new Date(s.timestamp),
        fileSize: s.fileSize
      }));
    } catch (error) {
      console.warn(`Failed to list screenshots for ${specName}:`, error);
      return [];
    }
  }
}