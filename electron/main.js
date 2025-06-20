const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage } = require("electron")
const path = require("path")
const fs = require("fs").promises

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

// Get user data directory
const getUserDataPath = () => {
  return path.join(app.getPath("userData"), "hill-chart-data.json")
}

// IPC Handlers
ipcMain.handle("load-data", async () => {
  try {
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
