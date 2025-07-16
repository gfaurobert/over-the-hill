const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, Menu, shell } = require("electron")
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
let updateAvailable = false
let latestVersion = null

// Check for updates from GitHub
async function checkForUpdates() {
  try {
    const https = require('https')
    const packageJson = require('../package.json')
    const currentVersion = packageJson.version
    
    // GitHub API to get latest release
    const options = {
      hostname: 'api.github.com',
      path: '/repos/gfaurobert/over-the-hill/releases/latest',
      headers: {
        'User-Agent': 'Over-The-Hill-App'
      }
    }
    
    return new Promise((resolve) => {
      https.get(options, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const release = JSON.parse(data)
            const releaseVersion = release.tag_name.replace('v', '')
            
            // Simple version comparison (you might want to use a library like semver for more robust comparison)
            if (releaseVersion !== currentVersion) {
              updateAvailable = true
              latestVersion = releaseVersion
              // Recreate menu to show update notification
              createMenu()
            }
          } catch (error) {
            console.error('Failed to parse update response:', error)
          }
          resolve()
        })
      }).on('error', (error) => {
        console.error('Failed to check for updates:', error)
        resolve()
      })
    })
  } catch (error) {
    console.error('Failed to check for updates:', error)
  }
}

function createMenu() {
  // Read version from package.json
  const packageJson = require('../package.json')
  const appVersion = packageJson.version || '0.0.0'
  
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Over The Hill',
          click: async () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Over The Hill',
              message: 'Over The Hill',
              detail: `A hill chart generator inspired by 37signals Hill Chart.\n\nVersion: ${appVersion}`,
              buttons: ['OK']
            })
          }
        },
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/gfaurobert/over-the-hill')
          }
        },
        {
          label: 'View Documentation',
          click: async () => {
            await shell.openExternal('https://your-docs-url.com')
          }
        },
        { type: 'separator' },
        // Conditionally add update notification
        ...(updateAvailable ? [
          {
            label: `Update Available (v${latestVersion})`,
            click: async () => {
              await shell.openExternal('https://github.com/gfaurobert/over-the-hill/releases/latest')
            }
          },
          { type: 'separator' }
        ] : []),
        {
          label: 'Check for Updates',
          click: async () => {
            await checkForUpdates()
            if (!updateAvailable) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'No Updates Available',
                message: 'You are running the latest version',
                detail: `Current version: ${appVersion}`,
                buttons: ['OK']
              })
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/gfaurobert/over-the-hill/issues')
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        }
      ]
    }
  ]

  // On macOS, add app menu
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

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
  
  // Create the menu after window is created
  createMenu()
  
  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    checkForUpdates()
  }, 3000)
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
    // For PNG clipboard operations, we need to receive a PNG blob from the renderer
    // The renderer should handle the SVG to PNG conversion using Canvas API
    // This handler should receive base64 PNG data, not SVG
    console.error("copy-image-to-clipboard: This handler expects PNG data, not SVG")
    throw new Error("Invalid data format: Expected PNG data")
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error)
    throw error
  }
})

// New handler specifically for PNG clipboard operations
ipcMain.handle("copy-png-to-clipboard", async (event, pngBase64) => {
  try {
    // Create image from PNG base64 data
    const dataUrl = `data:image/png;base64,${pngBase64}`
    const image = nativeImage.createFromDataURL(dataUrl)
    clipboard.writeImage(image)
  } catch (error) {
    console.error("Failed to copy PNG to clipboard:", error)
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
        // For PNG, we need the renderer to convert SVG to PNG first
        console.error("save-image-file: Direct SVG to PNG conversion not supported. Use save-png-file instead.")
        throw new Error("Direct SVG to PNG conversion not supported")
      }
    }
  } catch (error) {
    console.error("Failed to save image file:", error)
    throw error
  }
})

// New handler specifically for saving PNG files
ipcMain.handle("save-png-file", async (event, pngBase64, filename) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: "PNG Images", extensions: ["png"] }
      ],
    })

    if (filePath) {
      // Convert base64 to buffer and save
      const buffer = Buffer.from(pngBase64, 'base64')
      await fs.writeFile(filePath, buffer)
    }
  } catch (error) {
    console.error("Failed to save PNG file:", error)
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
