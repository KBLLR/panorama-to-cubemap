const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

/**
 * Represents a set of radio inputs.
 */
class RadioInput {
  /**
   * Creates a new RadioInput.
   * @param {string} name The name of the radio inputs.
   * @param {function(): void} onChange The function to call when the value changes.
   */
  constructor(name, onChange) {
    this.inputs = document.querySelectorAll(`input[name=${name}]`);
    for (let input of this.inputs) {
      input.addEventListener('change', onChange);
    }
  }

  /**
   * The value of the selected radio input.
   * @type {string}
   */
  get value() {
    for (let input of this.inputs) {
      if (input.checked) {
        return input.value;
      }
    }
  }
}

/**
 * Represents a single input element.
 */
class Input {
  /**
   * Creates a new Input.
   * @param {string} id The ID of the input element.
   * @param {function(): void} onChange The function to call when the value changes.
   */
  constructor(id, onChange) {
    this.input = document.getElementById(id);
    this.input.addEventListener('change', onChange);
    this.valueAttrib = this.input.type === 'checkbox' ? 'checked' : 'value';
  }

  /**
   * The value of the input.
   * @type {string|boolean}
   */
  get value() {
    return this.input[this.valueAttrib];
  }
}

/**
 * Represents a single face of a cubemap.
 */
class CubeFace {
  /**
   * Creates a new CubeFace.
   * @param {string} faceName The name of the face.
   */
  constructor(faceName) {
    this.faceName = faceName;

    this.anchor = document.createElement('a');
    this.anchor.style.position='absolute';
    this.anchor.title = faceName;

    this.img = document.createElement('img');
    this.img.style.filter = 'blur(4px)';

    this.anchor.appendChild(this.img);
  }

  /**
   * Sets the preview image for the face.
   * @param {string} url The URL of the preview image.
   * @param {number} x The x position of the preview image.
   * @param {number} y The y position of the preview image.
   */
  setPreview(url, x, y) {
    this.img.src = url;
    this.anchor.style.left = `${x}px`;
    this.anchor.style.top = `${y}px`;
  }

  /**
   * Sets the download link for the face.
   * @param {string} url The URL of the image to download.
   * @param {string} fileExtension The file extension of the image.
   */
  setDownload(url, fileExtension) {
    this.anchor.href = url;
    this.anchor.download = `${this.faceName}.${fileExtension}`;
    this.img.style.filter = '';
  }
}

/**
 * Removes all children from a DOM node.
 * @param {Node} node The node to remove children from.
 */
function removeChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

const mimeType = {
  'jpg': 'image/jpeg',
  'png': 'image/png'
};

/**
 * Converts image data to a data URL.
 * @param {ImageData} imgData The image data to convert.
 * @param {string} extension The file extension of the image.
 * @returns {Promise<string>} A promise that resolves with the data URL.
 */
function getDataURL(imgData, extension) {
  canvas.width = imgData.width;
  canvas.height = imgData.height;
  ctx.putImageData(imgData, 0, 0);
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(URL.createObjectURL(blob)), mimeType[extension], 0.92);
  });
}

const dom = {
  imageInput: document.getElementById('imageInput'),
  faces: document.getElementById('faces'),
  generating: document.getElementById('generating')
};

dom.imageInput.addEventListener('change', loadImage);

const settings = {
  cubeRotation: new Input('cubeRotation', loadImage),
  interpolation: new RadioInput('interpolation', loadImage),
  format: new RadioInput('format', loadImage),
};

const facePositions = {
  pz: {x: 1, y: 1},
  nz: {x: 3, y: 1},
  px: {x: 2, y: 1},
  nx: {x: 0, y: 1},
  py: {x: 1, y: 0},
  ny: {x: 1, y: 2}
};

/**
 * Loads an image from the file input and starts the conversion process.
 */
function loadImage() {
  const file = dom.imageInput.files[0];

  if (!file) {
    return;
  }

  const img = new Image();

  img.src = URL.createObjectURL(file);

  img.addEventListener('load', () => {
    const {width, height} = img;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, width, height);

    processImage(data);
  });
}

let finished = 0;
let workers = [];

/**
 * Processes the image data and renders the cubemap faces.
 * @param {ImageData} data The image data to process.
 */
function processImage(data) {
  removeChildren(dom.faces);
  dom.generating.style.visibility = 'visible';

  for (let worker of workers) {
    worker.terminate();
  }

  for (let [faceName, position] of Object.entries(facePositions)) {
    renderFace(data, faceName, position);
  }
}

/**
 * Renders a single face of the cubemap.
 * @param {ImageData} data The image data to process.
 * @param {string} faceName The name of the face to render.
 * @param {{x: number, y: number}} position The position of the face in the output grid.
 */
function renderFace(data, faceName, position) {
  const face = new CubeFace(faceName);
  dom.faces.appendChild(face.anchor);

  const options = {
    data: data,
    face: faceName,
    rotation: Math.PI * settings.cubeRotation.value / 180,
    interpolation: settings.interpolation.value,
  };

  const worker = new Worker('convert.js');

  const setDownload = ({data: imageData}) => {
    const extension = settings.format.value;

    getDataURL(imageData, extension)
      .then(url => face.setDownload(url, extension));

    finished++;

    if (finished === 6) {
      dom.generating.style.visibility = 'hidden';
      finished = 0;
      workers = [];
    }
  };

  const setPreview = ({data: imageData}) => {
    const x = imageData.width * position.x;
    const y = imageData.height * position.y;

    getDataURL(imageData, 'jpg')
      .then(url => face.setPreview(url, x, y));

    worker.onmessage = setDownload;
    worker.postMessage(options);
  };

  worker.onmessage = setPreview;
  worker.postMessage(Object.assign({}, options, {
    maxWidth: 200,
    interpolation: 'linear',
  }));

  workers.push(worker);
}