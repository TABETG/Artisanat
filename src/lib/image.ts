async function draw(file: File, maxSize: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Réduit une photo de téléphone (souvent 5 Mo) à ~300 Ko avant envoi. */
export async function resizeImage(file: File, maxSize = 1800, quality = 0.85): Promise<Blob> {
  const canvas = await draw(file, maxSize);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality));
}

/** Version légère pour le mode démonstration (stockée dans le navigateur). */
export async function imageToDataUrl(file: File, maxSize = 1000, quality = 0.72): Promise<string> {
  const canvas = await draw(file, maxSize);
  return canvas.toDataURL('image/jpeg', quality);
}
