import type { DisplayObject, ParsedBaseStyleProps, ParsedRectStyleProps } from '@antv/g';
import { singleton } from '@antv/g';
import { CanvasRenderer } from '@antv/g-canvas';
import { generateRoughOptions } from '../util';

@singleton({
  token: CanvasRenderer.RectRendererContribution,
})
export class RectRenderer implements CanvasRenderer.StyleRenderer {
  hash: (parsedStyle: ParsedBaseStyleProps) => string;

  render(
    context: CanvasRenderingContext2D,
    parsedStyle: ParsedRectStyleProps,
    object: DisplayObject<any, any>,
  ) {
    const { width, height } = parsedStyle as ParsedRectStyleProps;
    // @see https://github.com/rough-stuff/rough/wiki#rectangle-x-y-width-height--options
    // @ts-ignore
    context.roughCanvas.rectangle(0, 0, width.value, height.value, generateRoughOptions(object));
  }
}
