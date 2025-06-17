export interface ElectronAPI {
  loadData: () => Promise<any>
  saveData: (data: any) => Promise<void>
  clearData: () => Promise<void>
  copyImageToClipboard: (svgString: string) => Promise<void>
  copyTextToClipboard: (text: string) => Promise<void>
  saveImageFile: (svgString: string, filename: string) => Promise<void>
  saveTextFile: (content: string, filename: string) => Promise<void>
  openFile: () => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
