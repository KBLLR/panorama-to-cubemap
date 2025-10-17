# Panorama To Cubemap

A web app which converts 360° panoramas to six cube faces.

[**Live Demo**](https://jaxry.github.io/panorama-to-cubemap/)

## Features
* Runs in your browser by using the Canvas API to manipulate image data.
* Uses Lanczos interpolation for high quality output.
* Ability to rotate cubemap to control the orientation of the scene.

## What it does

This tool takes a 360° panoramic image in equirectangular projection and converts it into the six faces of a cubemap. This is useful for creating skyboxes in 3D applications or for other purposes where a cubemap is needed.

## How it works

The conversion process is done entirely in the browser using JavaScript and the Canvas API. The core logic is in the `convert.js` file, which runs in a Web Worker to avoid blocking the main thread. The `main.js` file handles the user interface and interaction.

The conversion process involves the following steps:
1. The user uploads a panoramic image.
2. The image is loaded into a canvas.
3. For each of the six faces of the cubemap, a Web Worker is created to render the face.
4. The worker calculates the color of each pixel in the output face by projecting it onto the panoramic image.
5. The user can choose between different interpolation methods (Lanczos, bicubic, bilinear, nearest neighbor) to control the quality of the output.
6. Once all six faces are rendered, they are displayed on the page and can be downloaded by the user.

## Local Development

To run this project locally, you will need a local web server to serve the files. You can use any simple web server, such as Python's built-in `http.server`.

1. Clone this repository:
   ```bash
   git clone https://github.com/jaxry/panorama-to-cubemap.git
   ```
2. Navigate to the project directory:
   ```bash
   cd panorama-to-cubemap
   ```
3. Start a local web server. For example, if you have Python 3 installed, you can run:
   ```bash
   python -m http.server
   ```
4. Open your web browser and go to `http://localhost:8000` (or the appropriate port for your web server).

## Usage

1. Open the web app in your browser.
2. Click the "Upload a panoramic image" button and select an equirectangular panoramic image.
3. The image will be processed and the six cubemap faces will be displayed.
4. You can adjust the settings for rotation, interpolation, and output format. The image will be reprocessed automatically when you change the settings.
5. Click on each face to download it as a separate image file.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the GitHub repository.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.