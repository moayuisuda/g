import { expect } from 'chai';
import { mat4, quat, vec3 } from 'gl-matrix';
import { AABB } from '../AABB';
import { Frustum } from '../Frustum';
import { Plane } from '../Plane';

describe('Frustum', () => {
  test('should extract 6 planes from VP matrix.', () => {
    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -1, 1, -1, 1, -1, 1);

    const viewMatrix = mat4.create();
    mat4.invert(
      viewMatrix,
      mat4.lookAt(mat4.create(), vec3.fromValues(0, 0, 10), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0))
    );

    const vpMatrix = mat4.mul(mat4.create(), projectionMatrix, viewMatrix);

    const frustum = new Frustum();
    frustum.extractFromVPMatrix(vpMatrix);

    // right plane
    expect(frustum.planes[0].normal).to.eqls(vec3.fromValues(-1, 0, 0));
    expect(frustum.planes[0].distance).to.eqls(-1);

    // left
    expect(frustum.planes[1].normal).to.eqls(vec3.fromValues(1, 0, 0));
    expect(frustum.planes[1].distance).to.eqls(-1);

    // bottom
    expect(frustum.planes[2].normal).to.eqls(vec3.fromValues(0, 1, 0));
    expect(frustum.planes[2].distance).to.eqls(-1);

    // top
    expect(frustum.planes[3].normal).to.eqls(vec3.fromValues(0, -1, 0));
    expect(frustum.planes[3].distance).to.eqls(-1);

    // far
    expect(frustum.planes[4].normal).to.eqls(vec3.fromValues(0, 0, 1));
    expect(frustum.planes[4].distance).to.eqls(-11);

    // near
    expect(frustum.planes[5].normal).to.eqls(vec3.fromValues(0, 0, -1));
    expect(frustum.planes[5].distance).to.eqls(9);
  });
});
