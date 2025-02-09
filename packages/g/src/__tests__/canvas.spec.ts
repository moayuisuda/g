import type { FederatedPointerEvent } from '@antv/g';
import { Canvas, CanvasEvent, Circle, Group } from '@antv/g';
import { Renderer as CanvasRenderer } from '@antv/g-canvas';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import chai, { expect } from 'chai';
// @ts-ignore
import chaiAlmost from 'chai-almost';
// @ts-ignore
import sinon from 'sinon';
// @ts-ignore
import sinonChai from 'sinon-chai';

chai.use(chaiAlmost(0.0001));
chai.use(sinonChai);

const $container = document.createElement('div');
$container.id = 'container';
document.body.prepend($container);

const renderer = new CanvasRenderer();

// create a canvas
const canvas = new Canvas({
  container: 'container',
  width: 600,
  height: 500,
  renderer,
});

describe('Canvas', () => {
  afterEach(() => {
    canvas.removeChildren();
  });

  afterAll(() => {
    canvas.destroy();
  });

  it('should not trigger CanvasEvent when switching renderer', async () => {
    const readyCallback = sinon.spy();
    const beforeDestroyCallback = sinon.spy();
    canvas.addEventListener(CanvasEvent.READY, readyCallback);
    canvas.addEventListener(CanvasEvent.BEFORE_DESTROY, beforeDestroyCallback);

    await canvas.setRenderer(new SVGRenderer());

    // @ts-ignore
    expect(readyCallback).to.have.been.not.called;
    // @ts-ignore
    expect(beforeDestroyCallback).to.have.been.not.called;
  });

  it('should generate correct composed path', async () => {
    let point = canvas.getClientByPoint(0, 0);
    expect(point.x).eqls(8);
    expect(point.y).eqls(8);

    point = canvas.getPointByClient(8, 8);
    expect(point.x).eqls(0);
    expect(point.y).eqls(0);

    const circle = new Circle({
      style: {
        cx: 100,
        cy: 100,
        r: 100,
        fill: 'red',
      },
    });

    canvas.addEventListener(CanvasEvent.READY, () => {
      canvas.appendChild(circle);
    });

    const handlePointerDown = (e) => {
      // target
      expect(e.target).to.be.eqls(circle);
      // currentTarget
      expect(e.currentTarget).to.be.eqls(canvas);

      // composed path
      const path = e.composedPath();
      expect(path.length).to.be.eqls(4);
      expect(path[0]).to.be.eqls(circle);
      expect(path[1]).to.be.eqls(canvas.document.documentElement);
      expect(path[2]).to.be.eqls(canvas.document);
      expect(path[3]).to.be.eqls(canvas);

      // pointer type
      expect(e.pointerType).to.be.eqls('mouse');

      // coordinates
      expect(e.clientX).to.be.eqls(100);
      expect(e.clientY).to.be.eqls(100);
      expect(e.screenX).to.be.eqls(200);
      expect(e.screenY).to.be.eqls(200);
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { once: true });

    const $canvas = canvas.getContextService().getDomElement();

    $canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'mouse',
        clientX: 100,
        clientY: 100,
        screenX: 200,
        screenY: 200,
      }),
    );
  });

  it('should return Document & Canvas when hit nothing', async () => {
    const circle = new Circle({
      style: {
        cx: 100,
        cy: 100,
        r: 100,
        fill: 'red',
      },
    });

    canvas.addEventListener(CanvasEvent.READY, () => {
      canvas.appendChild(circle);
    });

    canvas.addEventListener(
      'pointerdown',
      (e) => {
        // target
        expect(e.target).to.be.eqls(canvas.document);
        // currentTarget
        expect(e.currentTarget).to.be.eqls(canvas);

        // composed path
        const path = e.composedPath();

        expect(path.length).to.be.eqls(2);
        expect(path[0]).to.be.eqls(canvas.document);
        expect(path[1]).to.be.eqls(canvas);
      },
      { once: true },
    );

    const $canvas = canvas.getContextService().getDomElement();
    $canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'mouse',
        clientX: 400,
        clientY: 400,
        screenX: 500,
        screenY: 500,
      }),
    );

    canvas.addEventListener(
      'pointermove',
      (e) => {
        // target
        expect(e.target).to.be.eqls(canvas.document);

        // composed path
        const path = e.composedPath();

        expect(path.length).to.be.eqls(2);
        expect(path[0]).to.be.eqls(canvas.document);
        expect(path[1]).to.be.eqls(canvas);
      },
      { once: true },
    );
    $canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: 2400,
        clientY: 2400,
        screenX: 2500,
        screenY: 2500,
      }),
    );
  });

  it('should convert client & viewport coordinates correctly', async () => {
    const circle = new Circle({
      style: {
        cx: 100,
        cy: 100,
        r: 100,
        fill: 'red',
      },
    });

    canvas.addEventListener(CanvasEvent.READY, () => {
      canvas.appendChild(circle);
    });

    canvas.addEventListener(
      'pointerdown',
      // @ts-ignore
      (e: FederatedPointerEvent) => {
        // currentTarget
        expect(e.currentTarget).to.be.eqls(canvas);

        // coordinates
        expect(e.clientX).to.be.eqls(100);
        expect(e.clientY).to.be.eqls(100);
        expect(e.screenX).to.be.eqls(200);
        expect(e.screenY).to.be.eqls(200);
        expect(e.viewportX).to.almost.eqls(100 - left);
        expect(e.viewportY).to.almost.eqls(100 - top);
        expect(e.canvasX).to.almost.eqls(100 - left);
        expect(e.canvasY).to.almost.eqls(100 - top);

        const viewport = canvas.canvas2Viewport({ x: e.canvasX, y: e.canvasY });

        expect(viewport.x).to.almost.eqls(100 - left);
        expect(viewport.y).to.almost.eqls(100 - top);

        const { x: canvasX, y: canvasY } = canvas.viewport2Canvas({
          x: e.viewportX,
          y: e.viewportY,
        });
        expect(canvasX).to.almost.eqls(100 - left);
        expect(canvasY).to.almost.eqls(100 - top);
      },
      { once: true },
    );

    const $canvas = canvas.getContextService().getDomElement();
    const { top, left } = ($canvas as HTMLCanvasElement).getBoundingClientRect();

    $canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'mouse',
        clientX: 100,
        clientY: 100,
        screenX: 200,
        screenY: 200,
      }),
    );
  });

  it("should acount for camera's position when converting", async () => {
    const camera = canvas.getCamera();
    const $canvas = canvas.getContextService().getDomElement();
    const { top, left } = ($canvas as HTMLCanvasElement).getBoundingClientRect();

    const circle = new Circle({
      style: {
        cx: 100,
        cy: 100,
        r: 100,
        fill: 'red',
      },
    });
    canvas.addEventListener(CanvasEvent.READY, () => {
      canvas.appendChild(circle);
    });

    canvas.addEventListener(
      'pointerdown',
      // @ts-ignore
      (e: FederatedPointerEvent) => {
        // coordinates
        expect(e.clientX).to.be.eqls(100);
        expect(e.clientY).to.be.eqls(100);
        expect(e.screenX).to.be.eqls(200);
        expect(e.screenY).to.be.eqls(200);
        expect(e.viewportX).to.almost.eqls(100 - left);
        expect(e.viewportY).to.almost.eqls(100 - top);
        expect(e.canvasX).to.almost.eqls(200 - left); // canvasX changed
        expect(e.canvasY).to.almost.eqls(100 - top);

        const { x: viewportX, y: viewportY } = canvas.getPointByClient(100, 100);
        expect(viewportX).to.almost.eqls(100 - left);
        expect(viewportY).to.almost.eqls(100 - top);

        const { x: clientX, y: clientY } = canvas.getClientByPoint(viewportX, viewportY);
        expect(clientX).to.almost.eqls(100);
        expect(clientY).to.almost.eqls(100);
      },
      { once: true },
    );

    // move camera
    camera.pan(100, 0);

    $canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'mouse',
        clientX: 100,
        clientY: 100,
        screenX: 200,
        screenY: 200,
      }),
    );
  });

  it('should query child with multiple classnames correctly', () => {
    const group3 = new Group({
      id: 'id3',
      name: 'group3',
      className: 'c1 c2 c3',
    });
    canvas.appendChild(group3);

    expect(canvas.document.getElementsByClassName('c1').length).to.eqls(1);
    expect(canvas.document.getElementsByClassName('c2').length).to.eqls(1);
    expect(canvas.document.getElementsByClassName('c3').length).to.eqls(1);
  });

  // it("should acount for camera's zoom when converting", async () => {
  //   const camera = canvas.getCamera();
  //   const $canvas = canvas.getContextService().getDomElement();
  //   const { top, left } = ($canvas as HTMLCanvasElement).getBoundingClientRect();

  //   const circle = new Circle({
  //     style: {
  //       cx: 100,
  //       cy: 100,
  //       r: 100,
  //       fill: 'red',
  //     },
  //   });
  //   canvas.appendChild(circle);

  //   await sleep(100);

  //   canvas.addEventListener(
  //     'pointerdown',
  //     // @ts-ignore
  //     (e: FederatedPointerEvent) => {
  //       // currentTarget
  //       expect(e.currentTarget).to.be.eqls(canvas);

  //       // coordinates
  //       expect(e.clientX).to.be.eqls(100);
  //       expect(e.clientY).to.be.eqls(100);
  //       expect(e.screenX).to.be.eqls(200);
  //       expect(e.screenY).to.be.eqls(200);
  //       expect(e.viewportX).to.almost.eqls(100 - left);
  //       expect(e.viewportY).to.almost.eqls(100 - top);
  //       expect(e.canvasX).to.almost.eqls(100 - left);
  //       expect(e.canvasY).to.almost.eqls(100 - top);

  //       const viewport = canvas.canvas2Viewport({ x: e.canvasX, y: e.canvasY });

  //       expect(viewport.x).to.almost.eqls(100 - left);
  //       expect(viewport.y).to.almost.eqls(100 - top);

  //       const { x: canvasX, y: canvasY } = canvas.viewport2Canvas({
  //         x: e.viewportX,
  //         y: e.viewportY,
  //       });
  //       expect(canvasX).to.almost.eqls(100 - left);
  //       expect(canvasY).to.almost.eqls(100 - top);
  //     },
  //     { once: true },
  //   );

  //   // move camera
  //   camera.setZoom(2);

  //   $canvas.dispatchEvent(
  //     new PointerEvent('pointerdown', {
  //       pointerType: 'mouse',
  //       clientX: 100,
  //       clientY: 100,
  //       screenX: 200,
  //       screenY: 200,
  //     }),
  //   );
  // });
});
