const state = {
  files: [],
  outputDir: ""
};

const pickFilesButton = document.getElementById("pickFilesButton");
const pickFolderButton = document.getElementById("pickFolderButton");
const convertButton = document.getElementById("convertButton");
const formatSelect = document.getElementById("formatSelect");
const qualityRange = document.getElementById("qualityRange");
const qualityValue = document.getElementById("qualityValue");
const filesCount = document.getElementById("filesCount");
const outputFolder = document.getElementById("outputFolder");
const fileList = document.getElementById("fileList");
const status = document.getElementById("status");
const dropzone = document.getElementById("dropzone");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderFiles() {
  filesCount.textContent = `${state.files.length} seleccionados`;
  fileList.innerHTML = "";

  for (const filePath of state.files) {
    const item = document.createElement("li");
    const parts = filePath.split(/[\\/]/);
    const fileName = parts[parts.length - 1];

    item.innerHTML = `<span>${fileName}</span><small>${filePath}</small>`;
    fileList.appendChild(item);
  }
}

function addFiles(nextFiles) {
  const merged = new Set([...state.files, ...nextFiles]);
  state.files = [...merged];
  renderFiles();
}

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = qualityRange.value;
});

pickFilesButton.addEventListener("click", async () => {
  const files = await window.converterApi.pickFiles();
  if (files.length) {
    addFiles(files);
    setStatus("Archivos cargados. Ya puedes convertir.");
  }
});

pickFolderButton.addEventListener("click", async () => {
  const folder = await window.converterApi.pickOutputFolder();
  if (!folder) {
    return;
  }

  state.outputDir = folder;
  outputFolder.textContent = folder;
  setStatus("Carpeta de salida lista.");
});

convertButton.addEventListener("click", async () => {
  if (!state.files.length) {
    setStatus("Primero elige uno o mas archivos.", true);
    return;
  }

  if (!state.outputDir) {
    setStatus("Primero elige una carpeta de salida.", true);
    return;
  }

  convertButton.disabled = true;
  setStatus("Convirtiendo archivos...");

  try {
    const response = await window.converterApi.convertFiles({
      files: state.files,
      outputDir: state.outputDir,
      outputFormat: formatSelect.value,
      quality: qualityRange.value
    });

    const ok = response.results.filter((item) => item.success).length;
    const fail = response.results.length - ok;

    if (fail === 0) {
      setStatus(`Listo: ${ok} archivo(s) convertidos en ${response.outputDir}.`);
    } else {
      const failedNames = response.results
        .filter((item) => !item.success)
        .map((item) => {
          const parts = item.filePath.split(/[\\/]/);
          return `${parts[parts.length - 1]}: ${item.error}`;
        })
        .join(" | ");

      setStatus(`Convertidos: ${ok}. Fallidos: ${fail}. ${failedNames}`, true);
    }
  } catch (error) {
    setStatus(error.message || "No se pudo completar la conversion.", true);
  } finally {
    convertButton.disabled = false;
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");

  const droppedFiles = [...event.dataTransfer.files]
    .map((file) => file.path)
    .filter(Boolean);

  if (droppedFiles.length) {
    addFiles(droppedFiles);
    setStatus("Archivos agregados desde arrastrar y soltar.");
  }
});
