import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import createSoilShaderMaterial, {type SoilShaderUniforms} from '@agrodt/three-soil-volume-shader';
import {ZstdVolumeLoader, loadZSTDDecLib} from '@agrodt/three-zstd-volume-loader';
import {GUI} from 'dat.gui';

import './style.css'

const CAMERA_OFFSET_FACTOR = 1.75;

const [
  {data: volumeData, xSize, ySize, zSize},
  cmData,
] = await Promise.all([
  loadZSTDDecLib().then(zstd => new ZstdVolumeLoader(zstd).loadAsync(new URL('/g1b01-010_020-solids.raw.zst', import.meta.url).toString())),
  new THREE.TextureLoader().loadAsync(new URL('/cm-default.webp', import.meta.url).toString()),
]);

const halfXSize = xSize / 2;
const halfYSize = ySize / 2;
const halfZSize = zSize / 2;
const radius = Math.max(xSize, ySize) / 2;

const texture = new THREE.Data3DTexture(volumeData, xSize, ySize, zSize);
texture.format = THREE.RedFormat;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.unpackAlignment = 1;
texture.needsUpdate = true;

cmData.colorSpace = THREE.SRGBColorSpace;
cmData.needsUpdate = true;

const material = createSoilShaderMaterial({
  data: texture,
  size: new THREE.Vector3(xSize, ySize, zSize),
  cmData,
  renderThreshold: 0.001,
});

const geometry = new THREE.BoxGeometry(xSize, ySize, zSize)
  .translate(halfXSize, halfYSize, halfZSize);

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera();
camera.up.set(0, 0, 1);
camera.position.set(xSize, ySize, zSize * 0.75);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minZoom = 1;
controls.maxZoom = 5;
controls.enablePan = false;

scene.add(new THREE.AxesHelper(Math.max(xSize, ySize, zSize) * 1.5));

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

controls.target.set(halfXSize, halfYSize, halfZSize);
controls.update();

function render() {
  renderer.render(scene, camera);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  const {horizontal, vertical} = getCameraPlanes(window.innerWidth / window.innerHeight);
  camera.left = -horizontal;
  camera.right = horizontal;
  camera.bottom = -vertical;
  camera.top = vertical;

  camera.updateProjectionMatrix();
  render();
}

function getCameraPlanes(aspect: number) {
  if (aspect >= 1) {
    return {
      horizontal: radius * aspect * CAMERA_OFFSET_FACTOR,
      vertical: halfZSize * CAMERA_OFFSET_FACTOR,
    };
  }
  return {
    horizontal: radius * CAMERA_OFFSET_FACTOR,
    vertical: halfZSize / aspect * CAMERA_OFFSET_FACTOR,
  };
}

controls.addEventListener('change', render);
window.addEventListener('resize', resize);

resize();

const uniforms = material.uniforms as SoilShaderUniforms;
const minDistance = uniforms.u_min_distance.value;
const maxDistance = uniforms.u_max_distance.value;

const gui = new GUI();

gui
  .add(uniforms.u_render_threshold, 'value', 0, 0.05, 0.0001)
  .name('Min. size')
  .onChange(render);

for (const prop of 'xyz') {
  const folder = gui.addFolder('Clip ' + prop.toUpperCase())
  folder
    .add(minDistance, prop as 'x' | 'y' | 'z', 0, 1, 0.01)
    .name('min')
    .onChange(render);
  folder
    .add(maxDistance, prop as 'x' | 'y' | 'z', 0, 1, 0.01)
    .name('max')
    .onChange(render);
  folder.open();
}
