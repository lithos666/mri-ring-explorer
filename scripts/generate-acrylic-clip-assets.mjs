import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Exact supplied STEP geometry, with one proper rigid centering transform.
// The original is kept in source control for reproducible mesh generation;
// it is not added to the four-file final-print download list.
const project=path.resolve(import.meta.dirname,'..');
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...value]=arg.split('=');return [key.replace(/^--/,''),value.join('=')];}));
const sourceFilename='用于固定亚克力卡扣.step';
const archivedSource=path.join(project,'assets/cad/acrylic-clip.step');
const source=options.source?path.resolve(options.source):fs.existsSync(archivedSource)?archivedSource:'G:/OneDrive/桌面/MRI/new_generation_prototype/模型/'+sourceFilename;
const toolkit=path.resolve(options.toolkit||path.join(project,'../qa/cad-toolkit/node_modules/occt-import-js/dist/occt-import-js.js'));
const browserToolkit=path.resolve(options['browser-toolkit']||path.join(project,'../qa/node_modules/playwright/index.mjs'));
const output=path.join(project,'public/assembly/tools');
fs.mkdirSync(output,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const boundsOf=positions=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++){const d=i%3;min[d]=Math.min(min[d],positions[i]);max[d]=Math.max(max[d],positions[i]);}return {min,max,size:min.map((v,d)=>max[d]-v)};};
const {default:factory}=await import(pathToFileURL(toolkit).href);
const occt=await factory();
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
    asset: { version: '2.0', generator: 'portableMRI NerdFest - 2 supplied clip STEP conversion', extras: { unit: 'millimeter', sourceSha256: sourceHash } },
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
  return { url: `/assembly/tools/${filename}`, bytes: bytes.length, sha256: hash(bytes), centeredBoundsMM: { min: [-sourceBounds.size[1]/2, -sourceBounds.size[2]/2, -sourceBounds.size[0]/2], max: [sourceBounds.size[1]/2, sourceBounds.size[2]/2, sourceBounds.size[0]/2], size: [sourceBounds.size[1], sourceBounds.size[2], sourceBounds.size[0]] }, sourceToPreview: [0,0,1,0, 1,0,0,0, 0,1,0,0, -center[1],-center[2],-center[0],1] };
}

const config={id:'acrylic-clip',role:'temporary-acrylic-retaining-clip',color:[0.10,0.24,0.37]};
const bytes=fs.readFileSync(source);
assert(bytes.toString('utf8').includes('SI_UNIT(.MILLI.,.METRE.)'),'Source STEP must declare millimetre units.');
const parsed=occt.ReadStepFile(bytes,{linearUnit:'millimeter',linearDeflectionType:'absolute_value',linearDeflection:0.06,angularDeflection:0.18});
assert(parsed.success&&parsed.meshes?.length===1,'Expected the supplied single clip solid.');
const sourceBounds=boundsOf(parsed.meshes.flatMap(mesh=>mesh.attributes.position.array));
const center=sourceBounds.min.map((v,d)=>(v+sourceBounds.max[d])/2);
assert(Math.abs(sourceBounds.size[0]-27.1)<1e-6,'Review axial thickness if the source changes.');
const innerPlanes=parsed.meshes.flatMap(mesh=>{const a=mesh.attributes.position.array,n=mesh.attributes.normal.array;const planes=[];for(let i=0;i<a.length;i+=3)if(Math.abs(n[i])>.9999)planes.push([a[i],Math.sign(n[i])]);return planes;});
const lower=innerPlanes.filter(([x,s])=>s===1&&Math.abs(x-455.954083834706)<1e-5);
const upper=innerPlanes.filter(([x,s])=>s===-1&&Math.abs(x-473.054083834707)<1e-5);
assert(lower.length&&upper.length,'Both opposed inner-jaw planes must remain present.');
const asset={schemaVersion:1,id:config.id,role:config.role,unit:'millimeter',sourceFilename,sourceRelativePath:'assets/cad/acrylic-clip.step',sourceSha256:hash(bytes),sourceBytes:bytes.length,sourceBoundsMM:sourceBounds,sourceMeshCount:parsed.meshes.length,vertices:parsed.meshes.reduce((sum,m)=>sum+m.attributes.position.array.length/3,0),triangles:parsed.meshes.reduce((sum,m)=>sum+m.index.array.length/3,0),...writeGLB(config,parsed,sourceBounds,hash(bytes)),jawOpening:{axis:[0,0,1],clearanceMM:17.1,innerPlanesMM:[-8.55,8.55],insertionOpeningDirection:[-0.5405078640591351,-0.8413389619471047,0],sourceInnerPlanesMM:[455.954083834706,473.054083834707],evidence:'Opposed STEP faces have axial normals +X and -X and are 17.1 mm apart. Centered preview maps original X to Z. This does not establish acrylic thickness, safe retention force or verified installation points.'},materialStatus:'unconfirmed',quantityStatus:'unconfirmed',assemblyRegistrationStatus:'conceptual-contact-demonstration-not-validated-ring-placement',presentation:'Exact STEP mesh; display colour is illustrative, not a manufacturing material specification.'};
fs.mkdirSync(path.dirname(archivedSource),{recursive:true});
if(path.resolve(source)!==path.resolve(archivedSource))fs.copyFileSync(source,archivedSource);
const renderHTML = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:white;overflow:hidden}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body><script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const mode='acrylic-clip';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(1); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap; document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('white');
const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(new RoomEnvironment(),0.03).texture;scene.environmentIntensity=0.55;
scene.add(new THREE.HemisphereLight(0xffffff,0x9197a0,.75));
const key=new THREE.DirectionalLight(0xfff3e3,2.7);key.position.set(100,160,130);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-0.00006;key.shadow.normalBias=0.035;scene.add(key);
const fill=new THREE.DirectionalLight(0xcddfff,.9);fill.position.set(-110,70,35);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.4);rim.position.set(10,90,-130);scene.add(rim);
const root=new THREE.Group();scene.add(root);const loader=new GLTFLoader();
const load=async(id,x=0)=>{const {scene:model}=await loader.loadAsync('/assembly/tools/'+id+'.glb');model.position.x=x;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.envMapIntensity=0.55;const line=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,30),new THREE.LineBasicMaterial({color:0x515660,transparent:true,opacity:0.24}));o.add(line);}});root.add(model);};
await load(mode);root.rotation.z=-Math.atan2(-0.8413389619471047,-0.5405078640591351);
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
const threeDirectory=path.join(project,'node_modules/three');
const server=http.createServer((request,response)=>{try{const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);if(pathname==='/'){response.setHeader('Content-Type','text/html;charset=utf-8');response.end(renderHTML);return;}let filename;if(pathname.startsWith('/three/'))filename=path.resolve(threeDirectory,pathname.slice('/three/'.length));else if(pathname.startsWith('/assembly/tools/'))filename=path.resolve(output,pathname.slice('/assembly/tools/'.length));if(!filename||![threeDirectory,output].some(directory=>filename.startsWith(directory+path.sep))){response.writeHead(404);response.end();return;}response.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':'model/gltf-binary');response.end(fs.readFileSync(filename));}catch{response.writeHead(404);response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {chromium}=await import(pathToFileURL(browserToolkit).href);
let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:800,height:520},deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});await page.waitForSelector('body[data-ready="true"]');assert.equal(errors.length,0,errors.join('\n'));const filename=path.join(project,'public/bom/acrylic-clip.png');await page.locator('canvas').screenshot({path:filename});const image=fs.readFileSync(filename);asset.thumbnail={url:'/bom/acrylic-clip.png',bytes:image.length,sha256:hash(image),width:800,height:520};}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
fs.writeFileSync(path.join(project,'lib/acrylic-clip-asset.json'),JSON.stringify(asset,null,2)+'\n');
console.log(JSON.stringify({id:asset.id,sourceMeshCount:asset.sourceMeshCount,triangles:asset.triangles,sizeMM:asset.centeredBoundsMM.size,jawClearanceMM:asset.jawOpening.clearanceMM,url:asset.url,thumbnail:asset.thumbnail.url,sourceSha256:asset.sourceSha256}));
