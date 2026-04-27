const THEME_KEY = "converter-ping-on-theme";
const HISTORY_KEY = "converter-ping-on-history";

const IMAGE_EXTENSIONS = new Set(["heic", "heif", "jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff", "gif", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v"]);

const imgState = {
  files: [],
  outputDir: ""
};

const vidState = {
  file: "",
  outputDir: ""
};

const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || systemTheme);
}

function hideSplash() {
  setTimeout(() => {
    document.getElementById("splash").classList.add("hide");
    document.getElementById("app").classList.add("ready");
  }, 2000);
}

function initTabs() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(`tab-${tab}`).classList.add("active");
    });
  });
}

function initChipGroup(groupId, callback) {
  const group = document.getElementById(groupId);
  if (!group) {
    return;
  }

  group.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      group.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      if (callback) {
        callback(chip);
      }
    });
  });
}

function basename(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function extensionOf(filePath) {
  const name = basename(filePath);
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function setStatus(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-msg ${type}`;
}

function updateConvOverlay(done, total) {
  document.getElementById("convProgress").textContent = `${done} / ${total}`;
  document.getElementById("convBarFill").style.width = total > 0 ? `${(done / total) * 100}%` : "0%";
}

function showOverlay() {
  document.getElementById("convOverlay").classList.remove("hidden");
}

function hideOverlay() {
  document.getElementById("convOverlay").classList.add("hidden");
}

function saveHistory(entry) {
  history.unshift(entry);
  if (history.length > 50) {
    history.length = 50;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("historyList");

  if (!history.length) {
    list.innerHTML = `
      <div class="history-empty">
        <span class="history-empty-icon">&#9711;</span>
        <span class="history-empty-text">No hay conversiones aun</span>
      </div>
    `;
    return;
  }

  list.innerHTML = history
    .map((item) => {
      return `
        <div class="history-item">
          <span class="file-thumb">${getFileMark(item.ext)}</span>
          <div class="file-info">
            <span class="file-name">${item.name}</span>
            <span class="file-meta">${item.from} -> ${String(item.to).toUpperCase()}</span>
          </div>
          <span class="history-badge">${item.ok} OK</span>
          <span class="history-meta">${item.date}</span>
        </div>
      `;
    })
    .join("");
}

function getFileMark(extension) {
  const normalized = String(extension || "").toUpperCase();
  if (normalized.length >= 4) {
    return normalized.slice(0, 4);
  }
  return normalized || "FILE";
}

function getActiveChipData(groupId, key) {
  const activeChip = document.querySelector(`#${groupId} .chip.active`);
  return activeChip ? activeChip.dataset[key] : "";
}

function renderImgQueue() {
  const queue = document.getElementById("imgFileQueue");
  const counter = document.getElementById("imgFilesCount");

  counter.textContent = `${imgState.files.length} archivo${imgState.files.length === 1 ? "" : "s"}`;
  queue.innerHTML = "";

  imgState.files.forEach((filePath, index) => {
    const item = document.createElement("div");
    const ext = extensionOf(filePath).toUpperCase();
    item.className = "file-item";
    item.innerHTML = `
      <div class="file-thumb">${getFileMark(ext)}</div>
      <div class="file-info">
        <span class="file-name">${basename(filePath)}</span>
        <span class="file-meta">${ext || "SIN EXT"}</span>
      </div>
      <span class="file-status waiting" data-status="${index}">En espera</span>
      <button class="btn btn-ghost" data-remove-index="${index}">Quitar</button>
    `;
    queue.appendChild(item);
  });

  queue.querySelectorAll("[data-remove-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeIndex);
      imgState.files.splice(index, 1);
      renderImgQueue();
      updateImgConvertBtn();
    });
  });
}

function setImgFileStatus(index, statusClass, label) {
  const element = document.querySelector(`[data-status="${index}"]`);
  if (!element) {
    return;
  }

  element.className = `file-status ${statusClass}`;
  element.textContent = label;
}

function updateImgConvertBtn() {
  document.getElementById("imgConvertBtn").disabled = !(imgState.files.length > 0 && imgState.outputDir);
}

function updateVidConvertBtn() {
  document.getElementById("vidConvertBtn").disabled = !(vidState.file && vidState.outputDir);
}

function updateOutputLabel(labelId, value) {
  const label = document.getElementById(labelId);
  label.textContent = value || "Sin seleccionar";
  label.classList.toggle("no-folder", !value);
}

function normalizeImageFiles(files) {
  return files.filter((filePath) => IMAGE_EXTENSIONS.has(extensionOf(filePath)));
}

function normalizeVideoFiles(files) {
  return files.filter((filePath) => VIDEO_EXTENSIONS.has(extensionOf(filePath)));
}

async function pickImageFiles() {
  const files = await window.converterApi.pickFiles();
  return normalizeImageFiles(files);
}

async function handleAddImageFiles(files) {
  if (!files.length) {
    return;
  }

  const merged = new Set([...imgState.files, ...files]);
  imgState.files = [...merged];
  renderImgQueue();
  updateImgConvertBtn();
  setStatus("imgStatus", `${files.length} archivo(s) agregado(s).`, "info");
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  history.length = 0;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

document.getElementById("imgPickFiles").addEventListener("click", async () => {
  const files = await pickImageFiles();
  await handleAddImageFiles(files);
});

document.getElementById("imgClearFiles").addEventListener("click", () => {
  imgState.files = [];
  renderImgQueue();
  updateImgConvertBtn();
  setStatus("imgStatus", "Cola limpiada.", "info");
});

document.getElementById("imgPickFolder").addEventListener("click", async () => {
  const folder = await window.converterApi.pickOutputFolder();
  if (!folder) {
    return;
  }

  imgState.outputDir = folder;
  updateOutputLabel("imgOutputLabel", folder);
  updateImgConvertBtn();
  setStatus("imgStatus", "Carpeta de salida lista.", "info");
});

document.getElementById("imgQualityRange").addEventListener("input", (event) => {
  document.getElementById("imgQualityDisplay").textContent = event.target.value;
});

document.getElementById("imgConvertBtn").addEventListener("click", async () => {
  if (!imgState.files.length || !imgState.outputDir) {
    return;
  }

  const format = getActiveChipData("imgFormatChips", "format") || "jpeg";
  const quality = document.getElementById("imgQualityRange").value;
  const total = imgState.files.length;

  document.getElementById("imgConvertBtn").disabled = true;
  showOverlay();
  updateConvOverlay(0, total);

  imgState.files.forEach((_file, index) => {
    setImgFileStatus(index, "converting", "Convirtiendo...");
  });

  try {
    const response = await window.converterApi.convertFiles({
      files: imgState.files,
      outputDir: imgState.outputDir,
      outputFormat: format,
      quality
    });

    let ok = 0;
    response.results.forEach((result, index) => {
      if (result.success) {
        ok += 1;
        setImgFileStatus(index, "done", "OK");
      } else {
        setImgFileStatus(index, "error", "Error");
      }
      updateConvOverlay(index + 1, total);
    });

    const fail = total - ok;
    setTimeout(hideOverlay, 800);

    setStatus(
      "imgStatus",
      fail === 0 ? `OK: ${ok} archivo(s) convertidos correctamente.` : `Convertidos: ${ok}. Errores: ${fail}.`,
      fail === 0 ? "info" : "error"
    );

    saveHistory({
      name: `${ok} imagen(es)`,
      from: "mixed",
      to: format,
      ext: format,
      ok,
      date: new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
    });
  } catch (error) {
    hideOverlay();
    setStatus("imgStatus", error.message || "Error en la conversion.", "error");
    imgState.files.forEach((_file, index) => {
      setImgFileStatus(index, "waiting", "En espera");
    });
  } finally {
    document.getElementById("imgConvertBtn").disabled = false;
    updateImgConvertBtn();
  }
});

const imgDropzone = document.getElementById("imgDropzone");

imgDropzone.addEventListener("click", () => {
  document.getElementById("imgPickFiles").click();
});

imgDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  imgDropzone.classList.add("dragging");
});

imgDropzone.addEventListener("dragleave", () => {
  imgDropzone.classList.remove("dragging");
});

imgDropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  imgDropzone.classList.remove("dragging");
  const droppedFiles = normalizeImageFiles([...event.dataTransfer.files].map((file) => file.path).filter(Boolean));
  await handleAddImageFiles(droppedFiles);
});

document.getElementById("vidCrfRange").addEventListener("input", (event) => {
  document.getElementById("vidCrfDisplay").textContent = event.target.value;
});

document.getElementById("vidPickFile").addEventListener("click", async () => {
  const file = await window.converterApi.pickVideoFile();
  if (!file) {
    return;
  }

  vidState.file = file;
  updateOutputLabel("vidFileLabel", basename(file));
  updateVidConvertBtn();
  setStatus("vidStatus", "Video cargado. Configura las opciones y convierte.", "info");
});

document.getElementById("vidPickFolder").addEventListener("click", async () => {
  const folder = await window.converterApi.pickOutputFolder();
  if (!folder) {
    return;
  }

  vidState.outputDir = folder;
  updateVidConvertBtn();
  setStatus("vidStatus", "Carpeta de salida lista.", "info");
});

document.getElementById("vidConvertBtn").addEventListener("click", async () => {
  if (!vidState.file || !vidState.outputDir) {
    return;
  }

  const format = getActiveChipData("vidFormatChips", "vformat") || "mp4";
  const resolution = getActiveChipData("vidResChips", "res") || "original";
  const crf = Number(document.getElementById("vidCrfRange").value);
  const fps = getActiveChipData("vidFpsChips", "fps") || "original";

  document.getElementById("vidConvertBtn").disabled = true;
  showOverlay();
  updateConvOverlay(0, 1);
  setStatus("vidStatus", "Convirtiendo video...", "info");

  try {
    const response = await window.converterApi.convertVideo({
      file: vidState.file,
      outputDir: vidState.outputDir,
      format,
      resolution,
      crf,
      fps
    });

    updateConvOverlay(1, 1);
    setTimeout(hideOverlay, 800);
    setStatus("vidStatus", `OK: video convertido como ${basename(response.savedAs)}.`, "info");

    saveHistory({
      name: basename(vidState.file),
      from: extensionOf(vidState.file).toUpperCase(),
      to: format,
      ext: format,
      ok: 1,
      date: new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
    });
  } catch (error) {
    hideOverlay();
    setStatus("vidStatus", error.message || "Error al convertir el video.", "error");
  } finally {
    document.getElementById("vidConvertBtn").disabled = false;
    updateVidConvertBtn();
  }
});

const vidDropzone = document.getElementById("vidDropzone");

vidDropzone.addEventListener("click", () => {
  document.getElementById("vidPickFile").click();
});

vidDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  vidDropzone.classList.add("dragging");
});

vidDropzone.addEventListener("dragleave", () => {
  vidDropzone.classList.remove("dragging");
});

vidDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  vidDropzone.classList.remove("dragging");

  const droppedFiles = normalizeVideoFiles([...event.dataTransfer.files].map((file) => file.path).filter(Boolean));
  if (!droppedFiles.length) {
    setStatus("vidStatus", "Ese archivo no parece un video compatible.", "error");
    return;
  }

  vidState.file = droppedFiles[0];
  updateOutputLabel("vidFileLabel", basename(vidState.file));
  updateVidConvertBtn();
  setStatus("vidStatus", "Video cargado.", "info");
});

initChipGroup("imgFormatChips");
initChipGroup("vidFormatChips");
initChipGroup("vidResChips");
initChipGroup("vidFpsChips");
initTheme();
initTabs();
renderImgQueue();
renderHistory();
hideSplash();
