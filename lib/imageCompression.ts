/**
 * Compresión de fotos en el navegador antes de persistirlas en Firestore.
 *
 * La cuenta Firebase es Spark (sin bucket de Storage disponible), así que las
 * fotos se guardan como data URL dentro del documento de la foto. Base64
 * aumenta el tamaño ~33%, por lo que la reducción real viene de redimensionar
 * y recomprimir a WebP/JPEG con un límite estricto por debajo del máximo de
 * 1 MiB por documento de Firestore.
 */

export interface CompressedImage {
  dataUrl: string;
  mime: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  /** Bytes binarios estimados (sin el overhead de base64). */
  bytes: number;
}

interface CompressOptions {
  maxDimension?: number;
  maxChars?: number;
}

const MAX_DATA_URL_CHARS = 700_000; // ~512 KB binarios; deja margen para el resto del documento.

function estimatedBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((base64.length * 3) / 4);
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => loadViaImage(file));
  }
  return loadViaImage(file);
}

function loadViaImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };
    image.src = url;
  });
}

/**
 * Reduce la imagen hasta que la data URL cabe en `maxChars`.
 * WebP es preferido; si el navegador no lo soporta se usa JPEG.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
    throw new Error('Formato no soportado. Usa PNG, JPG o WEBP.');
  }

  const maxChars = options.maxChars ?? MAX_DATA_URL_CHARS;
  const bitmap = await loadBitmap(file);
  const sourceWidth = 'width' in bitmap ? bitmap.width : 0;
  const sourceHeight = 'height' in bitmap ? bitmap.height : 0;
  if (!sourceWidth || !sourceHeight) throw new Error('La imagen no tiene dimensiones válidas.');

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite procesar imágenes.');

  let best: CompressedImage | null = null;
  const dimensions = [options.maxDimension ?? 1280, 1024, 800, 640];
  const qualities = [0.74, 0.62, 0.5, 0.4];

  for (const maxDimension of dimensions) {
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

    for (const quality of qualities) {
      const webp = canvas.toDataURL('image/webp', quality);
      const mime: CompressedImage['mime'] = webp.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
      const dataUrl = mime === 'image/webp' ? webp : canvas.toDataURL('image/jpeg', quality);
      const candidate: CompressedImage = {
        dataUrl,
        mime,
        width,
        height,
        bytes: estimatedBytes(dataUrl),
      };
      best = candidate;
      if (dataUrl.length <= maxChars) return candidate;
    }
  }

  if (best && best.dataUrl.length <= maxChars * 1.2) return best;
  throw new Error('La imagen es demasiado grande incluso después de comprimirla (máx. 10 MB).');
}
