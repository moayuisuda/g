import { inject, injectable } from 'mana-syringe';
import {
  Line,
  LINE_CAP,
  LINE_JOIN,
  ParsedColorStyleProperty,
  Path,
  Pattern,
  PolygonShape,
  Polyline,
} from '@antv/g';
import { fillMatrix4x4, fillVec4, makeSortKeyOpaque, RendererLayer } from '../render/utils';
import { CullMode, Format, VertexBufferFrequency } from '../platform';
import { RenderInst } from '../render/RenderInst';
import { DisplayObject, PARSED_COLOR_TYPE, Point, SHAPE, Tuple4Number } from '@antv/g';
import { DeviceProgram } from '../render/DeviceProgram';
import { Batch, AttributeLocation } from './Batch';
import { ShapeRenderer } from '../tokens';

export const segmentInstanceGeometry = [0, -0.5, 0, 0, 1, -0.5, 1, 0, 1, 0.5, 1, 1, 0, 0.5, 0, 1];

export class InstancedLineProgram extends DeviceProgram {
  static a_Position = AttributeLocation.MAX;
  static a_PointA = AttributeLocation.MAX + 1;
  static a_PointB = AttributeLocation.MAX + 2;
  static a_Cap = AttributeLocation.MAX + 3;
  static a_Uv = AttributeLocation.MAX + 4;
  static a_Dash = AttributeLocation.MAX + 5;

  static ub_ObjectParams = 1;

  both: string = `
  ${Batch.ShaderLibrary.BothDeclaration}
  `;

  vert: string = `
  ${Batch.ShaderLibrary.VertDeclaration}
  layout(location = ${InstancedLineProgram.a_Position}) attribute vec2 a_Position;
  layout(location = ${InstancedLineProgram.a_PointA}) attribute vec2 a_PointA;
  layout(location = ${InstancedLineProgram.a_PointB}) attribute vec2 a_PointB;
  layout(location = ${InstancedLineProgram.a_Cap}) attribute float a_Cap;
  #ifdef USE_UV
    layout(location = ${InstancedLineProgram.a_Uv}) attribute vec2 a_Uv;
    varying vec2 v_Uv;
  #endif
  layout(location = ${InstancedLineProgram.a_Dash}) attribute vec3 a_Dash;

  varying vec4 v_Dash;
  // varying vec2 v_Normal;

  void main() {
    ${Batch.ShaderLibrary.Vert}
    ${Batch.ShaderLibrary.UvVert}

    vec2 xBasis = a_PointB - a_PointA;
    vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));
    // v_Normal = normalize(yBasis) * sign(a_Position.x - 0.5);

    vec2 point = a_PointA + xBasis * a_Position.x + yBasis * u_StrokeWidth * a_Position.y;
    point = point - a_Anchor.xy * abs(xBasis);

    // round
    if (a_Cap > 1.0 && a_Cap <= 2.0) {

    } else if (a_Cap > 2.0 && a_Cap <= 3.0) {
      point += sign(a_Position.x - 0.5) * normalize(xBasis) * vec2(u_StrokeWidth / 2.0);
    }

    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(point, 0.0, 1.0);

    v_Dash = vec4(a_Position.x, a_Dash);
  }
  `;

  frag: string = `
  ${Batch.ShaderLibrary.FragDeclaration}
  ${Batch.ShaderLibrary.UvFragDeclaration}
  ${Batch.ShaderLibrary.MapFragDeclaration}

  varying vec4 v_Dash;
  // varying vec2 v_Normal;
  
  void main() {
    ${Batch.ShaderLibrary.Frag}
    ${Batch.ShaderLibrary.MapFrag}

    gl_FragColor = u_StrokeColor;
    #ifdef USE_MAP
      gl_FragColor = u_Color;
    #endif

    // float blur = 1. - smoothstep(0.98, 1., length(v_Normal));
    float u_dash_offset = v_Dash.y;
    float u_dash_array = v_Dash.z;
    float u_dash_ratio = v_Dash.w;
    gl_FragColor.a = gl_FragColor.a
      // * blur
      * u_Opacity
      * ceil(mod(v_Dash.x + u_dash_offset, u_dash_array) - (u_dash_array * u_dash_ratio));
  }
`;
}

const LINE_CAP_MAP = {
  [LINE_CAP.Butt]: 1,
  [LINE_CAP.Round]: 2,
  [LINE_CAP.Square]: 3,
};

/**
 * use instanced for each segment
 * @see https://blog.scottlogic.com/2019/11/18/drawing-lines-with-webgl.html
 *
 * support dash array
 * TODO: joint & cap
 */
@injectable({
  token: { token: ShapeRenderer, named: SHAPE.Line },
})
export class InstancedLineRenderer extends Batch {
  protected program = new InstancedLineProgram();

  validate(object: DisplayObject) {
    // should split when using gradient & pattern
    const instance = this.instance;
    if (instance.nodeName === SHAPE.Line) {
      const source = instance.parsedStyle.stroke as ParsedColorStyleProperty;
      const target = object.parsedStyle.stroke as ParsedColorStyleProperty;

      // can't be merged if stroke's types are different
      if (source.type !== target.type) {
        return false;
      }

      // compare hash directly
      if (
        source.type !== PARSED_COLOR_TYPE.Constant &&
        target.type !== PARSED_COLOR_TYPE.Constant
      ) {
        return source.value.hash === target.value.hash;
      }
    }

    return true;
  }

  buildGeometry() {
    const interleaved = [];
    const indices = [];
    let offset = 0;
    this.objects.forEach((object) => {
      const line = object as Line;
      const { x1, y1, x2, y2, defX, defY, lineCap } = line.parsedStyle;

      const { dashOffset, dashSegmentPercent, dashRatioInEachSegment } = this.calcDash(
        object as Line,
      );

      interleaved.push(
        x1 - defX,
        y1 - defY,
        x2 - defX,
        y2 - defY,
        // caps
        LINE_CAP_MAP[lineCap],
        // dash
        dashOffset,
        dashSegmentPercent,
        dashRatioInEachSegment,
      );
      indices.push(0 + offset, 2 + offset, 1 + offset, 0 + offset, 3 + offset, 2 + offset);
      offset += 4;
    });

    this.geometry.setIndices(new Uint32Array(indices));
    this.geometry.vertexCount = 6;
    this.geometry.setVertexBuffer({
      bufferIndex: 1,
      byteStride: 4 * 4,
      frequency: VertexBufferFrequency.PerInstance,
      attributes: [
        {
          format: Format.F32_RG,
          bufferByteOffset: 4 * 0,
          location: InstancedLineProgram.a_Position,
          divisor: 0,
        },
        {
          format: Format.F32_RG,
          bufferByteOffset: 4 * 2,
          location: InstancedLineProgram.a_Uv,
          divisor: 0,
        },
      ],
      data: new Float32Array(segmentInstanceGeometry),
    });
    this.geometry.setVertexBuffer({
      bufferIndex: 2,
      byteStride: 4 * (2 + 2 + 1 + 3),
      frequency: VertexBufferFrequency.PerInstance,
      attributes: [
        {
          format: Format.F32_RG,
          bufferByteOffset: 4 * 0,
          location: InstancedLineProgram.a_PointA,
          divisor: 1,
        },
        {
          format: Format.F32_RG,
          bufferByteOffset: 4 * 2,
          location: InstancedLineProgram.a_PointB,
          divisor: 1,
        },
        {
          format: Format.F32_R,
          bufferByteOffset: 4 * 4,
          location: InstancedLineProgram.a_Cap,
          divisor: 1,
        },
        {
          format: Format.F32_RGB,
          bufferByteOffset: 4 * 5,
          location: InstancedLineProgram.a_Dash,
          divisor: 1,
        },
      ],
      data: new Float32Array(interleaved),
    });
  }

  updateAttribute(object: DisplayObject, name: string, value: any): void {
    super.updateAttribute(object, name, value);
    const geometry = this.geometry;
    const index = this.objects.indexOf(object);

    const { x1, y1, x2, y2, defX, defY, lineCap } = object.parsedStyle;

    if (name === 'x1' || name === 'y1' || name === 'x2' || name === 'y2') {
      geometry.updateVertexBuffer(
        2,
        InstancedLineProgram.a_PointA,
        index,
        new Uint8Array(new Float32Array([x1 - defX, y1 - defY, x2 - defX, y2 - defY]).buffer),
      );
    } else if (name === 'lineDashOffset' || name === 'lineDash') {
      const { dashOffset, dashSegmentPercent, dashRatioInEachSegment } = this.calcDash(
        object as Line,
      );
      geometry.updateVertexBuffer(
        2,
        InstancedLineProgram.a_Dash,
        index,
        new Uint8Array(
          new Float32Array([dashOffset, dashSegmentPercent, dashRatioInEachSegment]).buffer,
        ),
      );
    } else if (name === 'lineCap') {
      geometry.updateVertexBuffer(
        2,
        InstancedLineProgram.a_Cap,
        index,
        new Uint8Array(new Float32Array([LINE_CAP_MAP[lineCap]]).buffer),
      );
    }
  }

  uploadUBO(renderInst: RenderInst): void {
    renderInst.setBindingLayouts([{ numUniformBuffers: 1, numSamplers: 1 }]);
    renderInst.setSamplerBindingsFromTextureMappings([this.mapping]);
  }

  private calcDash(line: Line) {
    const { lineDash, lineDashOffset } = line.parsedStyle;
    const totalLength = line.getTotalLength();
    let dashOffset = 0;
    let dashSegmentPercent = 1;
    let dashRatioInEachSegment = 0;
    if (lineDash && lineDash.length) {
      dashOffset = lineDashOffset / totalLength;
      const segmentsLength = lineDash.reduce((cur, prev) => cur + prev, 0);
      dashSegmentPercent = segmentsLength / totalLength;
      dashRatioInEachSegment = lineDash[0] / segmentsLength;
    }
    return {
      dashOffset,
      dashSegmentPercent,
      dashRatioInEachSegment,
    };
  }
}
