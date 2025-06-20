const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage } = require("electron")
const path = require("path")
const fs = require("fs").promises
const os = require("os")

// Add command line switches for better Linux compatibility
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-dev-shm-usage')

// Fix GTK errors on Linux while maintaining rendering capability
if (process.platform === 'linux') {
  // Essential fixes for Linux
  app.commandLine.appendSwitch('disable-setuid-sandbox')
  app.commandLine.appendSwitch('disable-seccomp-filter-sandbox')
}

// Enable live reload for development
if (process.env.NODE_ENV === "development") {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "..", "node_modules", ".bin", "electron"),
    hardResetMethod: "exit",
  })
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "assets", "icon.png"), // Add your app icon
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  })

  // Load the app
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000")
    mainWindow.webContents.openDevTools()
  } else {
    // Handle both ASAR and non-ASAR paths
    let indexPath
    if (process.resourcesPath) {
      // In packaged app, try unpacked first
      indexPath = path.join(process.resourcesPath, "app.asar.unpacked", "out", "index.html")
      if (!require('fs').existsSync(indexPath)) {
        // Fallback to regular path
        indexPath = path.join(__dirname, "../out/index.html")
      }
    } else {
      indexPath = path.join(__dirname, "../out/index.html")
    }
    
    mainWindow.loadFile(indexPath)
  }
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Get default storage location based on platform
const getDefaultStorageLocation = () => {
  const platform = process.platform
  const homeDir = os.homedir()
  
  switch (platform) {
    case 'linux':
      return path.join(homeDir, '.config', 'over-the-hill')
    case 'darwin':
      return path.join(homeDir, '.over-the-hill')
    case 'win32':
      return path.join(homeDir, 'Documents', 'Over-The-Hill')
    default:
      return path.join(app.getPath("userData"), "over-the-hill")
  }
}

// Get storage location from settings or use default
const getStorageLocation = () => {
  try {
    const settingsPath = path.join(app.getPath("userData"), "settings.json")
    const settings = require('fs').readFileSync(settingsPath, 'utf8')
    const parsed = JSON.parse(settings)
    return parsed.storageLocation || getDefaultStorageLocation()
  } catch (error) {
    return getDefaultStorageLocation()
  }
}

// Save storage location to settings
const saveStorageLocation = (location) => {
  try {
    const settingsPath = path.join(app.getPath("userData"), "settings.json")
    let settings = {}
    try {
      settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'))
    } catch (error) {
      // Settings file doesn't exist, start with empty object
    }
    settings.storageLocation = location
    require('fs').writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error("Failed to save storage location:", error)
    throw error
  }
}

// Ensure storage directory exists
const ensureStorageDirectory = async () => {
  const storageDir = getStorageLocation()
  try {
    await fs.mkdir(storageDir, { recursive: true })
  } catch (error) {
    console.error("Failed to create storage directory:", error)
    throw error
  }
  return storageDir
}

// Get user data directory
const getUserDataPath = () => {
  const storageDir = getStorageLocation()
  return path.join(storageDir, "hill-chart-data.json")
}

// IPC Handlers
ipcMain.handle("get-storage-location", async () => {
  return getStorageLocation()
})

ipcMain.handle("set-storage-location", async (event, newLocation) => {
  try {
    // Validate the new location
    if (!newLocation || typeof newLocation !== 'string') {
      throw new Error('Invalid storage location')
    }
    
    // Test if we can write to the new location
    await fs.mkdir(newLocation, { recursive: true })
    const testFile = path.join(newLocation, '.test')
    await fs.writeFile(testFile, 'test')
    await fs.unlink(testFile)
    
    // Save the new location
    saveStorageLocation(newLocation)
    
    // Move existing data if it exists
    const oldDataPath = path.join(app.getPath("userData"), "hill-chart-data.json")
    const newDataPath = path.join(newLocation, "hill-chart-data.json")
    
    try {
      const oldData = await fs.readFile(oldDataPath, "utf8")
      await fs.writeFile(newDataPath, oldData)
      await fs.unlink(oldDataPath)
    } catch (error) {
      // Old data doesn't exist or can't be moved, which is fine
    }
    
    return { success: true }
  } catch (error) {
    console.error("Failed to set storage location:", error)
    throw error
  }
})

ipcMain.handle("select-storage-location", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Storage Location",
      properties: ["openDirectory"],
      defaultPath: getStorageLocation()
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      const newLocation = result.filePaths[0]
      
      // Validate the new location
      if (!newLocation || typeof newLocation !== 'string') {
        throw new Error('Invalid storage location')
      }
      
      // Test if we can write to the new location
      await fs.mkdir(newLocation, { recursive: true })
      const testFile = path.join(newLocation, '.test')
      await fs.writeFile(testFile, 'test')
      await fs.unlink(testFile)
      
      // Save the new location
      saveStorageLocation(newLocation)
      
      // Move existing data if it exists
      const oldDataPath = path.join(app.getPath("userData"), "hill-chart-data.json")
      const newDataPath = path.join(newLocation, "hill-chart-data.json")
      
      try {
        const oldData = await fs.readFile(oldDataPath, "utf8")
        await fs.writeFile(newDataPath, oldData)
        await fs.unlink(oldDataPath)
      } catch (error) {
        // Old data doesn't exist or can't be moved, which is fine
      }
      
      return newLocation
    }
    return null
  } catch (error) {
    console.error("Failed to select storage location:", error)
    throw error
  }
})

ipcMain.handle("load-data", async () => {
  try {
    await ensureStorageDirectory()
    const dataPath = getUserDataPath()
    const data = await fs.readFile(dataPath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    // Return empty data if file doesn't exist
    return {
      collections: null,
      snapshots: null,
      selectedCollection: null,
      collectionInput: null,
      hideCollectionName: null,
      copyFormat: null,
    }
  }
})

ipcMain.handle("save-data", async (event, data) => {
  try {
    await ensureStorageDirectory()
    const dataPath = getUserDataPath()
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error("Failed to save data:", error)
    throw error
  }
})

ipcMain.handle("clear-data", async () => {
  try {
    const dataPath = getUserDataPath()
    await fs.unlink(dataPath)
  } catch (error) {
    // File might not exist, which is fine
    console.log("No data file to clear")
  }
})

ipcMain.handle("copy-image-to-clipboard", async (event, svgString) => {
  try {
    // Create image from SVG data URL
    const dataUrl = "data:image/svg+xml;base64," + Buffer.from(svgString).toString("base64")
    const image = nativeImage.createFromDataURL(dataUrl)
    clipboard.writeImage(image)
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error)
    throw error
  }
})

ipcMain.handle("copy-text-to-clipboard", async (event, text) => {
  clipboard.writeText(text)
})

ipcMain.handle("save-image-file", async (event, svgString, filename) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: "PNG Images", extensions: ["png"] },
        { name: "SVG Images", extensions: ["svg"] }
      ],
    })

    if (filePath) {
      if (filePath.endsWith('.svg')) {
        // Save as SVG
        await fs.writeFile(filePath, svgString)
      } else {
        // Convert SVG to PNG using nativeImage
        const dataUrl = "data:image/svg+xml;base64," + Buffer.from(svgString).toString("base64")
        const image = nativeImage.createFromDataURL(dataUrl)
        const buffer = image.toPNG()
        await fs.writeFile(filePath, buffer)
      }
    }
  } catch (error) {
    console.error("Failed to save image file:", error)
    throw error
  }
})

ipcMain.handle("save-text-file", async (event, content, filename) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: "SVG Images", extensions: ["svg"] },
        { name: "JSON Files", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] },
      ],
    })

    if (filePath) {
      await fs.writeFile(filePath, content)
    }
  } catch (error) {
    console.error("Failed to save text file:", error)
    throw error
  }
})

ipcMain.handle("open-file", async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: "JSON Files", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
    })

    if (filePaths.length > 0) {
      const content = await fs.readFile(filePaths[0], "utf8")
      return JSON.parse(content)
    }
    return null
  } catch (error) {
    console.error("Failed to open file:", error)
    throw error
  }
})

ipcMain.handle("get-platform", async () => {
  return process.platform
})

ipcMain.handle("install-app", async () => {
  try {
    const homeDir = os.homedir()
    const localBinDir = path.join(homeDir, '.local', 'bin')
    const appDir = path.join(localBinDir, 'over-the-hill')
    const localAppsDir = path.join(homeDir, '.local', 'share', 'applications')
    
    // Ensure directories exist
    await fs.mkdir(appDir, { recursive: true })
    await fs.mkdir(localAppsDir, { recursive: true })
    
    // Find the actual AppImage file that's running
    let currentAppImagePath = process.execPath
    
    // If we're running from an AppImage, process.execPath points to the extracted binary
    // We need to find the original AppImage file
    if (process.env.APPIMAGE) {
      // APPIMAGE environment variable contains the path to the original AppImage
      currentAppImagePath = process.env.APPIMAGE
    } else {
      // Fallback: try to find the AppImage by looking at the process path
      // When running from AppImage, the binary is usually in a temp directory
      const execDir = path.dirname(process.execPath)
      if (execDir.includes('appimage') || execDir.includes('temp')) {
        // We're likely running from an extracted AppImage
        // Try to find the original AppImage in common locations
        const possiblePaths = [
          process.env.ARGV0, // Sometimes contains the original path
          process.argv[0],   // Original command line argument
        ]
        
        for (const possiblePath of possiblePaths) {
          if (possiblePath && possiblePath.endsWith('.AppImage')) {
            currentAppImagePath = possiblePath
            break
          }
        }
      }
    }
    
    const targetAppImagePath = path.join(appDir, 'Over-The-Hill-1.0.0.AppImage')
    
    // Copy the AppImage
    await fs.copyFile(currentAppImagePath, targetAppImagePath)
    await fs.chmod(targetAppImagePath, 0o755)
    
    // Copy the SVG icon
    const iconSourcePath = path.join(__dirname, '..', 'OverTheHill.svg')
    const iconTargetPath = path.join(appDir, 'OverTheHill.svg')
    
    // Check if SVG icon exists, if not fallback to PNG
    let iconSourcePathFinal = iconSourcePath
    try {
      await fs.access(iconSourcePath)
    } catch (error) {
      // SVG doesn't exist, use PNG
      iconSourcePathFinal = path.join(__dirname, 'assets', 'icon.png')
    }
    
    await fs.copyFile(iconSourcePathFinal, iconTargetPath)
    
    // Create .desktop file
    const desktopContent = `[Desktop Entry]
Name=Over The Hill
Comment=Hill Chart Generator
Exec=${targetAppImagePath} --no-sandbox
Icon=${iconTargetPath}
Terminal=false
Type=Application
Categories=Utility;Graphics;
`
    
    const desktopPath = path.join(localAppsDir, 'over-the-hill.desktop')
    await fs.writeFile(desktopPath, desktopContent)
    
    // Make .desktop file executable
    await fs.chmod(desktopPath, 0o644)
    
    return { success: true, message: 'App installed successfully!' }
  } catch (error) {
    console.error("Failed to install app:", error)
    throw error
  }
})
