"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSpecFiles = readSpecFiles;
exports.scanSpecs = scanSpecs;
exports.getSpecMetadata = getSpecMetadata;
exports.ensureDirectory = ensureDirectory;
exports.safeWriteFile = safeWriteFile;
const fs_1 = require("fs");
const path = __importStar(require("path"));
/**
 * Reads all spec files (requirements.md, design.md, tasks.md) for a given spec
 */
async function readSpecFiles(specName) {
    const specDir = path.join('.kiro/specs', specName);
    try {
        const [requirements, design, tasks] = await Promise.all([
            fs_1.promises.readFile(path.join(specDir, 'requirements.md'), 'utf-8'),
            fs_1.promises.readFile(path.join(specDir, 'design.md'), 'utf-8'),
            fs_1.promises.readFile(path.join(specDir, 'tasks.md'), 'utf-8')
        ]);
        return { requirements, design, tasks };
    }
    catch (error) {
        throw new Error(`Failed to read spec files for ${specName}: ${error}`);
    }
}
/**
 * Scans the .kiro/specs directory for available specs
 */
async function scanSpecs() {
    const specsDir = '.kiro/specs';
    try {
        const entries = await fs_1.promises.readdir(specsDir, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory() && entry.name !== 'Done')
            .map(entry => entry.name);
    }
    catch (error) {
        throw new Error(`Failed to scan specs directory: ${error}`);
    }
}
/**
 * Gets metadata for a specific spec
 */
async function getSpecMetadata(specName) {
    const specDir = path.join('.kiro/specs', specName);
    try {
        const [reqExists, designExists, tasksExists] = await Promise.all([
            fileExists(path.join(specDir, 'requirements.md')),
            fileExists(path.join(specDir, 'design.md')),
            fileExists(path.join(specDir, 'tasks.md'))
        ]);
        // Get last modified time from the most recently modified file
        const files = [];
        if (reqExists)
            files.push(path.join(specDir, 'requirements.md'));
        if (designExists)
            files.push(path.join(specDir, 'design.md'));
        if (tasksExists)
            files.push(path.join(specDir, 'tasks.md'));
        let lastModified = new Date(0);
        for (const file of files) {
            const stats = await fs_1.promises.stat(file);
            if (stats.mtime > lastModified) {
                lastModified = stats.mtime;
            }
        }
        // Determine status based on file existence and task completion
        let status = 'not-started';
        if (reqExists && designExists && tasksExists) {
            // Check if tasks are completed by looking for completed checkboxes
            const tasksContent = await fs_1.promises.readFile(path.join(specDir, 'tasks.md'), 'utf-8');
            const hasCompletedTasks = tasksContent.includes('- [x]');
            const hasIncompleteTasks = tasksContent.includes('- [ ]');
            if (hasCompletedTasks && !hasIncompleteTasks) {
                status = 'completed';
            }
            else if (hasCompletedTasks || hasIncompleteTasks) {
                status = 'in-progress';
            }
        }
        else if (reqExists || designExists || tasksExists) {
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
    }
    catch (error) {
        throw new Error(`Failed to get metadata for spec ${specName}: ${error}`);
    }
}
/**
 * Checks if a file exists
 */
async function fileExists(filePath) {
    try {
        await fs_1.promises.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Ensures a directory exists, creating it if necessary
 */
async function ensureDirectory(dirPath) {
    try {
        await fs_1.promises.mkdir(dirPath, { recursive: true });
    }
    catch (error) {
        throw new Error(`Failed to create directory ${dirPath}: ${error}`);
    }
}
/**
 * Safely writes content to a file, ensuring the directory exists
 */
async function safeWriteFile(filePath, content) {
    const dir = path.dirname(filePath);
    await ensureDirectory(dir);
    await fs_1.promises.writeFile(filePath, content, 'utf-8');
}
