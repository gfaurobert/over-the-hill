const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  loadData: () => ipcRenderer.invoke("load-data"),
  saveData: (data) => ipcRenderer.invoke("save-data", data),
  clearData: () => ipcRenderer.invoke("clear-data"),
  copyImageToClipboard: (svgString) => ipcRenderer.invoke("copy-image-to-clipboard", svgString),
  copyTextToClipboard: (text) => ipcRenderer.invoke("copy-text-to-clipboard", text),
  saveImageFile: (svgString, filename) => ipcRenderer.invoke("save-image-file", svgString, filename),
  saveTextFile: (content, filename) => ipcRenderer.invoke("save-text-file", content, filename),
  openFile: () => ipcRenderer.invoke("open-file"),
})
