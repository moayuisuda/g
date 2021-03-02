import { ITexture2D, ITexture2DInitializationOptions } from '..';
import regl from 'regl';
import { colorSpaceMap, dataTypeMap, filterMap, formatMap, gl, mipmapMap, wrapModeMap } from '../constants';

/**
 * adaptor for regl.Buffer
 * @see https://github.com/regl-project/regl/blob/gh-pages/API.md#buffers
 */
export default class ReglTexture2D implements ITexture2D {
  private texture: regl.Texture2D;
  private width: number;
  private height: number;

  constructor(reGl: regl.Regl, options: ITexture2DInitializationOptions) {
    const {
      data,
      type = gl.UNSIGNED_BYTE,
      width,
      height,
      flipY = false,
      format = gl.RGBA,
      mipmap = false,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      aniso = 0,
      alignment = 1,
      premultiplyAlpha = false,
      mag = gl.NEAREST,
      min = gl.NEAREST,
      colorSpace = gl.BROWSER_DEFAULT_WEBGL,
    } = options;
    this.width = width;
    this.height = height;

    const textureOptions: regl.Texture2DOptions = {
      width,
      height,
      // @ts-ignore
      type: dataTypeMap[type],
      format: formatMap[format],
      wrapS: wrapModeMap[wrapS],
      wrapT: wrapModeMap[wrapT],
      // @ts-ignore
      mag: filterMap[mag],
      min: filterMap[min],
      alignment,
      flipY,
      colorSpace: colorSpaceMap[colorSpace],
      premultiplyAlpha,
      aniso,
    };

    if (data) {
      textureOptions.data = data;
    }

    if (typeof mipmap === 'number') {
      textureOptions.mipmap = mipmapMap[mipmap];
    } else if (typeof mipmap === 'boolean') {
      textureOptions.mipmap = mipmap;
    }

    this.texture = reGl.texture(textureOptions);
  }

  public get() {
    return this.texture;
  }
  public update() {
    // @ts-ignore
    this.texture._texture.bind();
  }

  public resize({ width, height }: { width: number; height: number }): void {
    this.texture.resize(width, height);
    this.width = width;
    this.height = height;
  }

  public destroy() {
    this.texture.destroy();
  }
}
