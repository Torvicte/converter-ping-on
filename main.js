const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { convertFiles, convertVideo } = require("./converter");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 900,
    minHeight: 700,
    title: "Converter Ping On",
    backgroundColor: "#f3efe7",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("pick-files", async () => {
    const result = await dialog.showOpenDialog({
      title: "Selecciona los archivos que quieres convertir",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Imagenes",
          extensions: [
            "heic",
            "heif",
            "jpg",
            "jpeg",
            "png",
            "webp",
            "bmp",
            "tif",
            "tiff",
            "gif",
            "avif"
          ]
        },
        { name: "Todos los archivos", extensions: ["*"] }
      ]
    });

    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle("pick-video-file", async () => {
    const result = await dialog.showOpenDialog({
      title: "Selecciona el video que quieres convertir",
      properties: ["openFile"],
      filters: [
        {
          name: "Videos",
          extensions: ["mp4", "mov", "avi", "mkv", "webm", "m4v"]
        },
        { name: "Todos los archivos", extensions: ["*"] }
      ]
    });

    return result.canceled ? "" : result.filePaths[0];
  });

  ipcMain.handle("pick-output-folder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Elige la carpeta de salida",
      properties: ["openDirectory", "createDirectory"]
    });

    return result.canceled ? "" : result.filePaths[0];
  });

  ipcMain.handle("convert-files", async (_event, payload) => convertFiles(payload));
  ipcMain.handle("convert-video", async (_event, payload) => convertVideo(payload));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
