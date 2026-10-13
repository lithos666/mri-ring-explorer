import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Independent BOM previews only. Imported STEP geometry is retained, then a
// proper rigid transform centres it and places the original X thickness on Z.
// This script never changes the magnetic model or assembly registrations.
const project = path.resolve(import.meta.dirname, '..');
const options = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.split('='); return [key.replace(/^--/, ''), value.join('=')];
}));
const source = path.resolve(options.source || 'G:/OneDrive/桌面/MRI/new_generation_prototype/模型');
const toolkit = path.resolve(options.toolkit || path.join(project, '../qa/cad-toolkit/node_modules/occt-import-js/dist/occt-import-js.js'));
const browserToolkit = path.resolve(options['browser-toolkit'] || path.join(project, '../qa/node_modules/playwright/index.mjs'));
const output = path.join(project, 'public/bom/cad');
fs.mkdirSync(output, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const boundsOf = positions => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const d = i % 3; min[d] = Math.min(min[d], positions[i]); max[d] = Math.max(max[d], positions[i]);
  }
  return { min, max, size: min.map((v, d) => max[d] - v) };
};
const { default: factory } = await import(pathToFileURL(toolkit).href);
const occt = await factory();
const configs = [
  { id: 'spacer', filename: '层间隔块.step', role: 'inter-layer-spacer', color: [0.18, 0.30, 0.44] },
  { id: 'side-support', filename: '左右.step', role: 'frame-side-support', color: [0.50, 0.47, 0.41] },
  { id: 'bottom-support', filename: '下面.step', role: 'frame-bottom-support', color: [0.50, 0.47, 0.41] },
];

function writeGLB(config, parsed, sourceBounds, sourceHash) {
  const center = sourceBounds.min.map((v, d) => (v + sourceBounds.max[d]) / 2);
  const chunks = [], bufferViews = [], accessors = [], meshes = [], nodes = [];
  let binaryLength = 0;
  const append = (typed, target, componentType, type, count, bounds) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const view = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: bytes.length, target });
    chunks.push(bytes); binaryLength += bytes.length;
    const padding = (4 - binaryLength % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); binaryLength += padding; }
    const index = accessors.length;
    accessors.push({ bufferView: view, componentType, count, type, ...(bounds ? { min: bounds.min, max: bounds.max } : {}) });
    return index;
  };
  parsed.meshes.forEach((mesh, index) => {
    const positions = new Float32Array(mesh.attributes.position.array.length);
    const sourcePositions = mesh.attributes.position.array;
    const normals = new Float32Array(mesh.attributes.normal?.array.length || 0);
    for (let i = 0; i < sourcePositions.length; i += 3) {
      positions[i] = sourcePositions[i + 1] - center[1];
      positions[i + 1] = sourcePositions[i + 2] - center[2];
      positions[i + 2] = sourcePositions[i] - center[0];
      if (normals.length) {
        const n = mesh.attributes.normal.array;
        normals[i] = n[i + 1]; normals[i + 1] = n[i + 2]; normals[i + 2] = n[i];
      }
    }
    const indices = new Uint32Array(mesh.index.array);
    const attributes = { POSITION: append(positions, 34962, 5126, 'VEC3', positions.length / 3, boundsOf(positions)) };
    if (normals.length) attributes.NORMAL = append(normals, 34962, 5126, 'VEC3', normals.length / 3);
    const indexAccessor = append(indices, 34963, 5125, 'SCALAR', indices.length);
    const name = `${config.id}-${String(index).padStart(2, '0')}`;
    const extras = { sourceMeshIndex: index, sourceName: mesh.name || '', role: config.role };
    meshes.push({ name, primitives: [{ attributes, indices: indexAccessor, material: 0 }], extras });
    nodes.push({ name, mesh: index, extras });
  });
  const gltf = {
    asset: { version: '2.0', generator: 'MRI Nerdfeast BOM STEP conversion', extras: { unit: 'millimeter', sourceSha256: sourceHash } },
    scene: 0, scenes: [{ nodes: nodes.map((_, index) => index) }], nodes, meshes,
    materials: [{ name: 'Illustrative polymer material', pbrMetallicRoughness: { baseColorFactor: [...config.color, 1], metallicFactor: 0, roughnessFactor: 0.52 }, doubleSided: false }],
    buffers: [{ byteLength: binaryLength }], bufferViews, accessors,
  };
  const unpadded = Buffer.from(JSON.stringify(gltf));
  const json = Buffer.concat([unpadded, Buffer.alloc((4 - unpadded.length % 4) % 4, 0x20)]);
  const binary = Buffer.concat(chunks), header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binaryHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8);
  jsonHeader.writeUInt32LE(json.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
  const bytes = Buffer.concat([header, jsonHeader, json, binaryHeader, binary]);
  const filename = `${config.id}.glb`;
  fs.writeFileSync(path.join(output, filename), bytes);
  return { url: `/bom/cad/${filename}`, bytes: bytes.length, sha256: hash(bytes), centeredBoundsMM: { min: [-sourceBounds.size[1]/2, -sourceBounds.size[2]/2, -sourceBounds.size[0]/2], max: [sourceBounds.size[1]/2, sourceBounds.size[2]/2, sourceBounds.size[0]/2], size: [sourceBounds.size[1], sourceBounds.size[2], sourceBounds.size[0]] }, sourceToPreview: [0,0,1,0, 1,0,0,0, 0,1,0,0, -center[1],-center[2],-center[0],1] };
}

const assets = [];
for (const config of configs) {
  const original = fs.readFileSync(path.join(source, config.filename));
  const parsed = occt.ReadStepFile(original, { linearUnit: 'millimeter', linearDeflectionType: 'absolute_value', linearDeflection: 0.08, angularDeflection: 0.22 });
  if (!parsed.success || !parsed.meshes?.length) throw new Error(`STEP import failed: ${config.filename}`);
  const sourceBounds = boundsOf(parsed.meshes.flatMap(mesh => mesh.attributes.position.array));
  const sha256 = hash(original);
  const asset = { id: config.id, role: config.role, sourceFilename: config.filename, sourceSha256: sha256, sourceBytes: original.length, sourceBoundsMM: sourceBounds, sourceMeshCount: parsed.meshes.length, vertices: parsed.meshes.reduce((sum, mesh) => sum + mesh.attributes.position.array.length / 3, 0), triangles: parsed.meshes.reduce((sum, mesh) => sum + mesh.index.array.length / 3, 0), ...writeGLB(config, parsed, sourceBounds, sha256) };
  if (config.id === 'spacer') {
    const radii = [...original.toString('utf8').matchAll(/CYLINDRICAL_SURFACE\([^;]*,([\d.]+)\);/g)].map(match => Number(match[1])).sort((a,b) => a-b);
    if (radii.length !== 2 || Math.abs(radii[0]-3.1)>1e-9 || Math.abs(radii[1]-7)>1e-9 || Math.abs(sourceBounds.size[0]-18)>1e-6) throw new Error('Spacer source dimensions changed; review its STEP cylinders before updating size labels.');
    asset.confirmedGeometryMM = { length: 18, outerDiameter: 14, throughHoleDiameter: 6.2, evidence: 'STEP CYLINDRICAL_SURFACE radii 3.1 and 7.0 mm, both aligned with original X; X extent is 18 mm.' };
  }
  assets.push(asset);
  console.log(JSON.stringify({ id: asset.id, meshes: asset.sourceMeshCount, sizeMM: sourceBounds.size, glbBytes: asset.bytes, ...(asset.confirmedGeometryMM ? { confirmed: asset.confirmedGeometryMM } : {}) }));
}

const renderHTML = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:white;overflow:hidden}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body><script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const mode=new URLSearchParams(location.search).get('id')||'spacer';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(1); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap; document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('white');
const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(new RoomEnvironment(),0.03).texture;scene.environmentIntensity=0.55;
scene.add(new THREE.HemisphereLight(0xffffff,0x9197a0,.75));
const key=new THREE.DirectionalLight(0xfff3e3,2.7);key.position.set(100,160,130);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-0.00006;key.shadow.normalBias=0.035;scene.add(key);
const fill=new THREE.DirectionalLight(0xcddfff,.9);fill.position.set(-110,70,35);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.4);rim.position.set(10,90,-130);scene.add(rim);
const root=new THREE.Group();scene.add(root);const loader=new GLTFLoader();
const load=async(id,x=0)=>{const {scene:model}=await loader.loadAsync('/bom/cad/'+id+'.glb');model.position.x=x;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.envMapIntensity=0.55;const line=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,30),new THREE.LineBasicMaterial({color:0x515660,transparent:true,opacity:0.24}));o.add(line);}});root.add(model);};
if(mode==='frame-supports'){await load('side-support',-62);await load('bottom-support',62);}else{await load(mode);}
const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
root.position.y-=box.min.y;const maxDim=Math.max(size.x,size.y,size.z),aspect=innerWidth/innerHeight;
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,Math.max(1000,maxDim*25));
const target=new THREE.Vector3(center.x,size.y*0.53,0); const direction=new THREE.Vector3(1.35,.88,1.8).normalize();camera.position.copy(target).addScaledVector(direction,maxDim*4);camera.lookAt(target);camera.updateMatrixWorld();
const currentBox=new THREE.Box3().setFromObject(root);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let i=0;i<8;i++){const p=new THREE.Vector3(i&1?currentBox.max.x:currentBox.min.x,i&2?currentBox.max.y:currentBox.min.y,i&4?currentBox.max.z:currentBox.min.z).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
const span=Math.max((maxX-minX)/aspect,maxY-minY)*1.24;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(maxDim*14,maxDim*14),new THREE.ShadowMaterial({color:0x53606e,opacity:0.14}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.05;floor.receiveShadow=true;scene.add(floor);
const shadowExtent=maxDim*2;key.shadow.camera.left=-shadowExtent;key.shadow.camera.right=shadowExtent;key.shadow.camera.top=shadowExtent;key.shadow.camera.bottom=-shadowExtent;key.shadow.camera.near=.1;key.shadow.camera.far=1000;key.target.position.copy(target);scene.add(key.target);key.shadow.camera.updateProjectionMatrix();
renderer.render(scene,camera);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));renderer.render(scene,camera);document.body.dataset.ready='true';window.renderFacts={id:mode,meshCount:root.children.length,geometrySizeMM:size.toArray()};
</script></body></html>`;
const threeDirectory = path.join(project, 'node_modules/three');
const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/') { response.setHeader('Content-Type', 'text/html;charset=utf-8'); response.end(renderHTML); return; }
    let filename;
    if (pathname.startsWith('/three/')) filename = path.resolve(threeDirectory, pathname.slice('/three/'.length));
    else if (pathname.startsWith('/bom/cad/')) filename = path.resolve(output, pathname.slice('/bom/cad/'.length));
    if (!filename || (![threeDirectory,output].some(directory => filename.startsWith(directory + path.sep)))) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary'); response.end(fs.readFileSync(filename));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(pathToFileURL(browserToolkit).href);
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 520 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const id of [...configs.map(config => config.id), 'frame-supports']) {
    await page.goto(`http://127.0.0.1:${server.address().port}/?id=${id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body[data-ready="true"]');
    if (errors.length) throw new Error(errors.join('\n'));
    const filename = `${id}.png`; await page.locator('canvas').screenshot({ path: path.join(output, filename) });
    const bytes = fs.readFileSync(path.join(output, filename));
    const thumbnail = { url: `/bom/cad/${filename}`, bytes: bytes.length, sha256: hash(bytes), width: 800, height: 520 };
    const asset = assets.find(item => item.id === id);
    if (asset) asset.thumbnail = thumbnail; else assets.push({ id, roles: ['frame-side-support', 'frame-bottom-support'], thumbnail });
  }
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
const manifest = { schemaVersion: 1, unit: 'millimeter', previewOnly: true, presentation: 'Rigidly centred STEP geometry, neutral illustrative polymer material and a white studio render. Model colour is not a manufacturing material specification.', assets };
fs.writeFileSync(path.join(project, 'lib/bom-cad-assets.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Created ${configs.length} independent CAD GLBs and ${assets.length} white-background thumbnails; no assembly or field assets were changed.`);
