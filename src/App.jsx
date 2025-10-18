import { render } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { Face } from './Face';

const facePositions = {
  pz: { x: 1, y: 1 },
  nz: { x: 3, y: 1 },
  px: { x: 2, y: 1 },
  nx: { x: 0, y: 1 },
  py: { x: 1, y: 0 },
  ny: { x: 1, y: 2 }
};

function App() {
  const [faces, setFaces] = useState({});
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState({
    cubeRotation: 180,
    interpolation: 'lanczos',
    format: 'png'
  });

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);

    processImage(data);
  }, [settings]);

  const processImage = (data) => {
    setGenerating(true);
    setFaces({});

    let workers = [];
    for (const [faceName, position] of Object.entries(facePositions)) {
      const worker = new Worker(new URL('./convert.js', import.meta.url), { type: 'module' });
      workers.push(worker);

      const options = {
        data,
        face: faceName,
        rotation: Math.PI * settings.cubeRotation / 180,
        interpolation: settings.interpolation,
      };

      worker.onmessage = ({ data: imageData }) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          setFaces(prevFaces => {
            const newFaces = {
              ...prevFaces,
              [faceName]: {
                url,
                download: `${faceName}.${settings.format}`,
                position
              }
            };

            if (Object.values(newFaces).filter(f => f.download).length === 6) {
              setGenerating(false);
              workers.forEach(w => w.terminate());
            }
            return newFaces;
          });
        }, `image/${settings.format}`);
      };
      worker.postMessage(options);
    }
  };

  const [prompt, setPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const prompt = e.target.elements.prompt.value;
    setGeneratingAI(true);

    const { pipeline } = await import('@xenova/transformers');
    const generator = await pipeline('text-to-image', 'Xenova/stable-diffusion-2-1-base');
    const result = await generator(prompt, {
      width: 512,
      height: 256,
      num_inference_steps: 20,
    });

    const img = new Image();
    img.src = result[0];
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    processImage(data);
    setGeneratingAI(false);
  };

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <header>
        <h1>Panorama to Cubemap</h1>
        <aside>Convert a 360° panorama to six cube faces.</aside>
      </header>

      <main>
        <section>
          <h2>Generate with AI</h2>
          <p>Enter a text prompt to generate a panoramic image.</p>
          <form onSubmit={handleGenerate}>
            <input name="prompt" type="text" placeholder="A beautiful sunset over the ocean" />
            <button type="submit" disabled={generatingAI}>{generatingAI ? 'Generating...' : 'Generate'}</button>
          </form>
        </section>

        <section>
          <h2>Upload</h2>
          <label>Upload a panoramic image: <input onChange={handleImageUpload} type="file" accept="image/*" /></label>
          <ul>
            <li>The image should be formatted with the equirectangular projection.</li>
            <li>The image should have an aspect ratio of 2:1 (the width must be exactly twice the height).</li>
          </ul>
          <p>A cubemap will be generated from your image.</p>
        </section>

        <section class="settings">
          <h2>Settings</h2>
          <div>
            <label>Cube Rotation: <input name="cubeRotation" type="number" min="0" max="359" value={settings.cubeRotation} onChange={handleSettingChange} />°</label>
          </div>
          <fieldset title="The resampling algorithm to use when generating the cubemap.">
            <legend>Interpolation type</legend>
            <label><input type="radio" name="interpolation" value="lanczos" checked={settings.interpolation === 'lanczos'} onChange={handleSettingChange} />Lanczos (best but slower)</label>
            <label><input type="radio" name="interpolation" value="cubic" checked={settings.interpolation === 'cubic'} onChange={handleSettingChange} />Cubic (sharper details)</label>
            <label><input type="radio" name="interpolation" value="linear" checked={settings.interpolation === 'linear'} onChange={handleSettingChange} />Linear (softer details)</label>
          </fieldset>
          <fieldset>
            <legend>Output format</legend>
            <label><input type="radio" name="format" value="png" checked={settings.format === 'png'} onChange={handleSettingChange} />PNG</label>
            <label><input type="radio" name="format" value="jpg" checked={settings.format === 'jpg'} onChange={handleSettingChange} />JPEG</label>
          </fieldset>
        </section>

        <section>
          <h2>Output</h2>
          <p>Click each cube face to save it to your computer.</p>
          <div id="cubemap">
            {generating && <b id="generating">Generating...</b>}
            <output id="faces">
              {Object.entries(faces).map(([name, { url, download, position }]) => (
                <Face key={name} name={name} url={url} download={download} position={position} />
              ))}
            </output>
          </div>
        </section>
      </main>

      <footer>
        <p>
          <small>By <a href="https://github.com/jaxry">Lucas Crane</a></small>
          <br />
          <small>Design by <a href="http://motherfuckingwebsite.com/">mf</a></small>
        </p>
      </footer>
    </>
  );
}

render(<App />, document.body);