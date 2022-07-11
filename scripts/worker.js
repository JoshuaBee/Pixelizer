onmessage = (e) => {
	const { originalUniqueColors, maxColorDistance, maxUniqueColors } = e.data;

	// Create items array
	uniqueColorArray = Object.keys(originalUniqueColors).map(function(key) {
		return [key, originalUniqueColors[key]];
	});
	// Sort the array based on the second element
	uniqueColorArray.sort(function(first, second) {
		return second[1] - first[1];
	});

	// Group the colours together.
	let colorMap = {};
	let color1;
	let colorIndex1 = 0;
	let color2;
	let color2LAB;
	let colorIndex2 = 1;
	let removal = false;
	while (colorIndex2 < uniqueColorArray.length) {
		removal = false;
		color2 = uniqueColorArray[colorIndex2][0].split('-');
		color2LAB = convertRGBtoLAB(color2);
		color2Count = uniqueColorArray[colorIndex2][1];

		for (colorIndex1 = 0; colorIndex1 < colorIndex2; colorIndex1++) {
			color1 = uniqueColorArray[colorIndex1][0];
			if (deltaE(convertRGBtoLAB(color1.split('-')), color2LAB) <= maxColorDistance) {
				// Update color1 count
				uniqueColorArray[colorIndex1][1] += color2Count;

				// Add to color map
				colorMap[uniqueColorArray[colorIndex2][0]] = color1;

				// Remove color2
				uniqueColorArray.splice(colorIndex2, 1);
				removal = true;
				break;
			}
		}

		if (!removal) {
			colorIndex2++;
		}
	}

	// Reduce the number of unique colors
	while (uniqueColorArray.length > maxUniqueColors) {
		let scoreMin = Infinity;
		let scoreMinColor1Index;
		let scoreMinColor2Index;

		// Calculate the distances between all the unique colors
		for (let colorIndex1 = 0; colorIndex1 < uniqueColorArray.length; colorIndex1++) {
			let color1 = uniqueColorArray[colorIndex1][0].split('-');

			for (let colorIndex2 = colorIndex1 + 1; colorIndex2 < uniqueColorArray.length; colorIndex2++) {
				let color2 = uniqueColorArray[colorIndex2][0].split('-');

				let score = deltaE(convertRGBtoLAB(color1), convertRGBtoLAB(color2));
				if (score < scoreMin) {
					scoreMin = score;
					scoreMinColor1Index = colorIndex1;
					scoreMinColor2Index = colorIndex2;
				}
			}
		}

		// Update color1 count
		uniqueColorArray[scoreMinColor1Index][1] += uniqueColorArray[scoreMinColor2Index][1];

		// Update color map
		let color1 = uniqueColorArray[scoreMinColor1Index][0];
		let color2 = uniqueColorArray[scoreMinColor2Index][0];
		Object.entries(colorMap).forEach(([key, value]) => {
			if (value === color2) {
				colorMap[key] = color1;
			}
		});
		colorMap[color2] = color1;

		// Remove color2
		uniqueColorArray.splice(scoreMinColor2Index, 1);

		// Resort
		uniqueColorArray.sort((first, second) => {
			return second[1] - first[1];
		});
	}

	postMessage({ colorMap, uniqueColorArray });
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