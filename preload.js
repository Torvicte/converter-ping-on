const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("converterApi", {
  pickFiles: () => ipcRenderer.invoke("pick-files"),
  pickOutputFolder: () => ipcRenderer.invoke("pick-output-folder"),
  convertFiles: (payload) => ipcRenderer.invoke("convert-files", payload)
});
