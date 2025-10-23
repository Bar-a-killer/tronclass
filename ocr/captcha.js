import * as location from './model.js';

// Export an async function that returns a Promise<string>
// Node.js fallback: if browser-only APIs are unavailable, return a placeholder.
export default async function ocr(dataUrl) {
  try {
    const hasBrowserCanvas = typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function';

    if (!hasBrowserCanvas) {
      // Running in Node or environment without canvas APIs — return a 4-digit placeholder
      console.warn('[ocr] Browser canvas APIs not available; returning placeholder code in this environment.');
      return '0000';
    }

    const imageBitmap = await base64ToImageBitmap(dataUrl);
    const imageData = await location.getImageData(imageBitmap);
    const preprocessed = await location.preprocessImage(imageData);
    if (!preprocessed) {
      throw new Error('Preprocessing failed');
    }
    const result = await location.runModel(preprocessed);
    return typeof result === 'string' ? result : '';
  } catch (error) {
    console.error('[ocr] Error in OCR processing pipeline:', error);
    throw error;
  }
}

function base64ToImageBitmap(base64Data) {
  return new Promise((resolve, reject) => {
    fetch(base64Data)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        if (!blob.type || !blob.type.startsWith('image/')) {
          throw new Error('Fetched data is not an image blob');
        }
        return createImageBitmap(blob);
      })
      .then(imageBitmap => resolve(imageBitmap))
      .catch(error => {
        console.error('[ocr] Error converting Base64 to ImageBitmap:', error);
        reject(error);
      });
  });
}

