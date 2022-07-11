class Color {
	constructor(red, green, blue) {
		this.red = red;
		this.green = green;
		this.blue = blue;
	}

	getRed() {
		return this.red;
	}

	toString() {
		return `${ this.red }-${ this.green }-${ this.blue }`;
	}
}

// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const fileTypes = [
	"image/jpeg",
	"image/png",
];

var deferredPrompt;
var $fileInputLabel;
var $fileInput;
var $informationContainer;
var $newImage;
var $originalImage;
var $pixelize;
var $settings;

let originalUniqueColors = {};
let newUniqueColors = {};
let uniqueColorArray = [];
let colorMap = {};

const nf = Intl.NumberFormat();

const settings = {
	canvasHeight: 512,
	canvasWidth: 512,
	pixelSize: 8,
	useMaxUniqueColors: true,
	maxUniqueColors: 20,
	maxColorDistance: 10
}

document.addEventListener('DOMContentLoaded', () => {
	$canvas = document.querySelector('canvas');
	$fileInputLabel = document.querySelector('#upload');
	$fileInput = document.querySelector('input[type="file"]');
	$informationContainer = document.querySelector('.information__container');
	$pixelize = document.querySelector('#pixelize');
	$settings = document.querySelectorAll('[data-setting]');
	$originalImage = document.querySelector('#original-image');
	$newImage = document.querySelector('#new-image');

//	settings.canvasHeight = $canvas.scrollHeight;
// 	settings.canvasWidth = $canvas.scrollHeight;

	$fileInput.addEventListener('change', updateImage);
	$settings.forEach($setting => {
		$setting.addEventListener('change', settingChange);
	});
	$pixelize.addEventListener('click', pixelize);
});

function reset() {
	resetVariables();
	resetImage();
	hideInfo();
}

function resetImage() {
	var originalctx = $originalImage.getContext('2d');
	originalctx.clearRect(0, 0, settings.canvasWidth, settings.canvasHeight);

	var newctx = $newImage.getContext('2d');
	newctx.clearRect(0, 0, settings.canvasWidth, settings.canvasHeight);
}

function resetVariables() {
	originalUniqueColors = {};
	newUniqueColors = {};
	uniqueColorArray = [];
	colorMap = {};
}

function updateImage() {
	$fileInputLabel.dataset.loading = true;
	$fileInputLabel.disabled = true;

	const files = $fileInput.files;
	if (files.length > 0) {
		reset();

		var originalctx = $originalImage.getContext('2d');
		
		var img = new Image();
		img.addEventListener('load', (e) => {

			var height = e.target.height;
			var width = e.target.width;
			var scale = 1;

			if (height > settings.canvasHeight) {
				scale = height / settings.canvasHeight;
				height /= scale;
				width /= scale;
			}

			if (width > settings.canvasWidth) {
				scale = width / settings.canvasWidth;
				height /= scale;
				width /= scale;
			}

			const heightGap = (settings.canvasHeight - height) / 2;
			const widthGap = (settings.canvasWidth - width) / 2;

			originalctx.drawImage(img, widthGap, heightGap, width, height);
			

			getOriginalUniqueColors();
			$fileInputLabel.dataset.loading = false;
			$fileInputLabel.disabled = false;
		});
		img.src = URL.createObjectURL(files[0]);
	}
}

function settingChange(event) {
	const setting = event.target.dataset.setting;

	if (settings.hasOwnProperty(setting)) {
		if (event.target.type === 'number') {
			settings[setting] = Number(event.target.value);
		}
		else if (event.target.type === 'checkbox') {
			settings[setting] = event.target.checked;
		}
		else {
			settings[setting] = event.target.value;
		}
	}
}

function getOriginalUniqueColors() {
	var ctx = $originalImage.getContext('2d');
	const imgd = ctx.getImageData(0, 0, settings.canvasWidth, settings.canvasHeight);
	const pix = imgd.data;
	pixelCount = pix.length;
	for (var k = 0; k < pixelCount; k += 4) {
		let color = new Color(pix[k], pix[k + 1], pix[k + 2]);
		if (originalUniqueColors[color]) {
			originalUniqueColors[color]++;
		}
		else {
			originalUniqueColors[color] = 1;
		}
	}
}

function pixelize() {
	var totalStartTime = performance.now();
	var startTime = performance.now();

	// Reset variables
	newUniqueColors = {};
	uniqueColorArray = [];
	colorMap = {};

	$pixelize.dataset.loading = true;
	$pixelize.disabled = true;

	if (settings.useMaxUniqueColors) {
		const worker = new Worker("./scripts/worker.js");

		worker.postMessage({
			originalUniqueColors,
			maxColorDistance: settings.maxColorDistance,
			maxUniqueColors: settings.maxUniqueColors
		});

		worker.onmessage = (e) => {
			({ colorMap, uniqueColorArray } = e.data);

			updateCanvas();
		}
	} else {
		updateCanvas();
	}
}

function updateCanvas() {
	const middleIndex = (4 * Math.floor(((settings.pixelSize ** 2) / 2)));
	var newctx = $newImage.getContext('2d');
	var originalctx = $originalImage.getContext('2d'); 
	for (var i = 0; i < settings.canvasWidth / settings.pixelSize; i++) {
		for (var j = 0; j < settings.canvasHeight / settings.pixelSize; j++) {
			const imgd = originalctx.getImageData(i * settings.pixelSize, j * settings.pixelSize, settings.pixelSize, settings.pixelSize);
			const pix = imgd.data;
			pixelCount = pix.length;

			let red = pix[middleIndex];
			let green = pix[middleIndex + 1];
			let blue = pix[middleIndex + 2];

			if (settings.useMaxUniqueColors) {
				const closestColor = colorMap[`${ red }-${ green }-${ blue }`];
				if (closestColor) {
					[red, green, blue] = closestColor.split('-');

					let color = new Color(red, green, blue);
					if (newUniqueColors[color]) {
						newUniqueColors[color]++;
					}
					else {
						newUniqueColors[color] = 1;
					}
				}
			} else {
				let color = new Color(red, green, blue);
				if (newUniqueColors[color]) {
					newUniqueColors[color]++;
				}
				else {
					newUniqueColors[color] = 1;
				}
			}

			for (var k = 0; k < pixelCount; k += 4) {
				pix[k] = red;
				pix[k + 1] = green;
				pix[k + 2] = blue;
				pix[k + 3] = 255;
			}

			newctx.putImageData(imgd, i * settings.pixelSize, j * settings.pixelSize);

			$pixelize.dataset.loading = false;
			$pixelize.disabled = false;
		}
	}

	updateInfo();
	showInfo();
}

function updateInfo() {
	const $originalUniqueColorCount = document.querySelector('#originalUniqueColorCount');
	const $pixelizerUniqueColorCount = document.querySelector('#pixelizerUniqueColorCount');
	const $topUniqueColorsContainer = document.querySelector('.information__top-colors__container');
	const $topUniqueColors = document.querySelector('#topUniqueColors');

	$originalUniqueColorCount.innerHTML = nf.format(Object.keys(originalUniqueColors).length);
	$pixelizerUniqueColorCount.innerHTML = nf.format(Object.keys(newUniqueColors).length);

	if (uniqueColorArray.length > 0) {
		$topUniqueColorsContainer.ariaHidden = false;
	} else {
		$topUniqueColorsContainer.ariaHidden = true;
	}

	$topUniqueColors.innerHTML = '';
	uniqueColorArray.slice(0, 3).forEach(uniqueColor => {
		const color = uniqueColor[0].split('-');
		const count = uniqueColor[1];

		let differenceToBlack = deltaE(convertRGBtoLAB(color), convertRGBtoLAB([0, 0, 0]));
		let differenceToWhite = deltaE(convertRGBtoLAB(color), convertRGBtoLAB([255, 255, 255]));
		let textColor = 'black';
		if (differenceToBlack < differenceToWhite) {
			textColor = 'white';
		}

		const $uniqueColorContainer = document.createElement('div');
		$uniqueColorContainer.classList.add('unique-color__container');
		$uniqueColorContainer.style.backgroundColor = `rgb(${ color[0] },${ color[1] },${ color[2] })`;
		$uniqueColorContainer.style.color = textColor;
		$topUniqueColors.appendChild($uniqueColorContainer);

		const $uniqueColor = document.createElement('p');
		$uniqueColor.classList.add('unique-color__color');
		$uniqueColor.innerHTML = convertRGBtoHEX(color);
		$uniqueColor.dataset.fontWeight = 'bold';
		$uniqueColorContainer.appendChild($uniqueColor);

		const $uniqueColorCount = document.createElement('p');
		$uniqueColorCount.innerHTML = `used ${ nf.format(count) } times`;
		$uniqueColorCount.dataset.textAlign = 'center';
		$uniqueColorContainer.appendChild($uniqueColorCount);
	});
}

function showInfo() {
	$informationContainer.ariaHidden = false;
}

function hideInfo() {
	$informationContainer.ariaHidden = true;
}

/** 
 * 
 * @param {Array} rgb RGB color in array
 */
 function convertRGBtoHEX(rgb) {
	function componentToHex(c) {
		var hex = Number(c).toString(16).toUpperCase();
		return hex.length == 1 ? "0" + hex : hex;
	}

	return `#${ componentToHex(rgb[0]) }${ componentToHex(rgb[1]) }${ componentToHex(rgb[2]) }`;
}

/** 
 * https://github.com/antimatter15/rgb-lab/blob/master/color.js
 * 
 * @param {Array} rgb RGB color in array
 */
function convertRGBtoLAB(rgb) {
	var r = rgb[0] / 255,
		g = rgb[1] / 255,
		b = rgb[2] / 255,
		x, y, z;
	
	r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
	g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
	b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
	
	x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
	y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
	z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
	
	x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
	y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
	z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
	
	return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

/**
 * https://github.com/antimatter15/rgb-lab/blob/master/color.js
 * 
 * calculate the perceptual distance between colors in CIELAB
 * https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs
 * 
 * @param {Array} labA First LAB color in array
 * @param {Array} labB Second LAB color in array
 */
 function deltaE(labA, labB){
	var deltaL = labA[0] - labB[0];
	var deltaA = labA[1] - labB[1];
	var deltaB = labA[2] - labB[2];
	var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
	var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
	var deltaC = c1 - c2;
	var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
	deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
	var sc = 1.0 + 0.045 * c1;
	var sh = 1.0 + 0.015 * c1;
	var deltaLKlsl = deltaL / (1.0);
	var deltaCkcsc = deltaC / (sc);
	var deltaHkhsh = deltaH / (sh);
	var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
	return i < 0 ? 0 : Math.sqrt(i);
}

// https://developers.google.com/web/ilt/pwa/lab-offline-quickstart#52_activating_the_install_prompt
window.addEventListener('beforeinstallprompt', (event) => {

	// Prevent Chrome 67 and earlier from automatically showing the prompt
	event.preventDefault();

	// Stash the event so it can be triggered later.
	deferredPrompt = event;

	// Attach the install prompt to a user gesture
	document.getElementById('install').addEventListener('click', (event) => {

		// Show the prompt
		deferredPrompt.prompt();

		// Wait for the user to respond to the prompt
		deferredPrompt.userChoice.then((choiceResult) => {
			if (choiceResult.outcome === 'accepted') {
				console.log('User accepted the A2HS prompt');
			}
			else {
				console.log('User dismissed the A2HS prompt');
			}
			deferredPrompt = null;
		});
	});

	document.getElementById('install').setAttribute('aria-hidden', false);
});

// When the app is installed it should remove the install snackbar
window.addEventListener('appinstalled', (event) => {
	console.log('a2hs installed');
	document.getElementById('install').setAttribute('aria-hidden', true);
});