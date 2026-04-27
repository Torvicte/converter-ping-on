const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const heicConvert = require("heic-convert");

const TARGET_FORMATS = new Set(["jpeg", "png", "webp", "bmp", "tiff"]);
const HEIC_INPUTS = new Set([".heic", ".heif"]);
const VIDEO_AUDIO_FORMATS = new Set(["mp3", "aac", "wav", "ogg", "m4a"]);

function toHeicConvertFormat(outputFormat) {
  if (outputFormat === "jpeg") {
    return "JPEG";
  }

  if (outputFormat === "png") {
    return "PNG";
  }

  return null;
}

function ensureFormat(format) {
  const normalized = String(format || "").trim().toLowerCase();

  if (!TARGET_FORMATS.has(normalized)) {
    throw new Error(`Formato de salida no compatible: ${format}`);
  }

  return normalized;
}

function outputName(filePath, outputFormat) {
  const parsed = path.parse(filePath);
  return `${parsed.name}.${outputFormat === "jpeg" ? "jpg" : outputFormat}`;
}

async function ensureOutputDir(outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
}

function buildQualityArgs(outputPath, quality) {
  const extension = path.extname(outputPath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    const ffmpegQuality = Math.max(2, Math.min(31, Math.round(31 - ((quality - 40) / 60) * 29)));
    return ["-q:v", String(ffmpegQuality)];
  }

  return [];
}

function runFfmpeg(inputPath, outputPath, quality) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-update",
      "1",
      ...buildQualityArgs(outputPath, quality),
      outputPath
    ];
    const proc = spawn(ffmpegPath, args, { windowsHide: true });

    let stderr = "";

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg termino con codigo ${code}`));
    });
  });
}

async function convertHeic(filePath, outputPath, outputFormat, quality) {
  const inputBuffer = await fs.readFile(filePath);
  const directHeicFormat = toHeicConvertFormat(outputFormat);

  if (directHeicFormat) {
    const converted = await heicConvert({
      buffer: inputBuffer,
      format: directHeicFormat,
      quality: outputFormat === "jpeg" ? quality / 100 : undefined
    });

    await fs.writeFile(outputPath, converted);
    return;
  }

  const intermediateBuffer = await heicConvert({
    buffer: inputBuffer,
    format: "PNG"
  });
  const tempPath = path.join(path.dirname(outputPath), `.__temp_${Date.now()}.png`);

  await fs.writeFile(tempPath, intermediateBuffer);

  try {
    await runFfmpeg(tempPath, outputPath, quality);
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

async function convertSingleFile(filePath, outputDir, outputFormat, quality) {
  const extension = path.extname(filePath).toLowerCase();
  const outputPath = path.join(outputDir, outputName(filePath, outputFormat));

  if (HEIC_INPUTS.has(extension)) {
    await convertHeic(filePath, outputPath, outputFormat, quality);
    return outputPath;
  }

  await runFfmpeg(filePath, outputPath, quality);
  return outputPath;
}

async function convertFiles(payload) {
  const files = Array.isArray(payload?.files) ? payload.files : [];
  const outputDir = String(payload?.outputDir || "").trim();
  const outputFormat = ensureFormat(payload?.outputFormat);
  const quality = Math.min(100, Math.max(40, Number(payload?.quality) || 92));

  if (!files.length) {
    throw new Error("No seleccionaste archivos.");
  }

  if (!outputDir) {
    throw new Error("No seleccionaste una carpeta de salida.");
  }

  await ensureOutputDir(outputDir);

  const results = [];

  for (const filePath of files) {
    try {
      const savedAs = await convertSingleFile(filePath, outputDir, outputFormat, quality);
      results.push({ filePath, savedAs, success: true });
    } catch (error) {
      results.push({
        filePath,
        success: false,
        error: error.message
      });
    }
  }

  return { results, outputDir, outputFormat };
}

async function convertVideo(payload) {
  const file = String(payload?.file || "").trim();
  const outputDir = String(payload?.outputDir || "").trim();
  const format = String(payload?.format || "mp4").trim().toLowerCase();
  const resolution = String(payload?.resolution || "original").trim();
  const crf = Math.min(51, Math.max(0, Number(payload?.crf) || 23));
  const fps = String(payload?.fps || "original").trim();

  if (!file) {
    throw new Error("No seleccionaste un archivo de video.");
  }

  if (!outputDir) {
    throw new Error("No seleccionaste una carpeta de salida.");
  }

  await ensureOutputDir(outputDir);

  const parsed = path.parse(file);
  const outputPath = path.join(outputDir, `${parsed.name}.${format}`);
  const isAudioOnly = VIDEO_AUDIO_FORMATS.has(format);
  const args = ["-y", "-i", file];

  if (isAudioOnly) {
    if (format === "mp3") {
      args.push("-vn", "-codec:a", "libmp3lame", "-q:a", "2");
    } else if (format === "aac") {
      args.push("-vn", "-codec:a", "aac", "-b:a", "192k");
    } else {
      args.push("-vn");
    }
  } else {
    if (resolution && resolution !== "original") {
      args.push("-vf", `scale=${resolution}`);
    }

    args.push("-crf", String(crf));

    if (fps && fps !== "original") {
      args.push("-r", fps);
    }

    if (format === "mp4" || format === "mov" || format === "avi") {
      args.push("-codec:v", "libx264", "-preset", "fast", "-codec:a", "aac");
    } else if (format === "webm") {
      args.push("-codec:v", "libvpx-vp9", "-codec:a", "libopus");
    }
  }

  args.push(outputPath);

  await new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg termino con codigo ${code}`));
    });
  });

  return { savedAs: outputPath, format };
}

module.exports = { convertFiles, convertVideo };
