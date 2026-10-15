// @ts-nocheck
import { ensureArtwork, IText } from './artwork';

// Decal geometry is projected onto a parent mesh and lives in that mesh's local space,
// so it follows the mesh when the mesh moves, scales or is cloned.
// userData.decal = { pos: [x,y,z] (local), nrm: [x,y,z] (local), size (world units), angle (radians) }

export function buildDecalGeometry(THREE, parent, p) {
  parent.updateWorldMatrix(true, false);
  const posW = new THREE.Vector3(...p.pos).applyMatrix4(parent.matrixWorld);
  const nrmW = new THREE.Vector3(...p.nrm).transformDirection(parent.matrixWorld);

  const helper = new THREE.Object3D();
  helper.position.copy(posW);
  helper.lookAt(posW.clone().add(nrmW));
  helper.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), p.angle || 0));
  const orientation = new THREE.Euler().setFromQuaternion(helper.quaternion);

  const s = p.size;
  const geo = new THREE.DecalGeometry(parent, posW, orientation, new THREE.Vector3(s, s, s * 0.5));

  // Back to the parent's local space, nudged off the surface to avoid z-fighting
  geo.applyMatrix4(new THREE.Matrix4().copy(parent.matrixWorld).invert());
  const eps = (s * 0.004) / (parent.getWorldScale(new THREE.Vector3()).x || 1);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (pos && nor) {
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) + nor.getX(i) * eps, pos.getY(i) + nor.getY(i) * eps, pos.getZ(i) + nor.getZ(i) * eps);
    }
  }
  return geo;
}

let counter = 0;

export function createDecal(THREE, parent, pointW, normalW, sizeW) {
  parent.updateWorldMatrix(true, false);
  const params = {
    pos: parent.worldToLocal(pointW.clone()).toArray(),
    nrm: normalW.clone().transformDirection(new THREE.Matrix4().copy(parent.matrixWorld).invert()).toArray(),
    size: sizeW,
    angle: 0,
  };
  const mat = new THREE.MeshStandardMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    roughness: 0.6, metalness: 0,
  });
  const mesh = new THREE.Mesh(buildDecalGeometry(THREE, parent, params), mat);
  mesh.name = `Decal_${++counter}`;
  mesh.renderOrder = 1;
  mesh.receiveShadow = true;
  mesh.userData = { isDecal: true, userPart: true, decal: params };
  parent.add(mesh);

  const entry = ensureArtwork(THREE, mesh, { size: 512, transparent: true });
  entry.canvas.add(new IText('Text', {
    left: 256, top: 256, originX: 'center', originY: 'center', fontSize: 90, fill: '#111111', fontFamily: 'Arial',
  }));
  return mesh;
}

export function updateDecal(THREE, mesh, patch) {
  if (!mesh.parent || !mesh.parent.isMesh) return;
  Object.assign(mesh.userData.decal, patch);
  const old = mesh.geometry;
  mesh.geometry = buildDecalGeometry(THREE, mesh.parent, mesh.userData.decal);
  old.dispose();
}
