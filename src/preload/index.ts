import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type PreloadApi, type WindowName } from '@shared/ipc'

const api: PreloadApi = {
  app: {
    quit: () => ipcRenderer.send(IPC.APP_QUIT)
  },
  window: {
    show: (name: WindowName) => ipcRenderer.send(IPC.WINDOW_SHOW, name),
    hide: (name: WindowName) => ipcRenderer.send(IPC.WINDOW_HIDE, name)
  }
}

contextBridge.exposeInMainWorld('api', api)
