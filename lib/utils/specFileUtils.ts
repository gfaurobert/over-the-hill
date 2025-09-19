import { promises as fs } from 'fs';
import * as path from 'path';

export interface SpecFiles {
  requirements: string;
  design: string;
  tasks: string;
}

export interface SpecMetadata {
  name: string;
  path: string;
  status: 'completed' | 'in-progress' | 'not-started';
  lastModified: Date;
  hasRequirements: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
}

/**
 * Reads all spec files (requirements.md, design.md, tasks.md) for a given spec
 */
export async function readSpecFiles(specName: string): Promise<SpecFiles> {
  const specDir = path.join('.kiro/specs', specName);
  
  try {
    const [requirements, design, tasks] = await Promise.all([
      fs.readFile(path.join(specDir, 'requirements.md'), 'utf-8'),
      fs.readFile(path.join(specDir, 'design.md'), 'utf-8'),
      fs.readFile(path.join(specDir, 'tasks.md'), 'utf-8')
    ]);

    return { requirements, design, tasks };
  } catch (error) {
    throw new Error(`Failed to read spec files for ${specName}: ${error}`);
  }
}

/**
 * Scans the .kiro/specs directory for available specs
 */
export async function scanSpecs(): Promise<string[]> {
  const specsDir = '.kiro/specs';
  
  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && entry.name !== 'Done')
      .map(entry => entry.name);
  } catch (error) {
    throw new Error(`Failed to scan specs directory: ${error}`);
  }
}

/**
 * Gets metadata for a specific spec
 */
export async function getSpecMetadata(specName: string): Promise<SpecMetadata> {
  const specDir = path.join('.kiro/specs', specName);
  
  try {
    const [reqExists, designExists, tasksExists] = await Promise.all([
      fileExists(path.join(specDir, 'requirements.md')),
      fileExists(path.join(specDir, 'design.md')),
      fileExists(path.join(specDir, 'tasks.md'))
    ]);

    // Get last modified time from the most recently modified file
    const files = [];
    if (reqExists) files.push(path.join(specDir, 'requirements.md'));
    if (designExists) files.push(path.join(specDir, 'design.md'));
    if (tasksExists) files.push(path.join(specDir, 'tasks.md'));

    let lastModified = new Date(0);
    for (const file of files) {
      const stats = await fs.stat(file);
      if (stats.mtime > lastModified) {
        lastModified = stats.mtime;
      }
    }

    // Determine status based on file existence and task completion
    let status: 'completed' | 'in-progress' | 'not-started' = 'not-started';
    if (reqExists && designExists && tasksExists) {
      // Check if tasks are completed by looking for completed checkboxes
      const tasksContent = await fs.readFile(path.join(specDir, 'tasks.md'), 'utf-8');
      const hasCompletedTasks = tasksContent.includes('- [x]');
      const hasIncompleteTasks = tasksContent.includes('- [ ]');
      
      if (hasCompletedTasks && !hasIncompleteTasks) {
        status = 'completed';
      } else if (hasCompletedTasks || hasIncompleteTasks) {
        status = 'in-progress';
      }
    } else if (reqExists || designExists || tasksExists) {
      status = 'in-progress';
    }

    return {
      name: specName,
      path: specDir,
      status,
      lastModified,
      hasRequirements: reqExists,
      hasDesign: designExists,
      hasTasks: tasksExists
    };
  } catch (error) {
    throw new Error(`Failed to get metadata for spec ${specName}: ${error}`);
  }
}

/**
 * Checks if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

/**
 * Safely writes content to a file, ensuring the directory exists
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);
  await fs.writeFile(filePath, content, 'utf-8');
}