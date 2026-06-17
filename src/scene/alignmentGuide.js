import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";

export function createAlignmentGuide() {
  if (APP_CONFIG.alignmentGuide.type === "rectangle") {
    return createRectangleGuide();
  }

  return createAxesGuide();
}

function createAxesGuide() {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.visible = false;

  const length = APP_CONFIG.alignmentGuide.axes.length;
  const thickness = APP_CONFIG.alignmentGuide.axes.thickness;

  const xGeom = new THREE.BoxGeometry(length, thickness, thickness);
  const zGeom = new THREE.BoxGeometry(thickness, thickness, length);
  const centerGeom = new THREE.BoxGeometry(
    thickness * 2.5,
    thickness * 2.5,
    thickness * 2.5
  );

  const xMat = new THREE.MeshBasicMaterial({ color: 0xe11d48 });
  const zMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
  const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const xAxis = new THREE.Mesh(xGeom, xMat);
  const zAxis = new THREE.Mesh(zGeom, zMat);
  const center = new THREE.Mesh(centerGeom, centerMat);

  xAxis.position.y = 0.01;
  zAxis.position.y = 0.01;
  center.position.y = 0.015;

  group.add(xAxis, zAxis, center);
  return group;
}

function createRectangleGuide() {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.visible = false;

  const width = APP_CONFIG.alignmentGuide.rectangle.width;
  const depth = APP_CONFIG.alignmentGuide.rectangle.depth;
  const thickness = APP_CONFIG.alignmentGuide.rectangle.thickness;
  const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const frontBackGeom = new THREE.BoxGeometry(width, thickness, thickness);
  const sideGeom = new THREE.BoxGeometry(thickness, thickness, depth);

  const front = new THREE.Mesh(frontBackGeom, mat);
  front.position.set(0, 0.01, -depth / 2);

  const back = new THREE.Mesh(frontBackGeom, mat);
  back.position.set(0, 0.01, depth / 2);

  const left = new THREE.Mesh(sideGeom, mat);
  left.position.set(-width / 2, 0.01, 0);

  const right = new THREE.Mesh(sideGeom, mat);
  right.position.set(width / 2, 0.01, 0);

  group.add(front, back, left, right);
  return group;
}
