const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("converterApi", {
  pickFiles: () => ipcRenderer.invoke("pick-files"),
  pickVideoFile: () => ipcRenderer.invoke("pick-video-file"),
  pickOutputFolder: () => ipcRenderer.invoke("pick-output-folder"),
  convertFiles: (payload) => ipcRenderer.invoke("convert-files", payload),
  convertVideo: (payload) => ipcRenderer.invoke("convert-video", payload)
});
