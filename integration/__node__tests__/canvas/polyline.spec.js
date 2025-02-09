const { createCanvas } = require('canvas');
const fs = require('fs');
const { Polyline, Canvas } = require('@antv/g');
const { Renderer } = require('@antv/g-canvas');
const { sleep, diff } = require('../../util');

// create a node-canvas
const nodeCanvas = createCanvas(200, 200);

// create a renderer, unregister plugin relative to DOM
const renderer = new Renderer();
const domInteractionPlugin = renderer.getPlugin('dom-interaction');
renderer.unregisterPlugin(domInteractionPlugin);

const SIZE = 200;
const canvas = new Canvas({
  width: SIZE,
  height: SIZE,
  canvas: nodeCanvas, // use node-canvas
  renderer,
});

const RESULT_IMAGE = '/polyline.png';
const BASELINE_IMAGE_DIR = '/snapshots';

describe('Render <Polyline> with g-canvas', () => {
  afterEach(() => {
    canvas.removeChildren();
    fs.rmSync(__dirname + RESULT_IMAGE);
  });

  afterAll(() => {
    canvas.destroy();
  });

  it('should render polyline on server-side correctly.', async () => {
    await canvas.ready;
    const polyline = new Polyline({
      style: {
        points: [
          [10, 10],
          [10, 30],
          [30, 30],
        ],
        stroke: 'red',
        lineWidth: 6,
      },
    });
    canvas.appendChild(polyline);

    // dashed
    const polyline2 = polyline.cloneNode();
    polyline2.style.lineDash = [2];
    polyline2.translate(30, 0);
    canvas.appendChild(polyline2);

    // lineCap
    const polyline3 = polyline.cloneNode();
    polyline3.style.lineCap = 'round';
    polyline3.translate(60, 0);
    canvas.appendChild(polyline3);
    const polyline4 = polyline.cloneNode();
    polyline4.style.lineCap = 'square';
    polyline4.translate(90, 0);
    canvas.appendChild(polyline4);

    // lineJoin
    const polyline5 = polyline.cloneNode();
    polyline5.style.lineJoin = 'round';
    polyline5.translate(120, 0);
    canvas.appendChild(polyline5);

    const polyline6 = polyline.cloneNode();
    polyline6.style.lineJoin = 'miter'; // "bevel" | "miter" | "round";
    polyline6.translate(150, 0);
    canvas.appendChild(polyline6);

    await sleep(300);

    await new Promise((resolve) => {
      const out = fs.createWriteStream(__dirname + RESULT_IMAGE);
      const stream = nodeCanvas.createPNGStream();
      stream.pipe(out);
      out.on('finish', () => {
        resolve(undefined);
      });
    });

    expect(diff(__dirname + RESULT_IMAGE, __dirname + BASELINE_IMAGE_DIR + RESULT_IMAGE)).toBe(0);
  });
});
