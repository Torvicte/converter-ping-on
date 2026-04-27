# Converter Ping On

Aplicacion de escritorio para convertir imagenes por lote en Windows.

## Lo que hace

- Convierte HEIC y HEIF a JPEG o PNG de forma directa.
- Convierte JPG, PNG, WEBP, BMP, TIFF, GIF y AVIF a JPEG, PNG, WEBP, BMP o TIFF.
- Permite elegir varios archivos a la vez.
- Guarda en la carpeta que elijas.

## Uso rapido

1. Abre la app.
2. Pulsa `Elegir archivos`.
3. Pulsa `Elegir carpeta de salida`.
4. Escoge el formato.
5. Pulsa `Convertir ahora`.

## Desarrollo

```powershell
npm.cmd start
```

## Build Windows

```powershell
npm.cmd run build
```

## Agregar al menu Inicio

```powershell
powershell -ExecutionPolicy Bypass -File .\install-start-menu-shortcut.ps1
```
