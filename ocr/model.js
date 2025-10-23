import * as o from "./o.min.js";
import charset from "./charset.js";

export const location = {
  ...o
};
ort.env.wasm.numThreads = 1;

location['getImageData'] = async function(bitmap) {
	const offscreenCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = offscreenCanvas.getContext('2d');
	ctx.drawImage(bitmap, 0, 0);
	const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
	return imageData;
}


// Accept ImageData and preprocess to a normalized Float32Array suitable for the model.
location['preprocessImage'] = async function(imageData) {
	try {
		// Draw input ImageData to a canvas
		const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
		const srcCtx = srcCanvas.getContext('2d');
		srcCtx.putImageData(imageData, 0, 0);

		const targetHeight = 64;
		const targetWidth = Math.floor((srcCanvas.width * targetHeight) / srcCanvas.height);
		const resizedCanvas = new OffscreenCanvas(targetWidth, targetHeight);
		const resizedCtx = resizedCanvas.getContext('2d');
		resizedCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
		const grayscaleImageData = resizedCtx.getImageData(0, 0, targetWidth, targetHeight);
		for (let i = 0; i < grayscaleImageData.data.length; i += 4) {
			const gray = 0.299 * grayscaleImageData.data[i] + 0.587 * grayscaleImageData.data[i + 1] + 0.114 * grayscaleImageData.data[i + 2];
			grayscaleImageData.data[i] = gray;
			grayscaleImageData.data[i + 1] = gray;
			grayscaleImageData.data[i + 2] = gray;
		}
		const input = new Float32Array(targetWidth * targetHeight);
		for (let i = 0; i < grayscaleImageData.data.length; i += 4) {
			input[i / 4] = (grayscaleImageData.data[i] / 255 - 0.5) / 0.5;
		}
		return input;
	} catch (error) {
		//console.error('Failed to preprocess image:', error);
		return null;
	}
}

// Lazy-create a session promise and await it before running.
if(!location['sessionPromise']){
	location['sessionPromise'] = ort.InferenceSession.create('model.bin');
}
		
location['runModel'] = async function(input) {
	try {
		const session = await (location['sessionPromise'] || (location['sessionPromise'] = ort.InferenceSession.create('model.bin')));
		const inputTensor = new ort.Tensor('float32', input, [1, 1, 64, input.length / 64]);
		const inputs = {
			input1: inputTensor
		};
		const outputMap = await session.run(inputs);
		const outputTensor0 = outputMap['output'];
		const result = [];
		let lastItem = 0;
		for (const item of outputTensor0.data) {
			if (item === lastItem) {
				continue;
			} else {
				lastItem = item;
			}
			if (item !== 0) {
				result.push(charset[item] ?? '');
			}
		}
		return result.join('');
	} catch (e) {
		//console.error('Failed to run the model:', e);
		return null;
	}
}
