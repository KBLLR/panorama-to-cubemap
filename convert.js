/**
 * Clamps a value between a minimum and maximum value.
 * @param {number} x The value to clamp.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @returns {number} The clamped value.
 */
function clamp(x, min, max) {
  return Math.min(max, Math.max(x, min));
}

/**
 * Calculates the modulus of a number.
 * @param {number} x The number.
 * @param {number} n The modulus.
 * @returns {number} The result of the modulus operation.
 */
function mod(x, n) {
  return ((x % n) + n) % n;
}

/**
 * Creates a function that copies a pixel from a source image data to a destination image data using nearest neighbor interpolation.
 * @param {ImageData} read The source image data.
 * @param {ImageData} write The destination image data.
 * @returns {function(number, number, number): void} A function that copies a pixel.
 */
function copyPixelNearest(read, write) {
  const {width, height, data} = read;
  const readIndex = (x, y) => 4 * (y * width + x);

  return (xFrom, yFrom, to) => {

    const nearest = readIndex(
      clamp(Math.round(xFrom), 0, width - 1),
      clamp(Math.round(yFrom), 0, height - 1)
    );

    for (let channel = 0; channel < 3; channel++) {
      write.data[to + channel] = data[nearest + channel];
    }
  };
}

/**
 * Creates a function that copies a pixel from a source image data to a destination image data using bilinear interpolation.
 * @param {ImageData} read The source image data.
 * @param {ImageData} write The destination image data.
 * @returns {function(number, number, number): void} A function that copies a pixel.
 */
function copyPixelBilinear(read, write) {
  const {width, height, data} = read;
  const readIndex = (x, y) => 4 * (y * width + x);

  return (xFrom, yFrom, to) => {
    const xl = clamp(Math.floor(xFrom), 0, width - 1);
    const xr = clamp(Math.ceil(xFrom), 0, width - 1);
    const xf = xFrom - xl;

    const yl = clamp(Math.floor(yFrom), 0, height - 1);
    const yr = clamp(Math.ceil(yFrom), 0, height - 1);
    const yf = yFrom - yl;

    const p00 = readIndex(xl, yl);
    const p10 = readIndex(xr ,yl);
    const p01 = readIndex(xl, yr);
    const p11 = readIndex(xr, yr);

    for (let channel = 0; channel < 3; channel++) {
      const p0 = data[p00 + channel] * (1 - xf) + data[p10 + channel] * xf;
      const p1 = data[p01 + channel] * (1 - xf) + data[p11 + channel] * xf;
      write.data[to + channel] = Math.ceil(p0 * (1 - yf) + p1 * yf);
    }
  };
}

/**
 * Performs a discrete convolution with a provided kernel for resampling.
 * @param {ImageData} read The source image data.
 * @param {ImageData} write The destination image data.
 * @param {number} filterSize The size of the filter.
 * @param {function(number): number} kernel The kernel function.
 * @returns {function(number, number, number): void} A function that performs resampling.
 */
function kernelResample(read, write, filterSize, kernel) {
  const {width, height, data} = read;
  const readIndex = (x, y) => 4 * (y * width + x);

  const twoFilterSize = 2*filterSize;
  const xMax = width - 1;
  const yMax = height - 1;
  const xKernel = new Array(4);
  const yKernel = new Array(4);

  return (xFrom, yFrom, to) => {
    const xl = Math.floor(xFrom);
    const yl = Math.floor(yFrom);
    const xStart = xl - filterSize + 1;
    const yStart = yl - filterSize + 1;

    for (let i = 0; i < twoFilterSize; i++) {
      xKernel[i] = kernel(xFrom - (xStart + i));
      yKernel[i] = kernel(yFrom - (yStart + i));
    }

    for (let channel = 0; channel < 3; channel++) {
      let q = 0;

      for (let i = 0; i < twoFilterSize; i++) {
        const y = yStart + i;
        const yClamped = clamp(y, 0, yMax);
        let p = 0;
        for (let j = 0; j < twoFilterSize; j++) {
          const x = xStart + j;
          const index = readIndex(clamp(x, 0, xMax), yClamped);
          p += data[index + channel] * xKernel[j];

        }
        q += p * yKernel[i];
      }

      write.data[to + channel] = Math.round(q);
    }
  };
}

/**
 * Creates a function that copies a pixel from a source image data to a destination image data using bicubic interpolation.
 * @param {ImageData} read The source image data.
 * @param {ImageData} write The destination image data.
 * @returns {function(number, number, number): void} A function that copies a pixel.
 */
function copyPixelBicubic(read, write) {
  const b = -0.5;
  const kernel = x => {
    x = Math.abs(x);
    const x2 = x*x;
    const x3 = x*x*x;
    return x <= 1 ?
      (b + 2)*x3 - (b + 3)*x2 + 1 :
      b*x3 - 5*b*x2 + 8*b*x - 4*b;
  };

  return kernelResample(read, write, 2, kernel);
}

/**
 * Creates a function that copies a pixel from a source image data to a destination image data using Lanczos interpolation.
 * @param {ImageData} read The source image data.
 * @param {ImageData} write The destination image data.
 * @returns {function(number, number, number): void} A function that copies a pixel.
 */
function copyPixelLanczos(read, write) {
  const filterSize = 5;
  const kernel = x => {
    if (x === 0) {
      return 1;
    }
    else {
      const xp = Math.PI * x;
      return filterSize * Math.sin(xp) * Math.sin(xp / filterSize) / (xp * xp);
    }
  };

  return kernelResample(read, write, filterSize, kernel);
}

/**
 * @typedef {object} FaceOrientation
 * @property {function(object, number, number): void} pz Positive Z face orientation function.
 * @property {function(object, number, number): void} nz Negative Z face orientation function.
 * @property {function(object, number, number): void} px Positive X face orientation function.
 * @property {function(object, number, number): void} nx Negative X face orientation function.
 * @property {function(object, number, number): void} py Positive Y face orientation function.
 * @property {function(object, number, number): void} ny Negative Y face orientation function.
 */

/**
 * Functions for orienting the cube faces.
 * @type {FaceOrientation}
 */
const orientations = {
  pz: (out, x, y) => {
    out.x = -1;
    out.y = -x;
    out.z = -y;
  },
  nz: (out, x, y) => {
    out.x = 1;
    out.y = x;
    out.z = -y;
  },
  px: (out, x, y) => {
    out.x = x;
    out.y = -1;
    out.z = -y;
  },
  nx: (out, x, y) => {
    out.x = -x;
    out.y = 1;
    out.z = -y;
  },
  py: (out, x, y) => {
    out.x = -y;
    out.y = -x;
    out.z = 1;
  },
  ny: (out, x, y) => {
    out.x = y;
    out.y = -x;
    out.z = -1;
  }
};

/**
 * Renders a single face of the cubemap.
 * @param {object} options The options for rendering the face.
 * @param {ImageData} options.data The source image data.
 * @param {string} options.face The name of the face to render.
 * @param {number} options.rotation The rotation of the cube in radians.
 * @param {string} options.interpolation The interpolation method to use.
 * @param {number} [options.maxWidth=Infinity] The maximum width of the face.
 */
function renderFace({data: readData, face, rotation, interpolation, maxWidth = Infinity}) {

  const faceWidth = Math.min(maxWidth, readData.width / 4);
  const faceHeight = faceWidth;

  const cube = {};
  const orientation = orientations[face];

  const writeData = new ImageData(faceWidth, faceHeight);

  const copyPixel =
    interpolation === 'linear' ? copyPixelBilinear(readData, writeData) :
    interpolation === 'cubic' ? copyPixelBicubic(readData, writeData) :
    interpolation === 'lanczos' ? copyPixelLanczos(readData, writeData) :
    copyPixelNearest(readData, writeData);

  for (let x = 0; x < faceWidth; x++) {
    for (let y = 0; y < faceHeight; y++) {
      const to = 4 * (y * faceWidth + x);

      // fill alpha channel
      writeData.data[to + 3] = 255;

      // get position on cube face
      // cube is centered at the origin with a side length of 2
      orientation(cube, (2 * (x + 0.5) / faceWidth - 1), (2 * (y + 0.5) / faceHeight - 1));

      // project cube face onto unit sphere by converting cartesian to spherical coordinates
      const r = Math.sqrt(cube.x*cube.x + cube.y*cube.y + cube.z*cube.z);
      const lon = mod(Math.atan2(cube.y, cube.x) + rotation, 2 * Math.PI);
      const lat = Math.acos(cube.z / r);

      copyPixel(readData.width * lon / Math.PI / 2 - 0.5, readData.height * lat / Math.PI - 0.5, to);
    }
  }

  postMessage(writeData);
}

/**
 * Handles messages sent to the worker.
 * @param {MessageEvent} event The message event.
 * @param {object} event.data The data sent to the worker.
 */
onmessage = function({data}) {
  renderFace(data);
};