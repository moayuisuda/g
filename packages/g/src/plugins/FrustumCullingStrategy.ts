import { inject, singleton } from 'mana-syringe';
import { vec3 } from 'gl-matrix';
import { CullingStrategyContribution } from './CullingPlugin';
import { AABB, Plane } from '../shapes';
import { Mask } from '../shapes';
import { DefaultCamera, Camera } from '../camera/Camera';
import type { DisplayObject } from '../display-objects/DisplayObject';
import type { Element } from '../dom';
import { SHAPE } from '..';

// group is not a 2d shape
const shape2D = [
  SHAPE.Circle,
  SHAPE.Ellipse,
  SHAPE.Image,
  SHAPE.Rect,
  SHAPE.Line,
  SHAPE.Polyline,
  SHAPE.Polygon,
  SHAPE.Text,
  SHAPE.Path,
  SHAPE.HTML,
];

@singleton({ contrib: CullingStrategyContribution })
export class FrustumCullingStrategy implements CullingStrategyContribution {
  @inject(DefaultCamera)
  private camera: Camera;

  isVisible(object: DisplayObject) {
    const cullable = object.cullable;
    if (!cullable.enable) {
      return true;
    }

    const renderBounds = object.getRenderBounds();
    if (!renderBounds) {
      return false;
    }

    // get VP matrix from camera
    const frustum = this.camera.getFrustum();

    const parentVisibilityPlaneMask = (object.parentNode as Element)?.cullable?.visibilityPlaneMask;
    cullable.visibilityPlaneMask = this.computeVisibilityWithPlaneMask(
      object,
      renderBounds,
      parentVisibilityPlaneMask || Mask.INDETERMINATE,
      frustum.planes,
    );

    cullable.visible = cullable.visibilityPlaneMask !== Mask.OUTSIDE;

    return cullable.visible;
  }

  /**
   *
   * @see「Optimized View Frustum Culling Algorithms for Bounding Boxes」
   * @see https://github.com/antvis/GWebGPUEngine/issues/3
   *
   * * 基础相交测试 the basic intersection test
   * * 标记 masking @see https://cesium.com/blog/2015/08/04/fast-hierarchical-culling/
   * * TODO: 平面一致性测试 the plane-coherency test
   * * TODO: 支持 mesh 指定自身的剔除策略，参考 Babylon.js @see https://doc.babylonjs.com/how_to/optimizing_your_scene#changing-mesh-culling-strategy
   *
   * @param aabb aabb
   * @param parentPlaneMask mask of parent
   * @param planes planes of frustum
   */
  private computeVisibilityWithPlaneMask(
    object: DisplayObject,
    aabb: AABB,
    parentPlaneMask: Mask,
    planes: Plane[],
  ) {
    if (parentPlaneMask === Mask.OUTSIDE || parentPlaneMask === Mask.INSIDE) {
      // 父节点完全位于视锥内或者外部，直接返回
      return parentPlaneMask;
    }

    // Start with MASK_INSIDE (all zeros) so that after the loop, the return value can be compared with MASK_INSIDE.
    // (Because if there are fewer than 31 planes, the upper bits wont be changed.)
    let mask = Mask.INSIDE;

    const isShape2D = shape2D.indexOf(object.nodeName as SHAPE) > -1;

    // Use viewport culling for 2D shapes
    // @see https://github.com/antvis/g/issues/914
    for (let k = 0, len = planes.length; k < len; ++k) {
      // For k greater than 31 (since 31 is the maximum number of INSIDE/INTERSECTING bits we can store), skip the optimization.
      const flag = 1 << k;

      if ((parentPlaneMask & flag) === 0) {
        // 父节点处于当前面内部，可以跳过
        continue;
      }

      // skip near & far planes when testing 2D shapes
      if (isShape2D && (k === 4 || k === 5)) {
        continue;
      }

      // p-vertex n-vertex <-|plane p-vertex n-vertex
      // 使用 p-vertex 和 n-vertex 加速，避免进行平面和 aabb 全部顶点的相交检测
      const { normal, distance } = planes[k];
      if (vec3.dot(normal, aabb.getPositiveFarPoint(planes[k])) + distance < 0) {
        return Mask.OUTSIDE;
      }
      if (vec3.dot(normal, aabb.getNegativeFarPoint(planes[k])) + distance < 0) {
        // 和当前面相交，对应位置为1，继续检测下一个面
        mask |= flag;
      }
    }

    return mask;
  }
}
