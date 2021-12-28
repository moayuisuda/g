import { DisplayObject, DisplayObjectConfig, BaseStyleProps } from '@antv/g';

export enum FogType {
  NONE = 0,
  EXP = 1,
  EXP2 = 2,
  LINEAR = 3,
}

export interface FogProps extends BaseStyleProps {
  // @see https://doc.babylonjs.com/advanced_topics/shaders/Fog+ShaderMat
  // @see https://developer.playcanvas.com/en/api/pc.Scene.html#fog
  type: FogType;
  density: number;
  start: number;
  end: number;
}
export class Fog extends DisplayObject<FogProps> {
  static tag = 'fog';

  constructor({ style, ...rest }: DisplayObjectConfig<FogProps> = {}) {
    super({
      type: Fog.tag,
      style: {
        type: FogType.NONE,
        fill: 'black',
        start: 1,
        end: 1000,
        density: 0,
        ...style,
      },
      ...rest,
    });
  }

  // abstract getUniformWordCount(): number;
}
