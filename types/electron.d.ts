export interface ElectronAPI {
  loadData: () => Promise<any>
  saveData: (data: any) => Promise<void>
  clearData: () => Promise<void>
  copyImageToClipboard: (svgString: string) => Promise<void>
  copyPngToClipboard: (pngBase64: string) => Promise<void>
  copyTextToClipboard: (text: string) => Promise<void>
  saveImageFile: (svgString: string, filename: string) => Promise<void>
  savePngFile: (pngBase64: string, filename: string) => Promise<void>
  saveTextFile: (content: string, filename: string) => Promise<void>
  openFile: () => Promise<any>
  getStorageLocation: () => Promise<string>
  setStorageLocation: (location: string) => Promise<{ success: boolean }>
  selectStorageLocation: () => Promise<string | null>
  getPlatform: () => Promise<string>
  installApp: () => Promise<{ success: boolean; message: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
